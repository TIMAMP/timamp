/*jshint unused: false, latedef: false */
/*jslint vars: true, plusplus: true, undef: true, continue: true */
/*global requirejs, require */

"use strict";

//    console.log("SVG.parse: " + SVG.parse);
//    console.log("SVG.ImportStore: " + SVG.ImportStore);

// Configuration settings that do not change:
var altitudes = [0.3, 0.5, 0.7, 0.9, 1.1, 1.3, 1.5, 1.7, 1.9, 2.1, 2.3, 2.5, 2.7, 2.9, 3.1, 3.3, 3.5, 3.7, 3.9];
var maxDensity = 3200;
var altiHueMin = 0.5;
var altiHueMax = 1;
var altiSaturation = 0.8;
var altiBrightness = 0.8;
var maxPathCnt = maxDensity / altitudes.length;
var map;
var mapHeightFactor = 940 / 720;
var mapScaleFactor = 6000 / 720;
var legendWidthFactor = 200 / 720;
var mapW = 100;
var mapH = 100;
var mapCenter = [5, 51.5];
var mapScale;
var legendW;
var svg;
var pathsSVGGroup;
var projection;
var projectionPath;
var euTopoJson;
var days;
var hours;
var minutes;
var radarData = {};

/**
 * @type {Object}
 */
var currData;

//var r100, r50;

function init() {
    $(document).foundation();
    
    if (!SVG.supported) {
        alert('SVG not supported');
        return;
    }
    
    map = new Map(mapH);

    var loading = 3;
    
    d3.json("data/eu.topo.json", function (error, json) {
        if (error) {
            console.error(error);
            return;
        }
        euTopoJson = json;
        if (--loading == 0) initDone();
    });
    dataService.loadRadarsJSON(function (radars) {
        radarData.radars = radars;
        radarData.count = radars.length;

        // Create mapping from radar_ids to indices:
        radarData.radarIndices = {};
        radars.forEach(function (radar, i) {
            radarData.radarIndices[radar.radar_id] = i;
        });

        if (--loading == 0) initDone();
    });
    dataService.loadQueryTemplate(function () {
        if (--loading == 0) initDone();
    });
}

function initDone() {
    //dataService.printSpecifics_01();
    //dataService.printSpecifics_01b();
    //dataService.printSpecifics_01c();

    //r100 = map.dmxToPxl(100000); // 100 km
    //r50 = map.dmxToPxl(50000); // 50 km

    $("#input_days").change(inputChanged);
    $("#input_hours").change(inputChanged);
    $("#input_minutes").change(inputChanged);
    $("#input_duration").change(inputChanged);

    d3.select(window).on('resize', Foundation.utils.throttle(function(e) {
        if (d3.select("#map-container").node().getBoundingClientRect().width != mapW) {
            updateMap(false, true);
        }
    }, 25));

    updateMap(true, true);
}

function inputChanged() {
    updateMap(true, false);
}

function updateMap(dataDirty, mapDirty) {
    if (mapDirty) {
        var svgRect = d3.select("#map-container").node().getBoundingClientRect();
        mapW = svgRect.width;
        mapH = mapW * mapHeightFactor;
        mapScale = mapW * mapScaleFactor;
        legendW = mapW * legendWidthFactor;

        // specify the projection based of the size of the map:
        projection = d3.geo.mercator()
            .scale(mapScale)
            .translate([mapW / 2, mapH / 2])
            .center(mapCenter);

        // initialize the d3 path with which to draw the geography:
        projectionPath = d3.geo.path().projection(projection);

        // update radar positions:
        radarData.xPositions = [];
        radarData.yPositions = [];
        radarData.radars.forEach(function (radar, i) {
            var radp = projection([radar.coordinates[0], radar.coordinates[1]]);
//                console.log(radp[0], radp[1]);
            radarData.xPositions[i] = radp[0];
            radarData.yPositions[i] = radp[1];
        });
    }

    drawMap();

    if (dataDirty) {
        updateInput();
        var data = {
            startTime: new Date(2013, 3, days, hours, minutes),
            windowDuration : 20 /* the duration of a window in minutes */,
            windowCount: parseInt($("#input_duration").val()) * 3,
            altitudes : altitudes,
            densities : [],
            avDensities : undefined,
            uSpeeds : [],
            vSpeeds : [],
            speeds : []
        };
        console.log("Loading from " + data.startTime + " for " + data.windowCount +
            " windows of " + data.windowDuration + " minutes each.");
        dataService.loadData(data, radarData, function () {
            currData = data;
            drawPaths(currData);
            //console.log("Done");
        });
    }
    else {
        drawPaths(currData);
    }
}

function updateInput() {
    days = parseInt($("#input_days").val());
    var daysMin = parseInt($("#input_days").attr("min"));
    var daysMax = parseInt($("#input_days").attr("max"));

    hours = parseInt($("#input_hours").val());
    var hoursMin = parseInt($("#input_hours").attr("min"));
    var hoursMax = parseInt($("#input_hours").attr("max"));

    minutes = parseInt($("#input_minutes").val());
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
}

