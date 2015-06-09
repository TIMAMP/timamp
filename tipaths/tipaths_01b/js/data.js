/*jshint undef: false, unused: true, laxbreak: true*/
/*jslint vars: true, plusplus: true*/
/*global define*/

define(["jquery"], function ($) {
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
     * Loads data for four altitude-ranges, over a series of windows, for each
     * radar-window-altitude combination averaging the bird_density, the u_speed and
     * the v_speed. When the data is loaded, the handler function is called with
     * a JSON-object holding the data as sole argument.
     * @param {Date}     from        The start time of the series of windows
     * @param {Number}   winDuration The duration of a window in minutes.
     * @param {Number}   winCount    The number of windows
     * @param {Number}   altMin      The minimal altitude of the range.
     * @param {Number}   altMax      The maximal altitude of the range.
     * @param {Function} handler     The handler function.
     */
    data.loadData_1 = function (from, winDuration, winCount, altMin, altMax, handler) {
        var till = new Date(from.getTime() + winDuration * 60000 * winCount),
            fromStr = data.cartoDB.toString(from),
            tillStr = data.cartoDB.toString(till);
        //console.log("winDuration: " + winDuration + " - winCount: " + winCount);
        //console.log("from: " + from + " - till: " + till);
        var sql = "SELECT";
        sql += " DIV(CAST(EXTRACT(EPOCH FROM start_time) - EXTRACT(EPOCH FROM TIMESTAMP '" + fromStr + "') AS NUMERIC), " + (winDuration * 60) + ") AS window_idx";
        sql += ", FLOOR(altitude) AS altitude_idx";
        sql += ", radar_id";
        sql += ", AVG(bird_density) AS bird_density";
        sql += ", AVG(u_speed) AS u_speed";
        sql += ", AVG(v_speed) AS v_speed";
        // In the following line, a plus-sign is written in its url-encoded form
        // %2B, because this plus-sign does not seem to be encoded by the AJAX-
        // functionality:
        sql += ", SQRT(POWER(AVG(u_speed), 2) %2B POWER(AVG(v_speed), 2)) AS speed";
        sql += " FROM bird_migration_altitude_profiles";
        sql += " WHERE altitude >= '" + altMin + "'";
        sql += " AND altitude <= '" + altMax + "'";
        sql += " AND radial_velocity_std >= 2";
        sql += " AND start_time >= '" + fromStr + "'";
        sql += " AND start_time < '" + tillStr + "'";
        sql += " GROUP BY window_idx, altitude_idx, radar_id";
        sql += " ORDER BY window_idx, altitude_idx, radar_id";
        data.cartoDB.loadData(sql, handler);
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
