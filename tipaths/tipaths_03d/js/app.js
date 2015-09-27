/*jshint unused: false, latedef: false */
/*jslint vars: true, plusplus: true, undef: true, continue: true */
/*global requirejs, require */

"use strict";

// -----------------------------------------------------------------------------
// Configuration settings that do not change:

/**
 * The radius around radars in km in which path anchors are considered.
 * @type {number}
 */
var radarAnchorRadius = 75;

/**
 * the interval between anchors in km
 * @type {number}
 */
var anchorInterval = 10;

/**
 * The number of birds each path represents.
 * @type {number}
 */
var pathBirdCount = 50000;

/**
 * The height of the template map divided by its width, used to obtain the actual
 * height of the map, given the actual width after resizing.
 * @type {number}
 */
var mapHeightFactor = 940 / 720;

/**
 * The template legend width divided by the template map width, used to obtain the
 * actual width of the legend, given the actual width after resizing.
 * @type {number}
 */
var legendWidthFactor = 200 / 720;

/**
 * The minimum value of the range of hues to pick from for strata colors.
 * @type {number}
 */
var altiHueMin = 0.5;

/**
 * The maximum value of the range of hues to pick from for strata colors.
 * @type {number}
 */
var altiHueMax = 1;

/**
 * The saturation for strata colors.
 * @type {number}
 */
var altiSaturation = 1;

/**
 * The brightness for strata colors.
 * @type {number}
 */
var altiBrightness = 0.7;

/**
 * The initial focus duration, in hours.
 * @type {number}
 */
var initialFoucsLength = 6;

/**
 * When true then only one path per radar is drawn.
 * @type {boolean}
 */
var singlePath = false;

/**
 * When true the special 'arty' mode is activated.
 * @type {boolean}
 */
var arty = false;

// -----------------------------------------------------------------------------
// System variables:

/** @type {number} */ var mapW = 0;
/** @type {number} */ var mapH = 0;
/** @type {number} */ var legendW = 0;
/** @type {number} */ var anchorArea = anchorInterval * anchorInterval;
/** @type {array}  */ var anchorLocations;
/** @type {Object} */ var svg;
/** @type {Object} */ var projection;
/** @type {Object} */ var projectionPath;
/** @type {Object} */ var caseStudy;
/** @type {Object} */ var caseData;

// -----------------------------------------------------------------------------

/**
 * Start the app. Call this function from a script element at the end of the html-doc.
 * @param {string} _caseStudy The initial case study object as initialized in the
 * init.js files for each case study.
 */
function startApp(_caseStudy) {
  // assert that SVG is supported by the browser:
  if (!document.implementation.hasFeature("http://www.w3.org/TR/SVG11/feature#Image", "1.1")) {
    alert('SVG is not supported in your browser. Please use a recent browser.');
    return;
  }

  d3.select("#path-bird-count").text(numeral(pathBirdCount).format('0,0'));
  d3.select("#radar-anchor-radius").text(radarAnchorRadius);

  caseStudy = _caseStudy;

  // load the case study data:
  dataService.initCaseStudy(caseStudy, function () {
    //console.log(caseStudy);

    // parse the url query:
    var urlQuery = {};
    location.search.replace('\?','').split('&').map(function (nvPair) {
      nvPair = nvPair.split('=');
      urlQuery[nvPair[0]] = nvPair[1];
    });
    if (urlQuery["strata-count"]) {
      setStrataCount(parseInt(urlQuery["strata-count"]));
    }
    else if (urlQuery.altBands) {  // legacy
      setStrataCount(urlQuery.altBands);
    }
    if (urlQuery["single-path"]) {
      singlePath = urlQuery["single-path"] == "true";
    }
    if (urlQuery["length"]) {
      initialFoucsLength = parseInt(urlQuery["length"]);
    }

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

    //updateAnchors();
    updateColors();

    if (--busy == 0) initDone();
  });
}

