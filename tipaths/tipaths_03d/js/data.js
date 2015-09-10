/*jshint undef: false, unused: true, laxbreak: true*/
/*jslint vars: true, plusplus: true*/
/*global define*/

"use strict";

// Root dataService object.
var dataService = {};

// -----------------------------------------------------------------------------
// Radars:

/**
 * Retrieve the radars dataset and return an object that holds the data. The
 * given handler is called when this assynchronous operation is complete. An
 * array with objects that contain the radars data is passed to this handler.
 * There is one object for each radar in this array. Each object has the
 * following format: {
 *   "radar_id": {Number},
 *   "name": {String},
 *   "country": {String},
 *   "type": {String},
 *   "coordinates": [ {Number}, {Number} ]
 * } 
 * The coordinates are the longitude and latitude.
 * @param   {Function} completeHandler This handler is called when this
 *                                     assynchronous operation is complete.
 */
dataService.loadRadarsJSON = function (completeHandler) {
    $.getJSON("data/radars.geojson", function (json) {
        var radars = [], radar;
        $.each(json.features, function (i, feature) {
            radar = feature.properties;
            radar.coordinates = feature.geometry.coordinates;
            radars.push(radar);
        });
        dataService._sortRadars(radars);
        completeHandler(radars);
    });
};

/**
 * Retrieve the radars dataset and return an object that holds the data. The
 * given handler is called when this assynchronous operation is complete.
 * 
 * Warning: This function is not fully implemented. Use {@link loadRadarsJSON}
 * instead.
 * 
 * @param {Function} completeHandler - This handler is called when this
 *                                   assynchronous operation is complete.
 */
dataService.loadRadarsCartoDB = function (completeHandler) {
    var sql = "SELECT * FROM radars";
    $.getJSON(dataService.cartodbUrl(sql), function (json) {
        var radars = [];
        $.each(json.rows, function (i, row) {
            // TODO:
        });
        dataService._sortRadars(radars);
        completeHandler(radars);
    });
};

dataService._sortRadars = function (radars) {
    radars.sort(function (r1, r2) {
        // TODO: this code assumes that all ids are either number or string
        if ($.isNumeric(r1.radar_id)) return r1.radar_id - r2.radar_id;
        else return r1.radar_id.localeCompare(r2.radar_id);
    });
};

// -----------------------------------------------------------------------------

dataService._queryTemplate;

dataService.loadQueryTemplate = function (handler) {
    d3.xhr("data/data_5.sql", function (error, XMLHttpRequest) {
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
                function(match, key) {
                    proceed = true;
                    return ' ';
                }
            );
        }

        handler();
    });
};

dataService.formatTemplate = function (template, params) {
    return template.replace(/{{(\w+)}}/g, function(match, key) {
        key = key.trim();
        //console.log(match, key, params[key]);
        var val = params[key];
        return typeof val != 'undefined' ? val : match;
    });
}

/**
 * Loads data for a range of altitudes, over a series of windows, for each
 * radar-window-altitude combination averaging the bird_density, the u_speed and
 * the v_speed. When the data is loaded, the handler function is called with
 * a JSON-object holding the data as sole argument.
 *
 * The given data object must have the following properties:
 * - startTime: The start time of the series of windows
 * - windowDuration: The duration of a window in minutes.
 * - windowCount: The number of windows
 * - altitudes: The ordered list of altitudes to include.
 *
 * @param {Object}   data      The data object.
 * @param {Object}   radarData The radar-data object.
 * @param {function(Object)} handler   The handler function.
 */
dataService.loadData = function (data, radarData, handler) {
    var from = data.startTime;
    var till = new Date(from.getTime() + data.windowDuration * 60000 *
                        data.windowCount);
    var fromStr = dataService.cartoDB.toString(from);
    var tillStr = dataService.cartoDB.toString(till);

    var sql = dataService.formatTemplate(dataService._queryTemplate,
        {
            from: fromStr,
            till: tillStr,
            winDur: data.windowDuration * 60,
            minAlt: data.altitudes[0],
            maxAlt: data.altitudes[data.altitudes.length - 1]
        }
    );
    //console.log(sql);

    dataService.cartoDB.loadData(sql, function (json) {
        //console.log(JSON.stringify(json));
        dataService._processData(json, data, radarData);
        handler(data);
    });
};

/**
 * Helper function of loadFromCartoDB().
 * The order of the radars in the radarData object is used the order in
 * which the data is stored in the third dimension of the teh densities,
 * uSpeeds, vSpeeds and speeds matrices in the data object.
 *
 * @param {Object} json      The JSON-object with the loaded data.
 * @param {Object} data      The data object in which to organise the data.
 * @param {Object} radarData The radar-data object.
 */
