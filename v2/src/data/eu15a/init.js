/**
 * Created by wouter on 22/09/2015.
 */

/**
 * eu15a case study constructor.
 */
var eu15a = function () {

  var caseStudy = enram.caseStudy("eu15a", JsonDataService());

  caseStudy.getProjection = function (caseStudy, mapWidth, mapHeight) {
    return d3.geo.mercator()
      .scale(caseStudy.mapScaleFactor * mapWidth)
      .translate([mapWidth / 2, mapHeight / 2])
      .center(caseStudy.mapCenter);
  };

  return caseStudy;
}();
