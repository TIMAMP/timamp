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
var mapW = 720;
var mapH = 940;
var mapCenter = [5, 51.5];
var mapScale = 1000; // ori: 600
var r100, r50;
var pathsSVGGroup;

function init() {
    $(document).foundation();
    
    if (!SVG.supported) {
        alert('SVG not supported');
        return;
    }
    
    var projection = d3.geo.mercator()
        .scale(mapScale)
        .translate([mapW / 2, mapH / 2])
        .center(mapCenter);
    
//    var projection = d3.geo.albersUsa()
//        .scale(1000)
//        .translate([mapW / 2, mapH / 2]);
    
    var path = d3.geo.path()
        .projection(projection);

    var svg = d3.select("#svg").append("svg")
        .attr("width", mapW)
        .attr("height", mapH);
    
    d3.json("data/eu.topo.json", function(error, eu) {
        //console.log(topojson.feature(eu, eu.objects.europe));
        
        svg.insert("path", ".graticule")
            .datum(topojson.feature(eu, eu.objects.europe))
            .attr("class", "land")
            .attr("d", path);

        svg.insert("path", ".graticule")
            .datum(topojson.mesh(eu, eu.objects.europe, function(a, b) { return true; }))
            .attr("class", "country-boundary")
            .attr("d", path);

//      svg.insert("path", ".graticule")
//          .datum(topojson.mesh(us, us.objects.states, function(a, b) { return a !== b; }))
//          .attr("class", "state-boundary")
//          .attr("d", path);
    });

    d3.select(self.frameElement).style("height", mapH + "px");
}

function init_2() {
    //console.log("INIT");
    $(document).foundation();
    
    if (!SVG.supported) {
        alert('SVG not supported');
        return;
    }
    
    map = new Map(mapH);
    //console.log("- map.width: " + map.width);

    r100 = map.dmxToPxl(100000); // 100 km
    r50 = map.dmxToPxl(50000); // 50 km

    var svgWidth = $("#svg").parent().width();
    var svgHeight = svgWidth * mapH / mapW;
    //console.log("svg size: " + svgWidth + " / " + svgHeight);
    var viz = SVG('svg').size(svgWidth, svgHeight);
    viz.viewbox(0, 0, mapW, mapH);
    //viz.rect(mapW, mapH).fill("#ddeeff");

    $(window).on('resize', Foundation.utils.throttle(function(e) {
        var svgWidth = $("#svg").parent().width();
        var svgHeight = svgWidth * mapH / mapW;
        //console.log("svg size: " + svgWidth + " / " + svgHeight);
        viz.size(svgWidth, svgHeight);
    }, 25));


    $.get("images/basemap_03.svg", function (svgData) {
        //console.log(svgData);
        // add the map:
        var store = viz.svg(svgData);
        var mapSVGGroup = store.roots()[0];
        //mapSVGGroup.scale(700 / 999);

        data.loadRadars(function() {
            data.radars.xPositions = [];
            data.radars.yPositions = [];
            var radi, radn = data.radars.length, radar, radp;
            for (radi = 0; radi < radn; radi++) {
                radar = data.radars[radi];
                radp = map.locToPxl(radar.coordinates[0], radar.coordinates[1]);
                data.radars.xPositions[radi] = radp.x;
                data.radars.yPositions[radi] = radp.y;
            }

            // Draw radars:
            var radarSVGG = mapSVGGroup.group();
            radarSVGG.fill("#9090BF");
            var rpx, rpy;
            for (radi = 0; radi < radn; radi++) {
                rpx = data.radars.xPositions[radi];
                rpy = data.radars.yPositions[radi];
                radarSVGG.circle(5).translate(rpx, rpy);
            }

            // add the paths group:
            pathsSVGGroup = viz.group();

            // draw legend:
            var legendSVGGroup = viz.group();
            drawLegend(legendSVGGroup);

            $("#input_days").change(redraw);
            $("#input_hours").change(redraw);
            $("#input_minutes").change(redraw);
            $("#input_duration").change(redraw);

            redraw();
        });

    }, 'text');
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
            altitudes : altitudes,
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
        pa = 0, pd, px, py, px0, py0, dx, dy, nx, ny,
        xps = data.radars.xPositions,
        yps = data.radars.yPositions,
        idw = util.idw,
        asat = altiSaturation,
        abri = altiBrightness,
        lalpha,
        lwidth = 1.5;

    pathsSVGGroup.clear();

    // pixels secs per meter, als volgt te gebruiken:
    // d[pxl] = speed[m/s] * (duration[s] * conv[pxl/m])
    var pspm = map.dmxToPxl(1) * dob.windowDuration * 60;

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
            radx = xps[radi];
            rady = yps[radi];

            // for each path:
            var pathGr = pathsSVGGroup.group();
            var lcolor = util.hsvToRgb(hue, asat, abri)
            pathGr.stroke({
                color: lcolor,
                opacity: 0.9
            });

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
                    nx = px - dx;
                    ny = py + dy;


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
                    pathGr.line(px, py, nx, ny).stroke({
                        color: lcolor,
                        opacity: lalpha,
                        width: lwidth
                    });
                    px = nx;
                    py = ny;
                }
                px = px0;
                py = py0;
                var path = [[px, py]];
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

                    px += dx;
                    py -= dy;
                    path.push([px, py]);
                }
                pathGr.polyline(path)
                    .fill('none')
                    .stroke({
                        color: lcolor,
                        opacity: 1,
                        width: 1.5
                    });

                pathGr.circle(2).translate(px - 1, py - 1).fill({
                    color: util.hsvToRgb(hue, 0.8, 0.6),
                    opacity: 0.5
                });
            }
        }
    }
}

// -----------------------------------------------------------------------------

function drawLegend(legendSVGGroup) {
    var legendW = 200;
    var legendH = 16;

    var markerG = legendSVGGroup.group();
    var tx0 = 20;
    var tx = tx0;
    var td = 6;
    var ty = mapH - 20 - legendH - 3 - td - 24
    markerG.font({ family: 'Helvetica', size: 14 });
    markerG.text("200m").translate(tx0, ty);
    markerG.text("2000m")
        .translate(tx0 + legendW / 2, ty)
        .font({anchor: 'middle'});
    markerG.text("4000m")
        .translate(tx0 + legendW, ty)
        .font({anchor: 'end'});

    ty = mapH - 20 - legendH - 3 - td;
    markerG.fill("#555");
    markerG.polygon([[tx, ty], [tx + td, ty], [tx, ty + td]]);
    tx = tx0 + legendW;
    markerG.polygon([[tx, ty], [tx - td, ty], [tx, ty + td]]);
    tx = tx0 + legendW / 2;
    td = 5
    markerG.polygon([[tx - td, ty], [tx + td, ty], [tx, ty + td]]);

    tx = 20;
    ty = mapH - 20 - legendH;
    var alti, altn = altitudes.length;
    var dx = legendW / altn;
    var hue, hex;
    for (alti = 0; alti < altn; alti++) {
        hue = util.map(alti, 0, altn, altiHueMin, altiHueMax);
        hex = util.hsvToHex(hue, altiSaturation, altiBrightness);
        legendSVGGroup.rect(Math.ceil(dx), legendH).translate(tx, ty).fill(hex);
        tx += dx;
    }
}

// -----------------------------------------------------------------------------

