"use strict";

function viz_(_config, _utils) {

  // dependencies:
  var config = _config;
  var utils = _utils;
  var paths = viz_paths_(_config, _utils);
  var legends = viz_legends_(_config, _utils);

  // service object:
  var viz = {};

  // private properties:
  var svg;
  var pathsG;
  var clipG;
  var mapW = 0;         // the width of the map
  var mapH = 0;         // the height of the map
  var projection;       // the d3.geo projection used to map locations to pixels
  var projectionPath;   // the d3.geo.path object with which to draw the geography
  var anchorLocations;

  /**
   * Updates all the base map related data, such as it's size, the size of the
   * legends, the geographic projection, etc.
   *
   * @param caseStudy {object} The models.caseStudy object.
   */
  viz.updateMapData = function (caseStudy) {
    //console.log(">> viz.updateMapData()");
    var svgRect = d3.select("#map-container").node().getBoundingClientRect();
    mapW = svgRect.width;
    mapH = mapW * config.mapHeightFactor;

    // specify the projection based of the size of the map:
    projection = caseStudy.getProjection(caseStudy, mapW, mapH);

    // initialize the d3 path with which to draw the geography:
    projectionPath = d3.geo.path().projection(projection);

    // Update pixels properties of radar objects. These properties are objects
    // with an x and a y property, the position of the radar in pixel-space.
    caseStudy.radars.forEach(function (radar) {
      var projected = projection(radar.location);
      radar.pixels = { x: projected[0], y: projected[1] }
    });

    // Update the anchors:
    this.initAnchors(caseStudy);
  };

  /** @private Initialize the anchors. */
  viz.initAnchors = function (caseStudy) {
    //console.log(">> viz.initAnchors()");
    var locTopLeft = projection.invert([0, 0]);  // the location at the top-left corner
    var locBotRight = projection.invert([mapW, mapH]);  // the loc. at the bottom-right
    var rra = utils.geo.distAngle(config.radarAnchorRadius);  // radar radius as angle
    var dlon = utils.geo.destination(caseStudy.mapCenter, 90, caseStudy.anchorInterval)[0]
      - caseStudy.mapCenter[0];  // longitude delta
    var dlat = utils.geo.destination(caseStudy.mapCenter, 0, caseStudy.anchorInterval)[1]
      - caseStudy.mapCenter[1];  // latitude delta
    anchorLocations = [];
    for (var lon = locTopLeft[0]; lon < locBotRight[0]; lon += dlon) {
      for (var lat = locTopLeft[1]; lat > locBotRight[1]; lat -= dlat) {
        caseStudy.radars.forEach(function (radar) {
          if (utils.degrees(d3.geo.distance(radar.location, [lon, lat])) <= rra) {
            anchorLocations.push([lon, lat]);
          }
        });
      }
    }
  };

  /**
   * Redraws the base map (not the paths).
   *
   * @param caseStudy {object} The models.caseStudy object.
   */
  viz.redrawMap = function (caseStudy) {
    // create/replace svg object:
    if (svg) { svg.remove(); }
    svg = d3.select("#map-container").append("svg")
      .attr("width", mapW)
      .attr("height", mapH)
      .classed("visualisation", true);

    // add clip-path:
    svg.append("defs")
      .append("clipPath")
      .attr("id", "clipRect")
      .append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", mapW)
      .attr("height", mapH);

    clipG = svg.append("g");
    clipG.attr("style", "clip-path: url(#clipRect);");
    if (config.arty) {
      clipG.attr("style", "background: #fff;");
    }
    else {
      var mapG = clipG.append("g").attr("id", "map");
      this.drawMap(mapG, caseStudy);
    }
    pathsG = clipG.append("g").attr("id", "paths");

  };

  /* @private Map draw helper */
  viz.drawMap = function (mapG, caseStudy) {
    mapG.append("rect")
      .attr("id", "background")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", mapW)
      .attr("height", mapH);
    mapG.append("path")
      .attr("id", "land")
      .datum(topojson.feature(
        caseStudy.topoJson,
        caseStudy.topoJson.objects.countries
      ))
      .attr("d", projectionPath);
    mapG.append("path")
      .attr("id", "country-boundary")
      .datum(topojson.mesh(
        caseStudy.topoJson,
        caseStudy.topoJson.objects.countries,
        function(a, b) { return a !== b; }
      ))
      .attr("d", projectionPath);
    mapG.append("path")
      .attr("id", "graticule")
      .datum(d3.geo.graticule().step([1, 1]))
      .attr("d", projectionPath);

    // draw radars:
    var rra = utils.geo.distAngle(config.radarAnchorRadius); // radar radius as angle:
    var radarG = mapG.append("g").attr("id", "radars");
    caseStudy.radars.forEach(function (radar) {
      radarG.append("path")
        .attr("id", "radar-radius")
        .datum(d3.geo.circle().origin(radar.location).angle(rra))
        .attr("d", projectionPath);

      // Draw series points around radar at the marker radius:
      //var n = 36;
      //for (var i = 0; i < n; i++) {
      //  var bearing = utils.mapRange(i, 0, n, 0, 360);
      //  var dest = utils.geo.destination(radar.location, bearing, config.radarAnchorRadius);
      //  radarG.append("path")
      //    .datum(d3.geo.circle().origin(dest).angle(.01))
      //    .attr("d", projectionPath)
      //    .classed("highlight3", true);
      //}
    });

    // optionally draw radar labels:
    if (config.showRadarLabels) {
      var radarLabelsG = mapG.append("g").attr("id", "radar-labels");
      caseStudy.radars.forEach(function (radar) {
        radarLabelsG.append('circle')
          .attr('cx', radar.pixels.x)
          .attr('cy', radar.pixels.y)
          .attr('r', 1.5)
          .classed("radar-center", true);
        radarLabelsG
          .append("text")
          .attr("x", radar.pixels.x + 4)
          .attr("y", radar.pixels.y + 10)
          .text(radar.id)
          .classed("radar-label", true);
      });
    }
  };

  /**
   * Draw the paths.
   *
   * @param data
   */
  viz.drawPaths = function (data) {
    paths.drawPaths(data, anchorLocations, projection, pathsG);
  };

  /**
   * draw the legends
   */
  viz.drawLegends = function (caseStudy, focus) {
    if (!config.arty) {
      var legendG = clipG.append("g").attr("id", "color-legend");
      legends.drawColorLegend(legendG, caseStudy, focus);

      legendG = clipG.append("g").attr("id", "scale-legend");
      legends.drawScaleLegend(legendG, mapW, mapH, projection, caseStudy);

      if (config.writeMetaDataInViz) {
        var mdG = clipG.append("g").attr("id", "meta-data");
        legends.writeMetaData(mdG, mapH, focus);
      }
    }
  };

  return viz;
}
