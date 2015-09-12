/*jshint unused: false, latedef: false */
/*jslint vars: true, plusplus: true, undef: true, continue: true */
/*global requirejs, require */

"use strict";

function init() {

  var caseService = {
    // the coordinate (in degrees) on which to center the map:
    mapCenter: [-73.2, 42.48],
    // the factor with which the map-width needs to be multiplied to get the map scaling:
    mapScaleFactor: 4.25,
    // the url of the case study data:
    caseStudyUrl: "data/case-us.json",
    // the url of the topography data:
    topoJsonUrl: "data/topo-us.json",
    // the url of the query template:
    queryTemplateUrl: "data/template-us.sql",
    // the base url for the CartoDB queries:
    queryBaseUrl: "https://gbernstein.cartodb.com/api/v2/sql?q=",
    // the scale legend markers:
    scaleLegendMarkers: [0, 100, 200]
  };

  initApp(caseService);

}