function initDone() {
  caseStudy.focusLength = initialFoucsLength;

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
      updateVisualisation(true, false);
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
      if (focusDirty) updateVisualisation(true, false);
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
      //updateAnchors();
      updateColors();
      updateVisualisation(true, true);
    });

  d3.select("#input-length")
    .property('value', caseStudy.focusLength)
    .on('change', function () {
      caseStudy.focusLength = parseInt(d3.select("#input-length").property('value'));
      updateVisualisation(true, false);
    });

  d3.select(window)
    .on('resize', Foundation.utils.throttle(function(e) {
      if (d3.select("#map-container").node().getBoundingClientRect().width != mapW) {
        updateVisualisation(false, true);
      }
    }, 25));

  // First update the map data and add the svg element to avoid miscalculation
  // of the actual size of the svg content (on Chrome).
  updateMapData();
  svg = d3.select("#map-container").append("svg")
    .style("width", mapW)
    .style("height", mapH);

  // Now update the map for real:
  updateVisualisation(true, true);
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

/**
 * Prepare the hues for the altitude strata.
 */
function updateColors() {
  caseStudy.hues = [];
  caseStudy.altHexColors = [];
  var altn = caseStudy.strataCount;
  var hue;
  if (altn == 1) {
    hue = (altiHueMin + altiHueMax) / 2;
    caseStudy.hues.push(hue);
    caseStudy.altHexColors.push(util.hsvToHex(hue, altiSaturation, altiBrightness));
  }
  else {
    for (var alti = 0; alti < altn; alti++) {
      hue = util.mapRange(alti, 0, altn - 1, altiHueMin, altiHueMax);
      caseStudy.hues.push(hue);
      caseStudy.altHexColors.push(util.hsvToHex(hue, altiSaturation, altiBrightness));
    }
  }
}

function updateVisualisation(dataDirty, mapDirty) {
  if (mapDirty) updateMapData();

  // create/replace svg object:
  if (svg) { svg.remove(); }
  svg = d3.select("#map-container").append("svg")
    .attr("width", mapW)
    .attr("height", mapH)
    .classed("visualisation", true);

  svg.append("defs")
    .append("clipPath")
    .attr("id", "clipRect")
    .append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", mapW)
    .attr("height", mapH);

  var clipGroup = svg.append("g");
  clipGroup.attr("style", "clip-path: url(#clipRect);");

  if (arty) clipGroup.attr("style", "background: #fff;");

  if (!arty) {
    var mapGroup = clipGroup.append("svg:g").attr("id", "map");
  }
  var pathsGroup = clipGroup.append("svg:g").attr("id", "paths");

  drawMap(mapGroup);

  if (dataDirty) {
    var data = {
      focusMoment: moment.utc(caseStudy.focusMoment),
      interval : caseStudy.segmentInterval /* the duration of a window in minutes */,
      intervalCount: caseStudy.focusLength * 60 / caseStudy.segmentInterval
    };
    dataService.loadData(caseStudy.queryBaseUrl, data, caseStudy, function () {
      caseData = data;
      drawPaths(pathsGroup);
    });
  }
  else {
    drawPaths(pathsGroup);
  }

  if (!arty) {
    // draw legends:
    drawColorLegend(clipGroup.append("svg:g").attr("id", "color-legend"));
    drawScaleLegend(
      clipGroup.append("svg:g").attr("id", "scale-legend"),
      caseStudy.scaleLegendMarkers
    );
  }
}

function updateMapData() {
  var svgRect = d3.select("#map-container").node().getBoundingClientRect();
  mapW = svgRect.width;
  //console.log("- mapW:", mapW);
  mapH = mapW * mapHeightFactor;
  legendW = mapW * legendWidthFactor;

  // specify the projection based of the size of the map:
  projection = caseStudy.getProjection(caseStudy, mapW, mapH);

  // initialize the d3 path with which to draw the geography:
  projectionPath = d3.geo.path().projection(projection);

  caseStudy.radars.forEach(function (radar) {
    radar.projection = projection(radar.location);
  });

  initAnchors();
}

/** Initialize the anchors. */
function initAnchors() {
  var locTopLeft = projection.invert([0, 0]);  // the location at the top-left corner
  var locBotRight = projection.invert([mapW, mapH]);  // the loc. at the bottom-right
  var rra = util.geo.distAngle(radarAnchorRadius);  // radar radius as angel
  var dlon = util.geo.destination(caseStudy.mapCenter, 90, anchorInterval)[0]
    - caseStudy.mapCenter[0];  // longitude delta
  var dlat = util.geo.destination(caseStudy.mapCenter, 0, anchorInterval)[1]
    - caseStudy.mapCenter[1];  // latitude delta
  anchorLocations = [];
  for (var lon = locTopLeft[0]; lon < locBotRight[0]; lon += dlon) {
    for (var lat = locTopLeft[1]; lat > locBotRight[1]; lat -= dlat) {
      caseStudy.radars.forEach(function (radar) {
        if (util.degrees(d3.geo.distance(radar.location, [lon, lat])) <= rra) {
          anchorLocations.push([lon, lat]);
        }
      });
    }
  }
}

