/*jshint unused: false, latedef: false */
/*jslint vars: true, plusplus: true, undef: true, continue: true */
/*global requirejs, require */

"use strict";

moment.utc();

//    console.log("SVG.parse: " + SVG.parse);
//    console.log("SVG.ImportStore: " + SVG.ImportStore);

// Configuration settings that do not change:
var maxDensity = 3200;
var altiHueMin = 0.5;
var altiHueMax = 1;
var altiSaturation = 0.8;
var altiBrightness = 0.8;
var maxPathCnt;
var ras = [];   // random angles for path anchors
var rds = [];   // random distances for path anchors
var mapHeightFactor = 940 / 720;
var mapW = 100;
var mapH = 100;
var legendWidthFactor = 200 / 720;
var legendW;
var svg;
var pathsSVGGroup;
var projection;
var projectionPath;
var caseService;
var caseStudy;
var topography;

/** @type {Object} */
var currData;

function initApp(theCaseService) {
  caseService = theCaseService;

  $(document).foundation(); // TODO

  if (!document.implementation.hasFeature("http://www.w3.org/TR/SVG11/feature#Image", "1.1")) {
    alert('SVG is not supported in your browser. Please use a recent browser.');
    return;
  }

  var busy = 3;

  d3.json(caseService.topoJsonUrl, function (error, json) {
    if (error) {
      console.error(error);
      return;
    }
    topography = json;
    if (--busy == 0) initDone();
  });
  dataService.loadCaseStudy(caseService.caseStudyUrl, function (json) {
    //console.log(json);
    caseStudy = json;
    var altn = caseStudy.altitudes.length;
    maxPathCnt = maxDensity / altn;

    // the angle (in degrees) of the radius around the radars in which to anchor flows:
    var radarRadiusAngle = util.geoDistAngle(150);

    // prepare the fixed lists of random anchors:
    for (var alti = 0; alti < altn; alti++) {
      var raset = [];
      var rdset = [];
      for (var i = 0; i < 100; i++) {
        raset.push(Math.random() * Math.PI * 2);
        rdset.push(Math.random() * radarRadiusAngle);
      }
      ras.push(raset);
      rds.push(rdset);
    }

    if (--busy == 0) initDone();
  });
  dataService.loadQueryTemplate(caseService.queryTemplateUrl, function () {
    if (--busy == 0) initDone();
  });
}

