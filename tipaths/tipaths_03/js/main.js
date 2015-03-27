/*jshint unused: false, latedef: false */
/*jslint vars: true, plusplus: true, undef: true, continue: true */
/*global requirejs, require */

requirejs.config({
    baseUrl: 'js',
    shim: {
        'proj4': { exports: 'proj4' },
        'kriging': { exports: 'kriging' }
    },
    // Third party code lives in js/lib
    paths: {
        jquery: 'lib/jquery',
        proj4: 'lib/proj4',
        kriging: 'lib/kriging'
    }
});

require(["jquery", "data", "Map", "util", "interpolation"], function ($, data, Map, util, interpolation) {
    "use strict";
    
    var debug = util.debug,
        config = {
            maxDensity : 600,
            duration : 20,
            windowStep : 20,
            pathLen : 24
        },
        map = new Map(700),
        loadWinI = 0;
    
    // The distance in pixels traversed during a windowstep at 1/s.
    config.stepFactor = map.dmxToPxl(config.windowStep * 60);
    
    function init() {
        var canvas = $("#canvas");
        canvas.attr({
            width: map.width,
            height: map.height
        });
        
        $("#input_datetime").change(redraw);
        $("#button_redraw").click(redraw);

        redraw();
    }
    
    function redraw() {
        updateInterpolationParams();
        redrawMap(canvas);
    }
    
    function updateInterpolationParams() {
        // TODO: check if time handling is correct given the timezone differences...
        config.from = new Date($("#input_datetime").val());
    }
    
    function redrawMap(canvas) {
        var rdata = {
                startTime: "2013-04-05T00:00:00Z",
                windowDuration : 20,
                deltaStartTime : 5,
                radars : [],
                altitudes : [0.3, 0.5, 0.7, 0.9, 1.1, 1.3, 1.5, 1.7, 1.9, 2.1, 2.3, 2.5, 2.7, 2.9, 3.1 , 3.3, 3.5, 3.7, 3.9],
                xPositions : [],
                yPositions : [],
                densities : [],
                uSpeeds : [],
                vSpeeds : [],
                speeds : [],
                radarIndices : {}
            },
            radi,
            radn,
            radar,
            ri,
            rp;
        
        // Create mapping from radar_ids to indices:
        //console.log(data.radars);
        radn = data.radars.length;
        for (radi = 0; radi < radn; radi++) {
            radar = data.radars[radi];
            rdata.radars.push(radar.radar_id);
        }
        rdata.radars.sort();
        //console.log("- rdata.radars: " + rdata.radars);
        
        for (radi = 0; radi < radn; radi++) {
            rdata.radarIndices[rdata.radars[radi]] = radi;
        }
        //console.log("- rdata.radarIndices: " + rdata.radarIndices);
        
        for (radi = 0; radi < radn; radi++) {
            radar = data.radars[radi];
            //console.log(radar);
            ri = rdata.radarIndices[radar.radar_id];
            rp = map.locToPxl(radar.coordinates[0], radar.coordinates[1]);
            rdata.xPositions[ri] = rp.x;
            rdata.yPositions[ri] = rp.y;
        }
        
        loadNext(rdata, config.from);
    }
    
    function loadNext(rdata, from) {
        var till = new Date(from.getTime());
        till.setMinutes(from.getMinutes() + config.duration);
        console.log(">> loading from " + from + " till " + till);
        data.loadData_3(from, till, 0.3, 3.9, function (json) {
//        $.getJSON("data/td1.json", function(json) {
//            $("#debug").append(JSON.stringify(json));
//            console.log(json);
            processData(json, rdata);
            loadWinI++;
            if (loadWinI < config.pathLen) {
                from.setMinutes(config.from.getMinutes() + config.windowStep);
                loadNext(rdata, from);
            }
            else {
                drawMap(rdata);
                drawPaths(rdata, 0);
            }
        });
    }
    
    function processData(json, rdata) {
        //debug("JSON", JSON.stringify(json, null, 4));
        //console.log(json);
        var rowi,
            rows,
            alti,
            radi,
            radar,
            row,
            densities = [],
            uSpeeds = [],
            vSpeeds = [],
            speeds = [],
            speedMin = 1000000,
            speedMax = -1000000,
            densityMin = 1000000,
            densityMax = -1000000;
        
        function newZeroArray(length) {
            var result = [];
            for (var i = 0; i < length; i++) {
                result.push(0);
            }
            return result;
        }
        for (alti = 0; alti < rdata.altitudes.length; alti++) {
            densities.push(newZeroArray(5));
            uSpeeds.push(newZeroArray(5));
            vSpeeds.push(newZeroArray(5));
            speeds.push(newZeroArray(5));
        }
        rdata.densities.push(densities);
        rdata.uSpeeds.push(uSpeeds);
        rdata.vSpeeds.push(vSpeeds);
        rdata.speeds.push(speeds);
        
        rows = json.total_rows;
        for (rowi = 0; rowi < rows; rowi++) {
            row = json.rows[rowi];
            alti = data.altIndex(row.altitude, 0.3);
            radi = rdata.radarIndices[row.radar_id];
            densities[alti][radi] = row.bird_density;
            uSpeeds[alti][radi] = row.u_speed;
            vSpeeds[alti][radi] = row.v_speed;
            var speed = util.distance(row.u_speed, row.v_speed);
            speeds[alti][radi] = speed;
            
            //console.log(" - altitude: " + row.altitude + " - altIndex: " + data.altIndex(row.altitude, 0.3));
            
            if (speed < speedMin) { speedMin = speed; }
            else if (speed > speedMax) { speedMax = speed; }
            if (row.bird_density < densityMin) { densityMin = row.bird_density; }
            else if (row.bird_density > densityMax) { densityMax = row.bird_density; }
        }
        
        console.log("speed min: " + speedMin + " - max: " + speedMax);
        console.log("density min: " + densityMin + " - max: " + densityMax);
        
        return rdata;
    }
    
    function drawMap(rdata) {
        var radi,
            rlen,
            radar,
            rd,
            canvas = $("#canvas"),
            ctx = canvas[0].getContext("2d"),
            clr = "53, 106, 164",
            di,
            density,
            radx, 
            rady;
        
        // Draw the map bitmap:
        ctx.drawImage($("#img_map")[0], 0, 0);
        
        // Draw frame:
        ctx.lineWidth   = 1;
        ctx.strokeStyle = "#aaaaaa";
        ctx.strokeRect(0, 0, map.width, map.height);
        
        // Draw radars and interpolation:
        var drawFactor = 10;
        var r50 = map.dmxToPxl(50000); // 50 km
        var r100 = map.dmxToPxl(100000); // 100 km
        
        rlen = rdata.radars.length;
        for (radi = 0; radi < rlen; radi++) {
            radx = rdata.xPositions[radi];
            rady = rdata.yPositions[radi];
            
            // Draw radar shapes:
            ctx.strokeStyle = "rgba(" + clr + ", 0.4)";
            
            // 50 km circle:
            ctx.beginPath();
            ctx.arc(radx, rady, r50, 0, 2 * Math.PI);
            ctx.stroke();
            
            // 100 km circle:
            ctx.beginPath();
            ctx.arc(radx, rady, r100, 0, 2 * Math.PI);
            ctx.stroke();
            
            // radar center:
            ctx.beginPath();
            ctx.fillStyle = "rgb(" + clr + ")";
            ctx.arc(radx, rady, 2, 0, 2 * Math.PI);
            ctx.fill();
            
            // draw average travel vector:
            ctx.strokeStyle = "rgb(" + clr + ")";
            ctx.beginPath();
            ctx.moveTo(radx, rady);
            ctx.lineTo(radx + rdata.uSpeeds[radi] * drawFactor,
                       rady - rdata.vSpeeds[radi] * drawFactor);
            ctx.stroke();
        }
    }
    
    function drawPaths(rdata) {
        var alti,
            altn = rdata.altitudes.length,
            radi,
            radn = rdata.radars.length,
            rlen,
            radar,
            rd,
            canvas = $("#canvas"),
            ctx = canvas[0].getContext("2d"),
            pathCnt,
            path,
            secti,
            sectiFactor = 1,
            uSpeed,
            vSpeed,
            speed,
            hue,
            ha = 0,
            hb = 0.2,
            uSpeedInterpolator,
            vSpeedInterpolator,
            speedInterpolator,
            r100 = map.dmxToPxl(100000) /* 100 km */,
            r50 = map.dmxToPxl(50000) /* 50 km */,
            pa = 0,
            pd,
            px,
            py,
            di,
            density,
            radx, 
            rady,
            xps = rdata.xPositions,
            yps = rdata.yPositions,
            idw = interpolation.idw,
            stepFactor = config.stepFactor;
        
        //console.log("r100: " + r100);
        //console.log("rdata.uSpeeds[0].length: " + rdata.uSpeeds[windowIdx].length);
        
        var wini = 0;
        var wDensities = rdata.densities[wini];
        var wUSpeeds = rdata.uSpeeds[wini];
        var wVSpeeds = rdata.vSpeeds[wini];
        var wSpeeds = rdata.speeds[wini];
        //console.log("rdata.uSpeeds: " + rdata.uSpeeds);
        //console.log("wUSpeeds: " + wUSpeeds);
        
        // for each altitude
        for (alti = 0; alti < altn; alti++) {
            var densities = wDensities[alti];
            var uSpeeds = wUSpeeds[alti];
            var vSpeeds = wVSpeeds[alti];
            var speeds = wSpeeds[alti];
            //console.log("uSpeeds: " + uSpeeds);
            uSpeedInterpolator = interpolation.IDWInterpolator(
                uSpeeds,
                rdata.xPositions,
                rdata.yPositions,
                2
            );
            vSpeedInterpolator = interpolation.IDWInterpolator(
                vSpeeds,
                rdata.xPositions,
                rdata.yPositions,
                2
            );
            speedInterpolator = interpolation.IDWInterpolator(
                speeds,
                rdata.xPositions,
                rdata.yPositions,
                2
            );
            hue = util.map(alti, 0, 18, 0.15, 0.83);
            
            // for each radar:
            for (radi = 0; radi < radn; radi++) {
                density = densities[radi];
                radx = rdata.xPositions[radi];
                rady = rdata.yPositions[radi];
                pathCnt = util.constrain(util.map(density, 0, 350, 0, 100), 0, 5);

                for (path = 0; path < pathCnt; path++) {
                    pa = Math.random() * Math.PI * 2;
                    //pa += .2 + Math.random();
                    //pd = Math.random() * r100;
                    pd = util.map(path, 0, pathCnt, 0, r50);
                    px = radx + Math.cos(pa) * pd;
                    py = rady + Math.sin(pa) * pd;

                    for (secti = 0; secti < config.pathLen; secti++) {
                        console.log("secti: " + secti);
                        var densities = rdata.densities[secti][alti];
                        var uSpeeds = rdata.uSpeeds[secti][alti];
                        var vSpeeds = rdata.vSpeeds[secti][alti];
                        var speeds = rdata.speeds[secti][alti];
                        
                        // speeds are in m/s, 
                        config.stepFactor
                        
                        uSpeed = idw(px, py, uSpeeds, xps, yps, 2) * stepFactor;
                        vSpeed = idw(px, py, vSpeeds, xps, yps, 2) * stepFactor;
                        //speed = idw(px, py, speeds, xps, yps, 2) * stepFactor;
                        //hue = util.map(speed, 0, 10, 0, 0.5);

                        var alpha = util.map(secti, 0, config.pathLen - 1, .5, 1);
                        //ctx.strokeStyle = util.hsvToHex(hue, 0.8, 0.6);
                        ctx.strokeStyle = util.hsvaToRgba(hue, 0.8, 0.6, alpha);
                        ctx.beginPath();
                        ctx.moveTo(px, py);
                        px += uSpeed;
                        py -= vSpeed;
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
    
    data.loadRadars(init);
});
