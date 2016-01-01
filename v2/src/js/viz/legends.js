"use strict";

function viz_legends_(_config, _utils) {

  // dependencies:
  var config = _config;
  var utils = _utils;

  // service object:
  var legend = {};

  /**
   * Draws the color legend in a vertical layout.
   *
   * @param legendG The svg group element in which to draw the legend.
   * @param caseStudy {object} The models.caseStudy object.
   * @param focus {object} The models.focus object.
   */
  legend.drawColorLegend = function (legendG, caseStudy, focus) {
    var margin = 20;
    var legendW = 12;
    var legendH = 100;
    var legendT = margin;

    var altitudeRange = focus.altitudeRange(caseStudy);
    var minHeight = altitudeRange[0] / 1000;
    var midHeight = (altitudeRange[0] + altitudeRange[1]) / 2000;
    var maxHeight = altitudeRange[1] / 1000;

    var ty = legendT;
    var alti, altn = focus.strataCount(caseStudy);
    var dy = legendH / altn;
    for (alti = altn - 1; alti >= 0; alti--) {
      legendG.append("rect")
        .attr("x", margin)
        .attr("y", ty)
        .attr("width", legendW)
        .attr("height", Math.ceil(dy))
        .attr("style", "fill:" + config.altHexColors[alti] + ";");
      ty += dy;
    }

    var lineW = 7;
    var tx = margin + legendW + lineW;
    legendG.append("line")
      .classed("scale-legend-line", true)
      .attr("x1", margin)
      .attr("y1", legendT)
      .attr("x2", tx)
      .attr("y2", legendT);
    legendG.append("line")
      .classed("scale-legend-line", true)
      .attr("x1", margin + legendW)
      .attr("y1", legendT + legendH / 2)
      .attr("x2", tx)
      .attr("y2", legendT + legendH / 2);
    legendG.append("line")
      .classed("scale-legend-line", true)
      .attr("x1", margin)
      .attr("y1", legendT + legendH)
      .attr("x2", tx)
      .attr("y2", legendT + legendH);

    tx = margin + legendW + lineW + 4;
    legendG.append("text")
      .classed("legend-label", true)
      .attr("x", tx)
      .attr("y", legendT + 8)
      .text(maxHeight + "km");
    legendG.append("text")
      .classed("legend-label", true)
      .attr("x", tx)
      .attr("y", legendT + legendH / 2 + 4)
      .text(midHeight + " km");
    legendG.append("text")
      .classed("legend-label", true)
      .attr("x", tx)
      .attr("y", legendT + legendH)
      .text(minHeight + " km");
    legendG.append("text")
      .classed("legend-label", true)
      .attr("x", margin + legendW + lineW + 2)
      .attr("y", legendT + legendH + 12)
      .text("altitude");
  };

  /**
   * Draws the scale legend.
   *
   * @param legendG The svg group element in which to draw the legend.
   * @param mapW {number} map width
   * @param mapH {number} map height
   * @param projection {object} The d3.geo projection used to draw the map.
   * @param caseStudy {object} The models.caseStudy object.
   */
  legend.drawScaleLegend = function (legendG, mapW, mapH, projection, caseStudy) {
    var markers = caseStudy.scaleLegendMarkers
    var totalKm = markers[2];
    var radar = caseStudy.radars[0];
    var destProj = projection(utils.geo.destination(radar.location, 90, totalKm));
    var legendW = destProj[0] - projection(radar.location)[0];
    var marginR = 45;
    var legendL = mapW - marginR - legendW;
    var legendR = mapW - marginR;
    var lineH = 7;
    var ty = mapH - 20 - lineH - 4;

    var markerGr = legendG.append("g");
    markerGr.append("text")
      .classed("legend-label", true)
      .attr("x", legendL)
      .attr("y", ty)
      .attr("text-anchor", "middle")
      .text("0");
    markerGr.append("text")
      .classed("legend-label", true)
      .attr("x", (legendL + legendR) / 2)
      .attr("y", ty)
      .attr("text-anchor", "middle")
      .text(markers[1]);
    markerGr.append("text")
      .classed("legend-label", true)
      .attr("x", legendR + 8)
      .attr("y", ty)
      .attr("text-anchor", "middle")
      .text(markers[2] + " km");

    legendG.append("line")
      .classed("scale-legend-line", true)
      .attr("x1", legendL)
      .attr("y1", mapH - 20)
      .attr("x2", legendR)
      .attr("y2", mapH - 20);
    legendG.append("line")
      .classed("scale-legend-line", true)
      .attr("x1", legendL)
      .attr("y1", mapH - 20 - lineH)
      .attr("x2", legendL)
      .attr("y2", mapH - 20);
    legendG.append("line")
      .classed("scale-legend-line", true)
      .attr("x1", (legendL + legendR) / 2)
      .attr("y1", mapH - 20 - lineH)
      .attr("x2", (legendL + legendR) / 2)
      .attr("y2", mapH - 20);
    legendG.append("line")
      .classed("scale-legend-line", true)
      .attr("x1", legendR)
      .attr("y1", mapH - 20 - lineH)
      .attr("x2", legendR)
      .attr("y2", mapH - 20);
  };

  /**
   * @param mdG {object} The svg group element in which to draw the meta data text.
   * @param mapH {number} Map height.
   * @param focus {object} The models.focus object.
   */
  legend.writeMetaData = function (mdG, mapH, focus) {
    var margin = 18;
    var lh = 12;
    var ly = mapH - 7 - 3 * lh;
    var formatString = "HH[h], MMM D, YYYY";
    var tillMoment = moment(focus.from).add(focus.duration, "hours");

    mdG.append("text")
      .classed("legend-label", true)
      .attr("x", margin)
      .attr("y", ly)
      .text("From:");
    mdG.append("text")
      .classed("legend-label", true)
      .attr("x", margin + 35)
      .attr("y", ly)
      .text(focus.from.format(formatString));

    ly += lh;
    mdG.append("text")
      .classed("legend-label", true)
      .attr("x", margin)
      .attr("y", ly)
      .text("Till:");
    mdG.append("text")
      .classed("legend-label", true)
      .attr("x", margin + 35)
      .attr("y", ly)
      .text(tillMoment.format(formatString));

    ly += lh;
    mdG.append("text")
      .classed("legend-label", true)
      .attr("x", margin)
      .attr("y", ly)
      .text("Migrants per line: " + focus.migrantsPerPath);
  };

  return legend;
}
