/*jshint unused: false, latedef: false */
/*jslint vars: true, plusplus: true, undef: true, continue: true */
/*global requirejs, require */

"use strict";

function init() {

  var caseService = {
    mapCenter: [-73.02, 42.48],
    caseStudyUrl: "data/case_US_15a.json",
    topoJsonUrl: "data/us.topo.json",
    queryBaseUrl: "https://gbernstein.cartodb.com/api/v2/sql?q=",
    queryTemplateUrl: "data/data_us.sql",

    topoJson: null
  };

  caseService.getMapScale = function (mapWidth) {
    return mapWidth * 3000 / 800;
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
    var datum = topojson.feature(this.topoJson, this.topoJson.objects.land);
    svg.append("path")
      .datum(datum)
      .classed("land", true)
      .attr("d", projectionPath);

    datum = topojson.mesh(
      this.topoJson,
      this.topoJson.objects.land,
      function(a, b) { return a !== b; }
    );
    svg.append("path")
      .datum(datum)
      .classed("country-boundary", true)
      .attr("d", projectionPath);
  };

  initApp(caseService);

};