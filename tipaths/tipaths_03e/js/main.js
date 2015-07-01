/*jshint unused: false, latedef: false */
/*jslint vars: true, plusplus: true, undef: true, continue: true */
/*global requirejs, require */

"use strict";

//    console.log("SVG.parse: " + SVG.parse);
//    console.log("SVG.ImportStore: " + SVG.ImportStore);

// TODO
// - fix aggregation - see query in code of Peter en Bart
// - improve integration of paths
// - try other map projections
// - UTC

// Configuration settings that do not change:
var EUConfig = {};
EUConfig.radarsPath = "data/eu.radars.geo.json";
EUConfig.altitudes = [0.3, 0.5, 0.7, 0.9, 1.1, 1.3, 1.5, 1.7, 1.9, 2.1, 2.3, 2.5, 2.7, 2.9, 3.1, 3.3, 3.5, 3.7, 3.9];
EUConfig.mapCenter = [5, 51.5];
EUConfig.mapScale = 6000;
EUConfig.dataFromYear = 2013;
EUConfig.dataFromMonth = 3;
EUConfig.dataFromDay = 7;
EUConfig.dataTillDay = 11;

var USConfig = {};
USConfig.radarsPath = "data/us.radars.json";
USConfig.altitudes = [0.05, 0.15, 0.25, 0.35, 0.45, 0.55, 0.65, 0.75, 0.85, 0.95, 1.05, 1.15, 1.25, 1.35, 1.45, 1.55, 1.65, 1.75, 1.85, 1.95, 2.05, 2.15, 2.25, 2.35, 2.45, 2.55, 2.65, 2.75, 2.85, 2.95];
USConfig.mapCenter = [-73.02, 42.48];
USConfig.mapScale = 3000;
USConfig.dataFromYear = 2010;
USConfig.dataFromMonth = 9;
USConfig.dataFromDay = 2;
USConfig.dataTillDay = 11;
// 2010 sept 8-11

// US max density: 3324

var config;

// Select the current configuration:
//config = EUConfig;
config = USConfig;

var maxDensity = 3200;
var altiHueMin = 0.5;
var altiHueMax = 1;
var altiSaturation = 0.8;
var altiBrightness = 0.8;
var maxPathCnt = maxDensity / config.altitudes.length;
var map;
var mapW = 1000;
var mapH = 800;
var r100, r50;
var projection;
var pathsSVGGroup;

function init() {
    $(document).foundation();
    
//    console.log("- config.altitudes.length: " + config.altitudes.length);
    
    if (!SVG.supported) {
        alert('SVG not supported');
        return;
    }
    
    map = new Map(mapH);
    //console.log("- map.width: " + map.width);

    r100 = map.dmxToPxl(100000); // 100 km
    r50 = map.dmxToPxl(50000); // 50 km
    
    projection = d3.geo.mercator()
        .scale(config.mapScale)
        .translate([mapW / 2, mapH / 2])
        .center(config.mapCenter);
    
    var path = d3.geo.path()
        .projection(projection);
    
    var graticule = d3.geo.graticule()
        .step([1, 1]);

    var svg = d3.select("#svg").append("svg")
        .attr("width", mapW)
        .attr("height", mapH);
    
    svg.append("path")
        .datum(graticule)
        .attr("class", "graticule")
        .attr("d", path);
    
    d3.json("data/us.topo.json", function(error, us) {
        //console.dir(us.objects);
        //console.log(topojson.feature(us, us.objects.land));
        
        svg.insert("path", ".graticule")
            .datum(topojson.feature(us, us.objects.land))
            .attr("class", "land")
            .attr("d", path);

        svg.insert("path", ".graticule")
            .datum(topojson.mesh(us, us.objects.land, function(a, b) { return a !== b; }))
            .attr("class", "country-boundary")
            .attr("d", path);
        
        var legend = svg.append("g");
        
        data.loadRadarsUS(config.radarsPath, function() {
            data.radarXs = [];
            data.radarYs = [];
            var radi, radn = data.radars.length, radar, radp;
            for (radi = 0; radi < radn; radi++) {
                radar = data.radars[radi];
                var radp = projection([radar.lon, radar.lat]);
                data.radarXs[radi] = radp[0];
                data.radarYs[radi] = radp[1];
            }

            // draw radars:
            var radarSVGG = svg.append("g").attr("class", "radar");
            var rpx, rpy;
            for (radi = 0; radi < radn; radi++) {
                rpx = data.radarXs[radi];
                rpy = data.radarYs[radi];
                radarSVGG.append('svg:circle')
                    .attr('cx', rpx)
                    .attr('cy', rpy)
                    .attr('r', 2);
            }

            // add the paths group:
            pathsSVGGroup = svg.append("g");

            // draw legend:
            var legendSVGGroup = svg.append("g");
            drawLegend(legendSVGGroup);

            $("#input_days").change(redraw);
            $("#input_hours").change(redraw);
            $("#input_minutes").change(redraw);
            $("#input_duration").change(redraw);

            redraw();
        });
    });
    
    // TODO: what does this?
    d3.select(self.frameElement).style("height", mapH + "px");
    
    // TODO: fix
    $(window).on('resize', Foundation.utils.throttle(function(e) {
        var svgWidth = $("#svg").parent().width();
        var svgHeight = svgWidth * mapH / mapW;
        //console.log("svg size: " + svgWidth + " / " + svgHeight);
        svg.size(svgWidth, svgHeight);
    }, 25));
    
    printSpecifics_01();
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
    var from = new Date(config.dataFromYear, config.dataFromMonth, days, hours, minutes);

    loadFromCartoDB(from, windowCount, function (dob) {
        drawPaths(dob);
        //console.log("Done");
    });
}

