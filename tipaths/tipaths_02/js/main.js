/*jshint unused: false, latedef: false */
/*jslint vars: true, plusplus: true, undef: true, continue: true */
/*global requirejs, require */

requirejs.config({
    baseUrl: 'js',
    shim: {
        'proj4': { exports: 'proj4' },
        'kriging': { exports: 'kriging' }
    },
    paths: {
        jquery: 'lib/jquery',
        proj4: 'lib/proj4',
        kriging: 'lib/kriging'
    }
});

require(["jquery", "data", "Map", "util", "interpolation"], function ($, data, Map, util, interpolation) {
    "use strict";
    
    // Configuration settings that do not change:
    var config = {
        loadLocal : false,
        altitudes : [0.3, 0.5, 0.7, 0.9, 1.1, 1.3, 1.5, 1.7, 1.9, 2.1, 2.3, 2.5, 2.7, 2.9, 3.1 , 3.3, 3.5, 3.7, 3.9],
        maxDensity : 3200,
        maxPathCnt : 3200 / 100 * 2,
        altiHueMin : 0.5,
        altiHueMax : 1,
        altiSaturation : 0.8,
        altiBrightness : 0.8
    };
    
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

            $("#input_days").change(redraw);
            $("#input_hours").change(redraw);
            $("#input_minutes").change(redraw);
            $("#input_duration").change(redraw);
            
            redraw();
        });
        drawLegend();
    }
    
    function drawLegend() {
        var alti, altn = config.altitudes.length,
            lac = $(".legend_altiColor"),
            hue;
        
        for (alti = 0; alti < altn; alti++) {
            hue = util.map(alti, 0, altn, config.altiHueMin, config.altiHueMax);
            lac.append("<div class='legend_altiColor_segment'"
                       + " style='background: " + util.hsvToHex(hue, config.altiSaturation, config.altiBrightness) + "'></div>");
        }
    }
    
    function redraw() {
        var days = parseInt($("#input_days").val());
        var daysMin = parseInt($("#input_days").attr("min"));
        var daysMax = parseInt($("#input_days").attr("max"));
        
        var hours = parseInt($("#input_hours").val());
        var hoursMin = parseInt($("#input_hours").attr("min"));
        var hoursMax = parseInt($("#input_hours").attr("max"));
        
        var minutes = parseInt($("#input_minutes").val());
        var minutesStep = parseInt($("#input_minutes").attr("step"));
        
        if (minutes >= 60) {
            if (hours === 23 && days === daysMax) { minutes = 50; }
            else {
                hours++;
                minutes -= 60;
            }
        }
        else if (minutes < 0) {
            if (hours === 0 && days === daysMin) { minutes = 0; }
            else {
                hours--;
                minutes += 60;
            }
        }
        if (hours >= 24) {
            if (days === daysMax) { hours = 23; }
            else {
                days++;
                hours = 0;
            }
        }
        else if (hours < 0) {
            if (days === daysMin) { hours = 0; }
            else {
                days--;
                hours = 23;
            }
        }
        
        $("#input_days").val(days);
        $("#input_hours").val(hours);
        $("#input_minutes").val(minutes);
        
        var pathLen = parseInt($("#input_duration").val()) * 3;
        var from = new Date(2013, 3, days, hours, minutes);
        
        function proceed(rdata) {
            drawMap(canvas, rdata, function() {
                drawPaths(canvas, rdata);
            });
        }
        
        if (config.loadLocal) {
            //loadLocalJSON("../data_prepro/data/enram-data-2013-04-05.json", proceed);
        }
        else {
            loadFromCartoDB(from, pathLen, proceed);
        }
    }
    
    function loadFromCartoDB(from, pathLen, handler) {
        var rdata = {
                startTime: from,
                windowDuration : 20 /* the duration of a window in minutes */,
                pathLen: pathLen,
                deltaStartTime : undefined /* the duration of one step in minutes */ ,
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
        rdata.deltaStartTime = rdata.windowDuration;
        console.log("Loading from " + from + " for one windows of " + rdata.windowDuration + " minutes each.");
        data.loadData_3(from, rdata.windowDuration, 0.3, 3.9, function (json) {
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
        var alti, altn = rdata.altitudes.length,
            rowi, rown = json.total_rows,
            row,
            radi, radn = rdata.radars.length,
            radar,
            densities = [],
            uSpeeds = [],
            vSpeeds = [],
            speeds = [];
        
        for (alti = 0; alti < altn; alti++) {
            densities.push(util.zeroArray(radn));
            uSpeeds.push(util.zeroArray(radn));
            vSpeeds.push(util.zeroArray(radn));
            speeds.push(util.zeroArray(radn));
        }
        rdata.densities = densities;
        rdata.uSpeeds = uSpeeds;
        rdata.vSpeeds = vSpeeds;
        rdata.speeds = speeds;
        
        // Fill the data structure with the given data:
        for (rowi = 0; rowi < rown; rowi++) {
            row = json.rows[rowi];
            alti = ((row.altitude * 10) - 3) / 2;
            radi = rdata.radarIndices[row.radar_id];
            densities[alti][radi] = row.bird_density;
            uSpeeds[alti][radi] = row.u_speed;
            vSpeeds[alti][radi] = row.v_speed;
            speeds[alti][radi] = row.speed;
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
    
    function drawMap(canvas, rdata, handler) {
        var img,
            radi, radn = rdata.radars.length,
            radx, rady,
            ctx = canvas[0].getContext("2d"),
            clr = "120, 146, 164",
            drawFactor = 10;
        
        // Draw the map bitmap:
        img = new Image();
        img.onload = function() {
            ctx.drawImage(img, 0, 0);
            
            // Draw radars and interpolation:
            for (radi = 0; radi < radn; radi++) {
                radx = rdata.xPositions[radi];
                rady = rdata.yPositions[radi];
                
                // Draw radar shapes:
                ctx.strokeStyle = "rgba(" + clr + ", 0.4)";
                
                // radar center:
                ctx.beginPath();
                ctx.fillStyle = "rgb(" + clr + ")";
                ctx.arc(radx, rady, 2, 0, 2 * Math.PI);
                ctx.fill();
            }
            handler();
        }
        img.src = "images/basemap_01.png";
    }
    
    function drawPaths(canvas, rdata) {
        var alti, altn = rdata.altitudes.length,
            radi, radn = rdata.radars.length,
            pathi, pathn,
            pari, parn = rdata.pathLen,
            densities, uSpeeds, vSpeeds,
            hue,
            radx, rady,
            pa = 0, pd, px, py, dx, dy,
            ctx = canvas[0].getContext("2d"),
            xps = rdata.xPositions,
            yps = rdata.yPositions,
            idw = interpolation.idw,
            alpha;
        
        // pixels secs per meter
        var pspm = map.dmxToPxl(1) * rdata.windowDuration * 60;
//        console.log("pspm: " + pspm
//                    + " - map.dmxToPxl(1): " + map.dmxToPxl(1) 
//                    + " - rdata.deltaStartTime: " + rdata.deltaStartTime);
        
        // for each altitude:
        for (alti = 0; alti < altn; alti++) {
            densities = rdata.densities[alti];
            uSpeeds = rdata.uSpeeds[alti];
            vSpeeds = rdata.vSpeeds[alti];
            hue = util.map(alti, 0, altn, config.altiHueMin, config.altiHueMax);
            
            // for each radar:
            for (radi = 0; radi < radn; radi++) {
                radx = rdata.xPositions[radi];
                rady = rdata.yPositions[radi];
                
                // for each path:
                pathn = util.map(densities[radi], 0, config.maxDensity, 0, config.maxPathCnt);
                for (pathi = 0; pathi < pathn; pathi++) {
                    //pa += .2 + Math.random();
                    pa = Math.random() * Math.PI * 2;
                    //pd = Math.random() * r100;
                    pd = util.map(pathi, 0, pathn, 0, r100);
                    px = radx + Math.cos(pa) * pd;
                    py = rady + Math.sin(pa) * pd;
                    
                    for (pari = 0; pari < parn; pari++) {
                        
                        // d[pxl] = speed[m/s] * (duration[s] * conv[pxl/m])
                        dx = idw(px, py, uSpeeds, xps, yps, 2) * pspm;
                        dy = idw(px, py, vSpeeds, xps, yps, 2) * pspm;
                        
                        alpha = util.map(pari, 0, parn - 1, 0.6, 0.9);
                        ctx.strokeStyle = util.hsvaToRgba(hue, config.altiSaturation, config.altiBrightness, alpha);
                        ctx.beginPath();
                        ctx.moveTo(px, py);
                        px += dx;
                        py -= dy;
                        ctx.lineTo(px, py);
                        ctx.stroke();

    //                    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    //                    ctx.beginPath();
    //                    ctx.arc(px, py, 1.5, 0, 2 * Math.PI);
    //                    ctx.fill();
                    }

                    //ctx.fillStyle = "rbga(0, 0, 0, .5)";
                    ctx.fillStyle = util.hsvaToRgba(hue, 0.8, 0.6, 0.5);
                    ctx.beginPath();
                    ctx.arc(px, py, 1.5, 0, 2 * Math.PI);
                    ctx.fill();
                }
            }
        }
    }
    
    init();
});