function drawMap(mapGroup) {
  mapGroup.append("rect")
    .attr("id", "background")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", mapW)
    .attr("height", mapH);

  mapGroup.append("svg:path")
    .attr("id", "land")
    .datum(topojson.feature(
      caseStudy.topoJson,
      caseStudy.topoJson.objects.countries
    ))
    .attr("d", projectionPath);

  mapGroup.append("svg:path")
    .attr("id", "country-boundary")
    .datum(topojson.mesh(
      caseStudy.topoJson,
      caseStudy.topoJson.objects.countries,
      function(a, b) { return a !== b; }
    ))
    .attr("d", projectionPath);

  mapGroup.append("svg:path")
    .attr("id", "graticule")
    .datum(d3.geo.graticule().step([1, 1]))
    .attr("d", projectionPath);

  // draw radars:
  var rra = util.geo.distAngle(radarAnchorRadius); // radar radius as angel:
  var radarGroup = mapGroup.append("svg:g").attr("id", "radars");
  caseStudy.radars.forEach(function (radar, radi) {
    //rp = projection(radar.location);
    //radarGroup.append('svg:circle')
    //  .attr('cx', rp[0])
    //  .attr('cy', rp[1])
    //  .attr('r', 2)
    //  .classed("radar-center", true);

    radarGroup.append("svg:path")
      .attr("id", "radar-radius")
      .datum(d3.geo.circle().origin(radar.location).angle(rra))
      .attr("d", projectionPath);

    // Draw series points around radar at the marker radius:
    //var n = 36;
    //for (var i = 0; i < n; i++) {
    //  var bearing = util.mapRange(i, 0, n, 0, 360);
    //  var dest = util.geo.destination(radar.location, bearing, radarAnchorRadius);
    //  radarGroup.append("svg:path")
    //    .datum(d3.geo.circle().origin(dest).angle(.01))
    //    .attr("d", projectionPath)
    //    .classed("highlight3", true);
    //}
  });
}

/**
 * Draw the paths.
 */
function drawPaths(pathsGroup) {
  if (singlePath) {
    drawPaths_singlePath(caseStudy, pathsGroup);
  }
  else {
    drawPaths_multiPath(caseStudy, pathsGroup);
  }
}

function drawPaths_multiPath(caseStudy, pathsGroup) {
  //var stop = false;
  Math.seedrandom('ENRAM');
  var rlons = caseStudy.radLons;
  var rlats = caseStudy.radLats;
  var idw = util.idw;
  var strn = caseStudy.strataCount;
  var radiusFactor = 0.05;
  for (var stri = 0; stri < strn; stri++) {
    var densities = caseData.avDensities[stri];
    anchorLocations.forEach(function (anchorLoc) {
      //if (stop) return;
      var density = idw(anchorLoc[0], anchorLoc[1], densities, rlons, rlats, 2);
      if (Math.random() >= density * anchorArea / pathBirdCount) {
        return;
      }
      //stop = true;

      var pathData = buildPathData(stri, anchorLoc);
      var lineData = buildOutline(pathData, radiusFactor);
      drawPath_varialeThickness(pathsGroup.append("svg:g"), pathData, lineData, stri, radiusFactor);
    });
  }
}

function drawPaths_singlePath(caseStudy, pathsGroup) {
  var strn = caseStudy.strataCount;
  var tdy = Math.min(12 * strn, 150);
  var radiusFactor = 0.05;
  for (var stri = 0; stri < strn; stri++) {
    caseStudy.radars.forEach(function (radar, radi) {
      var oy = util.mapRange(stri, 0, strn - 1, tdy / 2, -tdy / 2);
      // draw anchor marks:
      pathsGroup.append('svg:circle')
        .attr('cx', radar.projection[0])
        .attr('cy', radar.projection[1] + oy)
        .attr('r', 1)
        .classed("acchor", true);
      if (caseData.avDensities[stri][radi] == 0) {
        return;  // do not draw empty paths
      }
      var pathData = buildPathData_singlePath(stri, radi, radar.location);
      pathData = pathData.map(function (d) {
        return [d[0], d[1] + oy, d[2], d[3]];
      });
      var lineData = buildOutline(pathData, radiusFactor);
      drawPath_varialeThickness(pathsGroup.append("svg:g"),
        pathData, lineData, stri, radiusFactor);
    });
  }
}