// -----------------------------------------------------------------------------

function loadFromCartoDB(from, windowCount, handler) {
    var dob = {
            startTime: from,
            windowDuration : 20 /* the duration of a window in minutes */,
            windowCount: windowCount,
            radars : [],
            altitudes : config.altitudes,
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
    data.loadDataUS(dob, handler);
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
}

// -----------------------------------------------------------------------------

/**
 * Draw the paths.
 * @param {Object} dob The data object.
 */
function drawPaths(dob) {
    //console.log(">> drawPaths - wind: " + wind);
    var wini, winn, wind = dob.windowCount,
        alti, altn = dob.altitudes.length,
        radi, radn = dob.radars.length,
        pathi, pathn,
        densities, uSpeeds, vSpeeds,
        hue,
        radx, rady,
        pa = 0, pd, px, py, px0, py0, dx, dy, nx, ny, pp, np,
        xps = data.radarXs,
        yps = data.radarYs,
        idw = util.idw,
        asat = altiSaturation,
        abri = altiBrightness,
        lalpha,
        lwidth = 1.5;

    pathsSVGGroup.selectAll("*").remove();

    // pixels secs per meter, als volgt te gebruiken:
    // d[pxl] = speed[m/s] * (duration[s] * conv[pxl/m])
    //var pspm = map.dmxToPxl(1) * dob.windowDuration * 60;
    
    // quick and dirty estimate:
    // - latitude: 111,111 meters (111.111 km) in the y direction is 1 degree
    // - longitude: 111,111 * cos(latitude) meters in the x direction is 1 degree
    // - latitude = mapCenter[1] / 180 * math.PI;
    // source: http://gis.stackexchange.com/questions/2951/algorithm-for-offsetting-a-latitude-longitude-by-some-amount-of-meters
    
    // one degree longitude in meters:
    var degToMetX = 111111 * Math.cos(config.mapCenter[1] / 180 * Math.PI);
//    console.log("degToMetX: " + degToMetX);
    var metToDegX = 1 / degToMetX;
//    console.log("metToDegX: " + metToDegX);
    var pspmX = metToDegX * dob.windowDuration * 60;
    
    // one degree latitude in meters:
    var degToMetY = 111111;
    var metToDegY = 1 / degToMetY;
//    console.log("degToMetY: " + degToMetY);
    var pspmY = metToDegY * dob.windowDuration * 60;
    
    // the volume of the context in km3, i.e. area of circle with 100km
    // radius by 200m:
    var contextVolume = Math.PI * 100 * 100 / 5;

    var half = Math.ceil(wind / 2);

    // for each altitude:
    for (alti = 0; alti < altn; alti++) {
        densities = dob.avDensities[alti];
        hue = util.map(alti, 0, altn, altiHueMin, altiHueMax);

        // for each radar:
        for (radi = 0; radi < radn; radi++) {
            var radar = data.radars[radi];
            // var radp = projection([radar.lon, radar.lat]);
            radx = radar.lon;
            rady = radar.lat;
            
            // for each path:
            var lcolor = util.hsvToHex(hue, asat, abri)
            var pathGr = pathsSVGGroup.append("g");

            pathn = util.map(densities[radi], 0, maxDensity, 0, maxPathCnt);
            for (pathi = 0; pathi < pathn; pathi++) {
                //console.log("> pathi: " + pathi + " - alti: " + alti);
                pa = Math.random() * Math.PI * 2;
                //pd = util.map(pathi, 0, pathn, 2, r100);
                pd = Math.random() * 150000 * metToDegX;
                px0 = px = radx + Math.cos(pa) * pd;
                py0 = py = rady + Math.sin(pa) * pd;
                pp = projection([px, py]);

                for (wini = half - 1; wini >= 0; wini--) {
                    //console.log("  > wini: " + wini + " - alti: " + alti);
                    if (dob.uSpeeds[wini] === undefined) { // DEBUG
                        console.error("dob.uSpeeds[wini] is undefined for"
                                      + " wini: " + wini + ", alti: " + alti);
                    }
                    uSpeeds = dob.uSpeeds[wini][alti];
                    vSpeeds = dob.vSpeeds[wini][alti];
                    dx = idw(px, py, uSpeeds, xps, yps, 2) * pspmX;
                    dy = idw(px, py, vSpeeds, xps, yps, 2) * pspmY;
                    
                    nx = px - dx;
                    ny = py - dy;
                    
                    np = projection([nx, ny]);
                    //console.log("    nx: " + nx + ", ny: " + ny + ", dx: " + nx + ", dy: " + ny + ", np: " + np);

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

                    lalpha = util.map(wini, half - 1, 0, 0.9, 0.3);
                    lwidth = util.map(wini, half - 1, 0, 1.5, 1);
                    pathGr.append("line")
                        .attr("x1", pp[0]).attr("y1", pp[1])
                        .attr("x2", np[0]).attr("y2", np[1])
                        .attr("style", "stroke:" + lcolor +
                              ";stroke-width:" + lwidth +
                              ";opacity:" + lalpha);
                    px = nx;
                    py = ny;
                    pp = np;
                }
                
                px = px0;
                py = py0;
                pp = projection([px, py]);
                var points = "" + pp[0] + "," + pp[1];
                for (wini = half; wini < wind; wini++) {
                    //console.log("wini: " + wini + " - alti: " + alti);
                    if (dob.uSpeeds[wini] === undefined) { // DEBUG
                        console.error("dob.uSpeeds[wini] is undefined for"
                                      + " wini: " + wini + ", alti: " + alti);
                    }
                    uSpeeds = dob.uSpeeds[wini][alti];
                    vSpeeds = dob.vSpeeds[wini][alti];
                    dx = idw(px, py, uSpeeds, xps, yps, 2) * pspmX;
                    dy = idw(px, py, vSpeeds, xps, yps, 2) * pspmY;

                    px += dx;
                    py += dy;
                    np = projection([px, py]);
                    points += " " + np[0] + "," + np[1];
                }
                pathGr.append("polyline")
                    .attr("points", points)
                    .attr("style", "stroke:" + lcolor +
                          ";fill:none;stroke-width:1.5;opacity:" + 1);
                pathGr.append('svg:circle')
                    .attr('cx', np[0])
                    .attr('cy', np[1])
                    .attr('r', 2)
                    .attr("style", "fill:" + util.hsvToHex(hue, 0.8, 0.6)
                         + ";opacity:0.5");
            }
        }
    }
}

// -----------------------------------------------------------------------------

function drawLegend(legendSVGGroup) {
    var legendW = 200;
    var legendH = 16;

    var markerGr = legendSVGGroup.append("g");
    var tx0 = 20;
    var tx = tx0;
    var td = 6;
    var ty = mapH - 20 - legendH - 3 - td - 4
    markerGr.append("text")
        .attr("class", "legend-labels")
        .attr("x", tx0)
        .attr("y", ty)
        .text("0m");
    markerGr.append("text")
        .attr("class", "legend-labels")
        .attr("x", tx0 + legendW / 2)
        .attr("y", ty)
        .attr("text-anchor", "middle")
        .text("2000m");
    markerGr.append("text")
        .attr("class", "legend-labels")
        .attr("x", tx0 + legendW)
        .attr("y", ty)
        .attr("text-anchor", "end")
        .text("4000m");

    ty = mapH - 20 - legendH - 3 - td;
    var points = tx + "," + ty;
    points += " " + (tx + td)  + "," +  ty;
    points += " " + tx + "," + (ty + td);
    markerGr.append("polygon")
        .attr("points", points)
        .attr("style", "fill:#555;");
    
    tx = tx0 + legendW;
    points = tx + "," + ty;
    points += " " + (tx - td)  + "," +  ty;
    points += " " + tx + "," + (ty + td);
    markerGr.append("polygon")
        .attr("points", points)
        .attr("style", "fill:#555;");
    
    tx = tx0 + legendW / 2;
    td = 5
    points = (tx - td) + "," + ty;
    points += " " + (tx + td)  + "," +  ty;
    points += " " + tx + "," + (ty + td);
    markerGr.append("polygon")
        .attr("points", points)
        .attr("style", "fill:#555;");

    tx = 20;
    ty = mapH - 20 - legendH;
    var alti, altn = config.altitudes.length;
    var dx = legendW / altn;
    var hue, hex;
    for (alti = 0; alti < altn; alti++) {
        hue = util.map(alti, 0, altn, altiHueMin, altiHueMax);
        hex = util.hsvToHex(hue, altiSaturation, altiBrightness);
        legendSVGGroup.append("rect")
            .attr("x", tx)
            .attr("y", ty)
            .attr("width", Math.ceil(dx))
            .attr("height", legendH)
            .attr("style", "fill:" + hex + ";");
        tx += dx;
    }
}

// -----------------------------------------------------------------------------

