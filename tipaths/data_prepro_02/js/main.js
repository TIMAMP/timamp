/*jshint unused: false, latedef: false */
/*jslint vars: true, plusplus: true, undef: true, continue: true */
/*global requirejs, require */

requirejs.config({
    baseUrl: 'js',
    shim: {
        'proj4': { exports: 'proj4' }
    },
    paths: {
        jquery: 'lib/jquery',
        proj4: 'lib/proj4'
    }
});

require(["jquery", "data", "Map", "util"], function ($, data, Map, util) {
    "use strict";
    
    // Configuration settings that do not change:
    var config = {};
    
    config.from = new Date(2013, 3, 5, 0, 0, 0);
    config.windowDuration = 20;  // the duration of a window in minutes
    config.windowCount = 7 * 24 * 3;  // the number of windows
    config.altitudes = [0.3, 0.5, 0.7, 0.9, 1.1, 1.3, 1.5, 1.7, 1.9, 2.1, 2.3, 2.5, 2.7, 2.9, 3.1, 3.3, 3.5, 3.7, 3.9];
    
    var map,
        canvas,
        r100, r50;
    
    function init() {
        canvas = $("#canvas");
        data.loadRadars(function () {
            map = new Map(700);
            //console.log("- map.width: " + map.width);
            canvas.attr({
                width: map.width,
                height: map.height
            });
            r100 = map.dmxToPxl(100000); // 100 km
            r50 = map.dmxToPxl(50000); // 50 km

            loadFromCartoDB(config.from, config.windowCount, function (rdata) {
                $("body").append(JSON.stringify(rdata, null, 2));
            });
        });
    }
    
    function loadFromCartoDB(from, windowCount, handler) {
        var rdata = {
                startTime: from,
                windowDuration : config.windowDuration,
                windowCount: config.windowCount,
                radars : [],
                altitudes : config.altitudes,
                xPositions : [],
                yPositions : [],
                densities : [],
                avDensities : undefined,
                uSpeeds : [],
                vSpeeds : [],
                speeds : []
            },
            radi, radn = data.radars.length;
        
        for (radi = 0; radi < radn; radi++) {
            rdata.radars.push(data.radars[radi].radar_id);
        }
        rdata.radars.sort();
        initRadarMapData(rdata);
        console.log("Loading from " + from + " for " + rdata.windowCount + " windows of " + rdata.windowDuration + " minutes each.");
        data.loadData_4(from, rdata.windowDuration, rdata.windowCount, 0.3, 3.9, function (json) {
            processData(json, rdata);
            handler(rdata);
        });
    }
    
    /**
     * Helper function of loadFromCartoDB().
     * @param {Object} json  The JSON-object with the loaded data.
     * @param {Object} rdata The data object in which to organise the data.
     */
    function processData(json, rdata) {
        //console.log(JSON.stringify(json));
        var wini, winn = rdata.windowCount,
            alti, altn = rdata.altitudes.length,
            rowi, rown = json.total_rows,
            row,
            radi, radn = rdata.radars.length,
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
            rdata.densities.push(densities);
            rdata.uSpeeds.push(uSpeeds);
            rdata.vSpeeds.push(vSpeeds);
            rdata.speeds.push(speeds);
        }
        
        // Fill the data structure with the given data:
        for (rowi = 0; rowi < rown; rowi++) {
            row = json.rows[rowi];
            wini = row.window_idx;
            alti = ((row.altitude * 10) - 3) / 2;
            radi = rdata.radarIndices[row.radar_id];
            rdata.densities[wini][alti][radi] = row.bird_density;
            rdata.uSpeeds[wini][alti][radi] = row.u_speed;
            rdata.vSpeeds[wini][alti][radi] = row.v_speed;
            rdata.speeds[wini][alti][radi] = row.speed;
        }
        
        // Add average densities per radar-altitude combination:
        rdata.avDensities = [];
        for (alti = 0; alti < altn; alti++) {
            avds = [];
            for (radi = 0; radi < radn; radi++) {
                dsum = 0;
                for (wini = 0; wini < winn; wini++) {
                    dsum += rdata.densities[wini][alti][radi];
                }
                avds[radi] = dsum / winn;
            }
            rdata.avDensities.push(avds);
        }
    }
    
    /**
     * Add mapping from radar_ids to indices in data arrays.
     * @param {Object} rdata The radar-data object.
     */
    function initRadarMapData(rdata) {
        var radi,
            radn = data.radars.length,
            radar,
            ri,
            rp;
        
        rdata.radarIndices = {};
        
        // Create mapping from radar_ids to indices:
        rdata.radarIndices = {};
        for (radi = 0; radi < radn; radi++) {
            rdata.radarIndices[rdata.radars[radi]] = radi;
        }
        
        // Update radar positions:
        for (radi = 0; radi < radn; radi++) {
            radar = data.radars[radi];
            //console.log(radar);
            ri = rdata.radarIndices[radar.radar_id];
            rp = map.locToPxl(radar.coordinates[0], radar.coordinates[1]);
            rdata.xPositions[ri] = rp.x;
            rdata.yPositions[ri] = rp.y;
        }
    }
    
    init();
});
