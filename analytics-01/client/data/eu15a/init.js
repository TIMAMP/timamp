/**
 * Created by wouter on 22/09/2015.
 */
(function() {
  'use strict';

  angular.module('enram')
    .factory('eu15a', ['enram', 'settings', eu15aFactory]);

  function eu15aFactory(enram, settings) {
    // case study constructor:

    var caseStudy = enram.caseStudy("eu15a", DBDataServiceInitializer);

    caseStudy.getProjection = function (caseStudy, mapWidth, mapHeight) {
      return d3.geo.mercator()
        .scale(caseStudy.mapScaleFactor * mapWidth)
        .translate([mapWidth / 2, mapHeight / 2])
        .center(caseStudy.mapCenter);
    };

    return caseStudy;
  }

})();
