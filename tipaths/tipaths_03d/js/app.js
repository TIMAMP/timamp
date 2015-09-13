/*jshint unused: false, latedef: false */
/*jslint vars: true, plusplus: true, undef: true, continue: true */
/*global requirejs, require */

"use strict";

// TODO: There is a problem when setting strataCount to 1.

// Configuration settings that do not change:
var mapHeightFactor = 940 / 720;
var legendWidthFactor = 200 / 720;
var maxDensity = 3200;
var altiHueMin = 0.5;
var altiHueMax = 1;
var altiSaturation = 0.8;
var altiBrightness = 0.8;

// System variables:
var maxPathCnt;
var ras = [];   // random angles for path anchors
var rds = [];   // random distances for path anchors
var mapW = 100;
var mapH = 100;
var legendW;
var svg;
var pathsSVGGroup;
var projection;
var projectionPath;
var caseStudy;

/** @type {Object} */
var currData;

/**
 * Start the app. Call this function from a script element at the end of the html-doc.
 * @param {string} caseStudyUrl The url of the case study metadata json file.
 */
function startApp(caseStudyUrl) {

  // assert that SVG is supported by the browser:
  if (!document.implementation.hasFeature("http://www.w3.org/TR/SVG11/feature#Image", "1.1")) {
    alert('SVG is not supported in your browser. Please use a recent browser.');
    return;
  }

  // load the case study data:
  dataService.loadCaseStudy(caseStudyUrl, function (json) {
    //console.log(json);
    caseStudy = json;

    // parse the url query:
    var urlQuery = {};
    location.search.replace('\?','').split('&').map(function (nvPair) {
      nvPair = nvPair.split('=');
      urlQuery[nvPair[0]] = nvPair[1];
    });
    //console.log(urlQuery);
    if (urlQuery.strataCount) { setStrataCount(urlQuery.strataCount); }
    else if (urlQuery.altBands) { setStrataCount(urlQuery.altBands); }  // legacy

    var busy = 3;

    // load the topography:
    d3.json(caseStudy.topoJsonUrl, function (error, json) {
      if (error) {
        console.error(error);
        return;
      }
      caseStudy.topoJson = json;
      if (--busy == 0) initDone();
    });

    // load the query template:
    dataService.loadQueryTemplate(caseStudy.queryTemplateUrl, function () {
      if (--busy == 0) initDone();
    });

    var altn = caseStudy.strataCount, alti;
    maxPathCnt = maxDensity / altn;

    updateAnchors();
    updateColors();

    if (--busy == 0) initDone();
  });
}

/**
 * Prepare the fixed lists of random anchors.
 */
function updateAnchors() {
  // the angle (in degrees) of the radius around the radars in which to anchor flows:
  var radarRadiusAngle = util.geoDistAngle(150);
  var newRas = [];
  var newRds = [];
  var radn = caseStudy.radarCount;
  var altn = caseStudy.strataCount;
  for (var radi = 0; radi < radn; radi++) {
    var raraset = [];
    var rardset = [];
    for (var alti = 0; alti < altn; alti++) {
      var raset = [];
      var rdset = [];
      for (var i = 0; i < 50; i++) {
        raset.push(Math.random() * Math.PI * 2);
        rdset.push(Math.random() * radarRadiusAngle);
      }
      raraset.push(raset);
      rardset.push(rdset);
    }
    newRas.push(raraset);
    newRds.push(rardset);
  }
  ras = newRas;
  rds = newRds;
}

/**
 * Prepare the hues for the altitude strata.
 */
function updateColors() {
  caseStudy.hues = [];
  caseStudy.altHexColors = [];
  var altn = caseStudy.strataCount;
  for (var alti = 0; alti < altn; alti++) {
    var hue = util.mapRange(alti, 0, altn - 1, altiHueMin, altiHueMax);
    caseStudy.hues.push(hue);
    caseStudy.altHexColors.push(util.hsvToHex(hue, altiSaturation, altiBrightness));
  }
}

/**
 * Use this function to update the strataCount value in the case study.
 * @param {number} newCount
 */
function setStrataCount(newCount) {
  // Assert that the strata count is a whole divisor of the number
  // of altitudes in the data.
  if (caseStudy.altitudes % newCount != 0) {
    console.error("The given strata count (" + newCount
      + ") should be a whole divisor of the number of altitudes in the data ("
      + caseStudy.altitudes + ").");
    return;
  }

  caseStudy.strataCount = newCount;
}

