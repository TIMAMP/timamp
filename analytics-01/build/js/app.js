/**
 * Created by wouter on 13/12/2015.
 */

(function() {
  'use strict';

  angular.module('utils', [])
    .factory('utils', [utils]);

  /**
   * utils service constructor.
   *
   * @returns The service object.
   */
  function utils() {
    //console.log(">> utils factory constructor");

    var utils = {};


    /**
     * Identity function, simply returns the first argument.
     * @param {*} d
     * @returns {*}
     */
    utils.id = function (d) { return d; }

// #############################################################################
// Geometric functions
// -----------------------------------------------------------------------------

    utils.geo = {};

    /** @const */
    utils.geo._GEO_DIST_FACTOR = 360 / (6371 * 2 * Math.PI);

    /**
     * Returns the angle (in degrees) corresponding with the given displacement in km.
     * The angle (in degrees) of a displacement of 1 km horizontally along the equator:
     * 1 km = 1 / (2 * 6371 * pi) * 360 degrees = 0.008993216059 degrees.
     * Inversely: 1 degree ~= 111.19492664 km
     *
     * @param {Number} dist The distance in km.
     * @returns {number}
     */
    utils.geo.distAngle = function (dist) {
      return dist * utils.geo._GEO_DIST_FACTOR;
    };

    /**
     * Returns the destination location, given a start location, a bearing and a
     * distance. Based on http://www.movable-type.co.uk/scripts/latlong.html
     * @param  {Array<number>} start a [lon, lat] coordinate in degrees
     * @param  {number}        bearing in degrees clockwise from north
     * @param  {number}        distance in km
     * @return {Array<number>} a [lon, lat] coordinate in degrees
     */
    utils.geo.destination = function (start, bearing, distance) {
      var dR = distance / 6371;  // angular distance = distance / earth’s radius
      var lat1 = utils.radians(start[1]);
      var lon1 = utils.radians(start[0]);
      bearing = utils.radians(bearing);
      var lat2 = Math.asin(Math.sin(lat1) * Math.cos(dR) +
        Math.cos(lat1) * Math.sin(dR) * Math.cos(bearing));
      var lon2 = lon1 + Math.atan2(Math.sin(bearing) * Math.sin(dR) * Math.cos(lat1),
          Math.cos(dR) - Math.sin(lat1) * Math.sin(lat2));
      lon2 = (lon2 + 3 * Math.PI) % (2 * Math.PI) - Math.PI; // normalise to -180..+180°
      //console.log(start, [Math.degrees(lon2), Math.degrees(lat2)]);
      return [utils.degrees(lon2), utils.degrees(lat2)];
    };

    /**
     * Returns the destination location, given a start location, a bearing and a
     * distance. Based on http://www.movable-type.co.uk/scripts/latlong.html
     * @param  {Array<number>} start a [lon, lat] coordinate in degrees
     * @param  {number}        bearing in radians clockwise from north
     * @param  {number}        distance in km
     * @return {Array<number>} a [lon, lat] coordinate in degrees
     */
    utils.geo.destinationRad = function (start, bearing, distance) {
      var dR = distance / 6371;  // angular distance = distance / earth’s radius
      var lat1 = utils.radians(start[1]);
      var lon1 = utils.radians(start[0]);
      var lat2 = Math.asin(Math.sin(lat1) * Math.cos(dR) +
        Math.cos(lat1) * Math.sin(dR) * Math.cos(bearing));
      var lon2 = lon1 + Math.atan2(Math.sin(bearing) * Math.sin(dR) * Math.cos(lat1),
          Math.cos(dR) - Math.sin(lat1) * Math.sin(lat2));
      lon2 = (lon2 + 3 * Math.PI) % (2 * Math.PI) - Math.PI; // normalise to -180..+180°
      //console.log(start, [Math.degrees(lon2), Math.degrees(lat2)]);
      return [utils.degrees(lon2), utils.degrees(lat2)];
    };

// #############################################################################
// Interpolation
// -----------------------------------------------------------------------------

    utils.idw = function (x, y, tValues, xValues, yValues, power) {
      if (tValues.length != xValues.length) {
        throw "tValues.length != xValues.length";
      }
      if (xValues.length != yValues.length) {
        throw "xValues.length != yValues.length";
      }
      var len = tValues.length, i, dx, dy, wi, ws = 0, r = 0;
      for (i = 0; i < len; i++) {
        dx = x - xValues[i];
        dy = y - yValues[i];
        if (dx == 0 && dy == 0) { return tValues[i]; }
        wi = 1 / Math.pow(Math.sqrt(dx * dx + dy * dy), power);
        r += wi * tValues[i];
        ws += wi;
      }
      return r / ws;
    };

// #############################################################################
// Color functions
// -----------------------------------------------------------------------------

    /**
     * Transforms HSB to RGB color. Accepts either 3 arguments (hue, saturaion and
     * value/brightness in  the range [0, 1]), or 1 argument (an object with h, s
     * and v properties in the range [0, 1]).
     * Based on http://axonflux.com/handy-rgb-to-hsl-and-rgb-to-hsv-color-model-c.
     * Conversion formula adapted from http://en.wikipedia.org/wiki/HSL_color_space.
     * @param   {Number|Object} h The hue value in the range [0, 1], or an
     *                            object with three properties {h:h, s:s, v:v}.
     * @param   {Number}        s The saturation in the range [0, 1].
     * @param   {Number}        v The value/brightness in the range [0, 1].
     * @returns {Object}        An object with r, g and b properties in the range
     *                          [0, 255].
     */
    utils.hsvToRgb = function (h, s, v) {
      var r, g, b, i, f, p, q, t;
      if (h && s === undefined && v === undefined) {
        s = h.s, v = h.v, h = h.h;
      }
      i = Math.floor(h * 6);
      f = h * 6 - i;
      p = v * (1 - s);
      q = v * (1 - f * s);
      t = v * (1 - (1 - f) * s);
      switch (i % 6) {
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
      }
      return {
        r: Math.floor(r * 255),
        g: Math.floor(g * 255),
        b: Math.floor(b * 255)
      };
    };

    /**
     * Converts an RGB color value to HSL.
     * Assumes r, g, and b are contained in the set [0, 255] and
     * returns h, s, and l in the set [0, 1].
     * Based on http://axonflux.com/handy-rgb-to-hsl-and-rgb-to-hsv-color-model-c.
     * Conversion formula adapted from http://en.wikipedia.org/wiki/HSL_color_space.
     * @param   {Number|Object} r The red color value in the range [0, 255], or an
     *                            object with three properties {r:r, g:g, b:b}.
     * @param   {Number}        g The green color value in the range [0, 255].
     * @param   {Number}        b The blue color value in the range [0, 255].
     * @returns {Array}         An object with h, a and v properties in the range
     *                          [0, 1].
     */
    utils.rgbToHsv = function (r, g, b) {
      var min, max, h, s, v, d;
      if (r && g === undefined && b === undefined) {
        g = r.g, b = r.b, r = r.r;
      }
      r = r / 255, g = g / 255, b = b / 255;
      max = Math.max(r, g, b), min = Math.min(r, g, b);
      v = max;
      d = max - min;
      s = max === 0 ? 0 : d / max;
      if (max == min) {
        h = 0; // achromatic
      } else {
        switch (max) {
          case r: h = (g - b) / d + (g < b ? 6 : 0); break;
          case g: h = (b - r) / d + 2; break;
          case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
      }
      return {h:h, s:s, v:v};
    };

    /**
     * Transform the given r, g and b values in the range [0, 255] to its
     * hex-representation.
     * @param   {Number|Object} r The red color value in the range [0, 255], or an
     *                            object with three properties {r:r, g:g, b:b}.
     * @param   {Number}        g The green color value in the range [0, 255].
     * @param   {Number}        b The blue color value in the range [0, 255].
     * @returns {String}        The hex represenation of the rgb value.
     */
    utils.rgbToHex = function (r, g, b) {
      if (r && g === undefined && b === undefined) {
        g = r.g, b = r.b, r = r.r;
      }
      r = r.toString(16);
      if (r.length == 1) r = "0" + r;
      g = g.toString(16);
      if (g.length == 1) g = "0" + g;
      b = b.toString(16);
      if (b.length == 1) b = "0" + b;
      return "#" + r + g + b;
    };

    utils.hsvToHex = function (h, s, v) {
      return utils.rgbToHex(utils.hsvToRgb(h, s, v));
    };

    utils.hsvaToRgba = function (h, s, v, a) {
      var rgb = utils.hsvToRgb(h, s, v);
      return "rgba(" + rgb.r + ", " + rgb.g + ", " + rgb.b + ", " + a + ")";
    };

// #############################################################################
// Statistics
// -----------------------------------------------------------------------------

    /**
     * Returns the average of the values in the given array.
     * @param   {Array}            ary     An array with numbers.
     * @param   {*}                undefAv The return value when the array is empty.
     * @returns {Number|undefined} The average or undefined if the array is empty.
     */
    utils.average = function (ary, undefAv) {
      if (arguments.length === 1) { undefAv = 0; }
      if (ary === undefined) { return undefAv; }
      var len = ary.length;
      if (len === 0) { return undefAv;  }
      var r = 0;
      for (var i = 0; i < len; i++) { r += ary[i]; }
      return r / len;
    };

    /**
     * Returns the average of a list of displacements, given as an array of
     * directions and an array of corresponding speeds. These array should have
     * the same length.
     * @param   {Array}            angles List of angles in radias.
     * @param   {Array}            speeds List of speeds.
     * @param   {*}                undefAv The return value when the array is empty.
     * @returns {Object|undefined} An object with angle and speed properties or
     *                             undefined if the given arrays are empty.
     */
    utils.averageDisplacement = function (angles, speeds, undefAv) {
      if (angles === undefined || speeds === undefined) { return undefAv; }
      var len = angles.length;
      if (len === 0) { return undefAv; }
      var x = 0, y = 0;
      for (var i = 0; i < len; i++) {
        x += Math.cos(angles[i]) * speeds[i];
        y += Math.sin(angles[i]) * speeds[i];
      }
      x /= len;
      y /= len;
      return {
        angle: Math.atan2(x, y),
        speed: Math.sqrt(x * x + y * y)
      };
    };

// #############################################################################
// Math utilities
// -----------------------------------------------------------------------------

    /**
     * Returns the given angle in degrees expressed as radians.
     * @param   {Number} degrees The given angle in degrees.
     * @returns {Number} The given angle in radians.
     */
    utils.radians = function (degrees) {
      return degrees * Math.PI / 180;
    };

    /**
     * Returns the given angle in radians expressed as degrees.
     * @param   {Number} radians The given angle in radians.
     * @returns {Number} The given angle in degrees.
     */
    utils.degrees = function (radians) {
      return radians / Math.PI * 180;
    };

    /**
     * Maps the value v from the source range [a, b] to the target range [c, d].
     * @param   {Number} value The value to map.
     * @param   {Number} low1 The first bound of the source range.
     * @param   {Number} high1 The second bound of the source range.
     * @param   {Number} low2 The first bound of the target range.
     * @param   {Number} high2 The second bound of the target range.
     * @returns {Number} The mapped value.
     */
    utils.mapRange = function (value, low1, high1, low2, high2) {
      return low2 + (high2 - low2) * (value - low1) / (high1 - low1);
    };

    /**
     * Constrains the given value v to the range [min, max]
     * @param   {Number} v   The value to constrain.
     * @param   {Number} min The minimum value of the range.
     * @param   {Number} max The maximum value of the range.
     * @returns {Number} The constrained value.
     */
    utils.constrain = function (v, min, max) {
      if (v < min) return min;
      else if (v > max) return max;
      else return v;
    };

    /**
     * Calculates the length of the vector (dx, dy).
     * @param   {Number} dx [[Description]]
     * @param   {Number} dy [[Description]]
     * @returns {Number} [[Description]]
     */
    utils.vectorLength = function (dx, dy) {
      return Math.sqrt(dx * dx + dy * dy);
    };

// #############################################################################
// Support functions
// -----------------------------------------------------------------------------

    /**
     * Return the size of one em in pixels.
     * @returns {Number} The size of one em in pixels.
     */
    utils.emSize = function () {
      return parseFloat($("body").css("font-size"));
    };

    /**
     * Creates a list with n zeros.
     * @param   {Number}   length The number of zeros to
     * @returns {[[Type]]} [[Description]]
     */
    utils.zeroArray = function (length) {
      var result = [];
      for (var i = 0; i < length; i++) {
        result.push(0);
      }
      return result;
    };

// -----------------------------------------------------------------------------

    utils.debug = function (name, value) {
      //$("#debug").append("<p>" + name + ": " + value + "</p>");
      if (name && value === undefined) {
        console.log(name);
      }
      else {
        console.log(name + ": " + value);
      }
    };

    return utils;
  }

})();

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
/**
 * Created by wouter on 01/09/2015.
 */

(function() {
  'use strict';

  angular.module('enram', [])
    .factory('enram', [enram]);

  /**
   * Enram service constructor.
   * @returns The service object.
   */
  function enram() {
    //console.log(">> enram service constructor");
    var enram = {};

    /**
     * Creates and returns a focus object.
     * @param from      {moment}  the start of the focus window
     * @param duration  {number}  the focus duration in hours
     */
    enram.focus = function (from, duration) {
      var focus = {
        from: from,
        till: moment.utc(from).add(duration, 'hours'),
        duration: duration,
        isFocus: true
      };

      /**
       * Update the from moment and the matching till moment.
       * @param from {moment}
       */
      focus.setFrom = function (from) {
        this.from = from;
        this.till = moment(from).add(this.duration, 'hours');
      };

      /**
       * Update the till moment and the matching from moment.
       * @param till {moment}
       */
      focus.setTill = function (till) {
        this.till = till;
        this.from = moment(till).subtract(focus.duration, 'hours');
      };

      /**
       * @return the number of
       */
      focus.segmentCount = function (caseStudy) {
        return this.duration * 60 / caseStudy.segmentSize;
      };

      return focus;
    };

    /**
     * caseStudy form:
     * {
     *   <see properties in README.md>
     *   defaultFocusFrom: {moment}
     *   segmentCount: {number} The number of segments in the source data
     * }
     *
     * @param basePath {string}
     * @param dataService {object}
     * @returns The caseStudy object.
     */
    enram.caseStudy = function (basePath, dataService) {
      var caseStudy = {
        basePath: basePath,
        dataService: dataService,
        isCaseStudy: true
      };

      /**
       * Asynchronously loads the case study metadata and other necessary data.
       * @param handler
       */
      caseStudy.load = function (handler) {
        this._loadMetaData(function () {
          caseStudy.dataService.initialize(caseStudy, function () {
            console.info("Loaded case study", caseStudy.label);
            handler();
          });
        });
      };

      /**
       * Load case study data from properly formatted json file.
       * @param {function(enram.caseStudy)} handler  This handler is
       *   called with the caseStudy as argument.
       */
      caseStudy._loadMetaData = function (handler) {
        //console.log(this);
        caseStudy.urlBase = "data/" + this.basePath + "/";
        d3.json(caseStudy.urlBase + "metadata.json", function (error, json) {
          //console.log(caseStudy);
          if (error) {
            throw error;
            //throw new Error("Error in caseStudy._loadMetaData. "
            //    + JSON.parse(error.responseText).error.join("; "));
          }
          else {
            for (var attr in json) {
              if (json.hasOwnProperty(attr)) caseStudy[attr] = json[attr];
            }
            caseStudy.dataFrom = moment.utc(caseStudy.dataFrom);
            caseStudy.dataTill = moment.utc(caseStudy.dataTill);
            caseStudy.defaultFocusFrom = moment.utc(caseStudy.focusFrom);

            // Create mapping from radar ids to indices:
            caseStudy.radarIndices = {};
            caseStudy.radLons = [];
            caseStudy.radLats = [];
            caseStudy.radars.forEach(function (radar, i) {
              radar.location = [radar.longitude, radar.latitude];
              caseStudy.radarIndices[radar.id] = i;
              caseStudy.radLons.push(radar.longitude);
              caseStudy.radLats.push(radar.latitude);
            });

            caseStudy.topoJsonUrl = caseStudy.urlBase + "topo.json";
            caseStudy.selectedRadar = caseStudy.radars[0];
            caseStudy.radarCount = caseStudy.radars.length;

            var dms = caseStudy.dataTill.valueOf() - caseStudy.dataFrom.valueOf();
           caseStudy.segmentCount = dms / 1000 / 60 / caseStudy.segmentSize;
            if (Math.abs(caseStudy.segmentCount) != caseStudy.segmentCount) {
              console.error(caseStudy.dataFrom.valueOf());
              console.error(caseStudy.dataTill.valueOf());
              throw new Error("Expected integer segmentCount, got: " +
                caseStudy.segmentCount + ", dms: " + dms);
            }

            handler(caseStudy);
          }
        });
      };

      /**
       * Loads the data for the given focus.
       * @param focus    {enram.focus}
       * @param handler  {function(dataObject)}  called when the data is loaded
       */
      caseStudy.loadFocusData = function (focus, handler) {
        //console.log(">> caseStudy.loadFocusData()");
        this.dataService.loadFocusData(caseStudy, focus, handler);
      };

      /**
       * @return the segment duration in milliseconds
       */
      caseStudy.segmentMillis = function () {
        return this.segmentSize * 60 * 1000;
      };

      caseStudy.getProjection = function (caseStudy, mapWidth, mapHeight) {
        console.error("There is no implementation for getProjection in case study '"
          + caseStudy.label + "'.");
      };

      return caseStudy;
    };

    /**
     * Loads the case studies passed as arguments and calls the handlers when complete.
     */
    enram.loadCaseStudies = function (caseStudies, handler) {
      //console.log("enram.initializeCaseStudies()");

      // the index of the next case study to load
      var current = 0;

      // recursively load the next case study:
      function next() {
        //console.log(" > next ", caseStudies.length, current);
        if (current == caseStudies.length) {
          // all case studies
          handler(caseStudies);
        }
        else {
          caseStudies[current].load(function () {
            current++;
            next();
          });
        }
      }

      // start loading the first case study:
      next();
    };

    return enram;
  }

})();

(function() {
  'use strict';

  //console.log("loading exposeApp module");

  var app = angular.module('exposeApp', [
    // Angular libraries:
    'ngAnimate',
    //'ngTouch',
    'ui.bootstrap',
    'ui.router',

    // app partials:
    'expose',
    'enram'
  ]);

  /**
   * Configures the app.
   */
  app.config(['$urlRouterProvider', '$locationProvider', '$httpProvider',
    function ($urlRouterProvider, $locationProvider, $httpProvider) {
      //console.log(">> app.config");
      $urlRouterProvider.otherwise('/');

      $locationProvider.html5Mode({
        enabled: false,
        requireBase: false
      });

      $locationProvider.hashPrefix('!');

      FastClick.attach(document.body);

      delete $httpProvider.defaults.headers.common['X-Requested-With'];
    }]);

  /**
   * Start the application.
   */
  app.run(function () {
    //console.log(">> app.run");
  });

  /**
   * Settings provider.
   */
  app.factory('settings', ['$log', function ($log) {
    var settings = {};

    // True when the browser supports svg.
    settings.svgSupported = document.implementation.hasFeature("http://www.w3.org/TR/SVG11/feature#Image", "1.1");

    // True when interface animations are enabled.
    settings.animationsEnabled = false;

    // The duration in hours of the focus interval.
    settings.focusDuration = 24;

    // The number of radar-graphs on one page.
    settings.radarsPerPage = 5;

    return settings;
  }]);

  /**
   * Main app controller.
   */
  app.controller('appCtrl', ['$scope', 'settings', 'enram', '$injector', '$uibModal', '$q', '$log',
    function ($scope, settings, enram, $injector, $uibModal, $q, $log) {
      //console.log(">> app.appCtrl constructor");
      //console.log(us15a);

      /**
       * Show 'LOADING' while loading something and returns a promise that is resolved
       * when the loading is complete.
       *
       * @param loader  A function that performs the loading and that takes a
       *                function as sole argument. This function is called when the
       *                loading is complete.
       */
      $scope.load = (function () {
        var counter = 0; // tracks overlapping calls
        return function (loader) {
          counter++;
          if (counter == 1) {
            // TODO: show 'LOADING' if this is not yet the case
          }
          return $q(function (resolve, reject) {
            loader(
              /* resolve handler */
              function () {
                resolve.apply(this, arguments);
                counter--;
                if (counter == 0) {
                  // TODO: stop show 'LOADING'
                }
              },
              /* reject handler */
              function () {
                reject.apply(this, arguments);
                counter--;
                if (counter == 0) {
                  // TODO: stop show 'LOADING'
                }
              });
          });
        }
      })();

      /** Returns the current focus. */
      function currentFocus() {
        return enram.focus($scope.model.dayOption.moment, settings.focusDuration);
      }

      /**
       * Helper function that load the data for the current focus in the current case study.
       *
       * <p>This function is typically called as follows:</p>
       *
       * <code>loadFocusData().then(function(data) { <handle data> });</code>
       *
       * @return  {promise}
       */
      function loadFocusData() {
        return $scope.load(function (resolve, reject) {
          $scope.model.caseStudy.loadFocusData(currentFocus(), function (data) {
            $scope.model.focusData = data;
            resolve(data);
          });
        });
      }

      /**
       * Sets the currently selected caseStudy.
       *
       * @param caseStudy
       */
      $scope.setCaseStudy = function (caseStudy) {
        if ($scope.model.caseStudy == caseStudy) { return; }
        //$log.info("Selected caseStudy:", caseStudy);
        $scope.model.caseStudy = caseStudy;

        // update the day options:
        $scope.model.dayOptions = [];
        var mom = moment(caseStudy.dataFrom).hours(0).minutes(0);
        while (mom.isBefore(caseStudy.dataTill)) {
          $scope.model.dayOptions.push({
            moment: mom,
            label: mom.format("MMM D, 'YY")
          });
          mom = moment(mom).add(24, "hours");
        }
        $scope.model.dayOption = $scope.model.dayOptions[3];

        // Update the radio options:
        $scope.model.radarOptions = [];
        var radarCnt = caseStudy.radars.length;
        var radarOption;
        caseStudy.radars.forEach(function (radar, i) {
          if (i % settings.radarsPerPage == 0) {
            var till = Math.min(i + settings.radarsPerPage, radarCnt);
            radarOption = {
              from: i,
              till: till,
              label: "Radars " + (i + 1) + "-" + till
            };
            $scope.model.radarOptions.push(radarOption);
          }
        });
        $scope.model.radarOption = $scope.model.radarOptions[0];

        // load the data:
        loadFocusData().then(function(data) {
          $scope.$broadcast('redrawExpose');
        });
      };

      /**
       * Sets the currently selected dayOption.
       *
       * @param dayOption
       */
      $scope.setDayOption = function (dayOption) {
        if ($scope.model.dayOption == dayOption) { return; }
        //$log.info("Selected dayOption:", dayOption);
        $scope.model.dayOption = dayOption;

        // load the data:
        loadFocusData().then(function(data) {
          $scope.$broadcast('redrawExpose');
        });
      };

      /**
       * Sets the currently selected radarOption.
       *
       * @param radarOption
       */
      $scope.setRadarOption = function (radarOption) {
        if ($scope.model.radarOption == radarOption) { return; }
        //$log.info("Selected radarOption:", radarOption);
        $scope.model.radarOption = radarOption;

        // load the data:
        loadFocusData().then(function(data) {
          $scope.$broadcast('redrawExpose');
        });
      };

      /**
       * Disable/Enable application-wide animations.
       */
      $scope.toggleAnimation = function () {
        $scope.settings.animationsEnabled = !$scope.settings.animationsEnabled;
        $animate.enabled($scope.settings.animationsEnabled);
      };

      /**
       * Opens a modal window with an error message.
       *
       * @param title The title to show in the window.
       * @param message The message to show in the window.
       * @param fatal True when the error is fatal.
       */
      $scope.reportError = function (title, message, fatal) {
        //console.log(">> appCtrl.reportError()");

        var modalScope = $scope.$new();
        modalScope.title = title;
        modalScope.message = message;
        modalScope.showOK = !fatal;
        modalScope.showCancel = false;

        return $uibModal.open({
          scope: modalScope,
          templateUrl: "modalErrorContent.html",
          animation: settings.animationsEnabled,
          keyboard: false,
          backdrop: 'static'
        });
      };

      // The settings are made available in the scope.
      $scope.settings = settings;

      /**
       * The main model object.
       *
       * We're using a model object to avoid scope inheritance problems due to
       * the fact that ng-model directives in a child-scope can create shadowing
       * properties hiding the actual properties in this scope.
       *
       * Model properties:
       * - caseStudies :  The potential case studies.
       * - caseStudy :    The currently selected case study.
       * - radarOptions : The potential radar-sets to show.
       * - radarOption :  The currently selected radar set.
       * - dayOptions :   The potential days to select.
       * - dayOption :    The currently selected day.
       * - focusData :    The currently shown focus data.
       */
      $scope.model = {
        caseStudies: [],
        caseStudy: null,
        radarOptions: [],
        radarOption: null,
        dayOptions: [],
        dayOption: null,
        focusData: null
      };

      // load the case studies:
      $scope.load(function (resolve, reject) {
        var caseStudies = [
          $injector.get('us15a.segmented'),
          $injector.get('us15a.raw')
        ];
        enram.loadCaseStudies(caseStudies, resolve);
      }).then(function (caseStudies) {
        //console.log("Initialised the case studies", caseStudies);
        $scope.model.caseStudies = caseStudies;
        $scope.setCaseStudy(caseStudies[0]);
      });

      // Assert that SVG is supported by the browser:
      if (!settings.svgSupported) {
        var msg = "SVG is not supported in this browser. Please use a recent browser.";
        $log.error(msg);
        $scope.reportError("Unsupported Browser", msg, true);
      }

    }]);

  /**
   * Navbar controller.
   */
  app.controller('navBarCtrl', ['$scope', function ($scope) {
    //console.log(">> app.navBarCtrl constructor");

    /**
     * True when the navbar is collapsed.
     * @type {boolean}
     */
    $scope.isCollapsed = true;

    /**
     * Sets the caseStudy in the appCtrl's scope and collapsed the navbar.
     * @param caseStudy
     */
    $scope.caseStudySelected = function (caseStudy) {
      $scope.setCaseStudy(caseStudy);
      $scope.isCollapsed = true;
    };

    /**
     * Sets the dayOption in the appCtrl's scope and collapsed the navbar.
     * @param dayOption
     */
    $scope.dayOptionSelected = function (dayOption) {
      $scope.setDayOption(dayOption);
      $scope.isCollapsed = true;
    };

    /**
     * Sets the radarOption in the appCtrl's scope and collapsed the navbar.
     * @param radarOption
     */
    $scope.radarOptionSelected = function (radarOption) {
      $scope.setRadarOption(radarOption);
      $scope.isCollapsed = true;
    };

  }]);

})();

/**
 * Created by wouter on 17/12/2015.
 */

(function() {
  'use strict';

  angular.module('timamp', ['utils'])
    .factory('timamp', ['utils', timamp]);

  function timamp() {
    //console.log(">> timamp service constructor");
    var timamp = {};

    /**
     * The timamp data structure is constructed such that it efficiently facilitates
     * the interpolation operations needed when constructing the paths in the timamp
     * visualization.
     *
     * Terminology:
     * - segment : The data is temporally segmented in segments of e.g. 20 minutes.
     * - focus : A temporal section of the data currently shown in the visualisation.
     * - strata : An altitude range.
     *
     * This data structure should always be complete, meaning that for each segment in the
     * focus window, for each strata and for each radar, there should be a value, even
     * if the original data does not fully cover the given focus window.
     *
     * The data object has the following form:
     * {
     *   caseStudy: {enram.caseStudy},  // the caseStudy
     *   focus: {enram.focus},    // specifies the focus start and duration
     *   segmentCount: {number},  // the number of segments in the focus
     *   densities: {Array},      // matrix with dimensions: [segment, strata, radar]
     *   uSpeeds: {Array},        // matrix with dimensions: [segment, strata, radar]
     *   vSpeeds: {Array},        // matrix with dimensions: [segment, strata, radar]
     *   speeds: {Array},         // matrix with dimensions: [segment, strata, radar]
     *   avDensities: {Array},    // matrix with dimensions: [strata, radar]
     * }
     *
     * @param caseStudy  {enram.caseStudy}
     * @param focus      {enram.focus}
     * @returns the data structure
     */
    timamp.dataObject = function (caseStudy, focus) {
      var dataObject = {
        caseStudy: caseStudy,
        focus: focus,
        segmentCount: focus.segmentCount(caseStudy),
        densities: [],
        uSpeeds: [],
        vSpeeds: [],
        speeds: [],
        avDensities: []
      };

      /**
       * Initializes the data structure to be filled with actual data.
       *
       * @return the data object
       */
      dataObject.initStructure = function () {
        var segn = this.segmentCount;
        var strn = caseStudy.strataCount;
        var radn = caseStudy.radarCount;
        for (var segi = 0; segi < segn; segi++) {
          var densities = [];
          var uSpeeds = [];
          var vSpeeds = [];
          var speeds = [];
          for (var stri = 0; stri < strn; stri++) {
            densities.push(utils.zeroArray(radn));
            uSpeeds.push(utils.zeroArray(radn));
            vSpeeds.push(utils.zeroArray(radn));
            speeds.push(utils.zeroArray(radn));
          }
          this.densities.push(densities);
          this.uSpeeds.push(uSpeeds);
          this.vSpeeds.push(vSpeeds);
          this.speeds.push(speeds);
        }

        for (stri = 0; stri < strn; stri++) {
          this.avDensities.push(utils.zeroArray(radn));
        }

        return this;
      };

      // empty partial data structure to use in dataObject.addMissingSegments:
      var missingSegmentData = [];
      var strn = caseStudy.strataCount;
      var radn = caseStudy.radarCount;
      for (var stri = 0; stri < strn; stri++) {
        missingSegmentData.push(utils.zeroArray(radn));
      }

      /**
       * Prepends data entries to replace missing data for a given amount of segments.
       * @param amount The number of segments for which to add data entries.
       */
      dataObject.prependMissingSegments = function (amount) {
        for (var i = 0; i < amount; i++) {
          this.densities.unshift(missingSegmentData);
          this.uSpeeds.unshift(missingSegmentData);
          this.vSpeeds.unshift(missingSegmentData);
          this.speeds.unshift(missingSegmentData);
        }
      };

      /**
       * Appends data entries to replace missing data for a given amount of segments.
       * @param amount The number of segments for which to add data entries.
       */
      dataObject.appendMissingSegments = function (amount) {
        for (var i = 0; i < amount; i++) {
          this.densities.push(missingSegmentData);
          this.uSpeeds.push(missingSegmentData);
          this.vSpeeds.push(missingSegmentData);
          this.speeds.push(missingSegmentData);
        }
      };

      return dataObject;
    };

    return timamp;
  }

})();

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
      var chartGap = 10; // the (vertical) gap between graphs in pixels
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
      var xGLValue = focus.start;
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

/**
 * Created by wouter on 22/09/2015.
 */
(function() {
  'use strict';

  angular.module('enram')
    .factory('us15a.raw', ['enram', us15a]);

  /**
   * us15a.raw service constructor.
   * @returns The service object.
   */
  function us15a(enram) {
    //console.log(">> us15a.raw factory constructor");

    var caseStudy = enram.caseStudy("us15a", dataService());

    caseStudy.getProjection = function (caseStudy, mapWidth, mapHeight) {
      return d3.geo.mercator()
        .scale(caseStudy.mapScaleFactor * mapWidth)
        .translate([mapWidth / 2, mapHeight / 2])
        .center(caseStudy.mapCenter);
    };

    return caseStudy;
  }

  /**
   * This data service load the raw data from the raw-data.json file generated
   * in tipaths_03d/data_work/process_csv_us15a.
   *
   * @returns {object}
   */
  function dataService() {
    var dataService = {};
    var sourceData = null;

    // Raw data indices:
    var ri_radar = 0,
      ri_time = 1,
      ri_strata = 2,
      ri_uSpeed = 3,
      ri_vSpeed = 4,
      ri_density = 5,
      ri_vertical_integrated_density = 6,
      ri_number_of_measurements = 7,
      ri_speed = 8;

    /**
     * Initializes the dataService.
     * @param caseStudy {enram.caseStudy}
     * @param handler
     */
    dataService.initialize = function (caseStudy, handler) {
      caseStudy.label = "USA, raw";

      // The implementation expects the records in the data to be temporally sorted.
      d3.json(caseStudy.urlBase + "raw-data.json", function (error, json) {
        //console.log(caseStudy);
        if (error) {
          console.error(error);
          //throw new Error("Error in dataService.loadCaseStudy. "
          //    + JSON.parse(error.responseText).error.join("; "));
          return;
        }

        sourceData = json;
        sourceData.forEach(function (rdata) {
          rdata.forEach(function (sdata) {
            sdata.forEach(function (record) {
              record[ri_time] = new Date(record[ri_time]);
            });
          });
        });

        handler();
      });
    };

    /**
     * Loads the data for the given focus.
     * @param caseStudy {enram.caseStudy}
     * @param focus     {enram.focus}
     * @param handler   {function}      called when the data is loaded
     */
    dataService.loadFocusData = function (caseStudy, focus, handler) {
      var data = {
        focus: focus
      };

      var times = [];     // dimensions: [strata, radar, time]
      var densities = []; // dimensions: [strata, radar, time]
      var speeds = [];    // dimensions: [strata, radar, time]

      var focusFrom = focus.from.toDate();
      var focusTill = focus.till.toDate();
      var strn = caseStudy.strataCount;
      var radn = caseStudy.radarCount;

      for (var stri = 0; stri < strn; stri++) {
        var timeData = [];
        var densiData = [];
        var speedData = [];
        for (var radi = 0; radi < radn; radi++) {
          timeData.push(null);
          densiData.push(null);
          speedData.push(null);
        }
        times.push(timeData);
        densities.push(densiData);
        speeds.push(speedData);
      }

      data.getTimes = function (stri, radi) {
        var series = times[stri][radi];
        if (series == null) {
          series = [];
          sourceData[radi][stri].forEach(function (record) {
            var time = record[ri_time];
            if (time >= focusFrom && time < focusTill) {
              series.push(time);
            }
          });
          times[stri][radi] = series;
        }
        return series;
      };

      data.getDensities = function (stri, radi) {
        var series = densities[stri][radi];
        if (series == null) {
          series = [];
          sourceData[radi][stri].forEach(function (record) {
            var time = record[ri_time];
            if (time >= focusFrom && time < focusTill) {
              series.push(record[ri_density]);
            }
          });
          densities[stri][radi] = series;
        }
        return series;
      };

      data.getSpeeds = function (stri, radi) {
        var series = speeds[stri][radi];
        if (series == null) {
          series = [];
          sourceData[radi][stri].forEach(function (record) {
            var time = record[ri_time];
            if (time >= focusFrom && time < focusTill) {
              series.push(record[ri_speed]);
            }
          });
          speeds[stri][radi] = series;
        }
        return series;
      };

      handler(data);
    };

    return dataService;
  }

})();

/**
 * Created by wouter on 22/09/2015.
 */
(function() {
  'use strict';

  angular.module('enram')
    .factory('us15a.segmented', ['enram', us15a]);

  /**
   * us15a.segmented service constructor.
   * @returns The service object.
   */
  function us15a(enram) {
    //console.log(">> us15a.segmented factory constructor");

    var caseStudy = enram.caseStudy("us15a", dataService());

    caseStudy.getProjection = function (caseStudy, mapWidth, mapHeight) {
      return d3.geo.mercator()
        .scale(caseStudy.mapScaleFactor * mapWidth)
        .translate([mapWidth / 2, mapHeight / 2])
        .center(caseStudy.mapCenter);
    };

    return caseStudy;
  }

  /**
   * This service load the TIMAMP data from the data.json file generated
   * in tipaths_03d/data_work/process_csv_us15a.
   *
   * @returns {object}
   */
  function dataService() {
    var dataService = {};
    var sourceData = null;

    /**
     * Initializes the dataService.
     * @param caseStudy {enram.caseStudy}
     * @param handler {function}
     */
    dataService.initialize = function (caseStudy, handler) {
      caseStudy.label = "USA, segmented";

      d3.json(caseStudy.urlBase + "data.json", function (error, json) {
        //console.log(caseStudy);
        if (error) {
          console.error(error);
          //throw new Error("Error in dataService.loadCaseStudy. "
          //    + JSON.parse(error.responseText).error.join("; "));
          return;
        }

        //if (checkData) checkData(sourceData);
        sourceData = json;
        handler();
      });
    };

    /**
     * Loads the data for the given focus.
     * @param caseStudy {enram.caseStudy}
     * @param focus     {enram.focus}
     * @param handler   {function(dataObject)} called when the data is loaded
     */
    dataService.loadFocusData = function (caseStudy, focus, handler) {
      //console.log(">> dataService.loadData()");
      var data = {
        caseStudy: caseStudy,
        focus: focus
      };

      var segmentMillis = caseStudy.segmentMillis();
      var dataFromTime = caseStudy.dataFrom.valueOf();
      var focusTime = focus.from.valueOf();
      var dt = focusTime - dataFromTime;
      var segiFrom = Math.floor(dt / segmentMillis);
      var segiTill = segiFrom + focus.segmentCount(caseStudy);

      if (segiFrom > caseStudy.segmentCount) {
        throw new Error("Focus outside of source data range");
      }
      if (segiTill < 0) {
        throw new Error("Focus outside of source data range");
      }
      segiFrom = Math.max(segiFrom, 0);
      segiTill = Math.min(segiTill, caseStudy.segmentCount);

      var times = null;   // dimensions: [time]
      var densities = []; // dimensions: [strata, radar, time]
      var speeds = [];    // dimensions: [strata, radar, time]

      var strn = caseStudy.strataCount;
      var radn = caseStudy.radarCount;
      var segi;
      for (var stri = 0; stri < strn; stri++) {
        var densiData = [];
        var speedData = [];
        for (var radi = 0; radi < radn; radi++) {
          densiData.push(null);
          speedData.push(null);
        }
        densities.push(densiData);
        speeds.push(speedData);
      }

      data.getTimes = function (stri, radi) {
        if (times === null) {
          times = [];
          for (var segi = segiFrom; segi < segiTill; segi++) {
            times.push(dataFromTime + segi * segmentMillis);
          }
        }
        return times;
      };

      data.getDensities = function (stri, radi) {
        var series = densities[stri][radi];
        if (series == null) {
          series = [];
          for (segi = segiFrom; segi < segiTill; segi++) {
            series.push(sourceData.densities[segi][stri][radi]);
          }
          densities[stri][radi] = series;
        }
        return series;
      };

      data.getSpeeds = function (stri, radi) {
        var series = speeds[stri][radi];
        if (series == null) {
          series = [];
          for (segi = segiFrom; segi < segiTill; segi++) {
            series.push(sourceData.speeds[segi][stri][radi]);
          }
          speeds[stri][radi] = series;
        }
        return series;
      };

      handler(data);
    };

    return dataService;
  }

})();

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

//# sourceMappingURL=app.js.map
