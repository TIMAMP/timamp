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
 * The migrants-per-path options.
 */
var migrantsPerPathOptions = [
  { value: 10000, text: "10K" },
  { value: 25000, text: "25K" },
  { value: 50000, text: "50K" },
  { value: 100000, text: "100K" },
  { value: 250000, text: "250K" },
  { value: 500000, text: "500K" }
];

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
var initialFocusLength = 6;

/**
 * When true then only one path per radar is drawn.
 * @type {boolean}
 */
var singlePath = false;

/**
 * When true then basic metadata is provided in the visualisation.
 * @type {boolean}
 */
var writeMetaDataInViz = true;

/**
 * When true the special 'arty' mode is activated.
 * @type {boolean}
 */
var arty = false;

var showRadarLabels = true;

// -----------------------------------------------------------------------------
// System variables:

/** @type {number} */ var mapW = 0;
/** @type {number} */ var mapH = 0;
/** @type {number} */ var legendW = 0;
/** @type {number} */ var anchorArea;
/** @type {array}  */ var anchorLocations;
/** @type {Object} */ var svg;
/** @type {Object} */ var projection;
/** @type {Object} */ var projectionPath;
/** @type {Object} */ var caseStudy;

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

  caseStudy = _caseStudy;

  d3.select("#radar-anchor-radius").text(radarAnchorRadius);

  // load the case study data:
  caseStudy.initialize(function () {
    //console.log(caseStudy);

    d3.select("#path-bird-count").text(numeral(caseStudy.migrantsPerPath).format('0,0'));

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
      initialFocusLength = parseInt(urlQuery["length"]);
    }

    var busy = 2;

    // load the topography:
    d3.json(caseStudy.topoJsonUrl, function (error, json) {
      if (error) {
        console.error(error);
        return;
      }
      caseStudy.topoJson = json;
      if (--busy == 0) initDone();
    });

    //updateAnchors();
    updateColors();

    anchorArea = caseStudy.anchorInterval * caseStudy.anchorInterval;

    if (--busy == 0) initDone();
  });
}