function initDone() {
  //dataService.printSpecifics_01();
  //dataService.printSpecifics_01b();
  //dataService.printSpecifics_01c();

  caseStudy.focusDuration = 8;

  var dayMin = caseStudy.minMoment.date();
  var dayMax = caseStudy.maxMoment.date();

  d3.select("#input-day")
    .property('value', caseStudy.focusMoment.date())
    .attr('min', caseStudy.minMoment.date())
    .attr('max', caseStudy.maxMoment.date())
    .on('change', function () {
      //console.log("change", d3.select(this).property('value'));
      var date = parseInt(d3.select(this).property('value'));
      caseStudy.focusMoment.date(date);
      updateMap(true, false);
    });

  d3.select("#input-hour")
    .property('value', caseStudy.focusMoment.hour())
    .on('change', function () {
      var inputDay = d3.select("#input-day");
      var date = parseInt(inputDay.property('value'));
      var inputHour = d3.select("#input-hour");
      var hour = parseInt(inputHour.property('value'));
      if (hour >= 24) {
        if (date >= dayMax) {
          date = dayMax;
          hour = 23;
        }
        else {
          date++;
          hour = 0;
        }
      }
      else if (hour < 0) {
        if (date <= dayMin) {
          date = dayMin;
          hour = 0;
        }
        else {
          date--;
          hour = 23;
        }
      }

      inputDay.property('value', date);
      inputHour.property('value', hour);

      var focusDirty = false;
      if (caseStudy.focusMoment.date() != date) {
        caseStudy.focusMoment.date(date);
        focusDirty = true;
      }
      if (caseStudy.focusMoment.hour() != hour) {
        caseStudy.focusMoment.hour(hour);
        focusDirty = true;
      }
      if (focusDirty) updateMap(true, false);
    });

  d3.select("#input-strata")
    .selectAll('option')
    .data(caseStudy.strataCounts)
    .enter().append("option")
    .property('value', util.id)
    .text(util.id);
  d3.select("#input-strata")
    .property('value', caseStudy.strataCount)
    .on('change', function () {
      //console.log("input-strata changed:", d3.select(this).property('value'));
      setStrataCount(d3.select(this).property('value'));
      updateAnchors();
      updateColors();
      updateMap(true, true);
    });

  d3.select("#input-duration")
    .property('value', caseStudy.focusDuration)
    .on('change', function () {
      caseStudy.focusDuration = parseInt(d3.select("#input-duration").property('value'));
      updateMap(true, false);
    });

  d3.select(window)
    .on('resize', Foundation.utils.throttle(function(e) {
      if (d3.select("#map-container").node().getBoundingClientRect().width != mapW) {
        updateMap(false, true);
      }
    }, 25));

  // First update the map data and add the svg element to avoid miscalculation
  // of the actual size of the svg content (on Chrome).
  updateMapData();
  svg = d3.select("#map-container").append("svg")
    .style("width", mapW)
    .style("height", mapH);

  // Now update the map for real:
  updateMap(true, true);
}

function updateMap(dataDirty, mapDirty) {
  if (mapDirty) updateMapData();

  drawMap();

  if (dataDirty) {
    var data = {
      focusMoment: moment.utc(caseStudy.focusMoment),
      interval : 20 /* the duration of a window in minutes */,
      intervalCount: caseStudy.focusDuration * 3
    };
    dataService.loadData(caseStudy.queryBaseUrl, data, caseStudy, function () {
      currData = data;
      drawPaths(currData);
    });
  }
  else {
    //console.log(currData);
    drawPaths(currData);
  }
}

function updateMapData() {
  var svgRect = d3.select("#map-container").node().getBoundingClientRect();
  mapW = svgRect.width;
  //console.log("- mapW:", mapW);
  mapH = mapW * mapHeightFactor;
  legendW = mapW * legendWidthFactor;

  // specify the projection based of the size of the map:
  projection = d3.geo.mercator()
    .scale(caseStudy.mapScaleFactor * mapW)
    .translate([mapW / 2, mapH / 2])
    .center(caseStudy.mapCenter);

  // initialize the d3 path with which to draw the geography:
  projectionPath = d3.geo.path().projection(projection);

  // update radar positions:
  caseStudy.xPositions = [];
  caseStudy.yPositions = [];
  caseStudy.radars.forEach(function (radar, i) {
    var radp = projection([radar.longitude, radar.latitude]);
    caseStudy.xPositions[i] = radp[0];
    caseStudy.yPositions[i] = radp[1];
  });
};

