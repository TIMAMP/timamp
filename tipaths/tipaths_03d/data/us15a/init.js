/**
 * Created by wouter on 22/09/2015.
 */

var us15a = function () {
  // case study constructor:

  function us15aDataService() {
    var dataService = {};
    var checkData = true;
    var sourceData = null;

    /**
     * Initializes the dataService.
     * @param caseStudy {enram.caseStudy}
     * @param handler {function}
     */
    dataService.initialize = function(caseStudy, handler) {
      d3.json(caseStudy.urlBase + "data.json", function (error, json) {
        //console.log(caseStudy);
        if (error) {
          console.error(error);
          //throw new Error("Error in dataService.loadCaseStudy. "
          //    + JSON.parse(error.responseText).error.join("; "));
          return;
        }

        if (checkData) { dataService.checkData(json); }
        sourceData = json;
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
    dataService.checkData = function (data) {
      var startTime = caseStudy.dataFrom.valueOf();
      var endTime = caseStudy.dataTill.valueOf();
      var dt = endTime - startTime;
      var itervalSec = caseStudy.segmentSize * 60 * 1000;
      var segn = Math.floor(dt / itervalSec);
      var strn = Math.max.apply(null, caseStudy.strataCounts);
      var radn = caseStudy.radarCount;
      var segi, stri;

      function logData() {
        console.error("- segn:" + segn);
        console.error("- data.densities.length:" + data.densities.length);
        console.error("- data.uSpeeds.length:" + data.densities.length);
        console.error("- data.vSpeeds.length:" + data.densities.length);
        console.error("- data.speeds.length:" + data.densities.length);
      }

      if (data.densities.length != segn) {
        logData();
        throw ("data.densities.length != segn");
      }
      if (data.uSpeeds.length != segn) {
        logData();
        throw ("data.uSpeeds.length != segn");
      }
      if (data.vSpeeds.length != segn) {
        logData();
        throw ("data.vSpeeds.length != segn");
      }
      if (data.speeds.length != segn) {
        logData();
        throw ("data.speeds.length != segn");
      }

      for (segi = 0; segi < segn; segi++) {
        if (data.densities[segi].length != strn) {
          throw ("data.densities[segi].length != strn");
        }
        if (data.uSpeeds[segi].length != strn) {
          throw ("data.uSpeeds[segi].length != strn");
        }
        if (data.vSpeeds[segi].length != strn) {
          throw ("data.vSpeeds[segi].length != strn");
        }
        if (data.speeds[segi].length != strn) {
          throw ("data.speeds[segi].length != strn");
        }

        for (stri = 0; stri < strn; stri++) {
          if (data.densities[segi][stri].length != radn) {
            throw ("data.densities[segi][stri].length != radn");
          }
          if (data.uSpeeds[segi][stri].length != radn) {
            throw ("data.uSpeeds[segi][stri].length != radn");
          }
          if (data.vSpeeds[segi][stri].length != radn) {
            throw ("data.vSpeeds[segi][stri].length != radn");
          }
          if (data.speeds[segi][stri].length != radn) {
            throw ("data.speeds[segi][stri].length != radn");
          }
        }
      }
    };

    /**
     * Loads the data for the given focus.
     * @param caseStudy {enram.caseStudy}
     * @param focus     {enram.focus}
     * @param handler   {function(dataObject)} called when the data is loaded
     */
    dataService.loadFocusData = function (caseStudy, focus, handler) {
      //console.log(">> dataService.loadFocusData()");
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
      var strn = focus.strataCount;
      var radn = caseStudy.radarCount;
      var segn = data.densities.length;
      var strataHeight = 1.4; // TODO: calculate this dynamically
      for (stri = 0; stri < strn; stri++) {
        var avds = [];
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
            avds[radi] = 0;
          } else {
            if (sum == 0) {
              console.error("avDensity is zero for stri " + stri + " and radi " + radi);
            }
            avds[radi] = sum / cnt * strataHeight;
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

      handler(data);
    };

    return dataService;
  } // end dataService

  var caseStudy = enram.caseStudy("us15a", us15aDataService());

  caseStudy.getProjection = function (caseStudy, mapWidth, mapHeight) {
    return d3.geo.mercator()
      .scale(caseStudy.mapScaleFactor * mapWidth)
      .translate([mapWidth / 2, mapHeight / 2])
      .center(caseStudy.mapCenter);
  };

  return caseStudy;
}();
