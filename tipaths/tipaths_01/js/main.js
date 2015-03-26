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
            maxDensity : 600
        },
        map = new Map(700);
    
    function init() {

        var canvas = $("#canvas");
        canvas.attr({
            width: map.width,
            height: map.height
        });
        
        // 
        $.each(data.altitudeStrings, function (i, altitude) {
            $("#select_altitude").
                append($("<option></option>")
                       .attr("value", altitude)
                       .text(altitude));
        });
        $("#input_datetime").change(redraw);
        $("#input_duration").change(redraw);
        $("#select_altitude").change(redraw);

        // interpolation settings:
        config.interpolation = {};
        $("#button_redraw").click(redraw);
        $("#select_variogram").change(redraw);
        $("#input_sigma2").change(redraw);
        $("#input_alpha").change(redraw);

        redraw();
    }
    
    function redraw() {
        updateInterpolationParams();
        redrawMap(canvas);
    }
    
    function updateInterpolationParams() {
        // TODO: check if time handling is correct given the timezone differences...
        config.from = new Date($("#input_datetime").val());
        config.duration = parseInt($("#input_duration").val(), 10);
        config.altitude = parseFloat($("#select_altitude").val());

        config.till = new Date(config.from.getTime());
        config.till.setMinutes(config.till.getMinutes() + config.duration);

        config.interpolation.variogram = $("#select_variogram").val();
        config.interpolation.sigma2 = parseInt($("#input_sigma2").val(), 10);
        config.interpolation.alpha = parseInt($("#input_alpha").val(), 10);
    }
    
    function redrawMap(canvas) {
        var sql = "SELECT radar_name";
        sql += ", AVG(bird_density) as bird_density";
        sql += ", AVG(u_speed) as u_speed";
        sql += ", AVG(v_speed) as v_speed";
        sql += ", AVG(ground_speed) as ground_speed";
        sql += " FROM bird_migration_altitude_profiles";
        sql += " WHERE altitude = '" + config.altitude + "'";
        sql += " AND bird_density > 0";
        sql += " AND start_time >= '" + data.cartoDB.toString(config.from) + "'";
        sql += " AND start_time < '" + data.cartoDB.toString(config.till) + "'";
        sql += " GROUP BY radar_name";
        //debug(sql);
        data.cartoDB.loadData(sql, function (json) {
//        $.getJSON("data/td1.json", function(json) {
//            $("#debug").append(JSON.stringify(json));
//            console.log(json);
            var rdata = processData(json);
            drawMap(rdata);
            drawPaths(rdata);
        });
    }
    
    function processData(json) {
        //debug("JSON", JSON.stringify(json, null, 4));
        //console.log(json);
        var i,
            leni,
            radar,
            row,
            rdata = {
                radarNames : [],
                densities : [],
                uSpeeds : [],
                vSpeeds : [],
                speeds : [],
                rxs : [],
                rys : []
            },
            rd,
            speedMin = 1000000,
            speedMax = -1000000,
            densityMin = 1000000,
            densityMax = -1000000;
        
        leni = data.radars.length;
        for (i = 0; i < leni; i++) {
            rdata[data.radars[i].name] = {};
        }
        
        leni = json.total_rows;
        for (i = 0; i < leni; i++) {
            row = json.rows[i];
            
            rd = rdata[row.radar_name];
            rd.index = i;
            
            var speed = util.distance(row.u_speed, row.v_speed);
            console.log("ground_speed: " + row.ground_speed + " - speed: " + speed);
            
            rdata.radarNames.push(row.radar_name);
            rdata.densities.push(row.bird_density);
            rdata.uSpeeds.push(row.u_speed);
            rdata.vSpeeds.push(row.v_speed);
            rdata.speeds.push(speed);
            
            if (speed < speedMin) { speedMin = speed; }
            else if (speed > speedMax) { speedMax = speed; }
            if (row.bird_density < densityMin) { densityMin = row.bird_density; }
            else if (row.bird_density > densityMax) { densityMax = row.bird_density; }
        }
        
        leni = data.radars.length;
        for (i = 0; i < leni; i++) {
            radar = data.radars[i];
            rd = rdata[radar.name];
            var rp = map.locToPxl(radar.coordinates[0], radar.coordinates[1]);
            rd.mapPos = rp;
            rdata.rxs.push(rp.x);
            rdata.rys.push(rp.y);
        }
        
        console.log("speed min: " + speedMin + " - max: " + speedMax);
        console.log("density min: " + densityMin + " - max: " + densityMax);
        
        return rdata;
    }
    
    function drawMap(rdata) {
        var i,
            leni,
            radar,
            rd,
            canvas = $("#canvas"),
            ctx = canvas[0].getContext("2d"),
            clr = "53, 106, 164",
            density;
        
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
        
        leni = data.radars.length;
        for (i = 0; i < leni; i++) {
            radar = data.radars[i];
            //debug("# Radar: " + radar.name + " - " + radar.coordinates);
            rd = rdata[radar.name];
            density = rdata.densities[rd.index];
            
            // Draw radar shapes:
            var alpha = 0;
            if (density > 0) {
                alpha = util.map(density, 0, config.maxDensity, 0.05, 0.5);
            }
            ctx.fillStyle = "rgba(" + clr + ", " + alpha + ")";
            ctx.strokeStyle = "rgba(" + clr + ", 0.4)";
            
            // 50 km circle:
            ctx.beginPath();
            ctx.arc(rd.mapPos.x, rd.mapPos.y, r50, 0, 2 * Math.PI);
            ctx.stroke();
            ctx.fill();
            
            // 100 km circle:
            ctx.beginPath();
            ctx.arc(rd.mapPos.x, rd.mapPos.y, r100, 0, 2 * Math.PI);
            ctx.stroke();
            
            // radar center:
            ctx.beginPath();
            ctx.fillStyle = "rgb(" + clr + ")";
            ctx.arc(rd.mapPos.x, rd.mapPos.y, 2, 0, 2 * Math.PI);
            ctx.fill();
            
            // draw all travel vectors:
//            ctx.strokeStyle = "rgba(102, 153, 0, 1)";
//            var len = rd.uSpeeds.length;
//            for (var j = 0; j < len; j++) {
//                ctx.beginPath();
//                ctx.moveTo(rd.mapPos.x, rd.mapPos.y);
//                ctx.lineTo(rd.mapPos.x + rd.uSpeeds[j] * drawFactor,
//                           rd.mapPos.y - rd.vSpeeds[j] * drawFactor);
//                ctx.stroke();
//            }
            
            // draw average travel vector:
            ctx.strokeStyle = "rgb(" + clr + ")";
            ctx.beginPath();
            ctx.moveTo(rd.mapPos.x, rd.mapPos.y);
            ctx.lineTo(rd.mapPos.x + rd.avUSpeed * drawFactor,
                       rd.mapPos.y - rd.avVSpeed * drawFactor);
            ctx.stroke();
        }
    }
    
    function drawPaths(rdata) {
        var ri,
            rlen,
            radar,
            rd,
            canvas = $("#canvas"),
            ctx = canvas[0].getContext("2d"),
            pathCnt,
            path,
            pathLen = 25,
            sectie,
            sectieFactor = 2,
            uSpeed,
            vSpeed,
            speed,
            hue,
            ha = 0,
            hb = 0.2,
            uSpeedInterpolator = interpolation.IDWInterpolator({
                tValues : rdata.uSpeeds,
                xValues : rdata.rxs,
                yValues : rdata.rys,
                power : 2
            }),
            vSpeedInterpolator = interpolation.IDWInterpolator({
                tValues : rdata.vSpeeds,
                xValues : rdata.rxs,
                yValues : rdata.rys,
                power : 2
            }),
            speedInterpolator = interpolation.IDWInterpolator({
                tValues : rdata.speeds,
                xValues : rdata.rxs,
                yValues : rdata.rys,
                power : 2
            }),
            r100 = map.dmxToPxl(100000) /* 100 km */,
            pa = 0,
            pd,
            px,
            py,
            density;
        
        console.log("r100: " + r100);
        
        rlen = data.radars.length;
        for (ri = 0; ri < rlen; ri++) {
            radar = data.radars[ri];
            rd = rdata[radar.name];
            density = rdata.densities[rd.index];
            pathCnt = util.constrain(util.map(density, 0, 250, 0, 100), 0, 100);

            for (path = 0; path < pathCnt; path++) {
                pa = Math.random() * Math.PI * 2;
                //pa += .2 + Math.random();
                //pd = Math.random() * r100;
                pd = util.map(path, 0, pathCnt, 0, r100);
                px = rd.mapPos.x + Math.cos(pa) * pd;
                py = rd.mapPos.y + Math.sin(pa) * pd;

    //            uSpeed = uSpeedInterpolator(px, py) * sectieFactor;
    //            vSpeed = vSpeedInterpolator(px, py) * sectieFactor;
    //            ctx.strokeStyle = "rbg(190, 0, 0)";
    //            ctx.beginPath();
    //            ctx.moveTo(px, py);
    //            ctx.lineTo(px + uSpeed * drawFactor,
    //                       py - vSpeed * drawFactor);
    //            ctx.stroke();

                for (sectie = 0; sectie < pathLen; sectie++) {

                    uSpeed = uSpeedInterpolator(px, py) * sectieFactor;
                    vSpeed = vSpeedInterpolator(px, py) * sectieFactor;
                    speed = speedInterpolator(px, py) * sectieFactor;
                    hue = util.map(speed, 0, 10, 0, 0.5);

                    ctx.strokeStyle = util.hsvToHex(hue, 0.8, 0.6);
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

                ctx.fillStyle = "rbga(0, 0, 0, .5)";
                ctx.beginPath();
                ctx.arc(px, py, 1.5, 0, 2 * Math.PI);
                ctx.fill();
            }
        }
    }
    
    data.loadRadars(init);
});