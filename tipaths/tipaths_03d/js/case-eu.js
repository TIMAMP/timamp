/*jshint unused: false, latedef: false */
/*jslint vars: true, plusplus: true, undef: true, continue: true */
/*global requirejs, require */

"use strict";

function init() {

  var caseService = {
    mapCenter: [5, 51.5],
    caseStudyUrl: "data/case_EU_15a.json",
    topoJsonUrl: "data/eu.topo.json",
    queryBaseUrl: "http://lifewatch.cartodb.com/api/v2/sql?q=",
    queryTemplateUrl: "data/data_eu.sql",

    topoJson: null
  };

  caseService.getMapScale = function (mapWidth) {
    return mapWidth * 6000 / 720;
  };

  caseService.init = function (dataService, handler) {
    d3.json(this.topoJsonUrl, function (error, json) {
      if (error) {
        console.error(error);
        return;
      }
      caseService.topoJson = json;
      handler();  // done
    });
  };

  caseService.loadDate = function (dataService, data, caseStudy, handler) {
    dataService.loadData(this.queryBaseUrl, data, caseStudy, function () {
      handler();  // done
    });
  };

  caseService.drawTopography = function (svg) {
    var datum = topojson.feature(this.topoJson, this.topoJson.objects.europe);
    svg.append("path")
      .datum(datum)
      .classed("land", true)
      .attr("d", projectionPath);

    datum = topojson.mesh(
      this.topoJson,
      this.topoJson.objects.europe,
      function(a, b) { return a !== b; }
    );
    svg.append("path")
      .datum(datum)
      .classed("country-boundary", true)
      .attr("d", projectionPath);
  };

  initApp(caseService);

};