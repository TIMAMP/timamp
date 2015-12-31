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

/** Check if the given data is OK:
 * - densities: data matrix with dimensions: [segments, strata, radars].
 * - uSpeeds: data matrix with dimensions: [segments, strata, radars].
 * - vSpeeds: data matrix with dimensions: [segments, strata, radars].
 * - speeds: data matrix with dimensions: [segments, strata, radars].
 * - avDensities: data matrix with dimensions: [strata, radars].
 */
exports.checkData = function (data, metadata, strataIdx) {
  var startTime = metadata.startMoment.valueOf();
  var endTime = metadata.endMoment.valueOf();
  var dt = endTime - startTime;
  var itervalSec = metadata.segmentSize * 60 * 1000;
  var segn = Math.floor(dt / itervalSec);
  var strn = metadata.strataOptions[strataIdx].length;
  var radn = metadata.radars.length;
  var segi, stri;

  if (data.densities.length != segn) {
    throw ("data.densities.length (" + data.densities.length +
      ") != segn (" + segn + ")");
  }
  if (data.uSpeeds.length != segn) {
    throw ("data.uSpeeds.length (" + data.uSpeeds.length +
      ") != segn (" + segn + ")");
  }
  if (data.vSpeeds.length != segn) {
    throw ("data.vSpeeds.length (" + data.vSpeeds.length +
      ") != segn (" + segn + ")");
  }
  if (data.speeds.length != segn) {
    throw ("data.speeds.length (" + data.speeds.length +
      ") != segn (" + segn + ")");
  }

  for (segi = 0; segi < segn; segi++) {
    if (data.densities[segi].length != strn) {
      throw ("data.densities[segi].length (" + data.densities[segi].length +
        ") != strn (" + strn + ")");
    }
    if (data.uSpeeds[segi].length != strn) {
      throw ("data.uSpeeds[segi].length (" + data.uSpeeds[segi].length +
        ") != strn (" + strn + ")");
    }
    if (data.vSpeeds[segi].length != strn) {
      throw ("data.vSpeeds[segi].length (" + data.vSpeeds[segi].length +
        ") != strn (" + strn + ")");
    }
    if (data.speeds[segi].length != strn) {
      throw ("data.speeds[segi].length (" + data.speeds[segi].length +
        ") != strn (" + strn + ")");
    }

    for (stri = 0; stri < strn; stri++) {
      if (data.densities[segi][stri].length != radn) {
        throw ("data.densities[segi][stri].length (" +
          data.densities[segi][stri].length + ") != radn (" + radn + ")");
      }
      if (data.uSpeeds[segi][stri].length != radn) {
        throw ("data.uSpeeds[segi][stri].length (" +
          data.uSpeeds[segi][stri].length + ") != radn (" + radn + ")");
      }
      if (data.vSpeeds[segi][stri].length != radn) {
        throw ("data.vSpeeds[segi][stri].length (" +
          data.vSpeeds[segi][stri].length + ") != radn (" + radn + ")");
      }
      if (data.speeds[segi][stri].length != radn) {
        throw ("data.speeds[segi][stri].length (" +
          data.speeds[segi][stri].length + ") != radn (" + radn + ")");
      }
    }
  }
};
