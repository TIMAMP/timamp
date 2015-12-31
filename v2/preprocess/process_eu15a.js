'use strict';

// See README.md for general documentation.

// Dependencies:
var fs = require('fs');
var request = require("request");
var moment = require('moment');

var utils = require('./js/utils.js');

// configuration:
var metadataPath = "eu15a/input/metadata.json";
var queryTemplatePath = "eu15a/input/template.sql";
var outputPath = "eu15a/output";

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

  request({
    url: metadata.queryBaseUrl + sql,
    json: true
  },
    function (error, response, json) {
      if (!error && response.statusCode === 200) {
        //console.log(json);
        handler(json);
      }
    });
}

function processData(strataIdx, metadata, json) {
  console.info("  - Processing " + json.total_rows + " rows");
  var strataOption = metadata.strataOptions[strataIdx];
  var data = utils.initData(metadata, strataOption);

  var segi, stri, radi, rowi;

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

function processNext(strataIdx, metadata, queryTemplate) {
  console.info('# Processing strata option ' + strataIdx);
  if (strataIdx < metadata.strataOptions.length) {
    loadData(strataIdx, metadata, queryTemplate, function (json) {
      var data = processData(strataIdx, metadata, json);
      utils.writeData(data, strataIdx, outputPath, function () {
        processNext(strataIdx + 1, metadata, queryTemplate);
      });
    });
  }
  else {
    console.info("# Preprocessing complete");
  }
}

var metadata = utils.loadMetadata(metadataPath);
var queryTemplate = loadQueryTemplate(queryTemplatePath);
processNext(0, metadata, queryTemplate);