function drawMap() {
  if (svg) { svg.remove(); }
  svg = d3.select("#map-container").append("svg")
    .attr("width", mapW)
    .attr("height", mapH)
    .classed("map", true);

  svg.append("defs")
    .append("clipPath")
    .attr("id", "clipRect")
    .append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", mapW)
    .attr("height", mapH);

  var svgGroup = svg.append("svg:g")
    .attr("style", "clip-path: url(#clipRect);");

  var datum = topojson.feature(
    caseStudy.topoJson,
    caseStudy.topoJson.objects.countries
  );
  svgGroup.append("svg:path")
    .datum(datum)
    .classed("map-land", true)
    .attr("d", projectionPath);

  datum = topojson.mesh(
    caseStudy.topoJson,
    caseStudy.topoJson.objects.countries,
    function(a, b) { return a !== b; }
  );
  svgGroup.append("svg:path")
    .datum(datum)
    .classed("country-boundary", true)
    .attr("d", projectionPath);

  var graticule = d3.geo.graticule()
    .step([1, 1]);
  svgGroup.append("svg:path")
    .datum(graticule)
    .classed("graticule", true)
    .attr("d", projectionPath);

  // draw radars:
  var radarGroup = svgGroup.append("svg:g");
  var rpx, rpy;
  caseStudy.radars.forEach(function (radar, radi) {
    rpx = caseStudy.xPositions[radi];
    rpy = caseStudy.yPositions[radi];
    //radarGroup.append('svg:circle')
    //  .attr('cx', rpx)
    //  .attr('cy', rpy)
    //  .attr('r', 3)
    //  .classed("radar-center", true);

    var circle = d3.geo.circle()
      .origin(radar.coordinate)
      .angle(util.geoDistAngle(100));
    radarGroup.append("svg:path")
      .datum(circle)
      .attr("d", projectionPath)
      .classed("radar-radius", true);

    //var n = 36;
    //for (var i = 0; i < n; i++) {
    //    var bearing = util.mapRange(i, 0, n, 0, 360);
    //    var dest = util.destinationPoint(radar.coordinate, bearing, 100);
    //    var circle = d3.geo.circle()
    //        .origin(dest)
    //        .angle(.01);
    //    radarGroup.append("svg:path")
    //        .datum(circle)
    //        .attr("d", projectionPath)
    //        .classed("highlight", true);
    //}
  });

  // add the paths group:
  pathsSVGGroup = svgGroup.append("svg:g");

  // draw legends:
  drawColorLegend(svgGroup.append("svg:g"));
  drawSizeLegend(svgGroup.append("svg:g"), caseStudy.scaleLegendMarkers);
}

/**
 * Draw the paths.
 * @param {Object} data The data object.
 */
