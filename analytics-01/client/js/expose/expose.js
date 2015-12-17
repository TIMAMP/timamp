/**
 * Created by wouter on 17/12/2015.
 */

/**
 * Created by wouter on 08/11/2015.
 */

(function() {
  'use strict';

  angular.module('expose', [])
    .factory('expose', [expose]);

  /**
   * Expose service constructor.
   */
  function expose() {
    var expose = {};

    /**
     * Creates a set of matching colors as hex strings.
     *
     * The colors are generated using the HUSL color model, see
     * http://www.husl-colors.org for more details.
     *
     * @param count the number of colors
     * @param hueMin a number between 0 and 360
     * @param hueMax a number between 0 and 360
     * @param saturation a number between 0 and 100
     * @param lightness a number between 0 and 100
     * @returns {Array}
     */
    expose.getColorHexSet = function (count, hueMin, hueMax, saturation, lightness) {
      if (count == 1) {
        return [HUSL.toHex(hueMin, saturation, lightness)];
      }
      else {
        var hueInc = (hueMax - hueMin) / (count - 1);
        var colors = [];
        for (var i = 0; i < count; i++) {
          colors.push(HUSL.toHex(hueMin + i * hueInc, saturation, lightness));
        }
        return colors;
      }
    };

    return expose;
  }

})();