function initDone() {
  //dataService.printSpecifics_01();
  //dataService.printSpecifics_01b();
  //dataService.printSpecifics_01c();

  var dateMin = caseStudy.minMoment.date();
  var dateMax = caseStudy.maxMoment.date();

  d3.select("#input_date")
    .property('value', caseStudy.focusMoment.date())
    .attr('min', caseStudy.minMoment.date())
    .attr('max', caseStudy.maxMoment.date())
    .on('change', function () {
      //console.log("change", d3.select(this).property('value'));
      var date = parseInt(d3.select(this).property('value'));
      caseStudy.focusMoment.date(date);
      updateMap(true, false);
    });

  d3.select("#input_hour")
    .property('value', caseStudy.focusMoment.hour())
    .on('change', function () {
      var input_date = d3.select("#input_date");
      var date = parseInt(input_date.property('value'));
      var input_hour = d3.select("#input_hour");
      var hour = parseInt(input_hour.property('value'));
      if (hour >= 24) {
        if (date >= dateMax) {
          date = dateMax;
          hour = 23;
        }
        else {
          date++;
          hour = 0;
        }
      }
      else if (hour < 0) {
        if (date <= dateMin) {
          date = dateMin;
          hour = 0;
        }
        else {
          date--;
          hour = 23;
        }
      }

      input_date.property('value', date);
      input_hour.property('value', hour);

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

  d3.select("#input_minute")
    .property('value', caseStudy.focusMoment.minute())
    .on('change', function () {
      var input_date = d3.select("#input_date");
      var date = parseInt(input_date.property('value'));
      var input_hour = d3.select("#input_hour");
      var hour = parseInt(input_hour.property('value'));
      var input_minute = d3.select("#input_minute");
      var minute = parseInt(input_minute.property('value'));

      if (minute >= 60) {
        if (hour >= 23) {
          if (date >= dateMax) {
            date = dateMax;
            hour = 23;
            minute = 50;
          }
          else {
            date++;
            hour = 0;
            minute = 0;
          }
        }
        else {
          hour++;
          minute = 0;
        }
      }
      else if (minute < 0) {
        if (hour <= 0) {
          if (date <= dateMin) {
            date = dateMin;
            hour = 0;
            minute = 0;
          }
          else {
            date--;
            hour = 23;
            minute = 50;
          }
        }
        else {
          hour--;
          minute = 50;
        }
      }

      input_date.property('value', date);
      input_hour.property('value', hour);
      input_minute.property('value', minute);

      var focusDirty = false;
      if (caseStudy.focusMoment.date() != date) {
        caseStudy.focusMoment.date(date);
        focusDirty = true;
      }
      if (caseStudy.focusMoment.hour() != hour) {
        caseStudy.focusMoment.hour(hour);
        focusDirty = true;
      }
      if (caseStudy.focusMoment.minute() != minute) {
        caseStudy.focusMoment.minute(minute);
        focusDirty = true;
      }
      if (focusDirty) updateMap(true, false);
    });

  d3.select("#input_duration")
    .on('change', function () {
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
      intervalCount: parseInt($("#input_duration").val()) * 3
    };
    dataService.loadData(caseService.queryBaseUrl, data, caseStudy, function () {
      currData = data;
      drawPaths(currData);
    });
  }
  else {
    console.log(currData);
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
    .scale(caseService.mapScaleFactor * mapW)
    .translate([mapW / 2, mapH / 2])
    .center(caseService.mapCenter);

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
    .style("width", mapW)
    .style("height", mapH)
    .classed("map", true);

  var datum = topojson.feature(
    topography,
    topography.objects.countries
  );
  svg.append("svg:path")
    .datum(datum)
    .classed("map-land", true)
    .attr("d", projectionPath);

  datum = topojson.mesh(
    topography,
    topography.objects.countries,
    function(a, b) { return a !== b; }
  );
  svg.append("svg:path")
    .datum(datum)
    .classed("country-boundary", true)
    .attr("d", projectionPath);

  var graticule = d3.geo.graticule()
    .step([1, 1]);
  svg.append("svg:path")
    .datum(graticule)
    .classed("graticule", true)
    .attr("d", projectionPath);

  // draw radars:
  var radarSVGG = svg.append("svg:g");
  var rpx, rpy;
  caseStudy.radars.forEach(function (radar, radi) {
    rpx = caseStudy.xPositions[radi];
    rpy = caseStudy.yPositions[radi];
    //radarSVGG.append('svg:circle')
    //  .attr('cx', rpx)
    //  .attr('cy', rpy)
    //  .attr('r', 3)
    //  .classed("radar-center", true);

    var circle = d3.geo.circle()
      .origin(radar.coordinate)
      .angle(util.geoDistAngle(100));
    svg.append("svg:path")
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
    //    svg.append("svg:path")
    //        .datum(circle)
    //        .attr("d", projectionPath)
    //        .classed("highlight", true);
    //}
  });

  // add the paths group:
  pathsSVGGroup = svg.append("svg:g");

  // draw legends:
  drawColorLegend(svg.append("svg:g"));
  drawSizeLegend(svg.append("svg:g"), caseService.scaleLegendMarkers);
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
  var altn = caseStudy.altitudes.length;
  for (var alti = 0; alti < altn; alti++) {
    var densities = data.avDensities[alti];
    var hue = util.mapRange(alti, 0, altn, altiHueMin, altiHueMax);
    var lcolor = util.hsvToHex(hue, altiSaturation, altiBrightness);

    // for each radar:
    caseStudy.radars.forEach(function (radar, radi) {
      var radx = radar.longitude;
      var rady = radar.latitude;
      var pathGr = pathsSVGGroup.append("svg:g");
      var pathn = util.mapRange(densities[radi], 0, maxDensity, 0, maxPathCnt);

      // for each path:
      for (var pathi = 0; pathi < pathn; pathi++) {
        //console.log("> pathi: " + pathi + " - alti: " + alti);
        var pa = ras[alti][pathi];  // path anchor angle
        var pd = rds[alti][pathi];  // path anchor distance
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
          .attr("style", "fill:" + util.hsvToHex(hue, 0.8, 0.6)
          + ";opacity:0.5");
      }
    });
  }
}

/**
 * Draws the legend.
 * @param svgGroup
 */
function drawColorLegend(svgGroup) {
  var legendH = 16;

  var markerGr = svgGroup.append("svg:g");
  var tx0 = 20;
  var tx = tx0;
  var td = 6;
  var ty = mapH - 20 - legendH - 3 - td - 4;
  markerGr.append("svg:text")
    .classed("legend-label", true)
    .attr("x", tx0)
    .attr("y", ty)
    .text("200m");
  markerGr.append("svg:text")
    .classed("legend-label", true)
    .attr("x", tx0 + legendW / 2)
    .attr("y", ty)
    .attr("text-anchor", "middle")
    .text("2000m");
  markerGr.append("svg:text")
    .classed("legend-label", true)
    .attr("x", tx0 + legendW)
    .attr("y", ty)
    .attr("text-anchor", "end")
    .text("4000m");

  ty = mapH - 20 - legendH - 3 - td;
  var points = tx + "," + ty;
  points += " " + (tx + td) + "," + ty;
  points += " " + tx + "," + (ty + td);
  markerGr.append("svg:polygon")
    .attr("points", points)
    .classed("color-legend-label-anchor", true);

  tx = tx0 + legendW;
  points = tx + "," + ty;
  points += " " + (tx - td) + "," + ty;
  points += " " + tx + "," + (ty + td);
  markerGr.append("svg:polygon")
    .attr("points", points)
    .classed("color-legend-label-anchor", true);

  tx = tx0 + legendW / 2;
  td = 5
  points = (tx - td) + "," + ty;
  points += " " + (tx + td) + "," + ty;
  points += " " + tx + "," + (ty + td);
  markerGr.append("svg:polygon")
    .attr("points", points)
    .classed("color-legend-label-anchor", true);

  tx = 20;
  ty = mapH - 20 - legendH;
  var alti, altn = caseStudy.altitudes.length;
  var dx = legendW / altn;
  var hue, hex;
  for (alti = 0; alti < altn; alti++) {
    hue = util.mapRange(alti, 0, altn, altiHueMin, altiHueMax);
    hex = util.hsvToHex(hue, altiSaturation, altiBrightness);
    svgGroup.append("svg:rect")
      .attr("x", tx)
      .attr("y", ty)
      .attr("width", Math.ceil(dx))
      .attr("height", legendH)
      .attr("style", "fill:" + hex + ";");
    tx += dx;
  }
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