function initDone() {
  caseStudy.focusLength = initialFocusLength;

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

  // input-length:
  d3.select("#input-length")
    .property('value', caseStudy.focusLength)
    .on('change', function () {
      caseStudy.focusLength = parseInt(d3.select("#input-length").property('value'));
      updateVisualisation(true, false);
    });

  // input-strata:
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

  // input-migrants-per-path:
  d3.select("#input-migrants-per-path")
    .selectAll('option')
    .data(migrantsPerPathOptions)
    .enter().append("option")
    .property("value", function (d) { return d.value; })
    //.property("selected", function(d) { return d === caseStudy.migrantsPerPath; })
    .text(function (d) { return d.text; });
  d3.select("#input-migrants-per-path")
    .property('value', caseStudy.migrantsPerPath)
    .on('change', function () {
      console.log("input-migrants-per-path changed:", d3.select(this).property('value'));
      setMigrantsPerPath(d3.select(this).property('value'));
      updateVisualisation(false, false);
    });

  // set resize handler that updates the visualisation:
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

function setMigrantsPerPath(newCount) {
  caseStudy.migrantsPerPath = newCount;
  d3.select("#path-bird-count").text(numeral(caseStudy.migrantsPerPath).format('0,0'));
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
    var mapGroup = clipGroup.append("g").attr("id", "map");
  }
  var pathsGroup = clipGroup.append("g").attr("id", "paths");

  drawMap(mapGroup);

  if (dataDirty) {
    caseStudy.loadData(function () { drawPaths(pathsGroup); });
  }
  else {
    drawPaths(pathsGroup);
  }

  if (!arty) {
    // draw legends:
    drawColorLegend(clipGroup.append("g").attr("id", "color-legend"));
    drawScaleLegend(
      clipGroup.append("g").attr("id", "scale-legend"),
      caseStudy.scaleLegendMarkers
    );
    writeMetaData(clipGroup);
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
  var rra = util.geo.distAngle(radarAnchorRadius);  // radar radius as angle
  var dlon = util.geo.destination(caseStudy.mapCenter, 90, caseStudy.anchorInterval)[0]
    - caseStudy.mapCenter[0];  // longitude delta
  var dlat = util.geo.destination(caseStudy.mapCenter, 0, caseStudy.anchorInterval)[1]
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

  mapGroup.append("path")
    .attr("id", "land")
    .datum(topojson.feature(
      caseStudy.topoJson,
      caseStudy.topoJson.objects.countries
    ))
    .attr("d", projectionPath);

  mapGroup.append("path")
    .attr("id", "country-boundary")
    .datum(topojson.mesh(
      caseStudy.topoJson,
      caseStudy.topoJson.objects.countries,
      function(a, b) { return a !== b; }
    ))
    .attr("d", projectionPath);

  mapGroup.append("path")
    .attr("id", "graticule")
    .datum(d3.geo.graticule().step([1, 1]))
    .attr("d", projectionPath);

  // draw radars:
  var rra = util.geo.distAngle(radarAnchorRadius); // radar radius as angle:
  var radarG = mapGroup.append("g").attr("id", "radars");
  if (showRadarLabels) {
    var radarLabelsG = mapGroup.append("g").attr("id", "radar-labels");
  }
  caseStudy.radars.forEach(function (radar) {
    radarG.append("path")
      .attr("id", "radar-radius")
      .datum(d3.geo.circle().origin(radar.location).angle(rra))
      .attr("d", projectionPath);

    if (showRadarLabels) {
      var rp = projection(radar.location);
      radarLabelsG.append('svg:circle')
        .attr('cx', rp[0])
        .attr('cy', rp[1])
        .attr('r', 1.5)
        .classed("radar-center", true);
      radarLabelsG
        .append("text")
        .attr("x", rp[0] + 4)
        .attr("y", rp[1] + 10)
        .text(radar.id)
        .classed("radar-label", true);
    }

    // Draw series points around radar at the marker radius:
    //var n = 36;
    //for (var i = 0; i < n; i++) {
    //  var bearing = util.mapRange(i, 0, n, 0, 360);
    //  var dest = util.geo.destination(radar.location, bearing, radarAnchorRadius);
    //  radarGroup.append("path")
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

function drawPaths_multiPath(caseStudy, pathsG) {
  //var stop = false;
  Math.seedrandom('ENRAM');
  var rlons = caseStudy.radLons;
  var rlats = caseStudy.radLats;
  var idw = util.idw;
  var strn = caseStudy.strataCount;
  var radiusFactor = 0.05;
  var probf = anchorArea / caseStudy.migrantsPerPath;
  for (var stri = 0; stri < strn; stri++) {
    try {
      var densities = caseStudy.data.avDensities[stri]; // birds/km2 in the strata
    } catch (error) {
      console.error("- stri: " + stri);
      console.error("- strn: " + strn);
      console.error("- caseStudy.data.avDensities: " + caseStudy.data.avDensities);
      throw (error);
    }
    anchorLocations.forEach(function (anchorLoc) {
      //if (stop) return;
      try {
        var density = idw(anchorLoc[0], anchorLoc[1], densities, rlons, rlats, 2);
      } catch (error) {
        console.error("- anchorLoc: " + anchorLoc);
        throw (error);
      }
      if (Math.random() < density * probf) {
        //stop = true;
        var pathData = timamp.buildPathData(caseStudy, stri, anchorLoc);
        if (pathData.length == 0) {
          //console.log("got empty pathData");
          return;
        }
        var lineData = timamp.buildOutline(pathData, radiusFactor);
        var flowG = pathsG.append("g").classed("flow-line", true);
        drawPath_variableThickness(flowG, pathData, lineData, stri, radiusFactor);

        // DEBUG:
        //console.log(anchorLocations.indexOf(anchorLoc));
        //if (anchorLoc == anchorLocations[DEBUG_ANCHOR_IDX]) {
        //  //anchorLoc.debug = true;
        //  flowG.select("path").style("fill", "#f00");
        //}
      }
    });
  }
}

//var DEBUG_ANCHOR_IDX = 324;

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
      if (caseStudy.data.avDensities[stri][radi] == 0) {
        return;  // do not draw empty paths
      }
      var pathData = buildPathData_singlePath(stri, radi, radar.location);
      pathData = pathData.map(function (d) {
        return [d[0], d[1] + oy, d[2], d[3]];
      });
      var lineData = timamp.buildOutline(pathData, radiusFactor);
      drawPath_variableThickness(pathsGroup.append("g"),
        pathData, lineData, stri, radiusFactor);
    });
  }
}