function drawMap() {
    if (svg) { svg.remove(); }
    svg = d3.select("#map-container").append("svg")
        .style("width", mapW)
        .style("height", mapH);

    var graticule = d3.geo.graticule()
        .step([1, 1]);
    svg.append("path")
        .datum(graticule)
        .classed("graticule", true)
        .attr("d", projectionPath);

    svg.insert("path", ".graticule")
        .datum(topojson.feature(euTopoJson, euTopoJson.objects.europe))
        .classed("land", true)
        .attr("d", projectionPath);
    svg.insert("path", ".graticule")
        .datum(topojson.mesh(euTopoJson, euTopoJson.objects.europe, function(a, b) { return a !== b; }))
        .classed("country-boundary", true)
        .attr("d", projectionPath);

    // draw radars:
    var radarSVGG = svg.append("g");
    var rpx, rpy;
    radarData.radars.forEach(function (radar, radi) {
        rpx = radarData.xPositions[radi];
        rpy = radarData.yPositions[radi];
        radarSVGG.append('svg:circle')
            .attr('cx', rpx)
            .attr('cy', rpy)
            .attr('r', 3)
            .classed("radar-center", true);

        var circle = d3.geo.circle()
            .origin(radar.coordinates)
            .angle(util.geoDistAngle(100));
        svg.append("path")
            .datum(circle)
            .attr("d", projectionPath)
            .classed("radar-radius", true);

        //var n = 36;
        //for (var i = 0; i < n; i++) {
        //    var bearing = util.mapRange(i, 0, n, 0, 360);
        //    var dest = util.destinationPoint(radar.coordinates, bearing, 100);
        //    var circle = d3.geo.circle()
        //        .origin(dest)
        //        .angle(.01);
        //    svg.append("path")
        //        .datum(circle)
        //        .attr("d", path)
        //        .classed("highlight", true);
        //}
    });

    // add the paths group:
    pathsSVGGroup = svg.append("g");

    // draw legend:
    //var legend = svg.append("g");
    var legendSVGGroup = svg.append("g");
    drawLegend(legendSVGGroup);
}

/**
 * Draw the paths.
 * @param {Object} data The dataService object.
 */
function drawPaths(data) {
    //console.log(">> drawPaths - wind: " + wind);
    var wind = data.windowCount;
    var half = Math.ceil(data.windowCount / 2);
    var xps = radarData.xPositions;
    var yps = radarData.yPositions;
    var idw = util.idw;

    // The angle (in degrees) of the radius around the radars in which to anchor flows:
    var radarRadiusAngle = util.geoDistAngle(75);

    //pathsSVGGroup.selectAll("*").remove();

    // pixels secs per meter, als volgt te gebruiken:
    // d[pxl] = speed[m/s] * (duration[s] * conv[pxl/m])
    var pspm =  util.geoDistAngle(1) / 1000 * data.windowDuration * 60;

    // the volume of the context in km3, i.e. area of circle with 100km
    // radius by 200m:
    //var contextVolume = Math.PI * 100 * 100 / 5;

    // for each altitude:
    var altn = data.altitudes.length;
    for (var alti = 0; alti < altn; alti++) {
        var densities = data.avDensities[alti];
        var hue = util.mapRange(alti, 0, altn, altiHueMin, altiHueMax);
        var lcolor = util.hsvToHex(hue, altiSaturation, altiBrightness);

        // for each radar:
        radarData.radars.forEach(function (radar, radi) {
            var radx = radar.coordinates[0];
            var rady = radar.coordinates[1];
            var pathGr = pathsSVGGroup.append("g");
            var pathn = util.mapRange(densities[radi], 0, maxDensity, 0, maxPathCnt);

            // for each path:
            for (var pathi = 0; pathi < pathn; pathi++) {
                //console.log("> pathi: " + pathi + " - alti: " + alti);
                var pa = Math.random() * Math.PI * 2;  // path anchor angle
                //pd = util.map(pathi, 0, pathn, 2, r100);
                var pd = Math.random() * radarRadiusAngle;  // path anchor distance
                var px0 = radx + Math.cos(pa) * pd;  // path anchor longitude
                var px = px0;
                var py0 = rady + Math.sin(pa) * pd;  // path anchor latitude
                var py = py0;
                var pp = projection([px, py]);  // projected point
                var wini, uSpeeds, vSpeeds, dx, dy, nx, ny, np;
                for (wini = half - 1; wini >= 0; wini--) {
                    //console.log("  > wini: " + wini + " - alti: " + alti);
                    if (data.uSpeeds[wini] === undefined) { // DEBUG
                        console.error("data.uSpeeds[wini] is undefined for"
                                      + " wini: " + wini + ", alti: " + alti);
                    }
                    uSpeeds = data.uSpeeds[wini][alti];
                    vSpeeds = data.vSpeeds[wini][alti];
                    dx = idw(px, py, uSpeeds, xps, yps, 2) * pspm;
                    dy = idw(px, py, vSpeeds, xps, yps, 2) * pspm;
                    
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

                    var lalpha = util.mapRange(wini, half - 1, 0, 0.9, 0.3);
                    var lwidth = util.mapRange(wini, half - 1, 0, 1.5, 1);
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
                    if (data.uSpeeds[wini] === undefined) { // DEBUG
                        console.error("data.uSpeeds[wini] is undefined for"
                                      + " wini: " + wini + ", alti: " + alti);
                    }
                    uSpeeds = data.uSpeeds[wini][alti];
                    vSpeeds = data.vSpeeds[wini][alti];
                    dx = idw(px, py, uSpeeds, xps, yps, 2) * pspm;
                    dy = idw(px, py, vSpeeds, xps, yps, 2) * pspm;

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
        });
    }
}

/**
 * Draws the legend.
 * @param legendSVGGroup
 */
function drawLegend(legendSVGGroup) {
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
        .text("200m");
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
    var alti, altn = altitudes.length;
    var dx = legendW / altn;
    var hue, hex;
    for (alti = 0; alti < altn; alti++) {
        hue = util.mapRange(alti, 0, altn, altiHueMin, altiHueMax);
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
