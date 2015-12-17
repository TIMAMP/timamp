/**
 * Created by wouter on 22/09/2015.
 */
(function() {
  'use strict';

  angular.module('enram')
    .factory('us15a.segmented', ['enram', us15a]);

  /**
   * us15a.segmented service constructor.
   * @returns The service object.
   */
  function us15a(enram) {
    //console.log(">> us15a.segmented factory constructor");

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
   * This service load the TIMAMP data from the data.json file generated
   * in tipaths_03d/data_work/process_csv_us15a.
   *
   * @returns {object}
   */
  function dataService() {
    var dataService = {};
    var sourceData = null;

    /**
     * Initializes the dataService.
     * @param caseStudy {enram.caseStudy}
     * @param handler {function}
     */
    dataService.initialize = function (caseStudy, handler) {
      caseStudy.label = "USA, segmented";

      d3.json(caseStudy.urlBase + "data.json", function (error, json) {
        //console.log(caseStudy);
        if (error) {
          console.error(error);
          //throw new Error("Error in dataService.loadCaseStudy. "
          //    + JSON.parse(error.responseText).error.join("; "));
          return;
        }

        //if (checkData) checkData(sourceData);
        sourceData = json;
        handler();
      });
    };

    /**
     * Loads the data for the given focus.
     * @param caseStudy {enram.caseStudy}
     * @param focus     {enram.focus}
     * @param handler   {function(dataObject)} called when the data is loaded
     */
    dataService.loadFocusData = function (caseStudy, focus, handler) {
      //console.log(">> dataService.loadData()");
      var data = {
        caseStudy: caseStudy,
        focus: focus
      };

      var segmentMillis = caseStudy.segmentMillis();
      var dataFromTime = caseStudy.dataFrom.valueOf();
      var focusTime = focus.from.valueOf();
      var dt = focusTime - dataFromTime;
      var segiFrom = Math.floor(dt / segmentMillis);
      var segiTill = segiFrom + focus.segmentCount(caseStudy);

      if (segiFrom > caseStudy.segmentCount) {
        throw new Error("Focus outside of source data range");
      }
      if (segiTill < 0) {
        throw new Error("Focus outside of source data range");
      }
      segiFrom = Math.max(segiFrom, 0);
      segiTill = Math.min(segiTill, caseStudy.segmentCount);

      var times = null;   // dimensions: [time]
      var densities = []; // dimensions: [strata, radar, time]
      var speeds = [];    // dimensions: [strata, radar, time]

      var strn = caseStudy.strataCount;
      var radn = caseStudy.radarCount;
      var segi;
      for (var stri = 0; stri < strn; stri++) {
        var densiData = [];
        var speedData = [];
        for (var radi = 0; radi < radn; radi++) {
          densiData.push(null);
          speedData.push(null);
        }
        densities.push(densiData);
        speeds.push(speedData);
      }

      data.getTimes = function (stri, radi) {
        if (times === null) {
          times = [];
          for (var segi = segiFrom; segi < segiTill; segi++) {
            times.push(dataFromTime + segi * segmentMillis);
          }
        }
        return times;
      };

      data.getDensities = function (stri, radi) {
        var series = densities[stri][radi];
        if (series == null) {
          series = [];
          for (segi = segiFrom; segi < segiTill; segi++) {
            series.push(sourceData.densities[segi][stri][radi]);
          }
          densities[stri][radi] = series;
        }
        return series;
      };

      data.getSpeeds = function (stri, radi) {
        var series = speeds[stri][radi];
        if (series == null) {
          series = [];
          for (segi = segiFrom; segi < segiTill; segi++) {
            series.push(sourceData.speeds[segi][stri][radi]);
          }
          speeds[stri][radi] = series;
        }
        return series;
      };

      handler(data);
    };

    return dataService;
  }

})();