function buildPathData_singlePath(stri, radi, anchorLoc) {
  var pathData = [];
  var segi, segn = caseStudy.data.intervalCount;
  var loc, dlon, dlat, pp, angl, dist, dens;
  var tf1 = caseStudy.data.interval * 0.06;  // 0.06 = 60 sec. * 0.001 km/m
  var half = Math.floor(caseStudy.data.intervalCount / 2);

  // tail half:
  loc = anchorLoc;
  pp = projection(loc);
  for (segi = half - 1; segi >= 0; segi--) {
    dlon = caseStudy.data.uSpeeds[segi][stri][radi] * tf1;
    dlat = caseStudy.data.vSpeeds[segi][stri][radi] * tf1;
    angl = Math.atan2(-dlon, -dlat);
    dist = util.vectorLength(dlon, dlat);
    loc = util.geo.destinationRad(loc, angl, dist);
    dens = caseStudy.data.densities[segi][stri][radi];
    pp = projection(loc);
    pp.push(dens, angl + Math.PI);
    pathData.unshift(pp);
  }

  // front half:
  loc = anchorLoc;
  pp = projection(loc);
  for (segi = half; segi < segn; segi++) {
    pp = projection(loc);
    dens = caseStudy.data.densities[segi][stri][radi];
    dlon = caseStudy.data.uSpeeds[segi][stri][radi] * tf1;
    dlat = caseStudy.data.vSpeeds[segi][stri][radi] * tf1;
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
  .interpolate("cardinal-closed");

function drawPath_fixedThickness(pathGr, pathData, stri) {
  var lcolor = caseStudy.altHexColors[stri];
  var segi, segn = caseStudy.data.intervalCount;
  for (segi = 0; segi < segn; segi++) {
    var node1 = pathData[segi];
    var node2 = pathData[segi + 1];
    var dens = (node1[2] + node2[2]) / 2;
    var lwidth = util.mapRange(dens, 0, 100, 0, 10);
    //console.log(node1, node2, dens, lwidth, lcolor);
    pathGr.append("line")
      .attr("x1", node1[0]).attr("y1", node1[1])
      .attr("x2", node2[0]).attr("y2", node2[1])
      .attr("style", "stroke:" + lcolor
      + ";stroke-width: " + lwidth
      + ";stroke-linecap: round"
      + ";opacity: 1");
  }
}

function drawPath_variableThickness(flowG, pathData, lineData, stri, radiusFactor) {
  //console.log(lineData.map(function (d) {
  //  return '[' + d[0] + ', ' + d[1] + ']';
  //}));
  var lcolor = caseStudy.altHexColors[stri];
  var segn = pathData.length - 1;
  var radius;

  // draw paths:
  var opacity = arty ? .6 : .7;
  flowG.append("path")
    .attr("d", lineFn(lineData))
    .style({fill: lcolor, "fill-opacity": opacity });

  // draw head dot:
  if (arty) {
    radius = 0;
    pathData.forEach(function (d) { radius += d[2]; });
    radius = Math.max(1, radius / pathData.length);
    opacity = .5;
  }
  else {
    radius = Math.max(1.5, pathData[segn][2] * radiusFactor + .5);
    opacity = .5;
  }
  flowG.append('svg:circle')
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
  var markerGr = legendGroup.append("g");
  markerGr.append("text")
    .classed("legend-label", true)
    .attr("x", legendL)
    .attr("y", ty)
    .attr("text-anchor", "middle")
    .text("0");
  markerGr.append("text")
    .classed("legend-label", true)
    .attr("x", legendL + legendW / 2)
    .attr("y", ty)
    .attr("text-anchor", "middle")
    .text("2");
  markerGr.append("text")
    .classed("legend-label", true)
    .attr("x", legendL + legendW + 6)
    .attr("y", ty)
    .attr("text-anchor", "middle")
    .text("4 km");

  var lineH = 7;
  legendGroup.append("line")
    .classed("scale-legend-line", true)
    .attr("x1", legendL)
    .attr("y1", mapH - 20 - legendH - lineH)
    .attr("x2", legendL)
    .attr("y2", mapH - 20);
  legendGroup.append("line")
    .classed("scale-legend-line", true)
    .attr("x1", legendL + legendW / 2)
    .attr("y1", mapH - 20 - legendH - lineH)
    .attr("x2", legendL + legendW / 2)
    .attr("y2", mapH - 20);
  legendGroup.append("line")
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
    legendGroup.append("rect")
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
    legendGroup.append("rect")
      .attr("x", margin)
      .attr("y", ty)
      .attr("width", legendW)
      .attr("height", Math.ceil(dy))
      .attr("style", "fill:" + caseStudy.altHexColors[alti] + ";");
    ty += dy;
  }

  var lineW = 7;
  legendGroup.append("line")
    .classed("scale-legend-line", true)
    .attr("x1", margin)
    .attr("y1", legendT)
    .attr("x2", margin + legendW + lineW)
    .attr("y2", legendT);
  legendGroup.append("line")
    .classed("scale-legend-line", true)
    .attr("x1", margin + legendW)
    .attr("y1", legendT + legendH / 2)
    .attr("x2", margin + legendW + lineW)
    .attr("y2", legendT + legendH / 2);
  legendGroup.append("line")
    .classed("scale-legend-line", true)
    .attr("x1", margin)
    .attr("y1", legendT + legendH)
    .attr("x2", 84)
    .attr("y2", legendT + legendH);

  legendGroup.append("text")
    .classed("legend-label", true)
    .attr("x", margin + legendW + lineW + 4)
    .attr("y", legendT + 4)
    .text("4000 m");
  legendGroup.append("text")
    .classed("legend-label", true)
    .attr("x", margin + legendW + lineW + 4)
    .attr("y", legendT + legendH / 2 + 4)
    .text("2000 m");

  legendGroup.append("text")
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

  var markerGr = legendGroup.append("g");
  markerGr.append("text")
    .classed("legend-label", true)
    .attr("x", legendL)
    .attr("y", ty)
    .attr("text-anchor", "middle")
    .text("0");
  markerGr.append("text")
    .classed("legend-label", true)
    .attr("x", (legendL + legendR) / 2)
    .attr("y", ty)
    .attr("text-anchor", "middle")
    .text(markers[1]);
  markerGr.append("text")
    .classed("legend-label", true)
    .attr("x", legendR + 8)
    .attr("y", ty)
    .attr("text-anchor", "middle")
    .text(markers[2] + " km");

  legendGroup.append("line")
    .classed("scale-legend-line", true)
    .attr("x1", legendL)
    .attr("y1", mapH - 20)
    .attr("x2", legendR)
    .attr("y2", mapH - 20);
  legendGroup.append("line")
    .classed("scale-legend-line", true)
    .attr("x1", legendL)
    .attr("y1", mapH - 20 - lineH)
    .attr("x2", legendL)
    .attr("y2", mapH - 20);
  legendGroup.append("line")
    .classed("scale-legend-line", true)
    .attr("x1", (legendL + legendR) / 2)
    .attr("y1", mapH - 20 - lineH)
    .attr("x2", (legendL + legendR) / 2)
    .attr("y2", mapH - 20);
  legendGroup.append("line")
    .classed("scale-legend-line", true)
    .attr("x1", legendR)
    .attr("y1", mapH - 20 - lineH)
    .attr("x2", legendR)
    .attr("y2", mapH - 20);
}

function writeMetaData(clipG) {
  if (!writeMetaDataInViz) return;

  var mdG = clipG.append("g").attr("id", "meta-data");
  var margin = 18;
  var lh = 12;
  var ly = mapH - 7 - 3 * lh;
  var formatString = "MMM D, YYYY - H[h]";
  var tillMoment = moment(caseStudy.focusMoment).add(caseStudy.focusLength, "hours");

  mdG.append("text")
    .classed("legend-label", true)
    .attr("x", margin)
    .attr("y", ly)
    .text("From:");
  mdG.append("text")
    .classed("legend-label", true)
    .attr("x", margin + 35)
    .attr("y", ly)
    .text(caseStudy.focusMoment.format(formatString));

  ly += lh;
  mdG.append("text")
    .classed("legend-label", true)
    .attr("x", margin)
    .attr("y", ly)
    .text("Till:");
  mdG.append("text")
    .classed("legend-label", true)
    .attr("x", margin + 35)
    .attr("y", ly)
    .text(tillMoment.format(formatString));

  ly += lh;
  mdG.append("text")
    .classed("legend-label", true)
    .attr("x", margin)
    .attr("y", ly)
    .text("Migrants per line: " + caseStudy.migrantsPerPath);
}