dataService._processData = function (json, data, radarData) {
    //console.log(JSON.stringify(json));
    var wini, winn = data.windowCount,
        alti, altn = data.altitudes.length,
        rowi, rown = json.total_rows,
        row,
        radi, radn = radarData.count,
        densities,
        uSpeeds,
        vSpeeds,
        speeds,
        dsum, avds;

    // Prepare the data structure:
    for (wini = 0; wini < winn; wini++) {
        densities = [];
        uSpeeds = [];
        vSpeeds = [];
        speeds = [];
        for (alti = 0; alti < altn; alti++) {
            densities.push(util.zeroArray(radn));
            uSpeeds.push(util.zeroArray(radn));
            vSpeeds.push(util.zeroArray(radn));
            speeds.push(util.zeroArray(radn));
        }
        data.densities.push(densities);
        data.uSpeeds.push(uSpeeds);
        data.vSpeeds.push(vSpeeds);
        data.speeds.push(speeds);
    }

    // Fill the data structure with the given data:
    for (rowi = 0; rowi < rown; rowi++) {
        row = json.rows[rowi];
        wini = row.interval_idx;
        alti = ((row.altitude * 10) - 3) / 2;
        radi = radarData.radarIndices[row.radar_id];
        data.densities[wini][alti][radi] = row.avg_bird_density;
        data.uSpeeds[wini][alti][radi] = row.avg_u_speed;
        data.vSpeeds[wini][alti][radi] = row.avg_v_speed;
        data.speeds[wini][alti][radi] = row.avg_speed;
    }

    // Add average densities per radar-altitude combination:
    data.avDensities = [];
    for (alti = 0; alti < altn; alti++) {
        avds = [];
        for (radi = 0; radi < radn; radi++) {
            dsum = 0;
            for (wini = 0; wini < winn; wini++) {
                dsum += data.densities[wini][alti][radi];
            }
            avds[radi] = dsum / winn;
        }
        data.avDensities.push(avds);
    }
}

// -----------------------------------------------------------------------------
// Data Specifics:
// -----------------------------------------------------------------------------

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


    dataService.cartoDB.loadData(sql, function (json) {
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
    dataService.cartoDB.loadData(sql, function (json) {
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
    dataService.cartoDB.loadData(sql, function (json) {
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
    dataService.cartoDB.loadData(sql, function (json) {
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
    dataService.cartoDB.loadData(sql, function (json) {
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
    dataService.cartoDB.loadData(sql, function (json) {
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

// An array with a continuous set of altitudes for which all radars provide data
// in the bird_migration_altitude_profiles dataset.
dataService.altitudes = [];
var i, j;
for (i = 0.3; i <= 3.9; i += 0.2) {
    dataService.altitudes.push(i);
}
dataService.altitudeStrings = [];
for (i = 0; i <= 3; i++) {
    for (j = 1; j <= 9; j += 2) {
        if (i === 0 && j === 1) { continue; }
        dataService.altitudeStrings.push(i + "." + j);
    }
}

// -----------------------------------------------------------------------------
// dataService.cartoDB

dataService.cartoDB = {};

/**
 * Load data from the CartoDB server.
 * @param {String}   sql     The SQL to execute on the CartoDB server.
 * @param {Function} handler A handler function with one parameter, the json
 *                           object received from the server.
 */
dataService.cartoDB.loadData = function (sql, handler) {
    d3.json("http://lifewatch.cartodb.com/api/v2/sql?q=" + sql,
        function (error, json) {
            if (error) {
                throw new Error("Error in dataService.cartoDB.loadData. "
                    + JSON.parse(error.responseText).error.join("; "));
            }
            else {
                handler(json);
            }
        }
    );
};

/**
 * Return the given date as a string in the format used in CartoDB.
 * @param   {Date}   date The date to format.
 * @returns {String} The formatted date.
 */
dataService.cartoDB.toString = function (date) {
    function pad(number) {
        var r = String(number);
        if (r.length === 1) {
            r = '0' + r;
        }
        return r;
    }
    return date.getFullYear()
        + '-' + pad(date.getMonth() + 1)
        + '-' + pad(date.getDate())
        + 'T' + pad(date.getHours())
        + ':' + pad(date.getMinutes())
        + ':' + pad(date.getSeconds())
        + 'Z';
};

// -----------------------------------------------------------------------------
