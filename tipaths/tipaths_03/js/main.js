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

require(["jquery", "data", "Map", "util", "interpolation"],
        function ($, data, Map, util, interpolation)
{
    "use strict";
    
    // Configuration settings that do not change:
    var altitudes = [0.3, 0.5, 0.7, 0.9, 1.1, 1.3, 1.5, 1.7, 1.9, 2.1, 2.3, 2.5, 2.7, 2.9, 3.1, 3.3, 3.5, 3.7, 3.9];
    var maxDensity = 288;
    
    var altiHueMin = 0.5;
    var altiHueMax = 1;
    var altiSaturation = 0.8;
    var altiBrightness = 0.8;
    var maxPathCnt = 20;
    var mapImg;     // the basemap image
    var map;
    var canvas;
    var r100, r50;
    
    function init() {
        canvas = $("#canvas");
        
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
        
        // Load the map image:
        mapImg = new Image();
        mapImg.onload = function() {
            data.loadRadars(redraw);
        }
        mapImg.src = "../images/basemap_01.png";
        
        drawLegend();
        
        //data.printSpecifics(drawLegend);
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
        
        var windowCount = parseInt($("#input_duration").val()) * 3;
        var from = new Date(2013, 3, days, hours, minutes);
        var ctx = canvas[0].getContext("2d");
        
        loadFromCartoDB(from, windowCount, function (dob) {
            drawMap(dob, ctx);
            drawPaths(dob, ctx);
            console.log("Done");
        });
    }
    
    // -----------------------------------------------------------------------------
    
    function loadFromCartoDB(from, windowCount, handler) {
        var dob = {
                startTime: from,
                windowDuration : 20 /* the duration of a window in minutes */,
                windowCount: windowCount,
                radars : [],
                altitudes : altitudes,
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
            dob.radars.push(data.radars[radi].radar_id);
        }
        dob.radars.sort();
        initRadarMapData(dob);
        
        console.log("Loading from " + from + " for " + dob.windowCount +
                    " windows of " + dob.windowDuration + " minutes each.");
        data.loadData_4(dob, handler);
    }
    
    // -----------------------------------------------------------------------------
    
    /**
     * Add mapping from radar_ids to indices in data arrays.
     * @param {Object} dob The radar-data object.
     */
    function initRadarMapData(dob) {
        var radi,
            radn = data.radars.length,
            radar,
            ri,
            rp;
        
        dob.radarIndices = {};
        
        // Create mapping from radar_ids to indices:
        dob.radarIndices = {};
        for (radi = 0; radi < radn; radi++) {
            dob.radarIndices[dob.radars[radi]] = radi;
        }
        
        // Update radar positions:
        for (radi = 0; radi < radn; radi++) {
            radar = data.radars[radi];
            //console.log(radar);
            ri = dob.radarIndices[radar.radar_id];
            rp = map.locToPxl(radar.coordinates[0], radar.coordinates[1]);
            dob.xPositions[ri] = rp.x;
            dob.yPositions[ri] = rp.y;
        }
    }
    
    // -----------------------------------------------------------------------------
    
    /**
     * Draw the map.
     * @param {Object} dob The object that contains the data.
     * @param {Object} ctx   CanvasRenderingContext2D
     */
    function drawMap(dob, ctx) {
        var radi, radn = dob.radars.length,
            radx, rady,
            clr = "120, 146, 164";
        
        // Draw the map bitmap:
        ctx.drawImage(mapImg, 0, 0);
        
        // Draw radars and interpolation:
        for (radi = 0; radi < radn; radi++) {
            radx = dob.xPositions[radi];
            rady = dob.yPositions[radi];
            
            // Draw radar shapes:
            ctx.strokeStyle = "rgba(" + clr + ", 0.4)";
            
            // radar center:
            ctx.beginPath();
            ctx.fillStyle = "rgb(" + clr + ")";
            ctx.arc(radx, rady, 2, 0, 2 * Math.PI);
            ctx.fill();
        }
    }
    
    // -----------------------------------------------------------------------------
    
    /**
     * Draw the paths.
     * @param {Object} dob The data object.
     * @param {Object} ctx CanvasRenderingContext2D
     */
    function drawPaths(dob, ctx) {
        //console.log(">> drawPaths - wind: " + wind);
        var wini, winn, wind = dob.windowCount,
            alti, altn = dob.altitudes.length,
            radi, radn = dob.radars.length,
            pathi, pathn,
            densities, uSpeeds, vSpeeds,
            hue,
            radx, rady,
            pa = 0, pd, px, py, px0, py0, dx, dy,
            xps = dob.xPositions,
            yps = dob.yPositions,
            idw = interpolation.idw,
            asat = altiSaturation,
            abri = altiBrightness,
            alpha;
        
        // pixels secs per meter, als volgt te gebruiken:
        // d[pxl] = speed[m/s] * (duration[s] * conv[pxl/m])
        var pspm = map.dmxToPxl(1) * dob.windowDuration * 60;
        
        // the volume of the context in km3, i.e. area of circle with 100km
        // radius by 200m:
        var contextVolume = Math.PI * 100 * 100 / 5;
        
        var half = Math.ceil(wind / 2);
        
        ctx.lineWidth = 1.5;
        
        // for each altitude:
        for (alti = 0; alti < altn; alti++) {
            densities = dob.avDensities[alti];
            hue = util.map(alti, 0, altn, altiHueMin, altiHueMax);
            
            // for each radar:
            for (radi = 0; radi < radn; radi++) {
                radx = dob.xPositions[radi];
                rady = dob.yPositions[radi];
                
                // for each path:
                pathn = util.map(densities[radi], 0, maxDensity, 0, maxPathCnt);
                for (pathi = 0; pathi < pathn; pathi++) {
                    pa = Math.random() * Math.PI * 2;
                    //pd = util.map(pathi, 0, pathn, 2, r100);
                    pd = Math.random() * r100;
                    px0 = px = radx + Math.cos(pa) * pd;
                    py0 = py = rady + Math.sin(pa) * pd;
                    
                    for (wini = half - 1; wini >= 0; wini--) {
                        //console.log("wini: " + wini + " - alti: " + alti);
                        if (dob.uSpeeds[wini] === undefined) { // DEBUG
                            console.error("dob.uSpeeds[wini] is undefined for"
                                          + " wini: " + wini + ", alti: " + alti);
                        }
                        uSpeeds = dob.uSpeeds[wini][alti];
                        vSpeeds = dob.vSpeeds[wini][alti];
                        dx = idw(px, py, uSpeeds, xps, yps, 2) * pspm;
                        dy = idw(px, py, vSpeeds, xps, yps, 2) * pspm;
                        
                        alpha = util.map(wini, half - 1, 0, 0.9, 0.3);
                        ctx.strokeStyle = util.hsvaToRgba(hue, asat, abri, alpha);
                        ctx.beginPath();
                        ctx.moveTo(px, py);
                        if (isNaN(px) || isNaN(dx)) {
                            console.log("wini: " + wini);
                            console.log("alti: " + alti);
                            console.log("pathi: " + pathi);
                            console.log("px: " + px);
                            console.log("py: " + py);
                            console.log("dx: " + dx);
                            console.log("dy: " + dx);
                            console.log("uSpeeds: " + uSpeeds);
                            console.log("xps: " + xps);
                            console.log("yps: " + yps);
                            console.log("pspm: " + pspm);
                            console.log("half: " + half);
                            console.log("pspm: " + pspm);
                            console.log("px0: " + px0 + ", pa: " + pa + ", pd: " + pd);
                            console.log("radx: " + radx + ", rady: " + rady);
//                            console.log("idw(px, py, uSpeeds, xps, yps, 2): " + idw(px, py, uSpeeds, xps, yps, 2));
                            return;
                        }
                        px -= dx;
                        py += dy;
                        ctx.lineTo(px, py);
                        ctx.stroke();
                    }
                    px = px0;
                    py = py0;
                    for (wini = half; wini < wind; wini++) {
                        //console.log("wini: " + wini + " - alti: " + alti);
                        if (dob.uSpeeds[wini] === undefined) { // DEBUG
                            console.error("dob.uSpeeds[wini] is undefined for"
                                          + " wini: " + wini + ", alti: " + alti);
                        }
                        uSpeeds = dob.uSpeeds[wini][alti];
                        vSpeeds = dob.vSpeeds[wini][alti];
                        dx = idw(px, py, uSpeeds, xps, yps, 2) * pspm;
                        dy = idw(px, py, vSpeeds, xps, yps, 2) * pspm;
//                        alpha = util.map(wini, 0, winn - 1, 0.6, 0.9);
                        ctx.strokeStyle = util.hsvaToRgba(hue, asat, abri, .9);
                        ctx.beginPath();
                        ctx.moveTo(px, py);
                        px += dx;
                        py -= dy;
                        ctx.lineTo(px, py);
                        ctx.stroke();
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
    
    // -----------------------------------------------------------------------------
    
    function drawLegend() {
        var alti, altn = altitudes.length;
        var lac = $(".legend_altiColor");
        var hue, clr;
        
        for (alti = 0; alti < altn; alti++) {
            hue = util.map(alti, 0, altn, altiHueMin, altiHueMax);
            clr = util.hsvToHex(hue, altiSaturation, altiBrightness);
            lac.append("<div class='legend_altiColor_segment'"
                       + " style='background: " + clr + "'></div>");
        }
    }
    
    // -----------------------------------------------------------------------------
    
    init();
});
