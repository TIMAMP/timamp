'use strict';

// See README.md for general documentation.

// Dependencies:
var fs = require('fs');
var csv = require('csv');

var utils = require('./js/utils.js');

// configuration:
var csvPath = "us15a/input/data.csv";
var metadataPath = "us15a/input/metadata.json";
var outputPath = "us15a/output";

// Raw data indices:
var ri_radar_id = 0,
  ri_interval_start_time = 1,
  ri_altitude_band = 2,
  ri_u_speed = 3,
  ri_v_speed = 4,
  ri_avg_bird_density = 5,
  ri_vertical_integrated_density = 6,
  ri_speed = 7 /* enriched */;

function loadData(path, metadata, handler) {
  console.log('# Loading data from ' + path);
  var parseConfig = { auto_parse: true, auto_parse_date: true };
  var parser = csv.parse(parseConfig, function (err, records) {
    if (err) {
      console.error("! Failed to read '" + csvPath + "'. " + err);
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

function process(records, metadata, strataOption, handler) {
  //console.log("strataOption:", strataOption);
  var segn = metadata.segmentCount;
  var strn = strataOption.length;  // the number of strata
  var radn = metadata.radars.length;  // the number of radars
  var segi, stri, radi;

  var data = utils.initData(metadata, strataOption);

  // Parse the records:
  records.forEach(function (record, ri) {

    // delta time:
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

  // Calculate the averages for each segment:
  for (segi = 0; segi < segn; segi++) {
    for (stri = 0; stri < strn; stri++) {
      for (radi = 0; radi < radn; radi++) {
        data.densities[segi][stri][radi] = utils.average(data.densities[segi][stri][radi]);
        data.uSpeeds[segi][stri][radi] = utils.average(data.uSpeeds[segi][stri][radi]);
        data.vSpeeds[segi][stri][radi] = utils.average(data.vSpeeds[segi][stri][radi]);
        data.speeds[segi][stri][radi] = utils.average(data.speeds[segi][stri][radi]);
      }
    }
  }

  handler(data);
}

function processNext(records, metadata, strataIdx) {
  if (strataIdx < metadata.strataOptions.length) {
    process(records, metadata, metadata.strataOptions[strataIdx], function (data) {
      utils.writeData(data, strataIdx, outputPath, function () {
        processNext(records, metadata, strataIdx + 1);
      });
    });
  }
  else {
    console.log("# Preprocessing complete");
  }
}

var metadata = utils.loadMetadata(metadataPath);
loadData(csvPath, metadata, function (records) {
  processNext(records, metadata, 0);
});
