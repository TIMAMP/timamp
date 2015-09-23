/**
 * Created by wouter on 22/09/2015.
 */

var us15a = {

  id: "us15a",

  getProjection: function (caseStudy, mapWidth, mapHeight) {
    return d3.geo.mercator()
      .scale(caseStudy.mapScaleFactor * mapWidth)
      .translate([mapWidth / 2, mapHeight / 2])
      .center(caseStudy.mapCenter);
  }

};