function buildPathData(stri, anchorLoc) {
  var pathData = [];
  var segi, segn = caseData.intervalCount;
  var loc, lon, lat, dlon, dlat, pp, angl, dist, dens;
  var rlons = caseStudy.radLons;
  var rlats = caseStudy.radLats;
  var idw = util.idw;
  var tf1 = caseData.interval * 0.06;  // 0.06 = 60 sec. * 0.001 km/m
  var half = Math.floor(caseData.intervalCount / 2);

  //function lprint(d) {
  //  tt.push("[" + d[stri].join(", ") + "]");
  //}
  //
  //var tt = [];
  //data.uSpeeds.forEach(lprint);
  //console.log("uSpeeds:", tt);
  //
  //tt = [];
  //data.vSpeeds.forEach(lprint);
  //console.log("vSpeeds:", tt);
  //
  //tt = [];
  //data.densities.forEach(lprint);
  //console.log("densities:", tt);

  // tail half:
  loc = anchorLoc;
  pp = projection(loc);
  for (segi = half - 1; segi >= 0; segi--) {
    lon = loc[0];
    lat = loc[1];
    dlon = idw(lon, lat, caseData.uSpeeds[segi][stri], rlons, rlats, 2) * tf1;
    dlat = idw(lon, lat, caseData.vSpeeds[segi][stri], rlons, rlats, 2) * tf1;
    angl = Math.atan2(-dlon, -dlat);
    dist = util.vectorLength(dlon, dlat);
    loc = util.geo.destinationRad(loc, angl, dist);
    dens = idw(loc[0], loc[1], caseData.densities[segi][stri], rlons, rlats, 2);
    pp = projection(loc);
    pp.push(dens, angl + Math.PI);
    pathData.unshift(pp);
  }

  // front half:
  loc = anchorLoc;
  pp = projection(loc);
  for (segi = half; segi < segn; segi++) {
    pp = projection(loc);
    lon = loc[0];
    lat = loc[1];
    dens = idw(lon, lat, caseData.densities[segi][stri], rlons, rlats, 2);
    dlon = idw(lon, lat, caseData.uSpeeds[segi][stri], rlons, rlats, 2) * tf1;
    dlat = idw(lon, lat, caseData.vSpeeds[segi][stri], rlons, rlats, 2) * tf1;
    angl = Math.atan2(dlon, dlat);
    pp.push(dens, angl);
    pathData.push(pp);
    dist = util.vectorLength(dlon, dlat);
    loc = util.geo.destinationRad(loc, angl, dist);
  }

  pp = projection(loc);
  pp.push(dens, 0); // same density as last segment
  pathData.push(pp);

  return pathData;
}

function buildPathData_singlePath(stri, radi, anchorLoc) {
  var pathData = [];
  var segi, segn = caseData.intervalCount;
  var loc, dlon, dlat, pp, angl, dist, dens;
  var tf1 = caseData.interval * 0.06;  // 0.06 = 60 sec. * 0.001 km/m
  var half = Math.floor(caseData.intervalCount / 2);

  // tail half:
  loc = anchorLoc;
  pp = projection(loc);
  for (segi = half - 1; segi >= 0; segi--) {
    dlon = caseData.uSpeeds[segi][stri][radi] * tf1;
    dlat = caseData.vSpeeds[segi][stri][radi] * tf1;
    angl = Math.atan2(-dlon, -dlat);
    dist = util.vectorLength(dlon, dlat);
    loc = util.geo.destinationRad(loc, angl, dist);
    dens = caseData.densities[segi][stri][radi];
    pp = projection(loc);
    pp.push(dens, angl + Math.PI);
    pathData.unshift(pp);
  }

  // front half:
  loc = anchorLoc;
  pp = projection(loc);
  for (segi = half; segi < segn; segi++) {
    pp = projection(loc);
    dens = caseData.densities[segi][stri][radi];
    dlon = caseData.uSpeeds[segi][stri][radi] * tf1;
    dlat = caseData.vSpeeds[segi][stri][radi] * tf1;
    angl = Math.atan2(dlon, dlat);
    pp.push(dens, angl);
    pathData.push(pp);
    dist = util.vectorLength(dlon, dlat);
    loc = util.geo.destinationRad(loc, angl, dist);
  }

  pp = projection(loc);
  pp.push(dens, 0);  // same density as last segment
  pathData.push(pp);

  return pathData;
}

