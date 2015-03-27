/* jshint jquery: true, devel:true, browser:true */
/* globals require, requirejs */



    
requirejs.config({
    baseUrl: 'js',
    shim: {
        'proj4': { exports: 'proj4' },
        'kriging': { exports: 'kriging' },
        'stats': { exports: 'Stats' }
    },
    // Third party code lives in js/lib
    paths: {
        jquery: 'lib/jquery',
        proj4: 'lib/proj4',
        kriging: 'lib/kriging',
        d3: 'lib/d3',
        stats: 'lib/stats.min'
    }
});

require(["jquery", "data", "Map", "util", "interpolation", "d3", "stats"], function ($, data, Map, util, interpolation, d3, Stats) {

    var debug = util.debug,
        config = {
            maxDensity : 600,
            interpolation: {},
            from: new Date("2013-04-05T00:00:00"),
			ras : [],
			rds : []
        },
        map = new Map(700),
        time,
        timelapsed = 0,
        stats;
    
    // http://paulirish.com/2011/requestanimationframe-for-smart-animating/
    // http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating
    // requestAnimationFrame polyfill by Erik Möller, fixes from Paul Irish and Tino Zijdel
    (function() {
        var lastTime = 0;
        var vendors = ['ms', 'moz', 'webkit', 'o'];
        for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
            window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
            window.cancelAnimationFrame = window[vendors[x]+'CancelAnimationFrame']||window[vendors[x]+'CancelRequestAnimationFrame'];
        }

        if (!window.requestAnimationFrame)
            window.requestAnimationFrame = function(callback, element) {
                var currTime = new Date().getTime();
                var timeToCall = Math.max(0, 16 - (currTime - lastTime));
                var id = window.setTimeout(function() { callback(currTime + timeToCall); },
                  timeToCall);
                lastTime = currTime + timeToCall;
                return id;
            };

        if (!window.cancelAnimationFrame)
            window.cancelAnimationFrame = function(id) {
                clearTimeout(id);
            };
    }());
    
    function init() {

        var canvas = $("#canvas");
        canvas.attr({
            width: map.width,
            height: map.height
        });
        
		var r100 = map.dmxToPxl(100000);
        for (var i = 0; i < 100; i++) {
			config.ras.push(Math.random() * Math.PI * 2);
			config.rds.push(Math.random() * r100);
		}
        
        stats = new Stats();
        stats.domElement.style.position = 'absolute';
        stats.domElement.style.left = '10px';
        stats.domElement.style.bottom = '10px';
        document.body.appendChild(stats.domElement);
        
        //drawMap();
        drawLoop();
    }
    
          function drawLoop() {
        var startAnimationTime =new Date("2014-04-05T00:00:11Z");
        var endAnimationTime =new Date("2014-04-05T23:59:11Z");
        var now = new Date(startAnimationTime.getTime());
        var fps = 1;
        stats.begin();
        requestAnimationFrame(drawLoop);
        if(now < endAnimationTime){
            now = new Date(startAnimationTime.getTime());
            startAnimationTime = new Date(startAnimationTime.getTime() + 5*60000);
            console.log("next " + startAnimationTime);
            //change the parameters from the input here
            $("#input_datetime").val(startAnimationTime);
            updateInterpolationParams();
            redrawMap();
        }
        stats.end();
    }
    
    
    function redrawMap() {
        var sql = "SELECT radar_name, start_time, bird_reflectivity, bird_density, direction, u_speed, v_speed";
        sql += " FROM bird_migration_altitude_profiles";
        sql += " WHERE altitude = '" + config.altitude + "'";
        sql += " AND start_time >= '" + data.cartoDB.toString(config.from) + "'";
        sql += " AND start_time < '" + data.cartoDB.toString(config.till) + "'";
        sql += " LIMIT 100";
        //debug(sql);
        data.cartoDB.loadData(sql, function (json) {
//        $.getJSON("data/td1.json", function(json) {
//            $("#debug").append(JSON.stringify(json));
//            console.log(json);
            var rdata = processData(json);
            drawMap(rdata);
            drawPaths(rdata);
            //drawLegend(rdata);
        });
    }
    
    function updateInterpolationParams() {
        
        // TODO: check if time handling is correct given the timezone differences...
        //config.from = new Date($("#input_datetime").val());
        config.from = new Date(config.from.getTime() + 1 *60000);
        //console.log(config.from.toUTCString());
        config.duration = 15;//parseInt($("#input_duration").val(), 10);
        config.altitude = 1.3;//parseFloat($("#select_altitude").val());

        config.till = new Date(config.from.getTime());
        config.till.setMinutes(config.till.getMinutes() + config.duration);

        //config.interpolation.variogram = $("#select_variogram").val();
        //config.interpolation.sigma2 = parseInt($("#input_sigma2").val(), 10);
        //config.interpolation.alpha = parseInt($("#input_alpha").val(), 10);
    }
    
    function processData(json) {
        //debug("JSON", JSON.stringify(json, null, 4));
        //console.log(json);
        var i,
            leni,
            radar,
            row,
            rdata = {
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
            rdata[data.radars[i].name] = {
                densities : [],
                uSpeeds : [],
                vSpeeds : [],
                speeds : []
            };
        }
        
        leni = json.total_rows;
        for (i = 0; i < leni; i++) {
            row = json.rows[i];
            if (row.bird_density === 0) { continue; }
            rd = rdata[row.radar_name];
            rd.densities.push(row.bird_density);
            rd.uSpeeds.push(row.u_speed);
            rd.vSpeeds.push(row.v_speed);
            rd.speeds.push(util.distance(row.u_speed, row.v_speed));
        }
        
        leni = data.radars.length;
        for (i = 0; i < leni; i++) {
            radar = data.radars[i];
            rd = rdata[radar.name];
            rd.avDensity = util.average(rd.densities, 0);
            rd.avUSpeed = util.average(rd.uSpeeds, 0);
            rd.avVSpeed = util.average(rd.vSpeeds, 0);
            rd.avSpeed = util.average(rd.speeds, 0);
            rd.mapPos = map.locToPxl(radar.coordinates[0], radar.coordinates[1]);
            
            rdata.densities.push(rd.avDensity);
            rdata.uSpeeds.push(rd.avUSpeed);
            rdata.vSpeeds.push(rd.avVSpeed);
            rdata.speeds.push(rd.avSpeed);
            rdata.rxs.push(rd.mapPos.x);
            rdata.rys.push(rd.mapPos.y);
            
            if (rd.avSpeed < speedMin) { speedMin = rd.avSpeed; }
            else if (rd.avSpeed > speedMax) { speedMax = rd.avSpeed; }
            if (rd.avDensity < densityMin) { densityMin = rd.avDensity; }
            else if (rd.avDensity > densityMax) { densityMax = rd.avDensity; }
            
//            debug("# Radar: ", radar.name);
//            debug("- avDensity", rd.avDensity);
//            debug("- rd.uSpeeds", rd.uSpeeds + " - rd.avUSpeed: " + rd.avUSpeed);
//            debug("- rd.vSpeeds", rd.vSpeeds + " - rd.avVSpeed: " + rd.avVSpeed);
        }
        
        //console.log("speed min: " + speedMin + " - max: " + speedMax);
        //console.log("density min: " + densityMin + " - max: " + densityMax);
        
        return rdata;
    }
    
    function drawMap(rdata) {
        var i,
            leni,
            radar,
            rd,
            canvas = $("#canvas"),
            ctx = canvas[0].getContext("2d"),
            clr = "53, 106, 164";
        
        // Draw the map bitmap:
        ctx.drawImage($("#img_map")[0], 0, 0);
        
        // Draw frame:
        ctx.lineWidth   = 1;
        ctx.strokeStyle = "#aaaaaa";
        ctx.strokeRect(0, 0, map.width, map.height);
        
        // Draw radars and interpolation:
        var drawFactor = 10,
            r50 = map.dmxToPxl(50000) /* 50 km */,
            r100 = map.dmxToPxl(100000) /* 100 km */;
        
        leni = data.radars.length;
        for (i = 0; i < leni; i++) {
            radar = data.radars[i];
            //debug("# Radar: " + radar.name + " - " + radar.coordinates);
            rd = rdata[radar.name];
            
            // Draw radar shapes:
            var alpha = 0;
            if (rd.avDensity > 0) {
                alpha = util.map(rd.avDensity, 0, config.maxDensity, 0.05, 0.5);
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
            pathLen = 50,
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
            py;
        
        rlen = data.radars.length;
        for (ri = 0; ri < rlen; ri++) {
            radar = data.radars[ri];
            rd = rdata[radar.name];
            if (rd.avDensity === 0) { continue; }
            //console.log("# Radar " + radar.name + " - avDensity: " + rd.avDensity);
            pathCnt = util.constrain(util.map(rd.avDensity, 0, 250, 0, 100), 0, 100);

            for (path = 0; path < pathCnt; path++) {
                pa = config.ras[path]; // Math.random() * Math.PI * 2;
                //pa += .2 + Math.random();
                //pd = Math.random() * r100;
                //pd = util.map(path, 0, pathCnt, 0, r100);
                pd = config.rds[path];
				px = rd.mapPos.x + Math.cos(pa) * pd;
                py = rd.mapPos.y + Math.sin(pa) * pd;

                ctx.fillStyle = "rbga(0, 0, 0, .5)";
                ctx.beginPath();
                ctx.arc(px, py, 1.5, 0, 2 * Math.PI);
                ctx.fill();

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

    //                ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    //                ctx.beginPath();
    //                ctx.arc(px, py, 1.5, 0, 2 * Math.PI);
    //                ctx.fill();
                }
            }
        }
    }
    
    data.loadRadars(init);
});
 