function drawPaths(data) {
  //console.log(">> drawPaths - wind: " + wind);
  var wind = data.intervalCount;
  var half = Math.ceil(data.intervalCount / 2);
  var xps = caseStudy.xPositions;
  var yps = caseStudy.yPositions;
  var idw = util.idw;

  // angle secs per meter, obtained by multiplying the angle that corresponds
  // to a displacement of 1 meter on the earth's surface multiplied by the duration
  // of one interval in seconds. Multiplying this asm value with a speed in
  // meters per second yields the angle of the displacement at that speed during
  // one interval.
  var asm =  util.geoDistAngle(1) / 1000 * data.interval * 60;

  // the volume of the context in km3, i.e. area of circle with 100km
  // radius by 200m:
  //var contextVolume = Math.PI * 100 * 100 / 5;

  // for each altitude:
  var altn = caseStudy.strataCount;
  for (var alti = 0; alti < altn; alti++) {
    var densities = data.avDensities[alti];
    var hue = caseStudy.hues[alti];
    var lcolor = caseStudy.altHexColors[alti];

    // for each radar:
    caseStudy.radars.forEach(function (radar, radi) {
      var radx = radar.longitude;
      var rady = radar.latitude;
      var pathGr = pathsSVGGroup.append("svg:g");
      var pathn = util.mapRange(densities[radi], 0, maxDensity, 0, maxPathCnt);

      // for each path:
      for (var pathi = 0; pathi < pathn; pathi++) {
        //console.log("> pathi: " + pathi + " - alti: " + alti);
        var pa = ras[radi][alti][pathi];  // path anchor angle
        var pd = rds[radi][alti][pathi];  // path anchor distance
        var px0 = radx + Math.cos(pa) * pd;  // path anchor longitude
        var px = px0;
        var py0 = rady + Math.sin(pa) * pd;  // path anchor latitude
        var py = py0;
        var pp = projection([px, py]);  // projected point
        var wini, dx, dy, nx, ny, np;
        for (wini = half - 1; wini >= 0; wini--) {
          //console.log("  > wini: " + wini + " - alti: " + alti);
          if (data.uSpeeds[wini] === undefined) { // DEBUG
            console.error("data.uSpeeds[wini] is undefined for"
              + " wini: " + wini + ", alti: " + alti);
          }
          dx = idw(px, py, data.uSpeeds[wini][alti], xps, yps, 2) * asm;
          dy = idw(px, py, data.vSpeeds[wini][alti], xps, yps, 2) * asm;
          nx = px - dx;
          ny = py - dy;

          np = projection([nx, ny]);
          //console.log("    nx: " + nx + ", ny: " + ny + ", dx: " + nx + ", dy: " + ny + ", np: " + np);

          //if (isNaN(px) || isNaN(dx)) {
          //  console.log("wini: " + wini);
          //  console.log("alti: " + alti);
          //  console.log("pathi: " + pathi);
          //  console.log("px: " + px);
          //  console.log("py: " + py);
          //  console.log("dx: " + dx);
          //  console.log("dy: " + dx);
          //  console.log("uSpeeds: " + data.uSpeeds[wini][alti]);
          //  console.log("xps: " + xps);
          //  console.log("yps: " + yps);
          //  console.log("pspm: " + pspm);
          //  console.log("half: " + half);
          //  console.log("pspm: " + pspm);
          //  console.log("px0: " + px0 + ", pa: " + pa + ", pd: " + pd);
          //  console.log("radx: " + radx + ", rady: " + rady);
          //  //console.log("idw(px, py, uSpeeds, xps, yps, 2): " + idw(px, py, uSpeeds, xps, yps, 2));
          //  return;
          //}

          var lalpha = util.mapRange(wini, half - 1, 0, 0.9, 0.3);
          var lwidth = util.mapRange(wini, half - 1, 0, 1.5, 1);
          pathGr.append("svg:line")
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
          dx = idw(px, py, data.uSpeeds[wini][alti], xps, yps, 2) * asm;
          dy = idw(px, py, data.vSpeeds[wini][alti], xps, yps, 2) * asm;
          px += dx;
          py += dy;
          np = projection([px, py]);
          points += " " + np[0] + "," + np[1];
        }
        pathGr.append("svg:polyline")
          .attr("points", points)
          .attr("style", "stroke:" + lcolor +
          ";fill:none;stroke-width:1.5;opacity:" + 1);
        pathGr.append('svg:circle')
          .attr('cx', np[0])
          .attr('cy', np[1])
          .attr('r', 2)
          .attr("style", "fill:" + util.hsvToHex(hue, altiSaturation, altiBrightness)
          + ";opacity:0.5");
      }
    });
  }
}

/**
 * Draws the legend.
 * @param svgGroup
 */
function drawColorLegend_hor(svgGroup) {
  var legendH = 12;
  var legendL = 25;
  //var tx0 = legendL;
  //var td = 6;
  var ty = mapH - 20 - legendH - 8;
  var markerGr = svgGroup.append("svg:g");
  markerGr.append("svg:text")
    .classed("legend-label", true)
    .attr("x", legendL)
    .attr("y", ty)
    .attr("text-anchor", "middle")
    .text("0");
  markerGr.append("svg:text")
    .classed("legend-label", true)
    .attr("x", legendL + legendW / 2)
    .attr("y", ty)
    .attr("text-anchor", "middle")
    .text("2");
  markerGr.append("svg:text")
    .classed("legend-label", true)
    .attr("x", legendL + legendW + 6)
    .attr("y", ty)
    .attr("text-anchor", "middle")
    .text("4 km");

  var lineH = 7;
  svgGroup.append("svg:line")
    .classed("scale-legend-line", true)
    .attr("x1", legendL)
    .attr("y1", mapH - 20 - legendH - lineH)
    .attr("x2", legendL)
    .attr("y2", mapH - 20);
  svgGroup.append("svg:line")
    .classed("scale-legend-line", true)
    .attr("x1", legendL + legendW / 2)
    .attr("y1", mapH - 20 - legendH - lineH)
    .attr("x2", legendL + legendW / 2)
    .attr("y2", mapH - 20);
  svgGroup.append("svg:line")
    .classed("scale-legend-line", true)
    .attr("x1", legendL + legendW)
    .attr("y1", mapH - 20 - legendH - lineH)
    .attr("x2", legendL + legendW)
    .attr("y2", mapH - 20);

  var tx = legendL;
  ty = mapH - 20 - legendH;
  var alti, altn = caseStudy.strataCount;
  var dx = legendW / altn;
  for (alti = 0; alti < altn; alti++) {
    svgGroup.append("svg:rect")
      .attr("x", tx)
      .attr("y", ty)
      .attr("width", Math.ceil(dx))
      .attr("height", legendH)
      .attr("style", "fill:" + caseStudy.altHexColors[alti] + ";");
    tx += dx;
  }
}