var lineFn = d3.svg.line()
  .x(function (d) { return d[0]; })
  .y(function (d) { return d[1]; })
  .interpolate("basis-closed");

function drawPath_fixedThickness(pathGr, pathData, stri) {
  var lcolor = caseStudy.altHexColors[stri];
  var segi, segn = caseData.intervalCount;
  for (segi = 0; segi < segn; segi++) {
    var node1 = pathData[segi];
    var node2 = pathData[segi + 1];
    var dens = (node1[2] + node2[2]) / 2;
    var lwidth = util.mapRange(dens, 0, 100, 0, 10);
    //console.log(node1, node2, dens, lwidth, lcolor);
    pathGr.append("svg:line")
      .attr("x1", node1[0]).attr("y1", node1[1])
      .attr("x2", node2[0]).attr("y2", node2[1])
      .attr("style", "stroke:" + lcolor
      + ";stroke-width: " + lwidth
      + ";stroke-linecap: round"
      + ";opacity: 1");
  }
}

function buildOutline(pathData, radiusFactor) {
  //console.log(pathData.map(function (d) {
  //  return '[' + d[0] + ', ' + d[1] + ', ' + d[2] + ', ' + d[3] + ']';
  //}));
  var lineData = [];
  var segi, segn = caseData.intervalCount;
  var segd, angle, radius, dx, dy;
  var minRadius = .25;

  segd = pathData[0];
  radius = minRadius + segd[2] * radiusFactor;
  angle = segd[3] + Math.PI * .5;
  dx = Math.sin(angle) * radius;
  dy = -Math.cos(angle) * radius;
  lineData.push([segd[0] + dx, segd[1] + dy]);
  lineData.unshift([segd[0] - dx, segd[1] - dy]);

  for (segi = 1; segi < segn; segi++) {
    segd = pathData[segi];
    angle = (pathData[segi - 1][3] + segd[3] + Math.PI) * .5;
    radius = minRadius + segd[2] * radiusFactor;
    dx = Math.sin(angle) * radius;
    dy = -Math.cos(angle) * radius;
    lineData.push([segd[0] + dx, segd[1] + dy]);
    lineData.unshift([segd[0] - dx, segd[1] - dy]);
  }

  segd = pathData[segn];
  radius = minRadius + segd[2] * radiusFactor;
  angle = segd[3] + Math.PI * .5;
  dx = Math.sin(angle) * radius;
  dy = -Math.cos(angle) * radius;
  lineData.push([segd[0] + dx, segd[1] + dy]);
  lineData.unshift([segd[0] - dx, segd[1] - dy]);

  return lineData;
}

function drawPath_varialeThickness(pathGr, pathData, lineData, stri, radiusFactor) {
  //console.log(lineData.map(function (d) {
  //  return '[' + d[0] + ', ' + d[1] + ']';
  //}));
  var lcolor = caseStudy.altHexColors[stri];
  var segn = caseData.intervalCount;
  var radius;

  // draw paths:
  var opacity = arty ? .6 : .7;
  pathGr.append("svg:path")
    .attr("d", lineFn(lineData))
    .attr("style", "fill: " + lcolor + "; fill-opacity: " + opacity + ";");

  // draw head dot:
  if (arty) {
    radius = 0;
    pathData.forEach(function (d) { radius += d[2]; });
    radius = Math.max(1, radius / pathData.length);
    opacity = .5;
  }
  else {
    radius = Math.max(1.5, pathData[segn][2] * radiusFactor + .5);
    opacity = .7;
  }
  pathGr.append('svg:circle')
    .attr('cx', pathData[segn][0])
    .attr('cy', pathData[segn][1])
    .attr('r', radius)
    .attr("style", "fill: " + lcolor + "; fill-opacity: " + opacity + ";");
}

/**
 * Draws the color legend in a horizontal layout.
 * @param legendGroup
 */
