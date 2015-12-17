/**
 * Created by wouter on 17/12/2015.
 */

(function() {
  'use strict';

  angular.module('expose')
    .factory('expose.lineChart', [lineChart]);

  function lineChart() {
    var lineChart = {};

    /**
     * Draws a line chart based on the given specs object.
     *
     * The spec objects should/may contain the following properties:
     *
     * {
     *   root: <D3 group element>, // in which the chart is drawn in top-left corner
     *   backgroundClass: <string>, // the class name for the background rect
     *   chartWidth: <number>,
     *   chartHeight: <number>,
     *   title: { // optional - TODO: add positioning
     *     label: <string>
     *   },
     *   xAxis: {
     *     range: {
     *       min: <number>,
     *       max <number>
     *     },
     *     gridLines: { // optional, may be array with multiple sub-specs
     *       class: <string>, // optional, class name for group that contains lines
     *       values: [ <number>, ... ] // positions of the vertical grid lines
     *     },
     *     labels: [ // optional
     *       {
     *         value: <number>,
     *         label: <string>
     *       }, ...
     *     ]
     *   },
     *   yAxis: { ... }, // same as xAxis
     *   dataSets: [
     *     {
     *       data: [
     *         {
     *           x: <number>,
     *           y: <number>
     *         }
     *       ],
     *       label: <string>, // optional
     *       class: <string>, // optional
     *       color: <string>  // optional, color as hex string
     *     }, ...
     *   ]
     * }
     */
    lineChart.draw = function (spec) {
      var axisG, gridLinesG, labelsG;
      var chartG = spec.root;

      // x-dimension:
      var xVSize = spec.xAxis.range.max - spec.xAxis.range.min;
      var xMin = spec.xAxis.range.min;
      var xFactor = spec.chartWidth / xVSize;
      function xMap(value) {
        return (value - xMin) * xFactor;
      }

      // y-dimension:
      var yVSize = spec.yAxis.range.max - spec.yAxis.range.min;
      var yMin = spec.yAxis.range.min;
      var yFactor = spec.chartHeight / yVSize;
      function yMap(value) {
        return spec.chartHeight - (value - yMin) * yFactor;
      }

      // background and frame:
      chartG
        .append("rect")
        .attr("class", "chart-bg")
        .attr("width", spec.chartWidth)
        .attr("height", spec.chartHeight);

      // x-axis:
      axisG = chartG
        .append("g")
        .attr("class", "chart-axis x-axis");

      function addXGridLines(parentG, glSpec) {
        if (glSpec.class != undefined) {
          parentG.classed(glSpec.class, true);
        }
        glSpec.values.forEach(function (value) {
          if (value > spec.xAxis.range.min && value < spec.xAxis.range.max) {
            parentG.append("path")
              .attr("d", "M " + xMap(value) + " 0 V " + spec.chartHeight);
          }
        });
      }

      if (spec.xAxis.gridLines != undefined) {
        gridLinesG = axisG
          .append("g")
          .attr("class", "grid-lines");
        if (spec.xAxis.gridLines instanceof Array) {
          spec.xAxis.gridLines.forEach(function (glSpec) {
            addXGridLines(gridLinesG.append("g"), glSpec);
          });
        }
        else {
          addXGridLines(gridLinesG, spec.xAxis.gridLines);
        }
      }

      if (spec.xAxis.labels != undefined) {
        labelsG = axisG
          .append("g")
          .attr("class", "axis-labels");
        spec.xAxis.labels.forEach(function (lvp) {
          if (lvp.value >= spec.xAxis.range.min && lvp.value <= spec.xAxis.range.max) {
            var label = labelsG
              .append("text")
              .attr("x", xMap(lvp.value))
              .attr("y", spec.chartHeight + 3)
              .text(lvp.label);
            if (lvp.value == spec.xAxis.range.min) {
              label.classed("axis-label-min", true);
            }
            else if (lvp.value == spec.xAxis.range.max) {
              label.classed("axis-label-max", true);
            }
          }
        });
      }

      // y-axis:
      axisG = chartG
        .append("g")
        .attr("class", "chart-axis y-axis");

      function addYGridLines(parentG, glSpec) {
        if (glSpec.class != undefined) {
          parentG.classed(glSpec.class, true);
        }
        glSpec.values.forEach(function (value) {
          if (value > spec.yAxis.range.min && value < spec.yAxis.range.max) {
            parentG.append("path")
              .attr("d", "M 0 " + yMap(value) + " H " + spec.chartWidth);
          }
        });
      }

      if (spec.yAxis.gridLines != undefined) {
        gridLinesG = axisG
          .append("g")
          .attr("class", "grid-lines");
        if (spec.yAxis.gridLines instanceof Array) {
          spec.yAxis.gridLines.forEach(function (glSpec) {
            addYGridLines(gridLinesG.append("g"), glSpec);
          });
        }
        else {
          addYGridLines(gridLinesG, spec.yAxis.gridLines);
        }
      }

      if (spec.yAxis.labels != undefined) {
        labelsG = axisG
          .append("g")
          .attr("class", "axis-labels");
        spec.yAxis.labels.forEach(function (lvp) {
          if (lvp.value >= spec.yAxis.range.min && lvp.value <= spec.yAxis.range.max) {
            var label = labelsG
              .append("text")
              .attr("x", -4)
              .attr("y", yMap(lvp.value))
              .text(lvp.label);
            if (lvp.value == spec.yAxis.range.min) {
              label.classed("axis-label-min", true);
            }
            else if (lvp.value == spec.yAxis.range.max) {
              label.classed("axis-label-max", true);
            }
          }
        });
      }

      // chart label:
      if (spec.title != undefined) {
        chartG
          .append("text")
          .attr("class", "chart-title")
          .attr("x", 4)
          .attr("y", 4)
          .text(spec.title.label);
      }

      // build mapped data:
      spec.dataSets.forEach(function (dataSet) {
        dataSet.mapped = dataSet.data.map(function (datum) {
          return {
            x: xMap(datum.x),
            y: yMap(datum.y)
          }
        });
      });

      // plot lines:
      var dx = function (d) { return d.x; };
      var dy = function (d) { return d.y; };
      var plotLine = d3.svg.line().x(dx).y(dy);
      chartG
        .append("g")
        .classed("plot-lines", true)
        .selectAll("path")
        .data(spec.dataSets)
        .enter()
        .append("g")
        .classed("plot-set", true)
        .each(function (ds) {
          var plotSet = d3.select(this);
          plotSet
            .append("g")
            .classed("plot-points", true)
            .style("fill", (ds.color != undefined) ? ds.color : null)
            .selectAll("circle")
            .data(ds.mapped)
            .enter()
            .append("circle")
            .attr("cx", dx)
            .attr("cy", dy)
            .attr("r", "1.5");
          plotSet
            .append("g")
            .classed("plot-line", true)
            .append("path")
            .attr("d", plotLine(ds.mapped))
            .style("stroke", (ds.color != undefined) ? ds.color : null);
        });
    };

    return lineChart;
  }
})();
