'use strict';

// See README.md for general documentation.

// Dependencies:
var fs = require('fs');
var csv = require('csv');
var jsonfile = require('jsonfile');
var moment = require('moment');

// cofiguration:
var csv_path = "data.csv";
var metadata_path = "metadata.json";
//var id = "us15a";

// Raw data indices:
var ri_radar_id = 0,
  ri_interval_start_time = 1,
  ri_altitude_band = 2,
  ri_u_speed = 3,
  ri_v_speed = 4,
  ri_avg_bird_density = 5,
  ri_vertical_integrated_density = 6,
  ri_speed = 7 /* enriched */;

function loadMetadata(path, handler) {
  console.log('# Loading metadata from ' + path);
  fs.readFile(path, 'utf8', function (err, raw) {
    if (err) {
      console.error("! Failed to read '" + path + "'. " + err);
      throw err;
    }

    var metadata = JSON.parse(raw);

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

    handler(metadata);
  });
}

function loadData(path, metadata, handler) {
  console.log('# Loading data from ' + path);
  var parseConfig = { auto_parse: true, auto_parse_date: true };
  var parser = csv.parse(parseConfig, function (err, records) {
    if (err) {
      console.error("! Failed to read '" + csv_path + "'. " + err);
      throw err;
    }

    // remove the headers:
    var headers = records.shift();

    // Parse the dates and add speed based on u-speed and v-speed:
    records.forEach(function (record) {
      record[ri_interval_start_time] = new Date(record[ri_interval_start_time]);

      var uSpeed = record[ri_u_speed];
      var vSpeed = record[ri_v_speed];
      record.push(Math.sqrt(uSpeed * uSpeed + vSpeed * vSpeed));
    });

    // Sort the records by date:
    records.sort(function (ra, rb) {
      if (ra[ri_interval_start_time] < rb[ri_interval_start_time]) return -1;
      if (ra[ri_interval_start_time] > rb[ri_interval_start_time]) return 1;
      return 0;
    });

    // Check if the given dates are inside the min-max range given in
    // the metadata:
    var minDate = records[0][ri_interval_start_time];
    var maxDate = records[records.length - 1][ri_interval_start_time];
    if (minDate < metadata.startMoment.toDate()) {
      throw new Error("minDate < startMoment, minDate: " + minDate
        + ", startMoment: " + metadata.startMoment.toDate());
    }
    if (maxDate > metadata.endMoment.toDate()) {
      throw new Error("maxDate > endMoment, maxDate: " + maxDate
        + ", endMoment: " + metadata.endMoment.toDate());
    }

    console.log('# Data loaded');
    handler(records);
  });
  fs.createReadStream(path).pipe(parser);
}

/**
 * Prepare the raw-data structure.
 * @param metadata
 * @param strataOption
 */