function drawColorLegend_hor(legendGroup) {
  var legendH = 12;
  var legendL = 25;
  //var tx0 = legendL;
  //var td = 6;
  var ty = mapH - 20 - legendH - 8;
  var markerGr = legendGroup.append("svg:g");
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
  legendGroup.append("svg:line")
    .classed("scale-legend-line", true)
    .attr("x1", legendL)
    .attr("y1", mapH - 20 - legendH - lineH)
    .attr("x2", legendL)
    .attr("y2", mapH - 20);
  legendGroup.append("svg:line")
    .classed("scale-legend-line", true)
    .attr("x1", legendL + legendW / 2)
    .attr("y1", mapH - 20 - legendH - lineH)
    .attr("x2", legendL + legendW / 2)
    .attr("y2", mapH - 20);
  legendGroup.append("svg:line")
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
    legendGroup.append("svg:rect")
      .attr("x", tx)
      .attr("y", ty)
      .attr("width", Math.ceil(dx))
      .attr("height", legendH)
      .attr("style", "fill:" + caseStudy.altHexColors[alti] + ";");
    tx += dx;
  }
}

/**
 * Draws the color legend in a vertical layout.
 * @param legendGroup
 */
function drawColorLegend(legendGroup) {
  var margin = 20;
  var legendW = 12;
  var legendH = 100;
  var legendT = margin;

  var ty = legendT;
  var alti, altn = caseStudy.strataCount;
  var dy = legendH / altn;
  var hue, hex;
  for (alti = altn - 1; alti >= 0; alti--) {
    legendGroup.append("svg:rect")
      .attr("x", margin)
      .attr("y", ty)
      .attr("width", legendW)
      .attr("height", Math.ceil(dy))
      .attr("style", "fill:" + caseStudy.altHexColors[alti] + ";");
    ty += dy;
  }

  var lineW = 7;
  legendGroup.append("svg:line")
    .classed("scale-legend-line", true)
    .attr("x1", margin)
    .attr("y1", legendT)
    .attr("x2", margin + legendW + lineW)
    .attr("y2", legendT);
  legendGroup.append("svg:line")
    .classed("scale-legend-line", true)
    .attr("x1", margin + legendW)
    .attr("y1", legendT + legendH / 2)
    .attr("x2", margin + legendW + lineW)
    .attr("y2", legendT + legendH / 2);
  legendGroup.append("svg:line")
    .classed("scale-legend-line", true)
    .attr("x1", margin)
    .attr("y1", legendT + legendH)
    .attr("x2", 84)
    .attr("y2", legendT + legendH);

  legendGroup.append("svg:text")
    .classed("legend-label", true)
    .attr("x", margin + legendW + lineW + 4)
    .attr("y", legendT + 4)
    .text("4000 m");
  legendGroup.append("svg:text")
    .classed("legend-label", true)
    .attr("x", margin + legendW + lineW + 4)
    .attr("y", legendT + legendH / 2 + 4)
    .text("2000 m");

  legendGroup.append("svg:text")
    .classed("legend-label", true)
    .attr("x", margin + legendW + lineW + 2)
    .attr("y", legendT + legendH - 4)
    .text("altitude");
}

/**
 * Draws the scale legend.
 * @param legendGroup
 * @param markers
 */
function drawScaleLegend(legendGroup, markers) {
  var totalKm = markers[2];
  var radar = caseStudy.radars[0];
  var destProj = projection(util.geo.destination(radar.location, 90, totalKm));
  var legendW = destProj[0] - projection(radar.location)[0];
  var marginR = 45;
  var legendL = mapW - marginR - legendW;
  var legendR = mapW - marginR;
  var lineH = 7;
  var ty = mapH - 20 - lineH - 4;

  var markerGr = legendGroup.append("svg:g");
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

  legendGroup.append("svg:line")
    .classed("scale-legend-line", true)
    .attr("x1", legendL)
    .attr("y1", mapH - 20)
    .attr("x2", legendR)
    .attr("y2", mapH - 20);
  legendGroup.append("svg:line")
    .classed("scale-legend-line", true)
    .attr("x1", legendL)
    .attr("y1", mapH - 20 - lineH)
    .attr("x2", legendL)
    .attr("y2", mapH - 20);
  legendGroup.append("svg:line")
    .classed("scale-legend-line", true)
    .attr("x1", (legendL + legendR) / 2)
    .attr("y1", mapH - 20 - lineH)
    .attr("x2", (legendL + legendR) / 2)
    .attr("y2", mapH - 20);
  legendGroup.append("svg:line")
    .classed("scale-legend-line", true)
    .attr("x1", legendR)
    .attr("y1", mapH - 20 - lineH)
    .attr("x2", legendR)
    .attr("y2", mapH - 20);
}
