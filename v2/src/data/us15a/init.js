/**
 * Created by wouter on 22/09/2015.
 */

/**
 * us15a case study constructor.
 */
var us15a = function () {

  var caseStudy = enram.caseStudy("us15a", JsonDataService());

  caseStudy.getProjection = function (caseStudy, mapWidth, mapHeight) {
    return d3.geo.mercator()
      .scale(caseStudy.mapScaleFactor * mapWidth)
      .translate([mapWidth / 2, mapHeight / 2])
      .center(caseStudy.mapCenter);
  };

  return caseStudy;
}();
