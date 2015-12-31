'use strict';

var fs = require('fs');
var jsonfile = require('jsonfile');
var moment = require('moment');

exports.loadMetadata = function (path) {
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
};

/**
 * Prepare the TIMAMP data structure which is constructed such that
 * it efficiently facilitates the interpolation operations needed when
 * constructing the paths.
 * @param metadata
 * @param strataOption
 */
exports.initData = function (metadata, strataOption) {
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
};

/**
 * Returns the average of the values in the given array.
 * @param   {Array}            ary     An array with numbers.
 * @param   {*}                undefAv The return value when the array is empty.
 * @returns {Number|undefined} The average or undefined if the array is empty.
 */
exports.average = function (ary, undefAv) {
  if (arguments.length === 1) { undefAv = 0; }
  if (ary === undefined) { return undefAv; }
  var len = ary.length;
  if (len === 0) { return undefAv;  }
  var r = 0;
  for (var i = 0; i < len; i++) { r += ary[i]; }
  return r / len;
};

exports.writeData = function (data, strataIdx, outputPath, handler) {
  // create the output folder if it does not yet exist:
  if (!fs.existsSync(outputPath)) { fs.mkdir(outputPath); }

  var data_path = outputPath + "/data-" + strataIdx + ".json";
  console.info("  - Writing TIMAMP-data at " + data_path);
  jsonfile.writeFile(data_path, data, function (err) {
    if (err) {
      console.error("Failed to write '" + data_path + "'. " + err);
      throw err;
    }
    handler();
  });
};
