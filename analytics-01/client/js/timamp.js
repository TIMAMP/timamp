/**
 * Created by wouter on 17/12/2015.
 */

(function() {
  'use strict';

  angular.module('timamp', ['utils'])
    .factory('timamp', ['utils', timamp]);

  function timamp() {
    //console.log(">> timamp service constructor");
    var timamp = {};

    /**
     * The timamp data structure is constructed such that it efficiently facilitates
     * the interpolation operations needed when constructing the paths in the timamp
     * visualization.
     *
     * Terminology:
     * - segment : The data is temporally segmented in segments of e.g. 20 minutes.
     * - focus : A temporal section of the data currently shown in the visualisation.
     * - strata : An altitude range.
     *
     * This data structure should always be complete, meaning that for each segment in the
     * focus window, for each strata and for each radar, there should be a value, even
     * if the original data does not fully cover the given focus window.
     *
     * The data object has the following form:
     * {
     *   caseStudy: {enram.caseStudy},  // the caseStudy
     *   focus: {enram.focus},    // specifies the focus start and duration
     *   segmentCount: {number},  // the number of segments in the focus
     *   densities: {Array},      // matrix with dimensions: [segment, strata, radar]
     *   uSpeeds: {Array},        // matrix with dimensions: [segment, strata, radar]
     *   vSpeeds: {Array},        // matrix with dimensions: [segment, strata, radar]
     *   speeds: {Array},         // matrix with dimensions: [segment, strata, radar]
     *   avDensities: {Array},    // matrix with dimensions: [strata, radar]
     * }
     *
     * @param caseStudy  {enram.caseStudy}
     * @param focus      {enram.focus}
     * @returns the data structure
     */
    timamp.dataObject = function (caseStudy, focus) {
      var dataObject = {
        caseStudy: caseStudy,
        focus: focus,
        segmentCount: focus.segmentCount(caseStudy),
        densities: [],
        uSpeeds: [],
        vSpeeds: [],
        speeds: [],
        avDensities: []
      };

      /**
       * Initializes the data structure to be filled with actual data.
       *
       * @return the data object
       */
      dataObject.initStructure = function () {
        var segn = this.segmentCount;
        var strn = caseStudy.strataCount;
        var radn = caseStudy.radarCount;
        for (var segi = 0; segi < segn; segi++) {
          var densities = [];
          var uSpeeds = [];
          var vSpeeds = [];
          var speeds = [];
          for (var stri = 0; stri < strn; stri++) {
            densities.push(utils.zeroArray(radn));
            uSpeeds.push(utils.zeroArray(radn));
            vSpeeds.push(utils.zeroArray(radn));
            speeds.push(utils.zeroArray(radn));
          }
          this.densities.push(densities);
          this.uSpeeds.push(uSpeeds);
          this.vSpeeds.push(vSpeeds);
          this.speeds.push(speeds);
        }

        for (stri = 0; stri < strn; stri++) {
          this.avDensities.push(utils.zeroArray(radn));
        }

        return this;
      };

      // empty partial data structure to use in dataObject.addMissingSegments:
      var missingSegmentData = [];
      var strn = caseStudy.strataCount;
      var radn = caseStudy.radarCount;
      for (var stri = 0; stri < strn; stri++) {
        missingSegmentData.push(utils.zeroArray(radn));
      }

      /**
       * Prepends data entries to replace missing data for a given amount of segments.
       * @param amount The number of segments for which to add data entries.
       */
      dataObject.prependMissingSegments = function (amount) {
        for (var i = 0; i < amount; i++) {
          this.densities.unshift(missingSegmentData);
          this.uSpeeds.unshift(missingSegmentData);
          this.vSpeeds.unshift(missingSegmentData);
          this.speeds.unshift(missingSegmentData);
        }
      };

      /**
       * Appends data entries to replace missing data for a given amount of segments.
       * @param amount The number of segments for which to add data entries.
       */
      dataObject.appendMissingSegments = function (amount) {
        for (var i = 0; i < amount; i++) {
          this.densities.push(missingSegmentData);
          this.uSpeeds.push(missingSegmentData);
          this.vSpeeds.push(missingSegmentData);
          this.speeds.push(missingSegmentData);
        }
      };

      return dataObject;
    };

    return timamp;
  }

})();
