/**
 * Created by wouter on 22/09/2015.
 */

var eu15a = {

  id: "eu15a",

  getProjection: function (caseStudy, mapWidth, mapHeight) {
    return d3.geo.mercator()
      .scale(caseStudy.mapScaleFactor * mapWidth)
      .translate([mapWidth / 2, mapHeight / 2])
      .center(caseStudy.mapCenter);
  }

};

