'use strict';

// See README.md for general documentation.

// Dependencies:
var fs = require('fs');
var request = require("request");
var jsonfile = require('jsonfile');
var moment = require('moment');

// configuration:
var metadata_path = "input/metadata.json";
var queryTemplate_path = "input/template.sql";

function loadMetadata(path) {
  console.info('# Loading metadata from ' + path);
  var buffer = fs.readFileSync(path, 'utf8');
  var metadata = JSON.parse(buffer);

  // segment duration in milliseconds:
  metadata.intervalMs = metadata.segmentSize * 60 * 1000;

  metadata.startMoment = moment.utc(metadata.dataFrom);
  metadata.endMoment = moment.utc(metadata.dataTill);
  metadata.startTime = metadata.startMoment.valueOf();
  metadata.endTime = metadata.endMoment.valueOf();

  // the number of segments:
  metadata.segmentCount = Math.floor((metadata.endTime - metadata.startTime) / metadata.intervalMs);

  // data structure to map radar ids to the radar index:
  metadata.radarIndices = {};
  metadata.radars.forEach(function (radar, i) {
    metadata.radarIndices[radar.id] = i;
  });

  return metadata;
}

function loadQueryTemplate(path) {
  console.info('# Loading query template from ' + path);
  var queryTemplate = fs.readFileSync(path).toString();
  //console.log(queryTemplate);

  //console.log(XMLHttpRequest);
  queryTemplate = queryTemplate.replace(/#.*\n/g, '\n');
  queryTemplate = queryTemplate.replace(/\n/g, ' ').trim();

  var proceed = true;
  while (proceed) {
    proceed = false;
    queryTemplate = queryTemplate.replace(/  /g,
      function (match, key) {
        proceed = true;
        return ' ';
      }
    );
  }

  return queryTemplate;
}

function formatTemplate(template, params) {
  return template.replace(/{{(\w+)}}/g, function (match, key) {
    key = key.trim();
    //console.log(match, key, params[key]);
    var val = params[key];
    return typeof val != 'undefined' ? val : match;
  });
}

/**
 * Loads the data from the CartoDB.
 *
 * <p>Loads data for a range of altitudes, over a series of windows, for each
 * radar-window-altitude combination averaging the bird_density, the u_speed and
 * the v_speed. When the data is loaded, the handler function is called with
 * a JSON-object holding the data as sole argument.</p>
 *
 * @param caseStudy {enram.caseStudy}
 * @param focus     {enram.focus}
 * @param handler   {function(dataObject)} called when the data is loaded
 */
function loadData(strataIdx, metadata, queryTemplate, handler) {
  console.info('  - Loading data for strata option ' + strataIdx);
  var sql = formatTemplate(queryTemplate,
    {
      from: metadata.startMoment.toISOString(),
      till: metadata.endMoment.toISOString(),
      interval: metadata.segmentSize * 60,  // segment size in seconds,
      strataSize: metadata.queryStrataSizes[strataIdx] / 1000, // in km
      minAlt: metadata.minAltitude / 1000,
      maxAlt: metadata.maxAltitude / 1000
    }
  );
  //console.log(sql);

  var url = metadata.queryBaseUrl + sql;
  //console.log(url);

  request({ url: url, json: true }, function (error, response, json) {
    if (!error && response.statusCode === 200) {
      //console.log(json);
      handler(json);
    }
  });
}

function processData(strataIdx, metadata, json) {
  console.info("  - Processing " + json.total_rows + " rows");
  var strataOption = metadata.strataOptions[strataIdx];
  var data = initData(metadata, strataOption);

  var rown = json.total_rows;
  var segn = metadata.segmentCount;
  var strn = strataOption.length;  // the number of strata
  var radn = metadata.radars.length;  // the number of radars
  var segi, stri, radi;
  var rowi, row, dsum, avds;

  // Add the data in the data structure:
  json.rows.forEach(function (row, rowi) {
    segi = row.interval_idx;
    stri = row.altitude_idx;
    radi = metadata.radarIndices[row.radar_id];

    // Shift altitude_idx for first strata-option in which the strata-size is 200. There is no data for the first strata
    // with range[0, 200].
    if (strataIdx == 0) {
      if (stri == 0) {
        throw new Error("Unexpected stri = 0 for strataIdx = 0");
      }
      stri--;
    }

    try {
      data.densities[segi][stri][radi] = row.avg_bird_density;
      data.uSpeeds[segi][stri][radi] = row.avg_u_speed;
      data.vSpeeds[segi][stri][radi] = row.avg_v_speed;
      data.speeds[segi][stri][radi] = row.avg_speed;
    }
    catch (error) {
      console.log("rowi:", rowi, ", segi:", segi, ", stri:", stri, ", radi:", radi);
      console.log("data.densities[segi]:", data.densities[segi]);
      console.log("data.densities[segi][stri]:", data.densities[segi][stri]);
      console.log("data.densities[segi][stri][radi]:", data.densities[segi][stri][radi]);
      throw error;
    }
  });

  return data;
}

/**
 * Prepare the TIMAMP data structure which is constructed such that
 * it efficiently facilitates the interpolation operations needed when
 * constructing the paths.
 * @param metadata
 * @param strataOption
 */
function initData(metadata, strataOption) {
  var segn = metadata.segmentCount;
  var strn = strataOption.length;  // the number of strata
  var radn = metadata.radars.length;  // the number of radars
  var segi, stri, radi;

  var data = {
    densities: [],
    uSpeeds: [],
    vSpeeds: [],
    speeds: []
  };
  for (segi = 0; segi < segn; segi++) {
    var densities = [];
    var uSpeeds = [];
    var vSpeeds = [];
    var speeds = [];
    for (stri = 0; stri < strn; stri++) {
      var densities2 = [];
      var uSpeeds2 = [];
      var vSpeeds2 = [];
      var speeds2 = [];
      for (radi = 0; radi < radn; radi++) {
        densities2.push([]);
        uSpeeds2.push([]);
        vSpeeds2.push([]);
        speeds2.push([]);
      }
      densities.push(densities2);
      uSpeeds.push(uSpeeds2);
      vSpeeds.push(vSpeeds2);
      speeds.push(speeds2);
    }
    data.densities.push(densities);
    data.uSpeeds.push(uSpeeds);
    data.vSpeeds.push(vSpeeds);
    data.speeds.push(speeds);
  }

  return data;
}

/**
 * Returns the average of the values in the given array.
 * @param   {Array}            ary     An array with numbers.
 * @param   {*}                undefAv The return value when the array is empty.
 * @returns {Number|undefined} The average or undefined if the array is empty.
 */
function average(ary, undefAv) {
  if (arguments.length === 1) { undefAv = 0; }
  if (ary === undefined) { return undefAv; }
  var len = ary.length;
  if (len === 0) { return undefAv;  }
  var r = 0;
  for (var i = 0; i < len; i++) { r += ary[i]; }
  return r / len;
}

function writeData(strataIdx, data, handler) {
  var data_path = "output/data-" + strataIdx + ".json";

  if (!fs.existsSync("output")) {
    fs.mkdir("output");
  }

  console.info("  - Writing TIMAMP-data at " + data_path);
  jsonfile.writeFile(data_path, data, function (err) {
    if (err) {
      console.error("Failed to write '" + data_path + "'. " + err);
      throw err;
    }

    handler();
  });
}

function processNext(strataIdx, metadata, queryTemplate) {
  console.info('# Processing strata option ' + strataIdx);
  if (strataIdx < metadata.strataOptions.length) {
    loadData(strataIdx, metadata, queryTemplate, function (json) {
      var data = processData(strataIdx, metadata, json);
      writeData(strataIdx, data, function () {
        processNext(strataIdx + 1, metadata, queryTemplate);
      });
    });
  }
  else {
    console.info("# Preprocessing complete");
  }
}

var metadata = loadMetadata(metadata_path)
var queryTemplate = loadQueryTemplate(queryTemplate_path);
processNext(0, metadata, queryTemplate);
