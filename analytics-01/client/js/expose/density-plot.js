/**
 * Created by wouter on 01/09/2015.
 */

(function() {
  'use strict';

  angular.module('expose')
    .factory('expose.densityPlot', ['settings', 'expose', 'expose.lineChart', densityPlot]);

  /**
   * demoPainter service constructor.
   *
   * A pointer service is used by the exposeView directive
   * for adding and updating the actual content in the exposeView.
   *
   * This sample service adds an svg element and draw in it a set of diagonal
   * dashed lines, making use of D3.
   *
   * Each painter service should provide the following public functions:
   * - init(scope, container)
   * - draw(scope, viewRect, dirties)
   * - clear()
   */
  function densityPlot(settings, expose, lineChart) {
    var viewContainer = null;
    var svg = null; // the svg element (as D3 reference)
    var painter = {};

    // Raw data indices:
    var ri_radar_id = 0,
      ri_interval_start_time = 1,
      ri_altitude_band = 2,
      ri_avg_u_speed = 3,
      ri_avg_v_speed = 4,
      ri_avg_bird_density = 5,
      ri_vertical_integrated_density = 6,
      ri_number_of_measurements = 7,
      ri_speed = 8;

    /**
     * Called once by the exposeView directive when the view should be initialized.
     *
     * @param $scope The scope of the exposeView directive.
     * @param viewContainer The html element in which to add the content.
     */
    painter.init = function ($scope, el) {
      viewContainer = el;
    };

    /**
     * This function is called by the exposeView directive when
     * the view's content should be drawn or redrawn.
     *
     * @param $scope The scope of the exposeView directive.
     * @param viewRect The rect that corresponds to the content bounding box
     *                 in the container passed to the init function.
     * @param dirties An object that may have the following properties:
     *                - all = true when the content is drawn for the first time
     *                - size = true when the view container was resized
     *                An arbitrary dirties object can be passed when dispatching
     *                a redrawExpose event to the exposeView directive. This object
     *                is then passed to this function as this argument.
     *                This parameter is guaranteed to be always be an object, even
     *                when no custom dirties object is given and none of the system
     *                properties apply.
     */
    painter.draw = function ($scope, viewRect, dirties) {
      //console.log(">> densityPlot.draw()", dirties.all, dirties.size, $scope.ready);

      // Only redraw when needed:
      if (!(dirties.all || dirties.size)) { return; }
      if ($scope.model.focusData == null) { return; }

      // add svg element:
      if (svg) { svg.remove(); } // remove the existing svg content
      svg = d3.select(viewContainer).append("svg")
        .attr("width", viewRect.width)
        .attr("height", viewRect.height);

      // parameters:
      var padLeft = 40;
      var padRight = 25;
      var padTop = 25;
      var padBottom = 50;
      var chartGap = 13; // the (vertical) gap between graphs in pixels
      var chartPadTop = 20;
      var subChartGap = 5; // the (vertical) gap between graphs in pixels

      // altitudes:
      var altitudes = [
        { from: 200, till: 1600, label: "200 - 1600 m" },
        { from: 1600, till: 3000, label: "1600 - 3000 m" }
      ];
      expose.getColorHexSet(altitudes.length, 110, 260, 100, 60).forEach(function (c, i) {
        altitudes[i].color = c;
      });

      // derived variables:
      var data = $scope.model.focusData;
      var focus = data.focus;
      var caseStudy = $scope.model.caseStudy;
      var focusTime = focus.from.valueOf();
      var focusMillis = focus.duration * 60 * 60 * 1000; // the focus duration in milliseconds

      var radarOption = $scope.model.radarOption;
      var radarFromIdx = radarOption.from; // the index of the first radar to graph
      var radarTillIdx = radarOption.till; // the index of the last radar to graph

      var contentWidth = viewRect.width - padLeft - padRight;
      var contentHeight = viewRect.height - padTop - padBottom;
      var rpp = settings.radarsPerPage;
      var chartComboHeight = (contentHeight - (rpp - 1) * chartGap - rpp * chartPadTop)  / rpp;
      var chartHeight = (chartComboHeight - subChartGap) / 2;

      var strn = caseStudy.strataCount;
      var radi, radar, i;

      // X-axis spec:
      var xGLValue = focus.from;
      var xGLValues = [xGLValue];
      var xLabels = [];
      for (i = 0; i < focus.duration; i++) {
        xGLValues.push(xGLValue);
        xLabels.push({ value: xGLValue, label: i });
        xGLValue = moment(xGLValue).add(1, "hours");
      }
      xLabels.push({ value: xGLValue, label: "GMT" });
      var xAxisSpec_1 = {
        range: { min: focusTime, max: focusTime + focusMillis },
        gridLines: {
          values: xGLValues
        }
      };
      var xAxisSpec_2 = {
        range: { min: focusTime, max: focusTime + focusMillis },
        gridLines: {
          values: xGLValues
        },
        labels: xLabels
      };

      // Y-axis specs:
      var yAxisSpec_density = {
        range: { min: 0, max: 400 },
        gridLines: {
          values: [ 200 ]
        },
        labels: [
          { label: "0", value: 0 },
          { label: "200", value: 200 },
          { label: "400", value: 400 }
        ]
      };
      var yAxisSpec_speed = {
        range: { min: 0, max: 40 },
        gridLines: {
          values: [ 20 ]
        },
        labels: [
          { label: "0", value: 0 },
          { label: "20", value: 20 },
          { label: "40", value: 40 }
        ]
      };

      // add the charts group:
      var chartsG = svg.append("g")
        .attr("id", "charts")
        .attr("transform", "translate(" + padLeft + "," + padTop + ")");

      // main title:
      chartsG.append("text")
        .attr("class", "charts-title")
        .attr("x", contentWidth / 2)
        .attr("y", 0)
        .text("Densities and speeds – " + focus.from.format("MMM D, YYYY"));

      // the graphs group contains the graphs, one for each radar:
      for (radi = radarFromIdx; radi < radarTillIdx; radi++) {
        radar = caseStudy.radars[radi];
        var localRadi = radi - radarFromIdx;

        // add chart-combo group with a title:
        var dy = chartPadTop + localRadi * (chartComboHeight + chartPadTop + chartGap);
        var chartComboG = chartsG.append("g")
          .attr("transform", "translate(0," + dy + ")");
        chartComboG
          .append("text")
          .attr("x", 3)
          .attr("y", -3)
          .text("Radar " + radar.id)
          .classed("chart-combo-title", true);

        // prepare data sets:
        var densiDataSets = [];
        var speedDataSets = [];
        for (var stri = 0; stri < strn; stri++) {
          var densiData = [];
          var speedData = [];
          var times = data.getTimes(stri, radi);
          var densities = data.getDensities(stri, radi);
          var speeds = data.getSpeeds(stri, radi);
          var len = times.length;
          for (var di = 0; di < len; di++) {
            densiData.push({
              x: times[di],
              y: densities[di]
            });
            speedData.push({
              x: times[di],
              y: speeds[di]
            });
          }
          densiDataSets.push({
            data: densiData,
            label: "Density",
            class: "density-plot-line",
            color: altitudes[stri].color
          });
          speedDataSets.push({
            data: speedData,
            label: "Speed",
            class: "speed-plot-line",
            color: altitudes[stri].color
          });
        }

        // draw density chart:
        var densiChartG = chartComboG.append("g");
        lineChart.draw({
          root: densiChartG,
          chartWidth: contentWidth,
          chartHeight: chartHeight,
          title: {
            label: "Density"
          },
          xAxis: xAxisSpec_1,
          yAxis: yAxisSpec_density,
          dataSets: densiDataSets
        });

        // draw speed chart:
        var speedChartG = chartComboG.append("g")
          .attr("transform", "translate(0," + (chartHeight + subChartGap) + ")");
        lineChart.draw({
          root: speedChartG,
          chartWidth: contentWidth,
          chartHeight: chartHeight,
          title: {
            label: "Speed"
          },
          xAxis: xAxisSpec_2,
          yAxis: yAxisSpec_speed,
          dataSets: speedDataSets
        });
      }

      // draw altitudes color legend:
      var altn = altitudes.length;
      var itemGap = 15;
      var itemWidth = Math.min((contentWidth - (altn - 1) * itemGap) / altn, 100);
      var itemHeight = 20;
      var legendG = chartsG
        .append("g")
        .classed("legend", true)
        .attr("transform", "translate(0," + (contentHeight + 5) + ")");
      altitudes.forEach(function (alt, alti) {
        var tx = alti * (itemWidth + itemGap);
        var itemG = legendG
          .append("g")
          .classed("legend-item", true)
          .attr("transform", "translate(" + tx + ", 0)");
        itemG.append("rect")
          .attr("x", 0).attr("y", 8)
          .attr("width", 12).attr("height", 6)
          .style("fill", altitudes[alti].color)
          .classed("legend-color-box", true);
        itemG
          .append("text")
          .attr("x", itemHeight)
          .attr("y", itemHeight / 2)
          .text(altitudes[alti].label)
          .classed("legend-label", true);
      });
    };

    /**
     * Clear the content.
     */
    painter.clear = function () {
      if (svg) { svg.remove(); }
    };

    return painter;
  }

})();
