/**
 * Created by wouter on 01/09/2015.
 */

(function() {
  'use strict';

  angular.module('enram', [])
    .factory('enram', [enram]);

  /**
   * Enram service constructor.
   * @returns The service object.
   */
  function enram() {
    //console.log(">> enram service constructor");
    var enram = {};

    /**
     * Creates and returns a focus object.
     * @param from      {moment}  the start of the focus window
     * @param duration  {number}  the focus duration in hours
     */
    enram.focus = function (from, duration) {
      var focus = {
        from: from,
        till: moment.utc(from).add(duration, 'hours'),
        duration: duration,
        isFocus: true
      };

      /**
       * Update the from moment and the matching till moment.
       * @param from {moment}
       */
      focus.setFrom = function (from) {
        this.from = from;
        this.till = moment(from).add(this.duration, 'hours');
      };

      /**
       * Update the till moment and the matching from moment.
       * @param till {moment}
       */
      focus.setTill = function (till) {
        this.till = till;
        this.from = moment(till).subtract(focus.duration, 'hours');
      };

      /**
       * @return the number of
       */
      focus.segmentCount = function (caseStudy) {
        return this.duration * 60 / caseStudy.segmentSize;
      };

      return focus;
    };

    /**
     * caseStudy form:
     * {
     *   <see properties in README.md>
     *   defaultFocusFrom: {moment}
     *   segmentCount: {number} The number of segments in the source data
     * }
     *
     * @param basePath {string}
     * @param dataService {object}
     * @returns The caseStudy object.
     */
    enram.caseStudy = function (basePath, dataService) {
      var caseStudy = {
        basePath: basePath,
        dataService: dataService,
        isCaseStudy: true
      };

      /**
       * Asynchronously loads the case study metadata and other necessary data.
       * @param handler
       */
      caseStudy.load = function (handler) {
        this._loadMetaData(function () {
          caseStudy.dataService.initialize(caseStudy, function () {
            console.info("Loaded case study", caseStudy.label);
            handler();
          });
        });
      };

      /**
       * Load case study data from properly formatted json file.
       * @param {function(enram.caseStudy)} handler  This handler is
       *   called with the caseStudy as argument.
       */
      caseStudy._loadMetaData = function (handler) {
        caseStudy.urlBase = "data/" + this.basePath + "/";
        d3.json(caseStudy.urlBase + "metadata.json", function (error, json) {
          if (error) {
            throw error;
            //throw new Error("Error in caseStudy._loadMetaData. "
            //    + JSON.parse(error.responseText).error.join("; "));
          }
          else {
            for (var attr in json) {
              if (json.hasOwnProperty(attr)) caseStudy[attr] = json[attr];
            }
            caseStudy.dataFrom = moment.utc(caseStudy.dataFrom);
            caseStudy.dataTill = moment.utc(caseStudy.dataTill);
            caseStudy.defaultFocusFrom = moment.utc(caseStudy.focusFrom);

            // Create mapping from radar ids to indices:
            caseStudy.radarIndices = {};
            caseStudy.radLons = [];
            caseStudy.radLats = [];
            caseStudy.radars.forEach(function (radar, i) {
              radar.location = [radar.longitude, radar.latitude];
              caseStudy.radarIndices[radar.id] = i;
              caseStudy.radLons.push(radar.longitude);
              caseStudy.radLats.push(radar.latitude);
            });

            caseStudy.topoJsonUrl = caseStudy.urlBase + "topo.json";
            caseStudy.selectedRadar = caseStudy.radars[0];
            caseStudy.radarCount = caseStudy.radars.length;

            var dms = caseStudy.dataTill.valueOf() - caseStudy.dataFrom.valueOf();
           caseStudy.segmentCount = dms / 1000 / 60 / caseStudy.segmentSize;
            if (Math.abs(caseStudy.segmentCount) != caseStudy.segmentCount) {
              console.error(caseStudy.dataFrom.valueOf());
              console.error(caseStudy.dataTill.valueOf());
              throw new Error("Expected integer segmentCount, got: " +
                caseStudy.segmentCount + ", dms: " + dms);
            }

            handler(caseStudy);
          }
        });
      };

      /**
       * Loads the data for the given focus.
       * @param focus    {enram.focus}
       * @param handler  {function(dataObject)}  called when the data is loaded
       */
      caseStudy.loadFocusData = function (focus, handler) {
        //console.log(">> caseStudy.loadFocusData()");
        this.dataService.loadFocusData(caseStudy, focus, handler);
      };

      /**
       * @return the segment duration in milliseconds
       */
      caseStudy.segmentMillis = function () {
        return this.segmentSize * 60 * 1000;
      };

      caseStudy.getProjection = function (caseStudy, mapWidth, mapHeight) {
        console.error("There is no implementation for getProjection in case study '"
          + caseStudy.label + "'.");
      };

      return caseStudy;
    };

    /**
     * Loads the case studies passed as arguments and calls the handlers when complete.
     */
    enram.loadCaseStudies = function (caseStudies, handler) {
      //console.log("enram.initializeCaseStudies()");

      // the index of the next case study to load
      var current = 0;

      // recursively load the next case study:
      function next() {
        //console.log(" > next ", caseStudies.length, current);
        if (current == caseStudies.length) {
          // all case studies
          handler(caseStudies);
        }
        else {
          caseStudies[current].load(function () {
            current++;
            next();
          });
        }
      }

      // start loading the first case study:
      next();
    };

    return enram;
  }

})();
