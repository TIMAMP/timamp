/*jshint undef: false, unused: true, laxbreak: true*/
/*jslint vars: true, plusplus: true*/
/*global define*/

define(["jquery", "util"], function ($, util) {
    "use strict";
    
    // Root data object.
    var data = {};
    
    // -----------------------------------------------------------------------------
    // Radars:

    /**
     * Load the radars data.
     * @param {Function} completeHandler - This handler is called when this
     *                                   assynchronous operation is complete.
     */
    data.loadRadars = function (completeHandler) {
        this.loadRadarsJSON(function (radars) {
            data.radars = radars;
            completeHandler();
        });
    };

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
    data.loadRadarsJSON = function (completeHandler) {
        $.getJSON("data/radars.geojson", function (json) {
            var radars = [], radar;
            $.each(json.features, function (i, feature) {
                radar = feature.properties;
                radar.coordinates = feature.geometry.coordinates;
                radars.push(radar);
            });
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
    data.loadRadarsCartoDB = function (completeHandler) {
        var sql = "SELECT * FROM radars";
        $.getJSON(data.cartodbUrl(sql), function (json) {
            var radars = [];
            $.each(json.rows, function (i, row) {
                // TODO:
            });
            completeHandler(radars);
        });
    };

    /**
     * Calls the handler once for each radar, passing the radar as argument. Note
     * that data.loadRadars() needs to be called before calling this function.
     * @param {Function} handler A function with one parameter: the radar object
     *                           as composed in data.loadRadarsJSON().
     */
    data.forEachRadar = function (handler) {
        $.each(data.radars, function (i, radar) {
            handler(radar);
        });
    };
    
    // -----------------------------------------------------------------------------
    
    /**
     * Loads data for a range of altitudes, over a series of windows, for each
     * radar-window-altitude combination averaging the bird_density, the u_speed and
     * the v_speed. When the data is loaded, the handler function is called with
     * a JSON-object holding the data as sole argument.
     * The given data object must have the following properties:
     * - startTime: The start time of the series of windows
     * - windowDuration: The duration of a window in minutes.
     * - windowCount: The number of windows
     * - altitudes: The ordered list of altitudes to include.
     * @param {Number}   dob     The data object.
     * @param {Function} handler The handler function.
     */
    data.loadData_4 = function (dob, handler) {
        var from = dob.startTime;
        var till = new Date(from.getTime() + dob.windowDuration * 60000 *
                            dob.windowCount);
        var fromStr = data.cartoDB.toString(from);
        var tillStr = data.cartoDB.toString(till);
        //console.log("dob.winDuration: " + dob.winDuration);
        //console.log("dob.winCount: " + dob.winCount);
        //console.log("from: " + from + " - till: " + till);
        var sql = "SELECT";
        sql += " DIV(CAST(EXTRACT(EPOCH FROM start_time) - EXTRACT(EPOCH FROM TIMESTAMP '" + fromStr + "') AS NUMERIC), " + (dob.windowDuration * 60) + ") AS window_idx";
        sql += ", altitude, radar_id";
        sql += ", AVG(bird_density) AS bird_density";
        sql += ", AVG(u_speed) AS u_speed";
        sql += ", AVG(v_speed) AS v_speed";
        // In the following line, a plus-sign is written in its url-encoded form
        // %2B, because this plus-sign does not seem to be encoded by the AJAX-
        // functionality:
        sql += ", SQRT(POWER(AVG(u_speed), 2) %2B POWER(AVG(v_speed), 2)) AS speed";
        sql += " FROM bird_migration_altitude_profiles";
        sql += " WHERE altitude >= " + dob.altitudes[0];
        sql += " AND altitude <= " + dob.altitudes[dob.altitudes.length - 1];
        sql += " AND radial_velocity_std >= 2";
        sql += " AND start_time >= '" + fromStr + "'";
        sql += " AND start_time < '" + tillStr + "'";
        sql += " GROUP BY window_idx, altitude, radar_id";
        sql += " ORDER BY window_idx, altitude, radar_id";
        //console.log(sql);
        data.cartoDB.loadData(sql, function (json) {
            processData(json, dob);
            handler(dob);
        });
    };
    
    /**
     * Helper function of loadFromCartoDB().
     * @param {Object} json The JSON-object with the loaded data.
     * @param {Object} dob The data object in which to organise the data.
     */
    function processData(json, dob) {
        //console.log(JSON.stringify(json));
        var wini, winn = dob.windowCount,
            alti, altn = dob.altitudes.length,
            rowi, rown = json.total_rows,
            row,
            radi, radn = dob.radars.length,
            radar,
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
            dob.densities.push(densities);
            dob.uSpeeds.push(uSpeeds);
            dob.vSpeeds.push(vSpeeds);
            dob.speeds.push(speeds);
        }
        
        // Fill the data structure with the given data:
        for (rowi = 0; rowi < rown; rowi++) {
            row = json.rows[rowi];
            wini = row.window_idx;
            alti = ((row.altitude * 10) - 3) / 2;
            radi = dob.radarIndices[row.radar_id];
            dob.densities[wini][alti][radi] = row.bird_density;
            dob.uSpeeds[wini][alti][radi] = row.u_speed;
            dob.vSpeeds[wini][alti][radi] = row.v_speed;
            dob.speeds[wini][alti][radi] = row.speed;
        }
        
        // Add average densities per radar-altitude combination:
        dob.avDensities = [];
        for (alti = 0; alti < altn; alti++) {
            avds = [];
            for (radi = 0; radi < radn; radi++) {
                dsum = 0;
                for (wini = 0; wini < winn; wini++) {
                    dsum += dob.densities[wini][alti][radi];
                }
                avds[radi] = dsum / winn;
            }
            dob.avDensities.push(avds);
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
    data.getSpecifics = function (handler) {
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
        
        
        data.cartoDB.loadData(sql, function (json) {
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
    
    function printSpecifics_01(handler) {
        var sql = "SELECT DISTINCT altitude, radar_name, start_time, bird_density";
        sql += " FROM bird_migration_altitude_profiles";
        sql += " WHERE bird_density =";
        sql += " (SELECT MAX(bird_density) FROM bird_migration_altitude_profiles)";
        data.cartoDB.loadData(sql, function (json) {
            //console.log("json: " + JSON.stringify(json));
            var row = json.rows[0];
            console.log("specifics: max bird_density: " + row.bird_density
                        + ", radar: " + row.radar_name
                        + ", altitude: " + row.altitude
                        + ", start_time: " + row.start_time);
            printSpecifics_02(handler);
        });
    }
    
    function printSpecifics_02(handler) {
        var sql = "SELECT DISTINCT start_time";
        sql += " FROM bird_migration_altitude_profiles";
        sql += " WHERE start_time =";
        sql += " (SELECT MIN(start_time) FROM bird_migration_altitude_profiles)";
        data.cartoDB.loadData(sql, function (json) {
            //console.log("json: " + JSON.stringify(json));
            var row = json.rows[0];
            console.log("specifics: min start_time: " + row.start_time);
            printSpecifics_03(handler);
        });
    }
    
    function printSpecifics_03(handler) {
        var sql = "SELECT DISTINCT start_time";
        sql += " FROM bird_migration_altitude_profiles";
        sql += " WHERE start_time =";
        sql += " (SELECT MAX(start_time) FROM bird_migration_altitude_profiles)";
        data.cartoDB.loadData(sql, function (json) {
            //console.log("json: " + JSON.stringify(json));
            var row = json.rows[0];
            console.log("specifics: max start_time: " + row.start_time);
            //printSpecifics_03(handler);
            handler();
        });
    };
    
    data.printSpecifics = function(handler) {
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
    data.altIndex = function (altitude) {
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
    data.altitudes = [];
    var i, j;
    for (i = 0.3; i <= 3.9; i += 0.2) {
        data.altitudes.push(i);
    }
    data.altitudeStrings = [];
    for (i = 0; i <= 3; i++) {
        for (j = 1; j <= 9; j += 2) {
            if (i === 0 && j === 1) { continue; }
            data.altitudeStrings.push(i + "." + j);
        }
    }
    
    // -----------------------------------------------------------------------------
    // data.cartoDB
    
    data.cartoDB = {};
    
    /**
     * Load data from the CartoDB server.
     * The 'Bird migration altitude profiles' data is contained in the XXX table.
     * - start_time: {String} A string that can be passed to the Date constructor.
     * - end_time: {String} A string that can be passed to the Date constructor.
     * - radar_name: {String}
     * - radar_id: {String}
     * - altitude: {Number} in km
     * - bird_density: {Numnber} In birds/km3. Is set to 0 when the
     *   radial_velocity_std is below 2.0.
     * - w_speed: {Number} vertical speed
     * - u_speed: {Number} Horizontal speed towards East.
     * - v_speed: {Number} Horizontal speed towards North.
     * - ground_speed: {Number} Horizontal speed at ground level.
     * - direction: {Number} Horizontal direction at ground level.
     * - radial_velocity_std: {Number}
     * @param {String}   sql     The SQL to execute on the CartoDB server.
     * @param {Function} handler A handler function with one parameter, the json
     *                           object received from the server.
     */
    data.cartoDB.loadData = function (sql, handler) {
        $.getJSON("http://lifewatch.cartodb.com/api/v2/sql?q=" + sql, handler);
    };

    /**
     * Return the given date as a string in the format used in CartoDB.
     * @param   {Date}   date The data to format.
     * @returns {String} The formatted date.
     */
    data.cartoDB.toString = function (date) {
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
    
    return data;
    
});