function drawColorLegend(svgGroup) {
  var margin = 20;
  var legendW = 12;
  var legendH = 100;
  var legendT = margin;

  var ty = legendT;
  var alti, altn = caseStudy.strataCount;
  var dy = legendH / altn;
  var hue, hex;
  for (alti = altn - 1; alti >= 0; alti--) {
    svgGroup.append("svg:rect")
      .attr("x", margin)
      .attr("y", ty)
      .attr("width", legendW)
      .attr("height", Math.ceil(dy))
      .attr("style", "fill:" + caseStudy.altHexColors[alti] + ";");
    ty += dy;
  }

  var lineW = 7;
  svgGroup.append("svg:line")
    .classed("scale-legend-line", true)
    .attr("x1", margin)
    .attr("y1", legendT)
    .attr("x2", margin + legendW + lineW)
    .attr("y2", legendT);
  svgGroup.append("svg:line")
    .classed("scale-legend-line", true)
    .attr("x1", margin + legendW)
    .attr("y1", legendT + legendH / 2)
    .attr("x2", margin + legendW + lineW)
    .attr("y2", legendT + legendH / 2);
  svgGroup.append("svg:line")
    .classed("scale-legend-line", true)
    .attr("x1", margin)
    .attr("y1", legendT + legendH)
    .attr("x2", 84)
    .attr("y2", legendT + legendH);

  svgGroup.append("svg:text")
    .classed("legend-label", true)
    .attr("x", margin + legendW + lineW + 4)
    .attr("y", legendT + 4)
    .text("4000 m");
  svgGroup.append("svg:text")
    .classed("legend-label", true)
    .attr("x", margin + legendW + lineW + 4)
    .attr("y", legendT + legendH / 2 + 4)
    .text("2000 m");

  svgGroup.append("svg:text")
    .classed("legend-label", true)
    .attr("x", margin + legendW + lineW + 2)
    .attr("y", legendT + legendH - 4)
    .text("altitude");
}

function drawSizeLegend(svgGroup, markers) {
  var totalKm = markers[2];
  var radar = caseStudy.radars[0];
  var destCoord = util.destinationPoint(radar.coordinate, 90, totalKm);
  var destProj = projection(destCoord);
  //console.log(totalKm, radar.coordinate, destCoord);
  //console.log(destProj, destProj[0], caseStudy.xPositions[0], legendW);
  var legendW = destProj[0] - caseStudy.xPositions[0];
  var marginR = 45;
  var legendL = mapW - marginR - legendW;
  var legendR = mapW - marginR;
  var lineH = 7;
  var ty = mapH - 20 - lineH - 4;

  var markerGr = svgGroup.append("svg:g");
  markerGr.append("svg:text")
    .classed("legend-label", true)
    .attr("x", legendL)
    .attr("y", ty)
    .attr("text-anchor", "middle")
    .text("0");
  markerGr.append("svg:text")
    .classed("legend-label", true)
    .attr("x", (legendL + legendR) / 2)
    .attr("y", ty)
    .attr("text-anchor", "middle")
    .text(markers[1]);
  markerGr.append("svg:text")
    .classed("legend-label", true)
    .attr("x", legendR + 8)
    .attr("y", ty)
    .attr("text-anchor", "middle")
    .text(markers[2] + " km");

  svgGroup.append("svg:line")
    .classed("scale-legend-line", true)
    .attr("x1", legendL)
    .attr("y1", mapH - 20)
    .attr("x2", legendR)
    .attr("y2", mapH - 20);
  svgGroup.append("svg:line")
    .classed("scale-legend-line", true)
    .attr("x1", legendL)
    .attr("y1", mapH - 20 - lineH)
    .attr("x2", legendL)
    .attr("y2", mapH - 20);
  svgGroup.append("svg:line")
    .classed("scale-legend-line", true)
    .attr("x1", (legendL + legendR) / 2)
    .attr("y1", mapH - 20 - lineH)
    .attr("x2", (legendL + legendR) / 2)
    .attr("y2", mapH - 20);
  svgGroup.append("svg:line")
    .classed("scale-legend-line", true)
    .attr("x1", legendR)
    .attr("y1", mapH - 20 - lineH)
    .attr("x2", legendR)
    .attr("y2", mapH - 20);
}
