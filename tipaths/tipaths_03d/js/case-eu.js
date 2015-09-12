/*jshint unused: false, latedef: false */
/*jslint vars: true, plusplus: true, undef: true, continue: true */
/*global requirejs, require */

"use strict";

function init() {

  var caseService = {
    // the coordinate (in degrees) on which to center the map:
    mapCenter: [4.5, 51.55],
    // the factor with which the map-width needs to be multiplied to get the map scaling:
    mapScaleFactor: 8.5,
    // the url of the case study data:
    caseStudyUrl: "data/case-eu.json",
    // the url of the topography data:
    topoJsonUrl: "data/topo-eu.json",
    // the url of the query template:
    queryTemplateUrl: "data/template-eu.sql",
    // the base url for the CartoDB queries:
    queryBaseUrl: "http://lifewatch.cartodb.com/api/v2/sql?q=",
    // the scale legend markers:
    scaleLegendMarkers: [0, 50, 100]
  };

  initApp(caseService);

}
