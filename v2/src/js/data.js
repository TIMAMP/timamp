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

// -----------------------------------------------------------------------------
// Database-based DataService
// -----------------------------------------------------------------------------

function DBDataService() {
  var dataService = {};

  /**
   * Initializes the dataService.
   * @param caseStudy {enram.caseStudy}
   * @param handler {function}
   */
  dataService.initialize = function(caseStudy, handler) {
    var queryTemplateUrl = caseStudy.urlBase + "template.sql";
    dataService.loadQueryTemplate(queryTemplateUrl, handler);
  };

  dataService.loadQueryTemplate = function (url, handler) {
    d3.xhr(url, function (error, XMLHttpRequest) {
      if (error) {
        console.error(error);
        return;
      }

      //console.log(XMLHttpRequest);
      dataService._queryTemplate = XMLHttpRequest.response;
      dataService._queryTemplate = dataService._queryTemplate.replace(/#.*\n/g, '\n');
      dataService._queryTemplate = dataService._queryTemplate.replace(/\n/g, ' ').trim();

      var proceed = true;
      while (proceed) {
        proceed = false;
        dataService._queryTemplate = dataService._queryTemplate.replace(/  /g,
          function (match, key) {
            proceed = true;
            return ' ';
          }
        );
      }

      handler();
    });
  };

  dataService.formatTemplate = function (template, params) {
    return template.replace(/{{(\w+)}}/g, function (match, key) {
      key = key.trim();
      //console.log(match, key, params[key]);
      var val = params[key];
      return typeof val != 'undefined' ? val : match;
    });
  };

  /**
   * Loads the data for the given focus.
   *
   * <p>Loads data for a range of altitudes, over a series of windows, for each
   * radar-window-altitude combination averaging the bird_density, the u_speed and
   * the v_speed. When the data is loaded, the handler function is called with
   * a JSON-object holding the data as sole argument.</p>
   *
   * @param caseStudy {enram.caseStudy}
   * @param focus     {enram.focus}
   * @param handler   {function(dataObject)} called when the data is loaded
   */
  dataService.loadFocusData = function (caseStudy, focus, handler) {
    var data = timamp.dataObject(caseStudy, focus).initStructure();

    // TODO: consider strataSize
    console.log("Loading from " + focus.from + " for " + data.segmentCount +
      " segments of " + data.caseStudy.segmentSize + " minutes each.");
    var sql = this.formatTemplate(this._queryTemplate,
      {
        from: focus.from.toISOString(),
        till: focus.till.toISOString(),
        interval: caseStudy.segmentSize * 60,  // segment size in seconds,
        strataSize: caseStudy.maxAltitude / 1000 / focus.strataCount, // in km
        minAlt: caseStudy.minAltitude / 1000,
        maxAlt: caseStudy.maxAltitude / 1000
      }
    );
    //console.log(sql);

    d3.json(caseStudy.queryBaseUrl + sql, function (error, json) {
      if (error) {
        throw new Error("Error in dataService.loadFocusData. "
          + JSON.parse(error.responseText).error.join("; "));
      }
      else {
        //console.log(JSON.stringify(json));
        dataService._processData(json, data);
        handler(data);
      }
    });
  };

  /**
   * Helper function of loadFromCartoDB().
   * The order of the radars in the radarData object is used the order in
   * which the data is stored in the third dimension of the teh densities,
   * uSpeeds, vSpeeds and speeds matrices in the data object.
   *
   * @param json {jsonObject} The JSON-object with the loaded data.
   * @param data {dataObject} The data object in which to organise the data.
   */
  dataService._processData = function (json, data) {
    //console.log(JSON.stringify(json));
    var rown = json.total_rows;
    var strn = data.focus.strataCount;
    var radn = data.caseStudy.radarCount;
    var segn = data.segmentCount;
    var rowi, row, stri, radi, dsum, avds;

    // Add the data in the data structure:
    for (rowi = 0; rowi < rown; rowi++) {
      row = json.rows[rowi];
      var segi = row.interval_idx;
      stri = row.altitude_idx;
      radi = data.caseStudy.radarIndices[row.radar_id];
      try {
        data.densities[segi][stri][radi] = row.avg_bird_density;
        data.uSpeeds[segi][stri][radi] = row.avg_u_speed;
        data.vSpeeds[segi][stri][radi] = row.avg_v_speed;
        data.speeds[segi][stri][radi] = row.avg_speed;
      }
      catch (error) {
        console.log("rowi:", rowi, ", segi:", segi, ", stri:", stri, ", radi:", radi);
        console.log("data.densities[segi]:", data.densities[segi]);
        console.log("data.densities[segi][stri]:", data.densities[segi][stri]);
        console.log("data.densities[segi][stri][radi]:", data.densities[segi][stri][radi]);
        throw error;
      }
    }

    // The strata height in km:
    var strataHeight = (data.caseStudy.maxAltitude - data.caseStudy.minAltitude)
      / data.focus.strataCount / 1000;

    // Calculate average densities per radar-altitude combination during the
    // complete window, integrated over the strata height. These numbers thus
    // represent the average number of birds per square km in a given strata
    // during the complete window.
    for (stri = 0; stri < strn; stri++) {
      avds = [];
      for (radi = 0; radi < radn; radi++) {
        dsum = 0;
        for (segi = 0; segi < segn; segi++) {
          dsum += data.densities[segi][stri][radi];
        }
        avds[radi] = dsum / segn * strataHeight;
      }
      data.avDensities[stri] = avds;
    }
  };

  return dataService;
}

// -----------------------------------------------------------------------------
// Data Specifics:
// -----------------------------------------------------------------------------

// TODO: no longer used - keep for reference
function legacyDataService(dataService, handler) {

  /**
   * Retrieves some specific characteristics of the data in the
   * bird_migration_altitude_profiles table. When the data is loaded, the given
   * handler is called with an object as sole argument. This object contains the
   * following properties:
   * - max_bird_density: {Number} The row with largest bird_density value in the
   * table.
   * - max_u_speed: {Number} The largest u_speed value in the table.
   * - max_v_speed: {Number} The largest v_speed value in the table.
   * @param {Function} handler The handler.
   */
  dataService.getSpecifics = function (handler) {
  //        var sql = "MAX(bird_density) AS max_density";
  //        sql += ", MAX(u_speed) AS max_u_speed";
  //        sql += ", MAX(v_speed) AS max_v_speed";
  //        sql += " FROM bird_migration_altitude_profiles";

    function sqlSelect(valueId, column, operator) {
      var sql = "SELECT DISTINCT altitude, radar_id, start_time";
      sql += ", end_time, bird_density, u_speed, v_speed";
      sql += ", '" + valueId + "' AS value_id";
      sql += " FROM bird_migration_altitude_profiles";
      sql += " WHERE " + column + " = (SELECT " + operator + "(" + column;
      sql += ") FROM bird_migration_altitude_profiles)";
      return sql;
    }
  //
    var sql = "SELECT DISTINCT altitude, radar_id, start_time, bird_density";
    sql += ", 'bird_density' AS value_id";
    sql += " FROM bird_migration_altitude_profiles";
    sql += " WHERE bird_density = (SELECT MAX(bird_density) FROM bird_migration_altitude_profiles)";

    var sql = "";
    sql += sqlSelect("max_bird_density", "bird_density", "MAX");
    sql += " UNION ";
    sql += sqlSelect("min_start_time", "start_time", "MIN");


    this.cartoDB.loadData(sql, function (json) {
      console.log("json: " + JSON.stringify(json));
      var specifics = {},
        rowi, rown = json.total_rows, row;
      for (rowi = 0; rowi < rown; rowi++) {
        row = json.rows[rowi];
        specifics[row.value_id] = row;
      }
      handler(specifics);
    });
  };

  dataService.printSpecifics_01 = function (handler) {
    var sql = "SELECT DISTINCT altitude, radar_name, start_time, bird_density";
    sql += " FROM bird_migration_altitude_profiles";
    sql += " WHERE bird_density =";
    sql += " (SELECT MAX(bird_density) FROM bird_migration_altitude_profiles)";
    this.cartoDB.loadData(sql, function (json) {
      //console.log("json: " + JSON.stringify(json));
      var row = json.rows[0];
      console.log("specifics: max bird_density: " + row.bird_density
        + ", radar: " + row.radar_name
        + ", altitude: " + row.altitude
        + ", start_time: " + row.start_time);
      //printSpecifics_01b(handler);
    });
  };

  dataService.printSpecifics_01b = function (handler) {
    var sql = "SELECT DISTINCT altitude, radar_name, start_time, u_speed";
    sql += " FROM bird_migration_altitude_profiles";
    sql += " WHERE u_speed =";
    sql += " (SELECT MAX(u_speed) FROM bird_migration_altitude_profiles)";
    this.cartoDB.loadData(sql, function (json) {
      //console.log("json: " + JSON.stringify(json));
      var row = json.rows[0];
      console.log("specifics: max u_speed: " + row.u_speed
        + ", radar: " + row.radar_name
        + ", altitude: " + row.altitude
        + ", start_time: " + row.start_time);
      //printSpecifics_01c(handler);
    });
  };

  dataService.printSpecifics_01c = function (handler) {
    var sql = "SELECT DISTINCT altitude, radar_name, start_time, v_speed";
    sql += " FROM bird_migration_altitude_profiles";
    sql += " WHERE v_speed =";
    sql += " (SELECT MAX(v_speed) FROM bird_migration_altitude_profiles)";
    this.cartoDB.loadData(sql, function (json) {
      //console.log("json: " + JSON.stringify(json));
      var row = json.rows[0];
      console.log("specifics: max v_speed: " + row.v_speed
        + ", radar: " + row.radar_name
        + ", altitude: " + row.altitude
        + ", start_time: " + row.start_time);
  //        printSpecifics_01b(handler);
    });
  };

  dataService.printSpecifics_02 = function (handler) {
    var sql = "SELECT DISTINCT start_time";
    sql += " FROM bird_migration_altitude_profiles";
    sql += " WHERE start_time =";
    sql += " (SELECT MIN(start_time) FROM bird_migration_altitude_profiles)";
    this.cartoDB.loadData(sql, function (json) {
      //console.log("json: " + JSON.stringify(json));
      var row = json.rows[0];
      console.log("specifics: min start_time: " + row.start_time);
      printSpecifics_03(handler);
    });
  };

  dataService.printSpecifics_03 = function (handler) {
    var sql = "SELECT DISTINCT start_time";
    sql += " FROM bird_migration_altitude_profiles";
    sql += " WHERE start_time =";
    sql += " (SELECT MAX(start_time) FROM bird_migration_altitude_profiles)";
    this.cartoDB.loadData(sql, function (json) {
      //console.log("json: " + JSON.stringify(json));
      var row = json.rows[0];
      console.log("specifics: max start_time: " + row.start_time);
      //printSpecifics_03(handler);
      handler();
    });
  };

  dataService.printSpecifics = function(handler) {
    printSpecifics_01(handler);
  //        console.log("- specifics.max_bird_density: " + specifics.max_bird_density);
  //        console.log("- specifics.max_u_speed: " + specifics.max_u_speed);
  //        console.log("- specifics.max_v_speed: " + specifics.max_v_speed);
  };

  // -----------------------------------------------------------------------------
  // Various:
  // -----------------------------------------------------------------------------

  /**
   * Returns the data-index for the given altitude.
   * @param   {[[Type]]} altitude [[Description]]
   * @returns {[[Type]]} [[Description]]
   */
  dataService.altIndex = function (altitude) {
    // 0.3 -> 0
    // 0.5 -> 1
    // 0.7 -> 2
    // 0.9 -> 3
    // 1.1 -> 4
    // 1.3 -> 5
    return ((altitude * 10) - 3) / 2;
  };
}
