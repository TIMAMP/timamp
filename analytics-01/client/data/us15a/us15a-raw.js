/**
 * Created by wouter on 22/09/2015.
 */
(function() {
  'use strict';

  angular.module('enram')
    .factory('us15a.raw', ['enram', us15a]);

  /**
   * us15a.raw service constructor.
   * @returns The service object.
   */
  function us15a(enram) {
    //console.log(">> us15a.raw factory constructor");

    var caseStudy = enram.caseStudy("us15a", dataService());

    caseStudy.getProjection = function (caseStudy, mapWidth, mapHeight) {
      return d3.geo.mercator()
        .scale(caseStudy.mapScaleFactor * mapWidth)
        .translate([mapWidth / 2, mapHeight / 2])
        .center(caseStudy.mapCenter);
    };

    return caseStudy;
  }

  /**
   * This data service load the raw data from the raw-data.json file generated
   * in tipaths_03d/data_work/process_csv_us15a.
   *
   * @returns {object}
   */
  function dataService() {
    var dataService = {};
    var sourceData = null;

    // Raw data indices:
    var ri_radar = 0,
      ri_time = 1,
      ri_strata = 2,
      ri_uSpeed = 3,
      ri_vSpeed = 4,
      ri_density = 5,
      ri_vertical_integrated_density = 6,
      ri_number_of_measurements = 7,
      ri_speed = 8;

    /**
     * Initializes the dataService.
     * @param caseStudy {enram.caseStudy}
     * @param handler
     */
    dataService.initialize = function (caseStudy, handler) {
      caseStudy.label = "USA, raw";

      // The implementation expects the records in the data to be temporally sorted.
      d3.json(caseStudy.urlBase + "raw-data.json", function (error, json) {
        //console.log(caseStudy);
        if (error) {
          console.error(error);
          //throw new Error("Error in dataService.loadCaseStudy. "
          //    + JSON.parse(error.responseText).error.join("; "));
          return;
        }

        sourceData = json;
        sourceData.forEach(function (rdata) {
          rdata.forEach(function (sdata) {
            sdata.forEach(function (record) {
              record[ri_time] = new Date(record[ri_time]);
            });
          });
        });

        handler();
      });
    };

    /**
     * Loads the data for the given focus.
     * @param caseStudy {enram.caseStudy}
     * @param focus     {enram.focus}
     * @param handler   {function}      called when the data is loaded
     */
    dataService.loadFocusData = function (caseStudy, focus, handler) {
      var data = {
        focus: focus
      };

      var times = [];     // dimensions: [strata, radar, time]
      var densities = []; // dimensions: [strata, radar, time]
      var speeds = [];    // dimensions: [strata, radar, time]

      var focusFrom = focus.from.toDate();
      var focusTill = focus.till.toDate();
      var strn = caseStudy.strataCount;
      var radn = caseStudy.radarCount;

      for (var stri = 0; stri < strn; stri++) {
        var timeData = [];
        var densiData = [];
        var speedData = [];
        for (var radi = 0; radi < radn; radi++) {
          timeData.push(null);
          densiData.push(null);
          speedData.push(null);
        }
        times.push(timeData);
        densities.push(densiData);
        speeds.push(speedData);
      }

      data.getTimes = function (stri, radi) {
        var series = times[stri][radi];
        if (series == null) {
          series = [];
          sourceData[radi][stri].forEach(function (record) {
            var time = record[ri_time];
            if (time >= focusFrom && time < focusTill) {
              series.push(time);
            }
          });
          times[stri][radi] = series;
        }
        return series;
      };

      data.getDensities = function (stri, radi) {
        var series = densities[stri][radi];
        if (series == null) {
          series = [];
          sourceData[radi][stri].forEach(function (record) {
            var time = record[ri_time];
            if (time >= focusFrom && time < focusTill) {
              series.push(record[ri_density]);
            }
          });
          densities[stri][radi] = series;
        }
        return series;
      };

      data.getSpeeds = function (stri, radi) {
        var series = speeds[stri][radi];
        if (series == null) {
          series = [];
          sourceData[radi][stri].forEach(function (record) {
            var time = record[ri_time];
            if (time >= focusFrom && time < focusTill) {
              series.push(record[ri_speed]);
            }
          });
          speeds[stri][radi] = series;
        }
        return series;
      };

      handler(data);
    };

    return dataService;
  }

})();