function initRawData(metadata, strataOption) {
  var strn = strataOption.length;  // the number of strata
  var radn = metadata.radars.length;  // the number of radars
  var stri, radi;

  var rawData = [];
  for (radi = 0; radi < radn; radi++) {
    var radData = []; // per radar
    for (stri = 0; stri < strn; stri++) {
      radData.push([]); // per strata
    }
    rawData.push(radData);
  }

  return rawData;
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
    speeds: [],
    avDensities: []
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

function process(records, metadata, strataOption, handler) {
  //console.log("strataOption:", strataOption);
  var segn = metadata.segmentCount;
  var strn = strataOption.length;  // the number of strata
  var radn = metadata.radars.length;  // the number of radars
  var segi, stri, radi;

  var rawData = initRawData(metadata, strataOption);
  var data = initData(metadata, strataOption);

  // Parse the records:
  records.forEach(function (record, ri) {

    // delta time
    var dt = record[ri_interval_start_time].getTime() - metadata.startTime;
    if (dt < 0) { throw new Error("dt < 0"); }

    segi = Math.floor(dt / metadata.intervalMs);
    stri = -1;
    var alti = record[ri_altitude_band] * 1000;
    for (var i = 0; i < strataOption.length; i++) {
      if (strataOption[i][0] <= alti && strataOption[i][1] > alti) {
        stri = i;
        break;
      }
    }
    radi = metadata.radarIndices[record[ri_radar_id]];
    //console.log(segi, segn, alti, stri, strn, radi, radn);

    // add record in the raw data structure:
    //try {
    //  rawData[radi][stri].push(record);
    //}
    //catch(error) {
    //  console.error(radi, radn, stri, strn);
    //  console.error(rawData[radi]);
    //  console.error(rawData[radi][stri]);
    //  throw error;
    //}

    // add data in the TIMAMP data structure:
    try {
      data.densities[segi][stri][radi].push(record[ri_avg_bird_density]);
      data.uSpeeds[segi][stri][radi].push(record[ri_u_speed]);
      data.vSpeeds[segi][stri][radi].push(record[ri_v_speed]);
      data.speeds[segi][stri][radi].push(record[ri_speed]);
    }
    catch(error) {
      console.error(segi, segn, stri, strn, radi, radn);
      console.error(data.densities[segi]);
      console.error(data.densities[segi][stri]);
      console.error(data.densities[segi][stri][radi]);
      throw error;
    }
  });

  // Detect segments without data for all radars:
  //for (segi = 0; segi < segn; segi++) {
  //  var segTime = new Date(startTime + segi * intervalMs);
  //  for (stri = 0; stri < strn; stri++) {
  //    var foundDensities = false;
  //    for (radi = 0; radi < radn; radi++) {
  //      if (data.densities[segi][stri][radi].length > 0) {
  //        foundDensities = true;
  //        break;
  //      }
  //      //data.uSpeeds[segi][stri][radi] = average(data.uSpeeds[segi][stri][radi]);
  //      //data.vSpeeds[segi][stri][radi] = average(data.vSpeeds[segi][stri][radi]);
  //      //data.speeds[segi][stri][radi] = average(data.speeds[segi][stri][radi]);
  //    }
  //    if (!foundDensities) {
  //      console.log("- no densities in segment " + segi + " (" + segTime + ")" + ", strata " + stri);
  //    }
  //  }
  //}

  // Calculate the averages for each segment:
  for (segi = 0; segi < segn; segi++) {
    for (stri = 0; stri < strn; stri++) {
      for (radi = 0; radi < radn; radi++) {
        data.densities[segi][stri][radi] = average(data.densities[segi][stri][radi]);
        data.uSpeeds[segi][stri][radi] = average(data.uSpeeds[segi][stri][radi]);
        data.vSpeeds[segi][stri][radi] = average(data.vSpeeds[segi][stri][radi]);
        data.speeds[segi][stri][radi] = average(data.speeds[segi][stri][radi]);
      }
    }
  }

  // The strata sizes in km:
  data.strataSizes = strataOption.map(function (strata) {
    return (strata[1] - strata[0]) / 1000;
  });

  handler(rawData, data);
}

function processData(records, metadata, strataIdx) {
  if (strataIdx < metadata.strataOptions.length) {
    process(records, metadata, metadata.strataOptions[strataIdx], function (rawData, data) {
      var raw_data_path = "output/raw-data-" + strataIdx + ".json";
      var data_path = "output/data-" + strataIdx + ".json";

      if (!fs.existsSync("output")) {
        fs.mkdir("output");
      }

      //jsonfile.spaces = 2;

      //console.log("# Writing raw-data at " + raw_data_path);
      //jsonfile.writeFile(raw_data_path, rawData, function (err) {
      //  if (err) {
      //    console.error("Failed to write '" + raw_data_path + "'. " + err);
      //    throw err;
      //  }

        console.log("# Writing TIMAMP-data at " + data_path);
        jsonfile.writeFile(data_path, data, function (err) {
          if (err) {
            console.error("Failed to write '" + data_path + "'. " + err);
            throw err;
          }

          processData(records, metadata, strataIdx + 1);
        });
      });

    //});
  }
  else {
    console.log("# Complete");
  }
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

loadMetadata(metadata_path, function (metadata) {
  loadData(csv_path, metadata, function (records) {
    processData(records, metadata, 0);
  });
});
