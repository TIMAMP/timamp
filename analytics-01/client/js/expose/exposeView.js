/**
 * Created by wouter on 08/11/2015.
 */

(function() {
  'use strict';

  angular.module('expose')
    .directive('exposeView', ['$window', 'expose.densityPlot', exposeView]);

  /**
   * <exposeView> directive.
   *
   * This directive manages a expose view. It depends on a painter service
   * that initializes and maintains the actual content. The painter is told to
   * redraw the content when the window is rescaled or when the redrawExpose event is
   * dispatched to this directive.
   *
   * This directive listens for the following events:
   * - redrawExpose - Triggers a redraw of the content by the painter.
   *
   */
  function exposeView($window, painter) {
    return {
      restrict: 'A',  // restrict to attribute use

      link: function ($scope, element, attrs) {
        // True as long as the view was not yet drawn:
        var firstDraw = true;

        // Tells the painter to redraw the view. To be called when the window
        // was resized, when the redrawExpose event was received, etc.
        function draw(dirties) {
          // The painter's draw function is guaranteed to be given an object:
          if (dirties === undefined) dirties = {};

          // When the content will be drawn for the first time, then first call
          // the painter's init function, and then call the draw with all = true
          // in the dirties object.
          if (firstDraw) {
            painter.init($scope, element[0])
            dirties.all = true;
            firstDraw = false;
          }

          var viewRect = element[0].getBoundingClientRect();

          painter.draw($scope, viewRect, dirties);
        }

        // Call redraw when the window was resized, but wait a bit to avoid
        // staggered content redrawing, and pass a dirty object with size = true:
        var timer = 0;
        angular.element($window).bind('resize', function () {
          clearTimeout (timer);
          timer = setTimeout(function () { draw({ size: true }); }, 250);
        });

        // Redraw on receiving the redrawExpose event.
        // Trigger this event by calling $scope.$broadcast('redrawExpose');
        $scope.$on('redrawExpose', function (event, dirties) {
          if (dirties === undefined) dirties = { all: true };
          //console.log("exposeView >> redrawExpose event");
          draw(dirties);
        });

        // Call draw for the first time when the html element is ready:
        $scope.$watch('$viewContentLoaded', draw);
      }
    };
  }

})();