/*jshint undef: false, unused: true, laxbreak: true*/
/*jslint vars: true, plusplus: true*/
/*global define*/

define(["jquery", "proj4"], function ($, proj4) {
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
     * Loads window data for one altitude.
     * @param {Date}     from     From datetime.
     * @param {Date}     till     Till datetime.
     * @param {Number}   altitude At altitude (.3, .5, .7, ..., 3.9)§
     * @param {Function} handler  A handler function that takes a JSON object as
     *                            sole argument.
     */
    data.loadData_1 = function (from, till, altitude, handler) {
        var sql = "SELECT radar_name";
        sql += ", AVG(bird_density) as bird_density";
        sql += ", AVG(u_speed) as u_speed";
        sql += ", AVG(v_speed) as v_speed";
        sql += ", AVG(ground_speed) as ground_speed";
        sql += " FROM bird_migration_altitude_profiles";
        sql += " WHERE altitude = '" + altitude + "'";
        sql += " AND bird_density > 0";
        sql += " AND start_time >= '" + data.cartoDB.toString(from) + "'";
        sql += " AND start_time < '" + data.cartoDB.toString(till) + "'";
        sql += " GROUP BY radar_name";
        //debug(sql);
        data.cartoDB.loadData(sql, handler);
    }
    
    /**
     * Loads window data for one altitude.
     * @param {Date}     from    From datetime.
     * @param {Date}     till    Till datetime.
     * @param {Number}   altMin  The minimum altitude.
     * @param {Number}   altMax  The maximum altitude.
     * @param {Function} handler A handler function that takes a JSON object as
     *                           sole argument.
     */
    data.loadData_2 = function (from, till, altMin, altMax, handler) {
        var sql = "SELECT radar_name";
        sql += ", AVG(bird_density) as bird_density";
        sql += ", AVG(u_speed) as u_speed";
        sql += ", AVG(v_speed) as v_speed";
        sql += ", AVG(ground_speed) as ground_speed";
        sql += " FROM bird_migration_altitude_profiles";
        sql += " WHERE altitude >= '" + altMin + "'";
        sql += " AND altitude <= '" + altMax + "'";
        sql += " AND bird_density > 0";
        sql += " AND start_time >= '" + data.cartoDB.toString(from) + "'";
        sql += " AND start_time < '" + data.cartoDB.toString(till) + "'";
        sql += " GROUP BY radar_name";
        //debug(sql);
        data.cartoDB.loadData(sql, handler);
    }
    
    // -----------------------------------------------------------------------------
    // Various:

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
