/*jshint undef: false, unused: true, laxbreak: true*/
/*jslint vars: true, plusplus: true*/
/*global define*/

"use strict";

// -----------------------------------------------------------------------------
// Json-based DataService
// -----------------------------------------------------------------------------

function JsonDataService() {
  var dataService = {};
  var checkData = true;
  var sourceData = null;
  var currFocus = null;

  /**
   * Initializes the dataService.
   * @param caseStudy {enram.caseStudy}
   * @param handler {function}
   */
  dataService.initialize = function(caseStudy, handler) {
    handler();
  };

  /**
   * Loads the data for the given focus.
   * @param caseStudy {enram.caseStudy}
   * @param focus     {enram.focus}
   * @param handler   {function(dataObject)} called when the data is loaded
   */
  dataService.loadFocusData = function (caseStudy, focus, handler) {
    //console.log(">> dataService.loadFocusData()");
    if (currFocus == undefined || currFocus.strataOptionIdx != focus.strataOptionIdx) {
      // update source data:
      var dataPath = caseStudy.urlBase + "data-" + focus.strataOptionIdx + ".json";
      d3.json(dataPath, function (error, json) {
        if (error) {
          console.error(error);
          //throw new Error("Error in dataService.loadCaseStudy. "
          //    + JSON.parse(error.responseText).error.join("; "));
          return;
        }

        sourceData = json;
        currFocus = focus;
        dataService._loadFocusData_next(caseStudy, focus, handler);
      });
    }
    else {
      this._loadFocusData_next(caseStudy, focus, handler);
    }
  };

  dataService._loadFocusData_next = function (caseStudy, focus, handler) {
    var data = timamp.dataObject(caseStudy, focus);
    var dt = focus.from.valueOf() - caseStudy.dataFrom.valueOf();
    var segmentSec = caseStudy.segmentSize * 60 * 1000;
    var iFrom = Math.floor(dt / segmentSec);
    // add one in the following to allow for the 2-stage Runge–Kutta interpolation
    var iTill = iFrom + data.segmentCount + 1;
    var iMax = sourceData.densities.length;
    //console.log(iFrom, caseStudy.dataFrom.toDate(), focus.from.toDate());

    // Warn when the focus interval does not intersect the available interval:
    if (iFrom >= iMax) {
      console.error("The focus starts after the available data interval.");
      data.appendMissingSegments(data.segmentCount + 1);
      handler(data);
      return;
    }
    if (iTill < 0) {
      console.error("The focus end before the available data interval.");
      data.appendMissingSegments(data.segmentCount + 1);
      handler(data);
      return;
    }

    // Remember to prepend or append missing data entries:
    var prepend = 0;
    var append = 0;
    if (iFrom < 0) {
      prepend = - iFrom;
      iFrom = 0;
    }
    if (iTill > iMax) {
      append = iTill - iMax;
      iTill = iMax;
    }
    //console.log(iFrom, iTill, iMax, prepend, append);

    // Use slices of the source data as focus data:
    data.densities = sourceData.densities.slice(iFrom, iTill);
    data.uSpeeds = sourceData.uSpeeds.slice(iFrom, iTill);
    data.vSpeeds = sourceData.vSpeeds.slice(iFrom, iTill);
    data.speeds = sourceData.speeds.slice(iFrom, iTill);

    // Calculate average densities per radar-altitude combination, integrated
    // over the strata height. These numbers thus represent the number of birds
    // per square km in a given strata. The average density is calculated over
    // the segments for which a (partial) path is shown, i.e. for which speed
    // and density > 0.
    var strn = data.strataCount;
    var radn = caseStudy.radarCount;
    var segn = data.densities.length;
    var stri, radi, segi;
    for (stri = 0; stri < strn; stri++) {
      var avds = [];
      var strataSize = data.strataSize(stri);
      for (radi = 0; radi < radn; radi++) {
        var cnt = 0;
        var sum = 0;
        for (segi = 0; segi < segn; segi++) {
          var den = data.densities[segi][stri][radi];
          if (den > 0 && data.speeds[segi][stri][radi] > 0) {
            cnt++;
            sum += den
          }
        }
        if (cnt == 0) {
          avds.push(0);
        } else {
          if (sum == 0) {
            console.error("avDensity is zero for stri " + stri + " and radi " + radi);
          }
          avds.push(sum / cnt * strataSize);
        }
      }
      data.avDensities.push(avds);
    }

    // Prepend or append missing data:
    if (prepend > 0) { data.prependMissingSegments(prepend); }
    if (append > 0) { data.appendMissingSegments(append); }

    if (data.densities.length != data.segmentCount + 1) {
      throw new Error("The data object does not have the proper amount of " +
        "entries. [data.densities.length: " + data.densities.length +
        ", data.segmentCount + 1: " + (data.segmentCount + 1) + "]");
    }

    if (checkData) {
      this._checkData(data);
    }

    handler(data);
  };

  /** Check if the given data is OK:
   * - densities: data matrix with dimensions: [segments, strata, radars].
   * - uSpeeds: data matrix with dimensions: [segments, strata, radars].
   * - vSpeeds: data matrix with dimensions: [segments, strata, radars].
   * - speeds: data matrix with dimensions: [segments, strata, radars].
   * - avDensities: data matrix with dimensions: [strata, radars].
   */
  dataService._checkData = function (data) {
    var segn = data.segmentCount + 1; // add one to allow two-phase integration
    var strn = data.strataCount;
    var radn = data.caseStudy.radarCount;
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

    if (data.avDensities.length != strn) {
      throw ("data.avDensities.length (" + data.avDensities.length +
        ") != strn (" + strn + ")");
    }
    for (stri = 0; stri < strn; stri++) {
      if (data.avDensities[stri].length != radn) {
        throw ("data.avDensities[stri].length (" +
          data.avDensities[stri].length + ") != radn (" + radn + ")");
      }
    }
  };

  return dataService;
} // end dataService
