'use strict';

// See README.md for general documentation.

// Dependencies:
var fs = require('fs');
var csv = require('csv');
var jsonfile = require('jsonfile');
var moment = require('moment');

// cofiguration:
var csv_path = "data.csv";
var raw_data_path = "raw-data.json";
var data_path = "data.json";
var metadata_path = "metadata.json";
//var id = "us15a";

// Raw data indices:
var ri_radar_id = 0,
  ri_interval_start_time = 1,
  ri_altitude_band = 2,
  ri_avg_u_speed = 3,
  ri_avg_v_speed = 4,
  ri_avg_bird_density = 5,
  ri_vertical_integrated_density = 6,
  ri_number_of_measurements = 7,
  ri_speed = 8;

function start() {
  fs.readFile(metadata_path, 'utf8', function (err, raw) {
    if (err) {
      console.error("! Failed to read '" + metadata_path + "'. " + err);
      throw err;
    }

    var metadata = JSON.parse(raw);

    // segment duration in milliseconds:
    var intervalMs = metadata.segmentSize * 60 * 1000;

    var startMoment = moment.utc(metadata.dataFrom);
    var endMoment = moment.utc(metadata.dataTill);
    var startTime = startMoment.valueOf();
    var endTime = endMoment.valueOf();

    // the number of segments:
    var segn = Math.floor((endTime - startTime) / intervalMs);

    // data structure to map radar ids to the radar index:
    var radarIndices = {};
    metadata.radars.forEach(function (radar, i) {
      radarIndices[radar.id] = i;
    });

    // the number of strata:
    var strn = metadata.strataCount;

    // the number of radars:
    var radn = metadata.radars.length;

    // read the csv-data:
    var parseConfig = { auto_parse: true, auto_parse_date: true };
    var parser = csv.parse(parseConfig, function (err, records) {
      if (err) {
        console.error("! Failed to read '" + csv_path + "'. " + err);
        throw err;
      }

      // remove the headers:
      var headers = records.shift();

      // Parse the dates and normalize the altitude id:
      records.forEach(function (record) {
        record[ri_interval_start_time] = new Date(record[ri_interval_start_time]);
        record[ri_altitude_band] = record[ri_altitude_band] - 1;
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
      if (minDate < startMoment.toDate()) {
        throw new Error("minDate < startMoment, minDate: " + minDate
          + ", startMoment: " + startMoment.toDate());
      }
      if (maxDate > endMoment.toDate()) {
        throw new Error("maxDate > endMoment, maxDate: " + maxDate
          + ", endMoment: " + endMoment.toDate());
      }

      var segi, stri, radi;

      // Prepare the raw-data structure:
      var rawData = [];
      for (radi = 0; radi < radn; radi++) {
        var radData = []; // per radar
        for (stri = 0; stri < strn; stri++) {
          radData.push([]); // per strata
        }
        rawData.push(radData);
      }

      // Prepare the TIMAMP data structure which is constructed such that
      // it efficiently facilitates the interpolation operations needed when
      // constructing the paths.
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

      // Parse the records and put all values for each segment in lists:
      var uSpeed, vSpeed, speed;
      records.forEach(function (record) {
        var dt = record[ri_interval_start_time].getTime() - startTime;
        if (dt < 0) { throw new Error("dt < 0"); }

        segi = Math.floor(dt / intervalMs);
        stri = record[ri_altitude_band];
        radi = radarIndices[record[ri_radar_id]];
        //console.log(segi, segn, stri, strn, radi, radn);

        uSpeed = record[ri_avg_u_speed];
        vSpeed = record[ri_avg_v_speed];
        speed = Math.sqrt(uSpeed * uSpeed + vSpeed * vSpeed);
        record.push(speed);

        // add record in the raw-data structure:
        rawData[radi][stri].push(record);

        // add data in the TIMAMP data structure:
        try {
          data.densities[segi][stri][radi].push(record[ri_avg_bird_density]);
          data.uSpeeds[segi][stri][radi].push(uSpeed);
          data.vSpeeds[segi][stri][radi].push(vSpeed);
          data.speeds[segi][stri][radi].push(speed);
        }
        catch(error) {
          console.log(segi, segn, stri, strn, radi, radn);
          console.log(data.densities[segi]);
          console.log(data.densities[segi][stri]);
          console.log(data.densities[segi][stri][radi]);
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

      // The strata height in km:
      var strataHeight = metadata.maxAltitude / metadata.strataCount / 1000;

      // Calculate average densities per radar-altitude combination, integrated
      // over the strata height. These numbers thus represent the number of birds
      // per square km in a given strata.
      //for (stri = 0; stri < strn; stri++) {
      //  var avds = [];
      //  for (radi = 0; radi < radn; radi++) {
      //    var dsum = 0;
      //    for (segi = 0; segi < segn; segi++) {
      //      dsum += data.densities[segi][stri][radi];
      //    }
      //    avds[radi] = dsum / segn * strataHeight;
      //  }
      //  data.avDensities.push(avds);
      //}

      // write the raw data in a json format:
      console.log("# Writing " + raw_data_path);
      jsonfile.writeFile(raw_data_path, rawData, function (err) {
        if (err) {
          console.error("Failed to write '" + raw_data_path + "'. " + err);
        }

        console.log("# Writing " + data_path);
        jsonfile.writeFile(data_path, data, function (err) {
          if (err) {
            console.error("Failed to write '" + data_path + "'. " + err);
          }
          else {
            console.error("# Done");
          }
        });
      });

    });

    console.log('# Reading ' + csv_path);
    fs.createReadStream(csv_path).pipe(parser);
  });
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

start();
