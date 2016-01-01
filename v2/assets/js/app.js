
function utils_() {

  "use strict";

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

  /**
   * Interpolates a value in a two-dimensional domain given a set of irregularly-
   * spaced data points. The value is interpolated by means of inverse distance
   * weighting (Shepard, 1968)
   *
   * - Donald Shepard (1968) A two-dimensional interpolation function for
   *   irregularly-spaced data. Proceedings of the 1968 23rd ACM national
   *   conference. ACM.
   *
   * @param x {number} The x-coordinate of the point for which to interpolate.
   * @param y {number} The y-coordinate of the point for which to interpolate.
   * @param tValues {array} The known values.
   * @param xValues {array} The x-coordinates for the known values.
   * @param yValues {array} The y-coordinates for the known values.
   * @param power {number} The power to use in the weighting.
   * @returns {number} The interpolated value.
   */
  utils.idw = function (x, y, tValues, xValues, yValues, power) {
    if (tValues === undefined || tValues === null) {
      throw new Error("tValues is undefined in utils.idw()");
    }
    if (xValues === undefined || xValues === null) {
      throw new Error("xValues is undefined in utils.idw()");
    }
    if (yValues === undefined || yValues === null) {
      throw new Error("yValues is undefined in utils.idw()");
    }
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
   *
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

  utils.TWO_PI = Math.PI * 2;

  /**
   * Returns the given angle in degrees expressed as radians.
   * @param   {Number} degrees The given angle in degrees.
   * @returns {Number} The given angle in radians.
   */
  utils.radians = function (degrees) {
    return degrees * Math.PI / 180;
  };

  /**
   * Normalize the given angle in radians.
   * @param angle
   * @returns the normalized angle, i.e. 0 <= angle < Pi * 2
   */
  utils.normRadians = function (angle) {
    while (angle < 0) {
      angle += utils.TWO_PI;
    }
    while (angle >= utils.TWO_PI) {
      angle -= utils.TWO_PI;
    }
    return angle;
  };

  utils.minimizeAngleDelta = function (count, getter, setter) {
    if (count == 0) { return; }
    var ac = getter(0);
    for (var i = 1; i < count; i++) {
      var ai = getter(i);
      while (ai > ac + Math.PI) { ai -= utils.TWO_PI; }
      while (ai < ac - Math.PI) { ai += utils.TWO_PI; }
      setter(i, ai);
      ac = ai;
    }
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

  // -----------------------------------------------------------------------------

  /** Polyfill String.trim for old browsers
   *  (q.v. blog.stevenlevithan.com/archives/faster-trim-javascript) */
  if (String.prototype.trim === undefined) {
    String.prototype.trim = function() {
      return String(this).replace(/^\s\s*/, '').replace(/\s\s*$/, '');
    };
  }

  // -----------------------------------------------------------------------------

  /**
   * Simple string formatting borrowed from
   * http://stackoverflow.com/questions/610406/javascript-equivalent-to-printf-string-format/4673436#4673436
   * For a more advance formatter, see https://github.com/alexei/sprintf.js.
   *
   * Usage: "{0} is dead, but {1} is alive! {0} {2}".format("ASP", "ASP.NET")
   * >> ASP is dead, but ASP.NET is alive! ASP {2}
   */
  if (!String.prototype.format) {
    String.prototype.format = function() {
      var args = arguments;
      return this.replace(/{(\d+)}/g, function(match, number) {
        return typeof args[number] != 'undefined' ? args[number] : match;
      });
    };
  }

  return utils;
}

"use strict";

function models_(_utils) {

  // dependencies:
  var utils = _utils;

  // service object:
  var models = {};

  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

  /**
   * A caseStudy object contains all the properties provided in the metadata.json
   * object that was use to initialize the case study. See `README.md` for more details
   * on this metadata json format.
   *
   * The dataFrom, dataTill and defaultFocusFrom properties given in the metadata json,
   * are parsed and converted to moment objects in the caseStudy object.
   *
   * The following properties are added in the caseStudy object:
   * - isCaseStudy : Is true.
   * - id : The id passed to the caseStudy constructor function.
   * - dataService : The data-service object passed to the caseStudy constructor
   *                 function.
   * - dataPath : The path in which the metadata and data are found,
   *              i.e. ./src/data/<id>/
   * - radarCount : The number of radars.
   * - radarIndices : A object that maps from radar ids to indices in the radars list.
   * - radLons : An array with the longitudes of the radars, used when calling the
   *             idw interpolation function.
   * - radLats : An array with the latitudes of the radars, used when calling the
   *             idw interpolation function.
   * - anchorArea : The surface area each anchor represents, expressed in km.
   *
   * The following properties are added in the radar objects in the radars list:
   * - location : An [radar.longitude, radar.latitude] array.
   * - pixels : An object with two properties: x and y, the position of the radar
   *            in pixel-space.
   *
   * Each stratum-array in the strataOptions get a third value, the height of the
   * stratum in
   *
   * @param id {string} The name of the folder in /src/data/ that contains the data.
   * @param dataService {object}
   * @return The caseStudy object.
   */
  models.caseStudy = function (id, dataService) {

    // caseStudy object:
    var caseStudy = {
      isCaseStudy: true,
      id: id,
      dataService: dataService
    };

    /**
     * Asynchronously loads the case study metadata and other necessary data.
     *
     * @param handler {function()} Called when the laoding is complete.
     */
    caseStudy.load = function (handler) {
      this.loadMetaData(function () {
        caseStudy.dataService.initialize(caseStudy, handler);
      });
    };

    /**
     * @private
     * Loads the metadata.json.
     *
     * @param handler {function()} Called when loading is complete.
     */
    caseStudy.loadMetaData = function (handler) {
      caseStudy.dataPath = "src/data/" + this.id + "/";
      d3.json(caseStudy.dataPath + "metadata.json", function (error, json) {
        if (error) {
          throw new Error("Error loading " + caseStudy.dataPath +
            + "metadata.json in caseStudy.loadMetaData(). " + error);
        }

        for (var attr in json) {
          if (json.hasOwnProperty(attr)) { caseStudy[attr] = json[attr]; }
        }
        caseStudy.dataFrom = moment.utc(caseStudy.dataFrom);
        caseStudy.dataTill = moment.utc(caseStudy.dataTill);
        caseStudy.defaultFocusFrom = moment.utc(caseStudy.defaultFocusFrom);

        caseStudy.radarCount = caseStudy.radars.length;
        caseStudy.radarIndices = {};
        caseStudy.radLons = [];
        caseStudy.radLats = [];
        caseStudy.radars.forEach(function (radar, i) {
          radar.location = [radar.longitude, radar.latitude];
          caseStudy.radarIndices[radar.id] = i;
          caseStudy.radLons.push(radar.longitude);
          caseStudy.radLats.push(radar.latitude);
        });

        caseStudy.strataOptions.forEach(function (strataOption) {
          strataOption.forEach(function (stratum) {
            stratum[2] = stratum[1] - stratum[0];
          })
        });

        caseStudy.anchorArea = caseStudy.anchorInterval * caseStudy.anchorInterval;

        if (caseStudy.topoJsonUrl == undefined) {
          caseStudy.topoJsonUrl = caseStudy.dataPath + "topo.json";
        }

        console.info("Loaded case study", caseStudy.label);
        handler.call();
      });
    };

    /**
     * Loads the data for the given focus.
     *
     * @param focus {object} The models.focus object.
     * @param handler {function(object)} Called when the data is loaded, passing the
     *                data object als argument.
     */
    caseStudy.loadFocusData = function (focus, handler) {
      //console.log(">> caseStudy.loadFocusData()");
      this.dataService.loadFocusData(this, focus, handler);
    };

    /**
     * @return the segment duration in milliseconds
     */
    caseStudy.segmentMillis = function () {
      return this.segmentSize * 60 * 1000;
    };

    /**
     * Initializes the d3.geo projection to be used in the mapping.
     *
     * @param caseStudy {object} The models.caseStudy object.
     * @param mapWidth {number}
     * @param mapHeight {number}
     */
    caseStudy.getProjection = function (caseStudy, mapWidth, mapHeight) {
      return d3.geo.mercator()
        .scale(caseStudy.mapScaleFactor * mapWidth)
        .translate([mapWidth / 2, mapHeight / 2])
        .center(caseStudy.mapCenter);
    };

    return caseStudy;
  };

  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

  /**
   * Creates and returns a new focus object.
   *
   * A focus object has the following properties:
   * - isFocus : True.
   * - from : A moment object that points to the start of the focus period.
   * - till : A moment object that points to the end of the focus period.
   * - duration : The duration of the focus period in hours.
   * - strataOptionIdx : Identifies the currently selected strataOption, as an
   *                     index in the caseStudy.strataOptions list.
   * - migrantsPerPath : The number of migrants per path.
   *
   * @param from {moment} the start of the focus window
   * @param duration {number} the focus duration in hours
   * @param strataOptionIdx {number}
   * @param migrantsPerPath {number}
   */
  models.focus = function (from, duration, strataOptionIdx, migrantsPerPath) {
    var focus = {
      from: from,
      till: moment(from).add(duration, 'hours'),
      duration: duration,
      strataOptionIdx: strataOptionIdx,
      migrantsPerPath: migrantsPerPath,
      isFocus: true
    };

    /**
     * @param caseStudy {object} The models.caseStudy object.
     * @return the number of segments for the focus and the given case study
     */
    focus.segmentCount = function (caseStudy) {
      return this.duration * 60 / caseStudy.segmentSize;
    };

    /**
     * @param caseStudy {object} The models.caseStudy object.
     * @return the strata option for the focus and the given case study
     */
    focus.strataOption = function (caseStudy) {
      return caseStudy.strataOptions[this.strataOptionIdx];
    };

    /**
     * @param caseStudy {object} The models.caseStudy object.
     * @return the number of strata for the focus and the given case study
     */
    focus.strataCount = function (caseStudy) {
      return this.strataOption(caseStudy).length;
    };

    /**
     * Returns a list with the lowest and the highest altitude.
     * @param caseStudy {object} The models.caseStudy object.
     */
    focus.altitudeRange = function (caseStudy) {
      var strataOption = this.strataOption(caseStudy);
      return [strataOption[0][0], strataOption[strataOption.length - 1][1]];
    };

    /**
     * Constrains the focus period to fall within the available data period.
     * @param caseStudy {object} The models.caseStudy object.
     * @returns this
     */
    focus.constrain = function (caseStudy) {
      if (this.from.isBefore(caseStudy.dataFrom)) {
        this.setFrom(moment(caseStudy.dataFrom));
      }
      else if (this.till.isAfter(caseStudy.dataTill)) {
        this.setTill(moment(caseStudy.dataTill));
      }
      return this;
    };

    /**
     * Update the from moment and the matching till moment.
     * @param from {moment}
     */
    focus.setFrom = function (from) {
      if (this.from.isSame(from)) return;
      this.from = from;
      this.till = moment(from).add(this.duration, 'hours');
    };

    /**
     * Update the till moment and the matching from moment.
     * @param till {moment}
     */
    focus.setTill = function (till) {
      if (this.till.isSame(till)) return;
      this.till = till;
      this.from = moment(till).subtract(this.duration, 'hours');
    };

    /**
     * Update the duration and the derived till moment.
     * @param duration {number} the new focus duration in hours
     */
    focus.setDuration = function (duration) {
      if (this.duration == duration) return;
      this.duration = duration;
      this.till = moment(from).add(this.duration, 'hours');
    };

    /**
     * @returns a clone of the focus object
     */
    focus.clone = function () {
      var clone = {};
      for (var attr in this) {
        if (this.hasOwnProperty(attr)) { clone[attr] = this[attr]; }
      }
      return clone;
    };

    return focus;
  };

  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

  /**
   * The data structure is constructed such that it efficiently facilitates the
   * interpolation operations needed when constructing the paths in the TIMAMP
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
   * The data object has the following properties:
   * - caseStudy : The models.caseStudy for this data.
   * - focus : The models.focus for this data.
   * - strataOption : The strata-option used for this data.
   * - strataCount : The number of strata in the strata-option.
   * - segmentCount : The number of segments in the focus.
   * - densities : An array-matrix with dimensions: [segment, strata, radar]
   * - uSpeeds : An array-matrix with dimensions: [segment, strata, radar]
   * - vSpeeds : An array-matrix with dimensions: [segment, strata, radar]
   * - speeds : An array-matrix with dimensions: [segment, strata, radar]
   * - avDensities : An array-matrix with dimensions: [strata, radar]
   *
   * @param caseStudy {object} The models.caseStudy object.
   * @param focus {object} The models.focus object.
   * @returns the data object
   */
  models.dataObject = function (caseStudy, focus) {
    var dataObject = {
      caseStudy: caseStudy,
      focus: focus,
      strataOption: focus.strataOption(caseStudy),
      strataCount: focus.strataCount(caseStudy),
      segmentCount: focus.segmentCount(caseStudy),
      densities: [],
      uSpeeds: [],
      vSpeeds: [],
      speeds: [],
      avDensities: []
    };

    /**
     * Initializes the empty data structure.
     * @return the data object
     */
    dataObject.initStructure = function () {
      var segn = this.segmentCount;
      var strn = this.strataCount;
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

    /**
     * @param strataIdx {number}
     * @returns {number} The size (height) of the strata with the given index.
     */
    dataObject.strataSize = function (strataIdx) {
      return this.strataOption[strataIdx][2] / 1000;
    };

    /**
     * Prepends data entries to replace missing data for a given amount of segments.
     * @param amount {number} The number of segments for which to add data entries.
     */
    dataObject.prependMissingSegments = function (amount) {
      // empty partial data structure to use in dataObject.addMissingSegments:
      var missingSegmentData = [];
      for (var stri = 0; stri < this.strataCount; stri++) {
        missingSegmentData.push(utils.zeroArray(caseStudy.radarCount));
      }

      for (var i = 0; i < amount; i++) {
        this.densities.unshift(missingSegmentData);
        this.uSpeeds.unshift(missingSegmentData);
        this.vSpeeds.unshift(missingSegmentData);
        this.speeds.unshift(missingSegmentData);
      }
    };

    /**
     * Appends data entries to replace missing data for a given amount of segments.
     * @param amount {number} The number of segments for which to add data entries.
     */
    dataObject.appendMissingSegments = function (amount) {
      // empty partial data structure to use in dataObject.addMissingSegments:
      var missingSegmentData = [];
      for (var stri = 0; stri < this.strataCount; stri++) {
        missingSegmentData.push(utils.zeroArray(caseStudy.radarCount));
      }

      for (var i = 0; i < amount; i++) {
        this.densities.push(missingSegmentData);
        this.uSpeeds.push(missingSegmentData);
        this.vSpeeds.push(missingSegmentData);
        this.speeds.push(missingSegmentData);
      }
    };

    return dataObject;
  };

  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

  /**
   * This function assumes that seconds and milliseconds are zero.
   *
   * @param from {moment}
   * @param focus {object} The models.focus object.
   * @param caseStudy {object} The models.caseStudy object.
   * @returns {moment}
   */
  models.constrainFrom = function (from, focus, caseStudy) {
    if (from.isBefore(caseStudy.dataFrom)) {
      from.date(caseStudy.dataFrom.date());
      from.hour(caseStudy.dataFrom.hour());
      from.minute(caseStudy.dataFrom.minute());
      return from;
    }
    var till = moment(from).add(focus.duration, 'hours');
    if (!till.isBefore(caseStudy.dataTill)) {
      from.date(caseStudy.dataTill.date());
      from.hour(caseStudy.dataTill.hour() - focus.duration);
      from.minute(caseStudy.dataTill.minute());
    }
    return from;
  };

  return models;
}
"use strict";

function gui_(_app, _models, _config) {

  // dependencies:
  var app = _app;
  var models = _models;
  var config = _config;

  // service object:
  var gui = {};

  /**
   * @private
   * Initialize the gui service.
   */
  gui.initialize = function () {
    var caseStudy = app.caseStudy();
    var focus = app.focus();

    d3.select("#radar-anchor-radius").text(config.radarAnchorRadius);
    this.updateText(true);

    // configure the date input widgets:
    d3.select("#input-day")
      .property('value', focus.from.date())
      .on('change', this.dateUpdateHandler);
    d3.select("#focus-month").text(focus.from.format("MMM"));
    d3.select("#focus-year").text(focus.from.format("YYYY"));
    d3.select("#input-hour")
      .property('value', focus.from.hour())
      .on('change', this.dateUpdateHandler);
    
    // configure the duration input widget:
    d3.select("#input-length")
      .property('value', focus.duration)
      .on('change', this.durationUpdateHandler);
    
    // configure the strata-count input widget:
    d3.select("#input-strata")
      .selectAll('option')
      .data(caseStudy.strataOptions)
      .enter().append("option")
      .property('value', function (strataOption, i) { return i; })
      .text(function (strataOption) { return strataOption.length; });
    d3.select("#input-strata")
      .property('value', caseStudy.defaultStrataOption)
      .on('change', this.strataCountUpdateHandler);
    
    // configure the migrants-per-path input widget:
    d3.select("#input-migrants-per-path")
      .selectAll('option')
      .data(config.migrantsPerPathOptions)
      .enter().append("option")
      .property("value", function (d) { return d.value; })
      //.property("selected", function(d) { return d === focus.migrantsPerPath; })
      .text(function (d) { return d.text; });
    d3.select("#input-migrants-per-path")
      .property('value', focus.migrantsPerPath)
      .on('change', this.migrantsPerPathUpdateHandler);
    
    // set resize handler that updates the visualisation:
    d3.select(window)
      .on('resize', Foundation.utils.throttle(function(e) {
        if (d3.select("#map-container").node().getBoundingClientRect().width != app.mapW) {
          app.updateVisualisation(false, true);
        }
      }, 25));
  };

  /**
   * Update the text in the gui.
   *
   * @param migrantsPerPathChanged {boolean}
   */
  gui.updateText = function (migrantsPerPathChanged) {
    var focus = app.focus();
    if (migrantsPerPathChanged == undefined || migrantsPerPathChanged) {
      d3.select("#migrants-per-path").text(numeral(focus.migrantsPerPath).format('0,0'));
    }
  };

  /* @private update handler. */
  gui.dateUpdateHandler = function () {
    //console.log(">> gui.dateUpdateHandler");
    var caseStudy = app.caseStudy();
    var focus = app.focus();
    var inputDay = d3.select("#input-day");
    var inputHour = d3.select("#input-hour");
    
    // derive and constrain new focus from moment:
    var newFocusFrom = moment(focus.from);
    newFocusFrom.date(parseInt(inputDay.property('value')));
    newFocusFrom.hour(parseInt(inputHour.property('value')));
    models.constrainFrom(newFocusFrom, focus, caseStudy);
    
    // update the input widget to the constrained values:
    inputDay.property('value', newFocusFrom.date());
    inputHour.property('value', newFocusFrom.hour());
    d3.select("#focus-month").text(focus.from.format("MMM"));
    d3.select("#focus-year").text(focus.from.format("YYYY"));
    
    // update focus and view if focus has changed:
    if (!newFocusFrom.isSame(focus.from)) {
      app.updateFocusFrom(newFocusFrom);
    }
  };

  /* @private update handler. */
  gui.durationUpdateHandler = function () {
    var focus = app.focus();
    var inputDuration = d3.select("#input-length");
    var newDuration = parseInt(inputDuration.property('value'));
    if (newDuration != focus.duration) {
      app.updateFocusDuration(newDuration);
    }
  };

  /* @private update handler. */
  gui.strataCountUpdateHandler = function () {
    var focus = app.focus();
    var newIdx = d3.select("#input-strata").property('value');
    if (newIdx != focus.strataOptionIdx) {
      app.updateStrataOptionIdx(newIdx)
    }
  };

  /* @private update handler. */
  gui.migrantsPerPathUpdateHandler = function () {
    var focus = app.focus();
    var newMPP = d3.select(this).property('value');
    if (newMPP != focus.migrantsPerPath) {
      app.updateMigrantsPerPath(newMPP);
      gui.updateText(focus, true);
    }
  };
  
  gui.initialize();

  return gui;
}
"use strict";

/**
 * Data-service for models.caseStudy instances that loads data from json-files.
 *
 * @param models {object} The models service.
 */
function jsonDataService(models) {

  // service object:
  var dataService = {};

  // private properties:
  var checkData = true;
  var sourceData = null;
  var currStrataOptionIdx = -1;

  /**
   * Initializes the dataService.
   *
   * @param caseStudy {object} The models.caseStudy object.
   * @param handler {function}
   */
  dataService.initialize = function(caseStudy, handler) {
    handler();
  };

  /**
   * Loads the data for the given focus.
   *
   * @param caseStudy {object} The models.caseStudy object.
   * @param focus {object} The models.focus object.
   * @param handler {function(object)} Called when the data is loaded, passing the
   *                data object as argument.
   */
  dataService.loadFocusData = function (caseStudy, focus, handler) {
    //console.log(">> dataService.loadFocusData()");
    if (currStrataOptionIdx == -1 || currStrataOptionIdx != focus.strataOptionIdx) {
      // update source data:
      var dataPath = caseStudy.dataPath + "data-" + focus.strataOptionIdx + ".json";
      d3.json(dataPath, function (error, json) {
        if (error) {
          throw new Error("Error in dataService.loadFocusData. " + error);
        }
        sourceData = json;
        currStrataOptionIdx = focus.strataOptionIdx;
        dataService._loadFocusData_next(caseStudy, focus, handler);
      });
    }
    else {
      this._loadFocusData_next(caseStudy, focus, handler);
    }
  };

  /* @private */
  dataService._loadFocusData_next = function (caseStudy, focus, handler) {
    var data = models.dataObject(caseStudy, focus);
    var dt = focus.from.valueOf() - caseStudy.dataFrom.valueOf();
    var segmentSec = caseStudy.segmentSize * 60 * 1000;
    var iFrom = Math.floor(dt / segmentSec);
    // add one in the following to allow for the 2-stage Runge–Kutta interpolation
    var iTill = iFrom + data.segmentCount + 1;
    var iMax = sourceData.densities.length;

    // Warn when the focus interval does not intersect the available interval:
    if (iFrom >= iMax) {
      console.error("The focus starts after the available data interval.");
      data.appendMissingSegments(data.segmentCount + 1);
      handler(data);
      return;
    }
    if (iTill < 0) {
      console.error("The focus end before the available data interval.");
      data.appendMissingSegments(data.segmentCount + 1);
      handler(data);
      return;
    }

    // Remember to prepend or append missing data entries:
    var prepend = 0;
    var append = 0;
    if (iFrom < 0) {
      prepend = - iFrom;
      iFrom = 0;
    }
    if (iTill > iMax) {
      append = iTill - iMax;
      iTill = iMax;
    }

    // Use slices of the source data as focus data:
    data.densities = sourceData.densities.slice(iFrom, iTill);
    data.uSpeeds = sourceData.uSpeeds.slice(iFrom, iTill);
    data.vSpeeds = sourceData.vSpeeds.slice(iFrom, iTill);
    data.speeds = sourceData.speeds.slice(iFrom, iTill);

    // Calculate average densities per radar-altitude combination, integrated
    // over the strata height. These numbers thus represent the number of birds
    // per square km in a given strata. The average density is calculated over
    // the segments for which a (partial) path is shown, i.e. for which speed
    // and density > 0.
    var strn = data.strataCount;
    var radn = caseStudy.radarCount;
    var segn = data.densities.length;
    var stri, radi, segi;
    for (stri = 0; stri < strn; stri++) {
      var avds = [];
      var strataSize = data.strataSize(stri);
      for (radi = 0; radi < radn; radi++) {
        var cnt = 0;
        var sum = 0;
        for (segi = 0; segi < segn; segi++) {
          var den = data.densities[segi][stri][radi];
          if (den > 0 && data.speeds[segi][stri][radi] > 0) {
            cnt++;
            sum += den
          }
        }
        if (cnt == 0) {
          avds.push(0);
        } else {
          if (sum == 0) {
            console.error("avDensity is zero for stri " + stri + " and radi " + radi);
          }
          avds.push(sum / cnt * strataSize);
        }
      }
      data.avDensities.push(avds);
    }

    // Prepend or append missing data:
    if (prepend > 0) { data.prependMissingSegments(prepend); }
    if (append > 0) { data.appendMissingSegments(append); }

    if (data.densities.length != data.segmentCount + 1) {
      throw new Error("The data object does not have the proper amount of " +
        "entries. [data.densities.length: " + data.densities.length +
        ", data.segmentCount + 1: " + (data.segmentCount + 1) + "]");
    }

    if (checkData) {
      this.checkData(data);
    }

    handler(data);
  };

  /**
   * @private
   * Check if the given data is OK:
   * - densities: data matrix with dimensions: [segments, strata, radars].
   * - uSpeeds: data matrix with dimensions: [segments, strata, radars].
   * - vSpeeds: data matrix with dimensions: [segments, strata, radars].
   * - speeds: data matrix with dimensions: [segments, strata, radars].
   * - avDensities: data matrix with dimensions: [strata, radars].
   */
  dataService.checkData = function (data) {
    var segn = data.segmentCount + 1; // add one to allow two-phase integration
    var strn = data.strataCount;
    var radn = data.caseStudy.radarCount;
    var segi, stri;

    if (data.densities.length != segn) {
      throw ("data.densities.length (" + data.densities.length +
        ") != segn (" + segn + ")");
    }
    if (data.uSpeeds.length != segn) {
      throw ("data.uSpeeds.length (" + data.uSpeeds.length +
        ") != segn (" + segn + ")");
    }
    if (data.vSpeeds.length != segn) {
      throw ("data.vSpeeds.length (" + data.vSpeeds.length +
        ") != segn (" + segn + ")");
    }
    if (data.speeds.length != segn) {
      throw ("data.speeds.length (" + data.speeds.length +
        ") != segn (" + segn + ")");
    }

    for (segi = 0; segi < segn; segi++) {
      if (data.densities[segi].length != strn) {
        throw ("data.densities[segi].length (" + data.densities[segi].length +
          ") != strn (" + strn + ")");
      }
      if (data.uSpeeds[segi].length != strn) {
        throw ("data.uSpeeds[segi].length (" + data.uSpeeds[segi].length +
          ") != strn (" + strn + ")");
      }
      if (data.vSpeeds[segi].length != strn) {
        throw ("data.vSpeeds[segi].length (" + data.vSpeeds[segi].length +
          ") != strn (" + strn + ")");
      }
      if (data.speeds[segi].length != strn) {
        throw ("data.speeds[segi].length (" + data.speeds[segi].length +
          ") != strn (" + strn + ")");
      }

      for (stri = 0; stri < strn; stri++) {
        if (data.densities[segi][stri].length != radn) {
          throw ("data.densities[segi][stri].length (" +
            data.densities[segi][stri].length + ") != radn (" + radn + ")");
        }
        if (data.uSpeeds[segi][stri].length != radn) {
          throw ("data.uSpeeds[segi][stri].length (" +
            data.uSpeeds[segi][stri].length + ") != radn (" + radn + ")");
        }
        if (data.vSpeeds[segi][stri].length != radn) {
          throw ("data.vSpeeds[segi][stri].length (" +
            data.vSpeeds[segi][stri].length + ") != radn (" + radn + ")");
        }
        if (data.speeds[segi][stri].length != radn) {
          throw ("data.speeds[segi][stri].length (" +
            data.speeds[segi][stri].length + ") != radn (" + radn + ")");
        }
      }
    }

    if (data.avDensities.length != strn) {
      throw ("data.avDensities.length (" + data.avDensities.length +
        ") != strn (" + strn + ")");
    }
    for (stri = 0; stri < strn; stri++) {
      if (data.avDensities[stri].length != radn) {
        throw ("data.avDensities[stri].length (" +
          data.avDensities[stri].length + ") != radn (" + radn + ")");
      }
    }
  };

  return dataService;
}

"use strict";

function app(_config, _models, _viz) {

  // dependencies:
  var config = _config;
  var models = _models;
  var viz = _viz;
  var gui;

  // service object:
  var app = {};

  // private properties:
  var caseStudy;
  var focus;
  var data;
  var readyHandler;

  /**
   * Initialize the app.
   *
   * @param _caseStudy {object} The initial models.caseStudy object.
   * @param _readyHandler {function} Called when the case-study and first data has
   *                      been loaded and is being displayed.
   */
  app.initialize = function (_caseStudy, _readyHandler) {
    readyHandler = _readyHandler;

    // assert that SVG is supported by the browser:
    if (!document.implementation.hasFeature("http://www.w3.org/TR/SVG11/feature#Image", "1.1")) {
      app.reportError('SVG is not supported in your browser. Please use a recent browser.');
      return;
    }

    // load the case study meta data:
    try {
      _caseStudy.load(function () {
        app.caseStudy(_caseStudy); // this also initializes the _focus
        gui = gui_(app, models, config); // initialize the gui
        var busy = 2; // two additional asynchronous steps

        // load the topography:
        d3.json(caseStudy.topoJsonUrl, function (error, json) {
          if (error) {
            console.error(error);
            return;
          }
          caseStudy.topoJson = json;

          if (--busy == 0) {
            app.updateVisualisation(true, true);
          }
        });

        config.updateColors(focus.strataCount(caseStudy));

        if (--busy == 0) {
          app.updateVisualisation(true, true);
        }
      });
    }
    catch (error) {
      app.reportError("Failed to initialize the app. " + error);
      throw error;
    }

  };

  /**
   * To call when the visualization needs to be updated.
   *
   * @param focusDirty
   * @param sizeDirty
   */
  app.updateVisualisation = function (focusDirty, sizeDirty) {
    //console.log(">> app.updateVisualisation() - " + focusDirty + " - " + sizeDirty);
    var busy = 2; // two additional asynchronous steps

    try {
      if (sizeDirty) { viz.updateMapData(caseStudy); }

      viz.redrawMap(caseStudy);

      if (focusDirty) {
        // A clone of the focus is passed to the loader. This focus will be set
        // as focus property on the resulting data object.
        var newFocus = focus.clone();
        caseStudy.loadFocusData(newFocus, function (newData) {
          //console.log(newData);
          //console.log("- _focus == newData.focus: " + (_focus == newData.focus));
          if (newFocus != newData.focus) {
            console.error("- newFocus == newData.focus: " + (newFocus == newData.focus));
            throw new Error("Unexpected: newFocus != newData.focus in app.updateVisualisation()");
          }
          data = newData;
          focus = data.focus;
          viz.drawPaths(data);

          if (--busy == 0 && readyHandler != undefined) {
            readyHandler();
            readyHandler = undefined;
          }
        });
      }
      else {
        viz.drawPaths(data);
      }

      viz.drawLegends(caseStudy, focus);

      if (--busy == 0 && readyHandler != undefined) {
        readyHandler();
        readyHandler = undefined;
      }
    }
    catch (error) {
      app.reportError("Failed to update the visualization. " + error);
      throw error;
    }
  };

  /**
   * Report an error to the user.
   *
   * @param msg {string} The message
   * @param fatal {boolean} True when the error is fatal.
   */
  app.reportError = function (msg, fatal) {
    // TODO: enable in production
    console.error(msg);
    alert(msg);
  };

  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // Accessors:

  /**
   * Get or set the caseStudy.
   *
   * @param newCaseStudy {object} [Optional] An models.caseStudy object.
   */
  app.caseStudy = function (newCaseStudy) {
    if (newCaseStudy == undefined) { return caseStudy; }
    caseStudy = newCaseStudy;

    // initialize the initial focus:
    focus = models.focus(
      caseStudy.defaultFocusFrom,
      config.defaultFocusDuration,
      caseStudy.defaultStrataOption,
      caseStudy.defaultMigrantsPerPath
    );
    focus.constrain(caseStudy);
  };

  /**
   * Get the focus.
   */
  app.focus = function () {
    return focus;
  };

  // - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  // Focus update functions:

  /**
   * Update the focus from date.
   *
   * @param newFrom {moment} The new focus start moment.
   */
  app.updateFocusFrom = function (newFrom) {
    focus.setFrom(newFrom);
    this.updateVisualisation(true, false);
  };

  /**
   * Update the focus duration.
   *
   * @param newDuration {number} the new focus duration in hours
   */
  app.updateFocusDuration = function (newDuration) {
    focus.setDuration(newDuration);
    this.updateVisualisation(true, false);
  };

  /**
   * Update the focus strata-option index.
   *
   * @param newIdx {number} An index in the caseStudy.strataOptions array.
   */
  app.updateStrataOptionIdx = function (newIdx) {
    focus.strataOptionIdx = newIdx;
    config.updateColors(focus.strataCount(caseStudy));
    this.updateVisualisation(true, true);
  };

  /**
   * Update the focus migrants-per-path.
   *
   * @param newMPP {number}
   */
  app.updateMigrantsPerPath = function (newMPP) {
    focus.migrantsPerPath = newMPP;
    this.updateVisualisation(false, false);
  };

  return app;
}

// -----------------------------------------------------------------------------

/**
 * Start the app. Call this function from a script element at the end of the html-doc.
 *
 * @param caseStudyConstructor {function()} A function that returns the (initial)
 *                             models.caseStudy object.
 */
function startApp(caseStudyConstructor) {

  // initialize the services:
  var utils = utils_();
  var config = config_(utils);
  var models = models_(utils);
  var viz = viz_(config, utils);
  var _app = app(config, models, viz);

  // initialize the app:
  _app.initialize(caseStudyConstructor(models),  function () {
    console.info("App ready.")
  });
}

"use strict";

/**
 * Configuration settings service constructor.
 *
 * @param _utils The utils service.
 */
function config_(_utils) {

  // dependencies:
  var utils = _utils;

  // service object:
  var config = {};

  /**
   * The radius around radars in km in which path anchors are considered.
   * @type {number}
   */
  config.radarAnchorRadius = 75;

  /**
   * The migrants-per-path options.
   */
  config.migrantsPerPathOptions = [
    {value: 10000, text: "10K"},
    {value: 25000, text: "25K"},
    {value: 50000, text: "50K"},
    {value: 100000, text: "100K"},
    {value: 250000, text: "250K"},
    {value: 500000, text: "500K"}
  ];

  /**
   * The height of the template map divided by its width, used to obtain the actual
   * height of the map, given the actual width after resizing.
   * @type {number}
   */
  config.mapHeightFactor = 940 / 720;

  /**
   * The template legend width divided by the template map width, used to obtain the
   * actual width of the legend, given the actual width after resizing.
   * @type {number}
   */
  config.legendWidthFactor = 200 / 720;

  /**
   * The minimum value of the range of hues to pick from for strata colors.
   * @type {number}
   */
  config.altiHueMin = 0.5;

  /**
   * The maximum value of the range of hues to pick from for strata colors.
   * @type {number}
   */
  config.altiHueMax = 1;

  /**
   * The saturation for strata colors.
   * @type {number}
   */
  config.altiSaturation = 1;

  /**
   * The brightness for strata colors.
   * @type {number}
   */
  config.altiBrightness = 0.7;

  /**
   * The initial focus duration, in hours.
   * @type {number}
   */
  config.defaultFocusDuration = 6;

  /**
   * When true then basic metadata is provided in the visualisation.
   * @type {boolean}
   */
  config.writeMetaDataInViz = true;

  /**
   * When true the special 'arty' mode is activated.
   * @type {boolean}
   */
  config.arty = false;

  /**
   * When true then the radar labels are shown.
   * @type {boolean}
   */
  config.showRadarLabels = true;

  /**
   * Prepare the colors for the strata.
   *
   * @param strataCount {number} The number of strata.
   */
  config.updateColors = function (strataCount) {
    this.altHexColors = [];
    var hue, color;
    if (strataCount == 1) {
      hue = (this.altiHueMin + this.altiHueMax) / 2;
      color = utils.hsvToHex(hue, this.altiSaturation, this.altiBrightness);
      this.altHexColors.push(color);
    }
    else {
      for (var alti = 0; alti < strataCount; alti++) {
        hue = utils.mapRange(alti, 0, strataCount - 1, this.altiHueMin, this.altiHueMax);
        color = utils.hsvToHex(hue, this.altiSaturation, this.altiBrightness);
        this.altHexColors.push(color);
      }
    }
  };

  return config;
}

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

"use strict";

function viz_paths_(_config, _utils) {

  // dependencies:
  var config = _config;
  var utils = _utils;

  // service object:
  var paths = {};

  // private properties:
  var radiusFactor = 0.05;  // Determines the thickness of the paths.

  // pathData indices:
  var pdi_x = 0;
  var pdi_y = 1;
  var pdi_density = 2;
  var pdi_angle = 3;
  var pdi_location = 4;
  var pdi_distance = 5;

  /**
   * Draw the paths.
   *
   * @param data {object} the models.dataObject
   * @param anchorLocations {array} the anchor locations
   * @param projection {function} the d3.geo geographic projection
   * @param pathsG {object} The svg group element in which to draw the paths.
   */
  paths.drawPaths = function (data, anchorLocations, projection, pathsG) {
    //console.log(">> _paths.drawPaths");

    // set fixed random seed:
    Math.seedrandom('ENRAM');

    var rlons = data.caseStudy.radLons;
    var rlats = data.caseStudy.radLats;
    var idw = utils.idw;
    var strn = data.strataCount;
    var probf = data.caseStudy.anchorArea / data.focus.migrantsPerPath;
    for (var stri = 0; stri < strn; stri++) {
      try {
        var densities = data.avDensities[stri]; // birds/km2 in the strata
      }
      catch (error) {
        console.error("- stri: " + stri);
        console.error("- strn: " + strn);
        console.error("- data.avDensities: " + data.avDensities);
        throw (error);
      }

      var pathColor = config.altHexColors[stri];

      anchorLocations.forEach(function (anchorLoc) {
        try {
          var density = idw(anchorLoc[0], anchorLoc[1], densities, rlons, rlats, 2);
        }
        catch (error) {
          console.error("- anchorLoc: " + anchorLoc);
          throw (error);
        }

        // Only continue for a subset of anchor locations, selected by a probability based
        // on the average density:
        if (Math.random() < density * probf) {
          //console.log("- active anchorId(anchorLoc): " + anchorId(anchorLoc));

          var pathData = paths.buildPathData(data, stri, anchorLoc, projection);
          if (pathData.length == 0) {
            //console.log("got empty pathData");
            return;
          }

          var lineData = paths.buildOutline(pathData);
          var flowG = pathsG.append("g").classed("flow-line", true);
          paths.drawPath(flowG, pathData, lineData, pathColor);

          // DEBUG:
          //if (isDebug(anchorLoc)) {
          //  console.log(pathData);
          //  flowG.select("path").style("fill", "#f00");
          //}
        }
      });
    }
  };

  /**
   * @private
   * The resulting path is obtained through numerical integration from the anchor point, half
   * backwards, half forwards. The integration is implemented using the 2-stage Runge–Kutta
   * algorithm, also known as the Heun method, as represented in the following scheme:
   *
   *        a := k.u(p_i, t_i),
   *        b := k.u(p_i + a, t_i + k)
   *  p_(i+1) := p_i + 1/2(a + b)
   *
   * where:
   * -       i : the current iteration index
   * -     p_i : the position at index i
   * -     t_i : the time at index i
   * - u(x, t) : the velocity at position x and time t
   * -       k : timestep
   *
   * Reference: Darmofal_96a (in README.md)
   *
   * @param data {object} the models.dataObject
   * @param stri {number} strata index
   * @param anchorLoc {array} Anchor location in the form of a [longitude, latitude] array.
   * @param projection {function} The d3.geo projection.
   */
  paths.buildPathData = function (data, stri, anchorLoc, projection) {
    var pathData = [];
    var rlons = data.caseStudy.radLons;
    var rlats = data.caseStudy.radLats;
    var idw = utils.idw;

    // This value is multiplied with uSpeed/vSpeed values, expressed in m/s, in order
    // to obtain the distance traveled during the segment interval, expressed in km.
    // Note: data.caseStudy.segmentSize = the duration of a segment in minutes (e.g. 20 min).
    var tf1 = data.caseStudy.segmentSize * 60 / 1000;

    /**
     * @param p_0 {array} source position as [longitude, latitude] array
     * @param t_i {number} source segment index
     * @param s_i {number} strata index
     */
    function stepBackward(p_0, t_i, s_i) {
      var a_u = -idw(p_0[0], p_0[1], data.uSpeeds[t_i][s_i], rlons, rlats, 2) * tf1;
      var a_v = -idw(p_0[0], p_0[1], data.vSpeeds[t_i][s_i], rlons, rlats, 2) * tf1;
      var a_d = utils.vectorLength(a_u, a_v);  // distance a
      var a_a = Math.atan2(a_u, a_v);         // angle a
      var a_l = utils.geo.destinationRad(p_0, a_a, a_d);  // location p_0 + a
      var b_u = -idw(a_l[0], a_l[1], data.uSpeeds[t_i - 1][s_i], rlons, rlats, 2) * tf1;
      var b_v = -idw(a_l[0], a_l[1], data.vSpeeds[t_i - 1][s_i], rlons, rlats, 2) * tf1;
      var f_u = (a_u + b_u) / 2;              // final u_distance
      var f_v = (a_v + b_v) / 2;              // final v_distance
      var f_d = utils.vectorLength(f_u, f_v); // final distance
      var f_a = Math.atan2(f_u, f_v);         // final angle
      var f_l = utils.geo.destinationRad(p_0, f_a, f_d);  // final position p_0 + 1/2(a + b)
      var den = idw(f_l[0], f_l[1], data.densities[t_i - 1][s_i], rlons, rlats, 2);
      var dat = projection(f_l);  // projection of the location in pixel-space
      dat.push(den, f_a + Math.PI, f_l, f_d, -f_u, -f_v, t_i - 1);
      return dat;
    }

    /**
     * @param p_0 {array} source position as [longitude, latitude] array
     * @param t_i {number} source segment index
     * @param s_i {number} strata index
     */
    function stepForward(p_0, t_i, s_i) {
      var a_u, a_v, a_d, a_a, a_l, f_u, f_v, f_d, f_a, f_l, den, dat;
      a_u = idw(p_0[0], p_0[1], data.uSpeeds[t_i][s_i], rlons, rlats, 2) * tf1;
      a_v = idw(p_0[0], p_0[1], data.vSpeeds[t_i][s_i], rlons, rlats, 2) * tf1;
      a_d = utils.vectorLength(a_u, a_v);  // distance a
      a_a = Math.atan2(a_u, a_v);          // angle a
      a_l = utils.geo.destinationRad(p_0, a_a, a_d);  // location p_0 + a
      if (t_i + 1 >= data.densities.length) {
        f_u = a_u;
        f_v = a_v;
        f_d = a_d;
        f_a = a_a;
        f_l = a_l;
        den = idw(f_l[0], f_l[1], data.densities[t_i][s_i], rlons, rlats, 2);
      }
      else {
        try {
          var b_u = idw(a_l[0], a_l[1], data.uSpeeds[t_i + 1][s_i], rlons, rlats, 2) * tf1;
          var b_v = idw(a_l[0], a_l[1], data.vSpeeds[t_i + 1][s_i], rlons, rlats, 2) * tf1;
        }
        catch (error) {
          console.error("- a_l:", a_l);
          console.error("- t_i:", t_i, "s_i:", s_i);
          console.error("- data.uSpeeds:", data.uSpeeds);
          console.error("- data.uSpeeds[t_i + 1]:", data.uSpeeds[t_i + 1]);
          throw error;
        }
        f_u = (a_u + b_u) / 2;              // final u_distance
        f_v = (a_v + b_v) / 2;              // final v_distance
        f_d = utils.vectorLength(f_u, f_v); // final distance
        f_a = Math.atan2(f_u, f_v);         // final angle
        f_l = utils.geo.destinationRad(p_0, f_a, f_d);  // final position p_0 + 1/2(a + b)
        den = idw(f_l[0], f_l[1], data.densities[t_i + 1][s_i], rlons, rlats, 2);
      }
      dat = projection(f_l);  // projection of the location in pixel-space
      dat.push(den, f_a, f_l, f_d, f_u, f_v, t_i + 1);
      return dat;
    }

    var segn = Math.min(data.segmentCount, data.densities.length);
    var half = Math.floor(data.segmentCount / 2);
    var segi, loc, d_u, d_v, dat, ang, dis, den;
    //console.log("rlons:", rlons, "rlats:", rlats, "segn:", segn);

    // middle point on anchor position:
    loc = anchorLoc;       // the current location, initially the location of the path's anchor
    dat = projection(loc);  // projection of the location in pixel-space
    try {
      d_u = idw(loc[0], loc[1], data.uSpeeds[half][stri], rlons, rlats, 2) * tf1;  // interpolated u-speed
    } catch (error) {
      console.error("loc:", loc);
      console.error("data.uSpeeds:", data.uSpeeds);
      console.error("half:", half);
      console.error("data.uSpeeds[half]:", data.uSpeeds[half]);
      throw error;
    }
    d_v = idw(loc[0], loc[1], data.vSpeeds[half][stri], rlons, rlats, 2) * tf1;  // interpolated v-speed
    den = idw(loc[0], loc[1], data.densities[half][stri], rlons, rlats, 2);      // interpolated density
    ang = Math.atan2(d_u, d_v);         // angle
    dis = utils.vectorLength(d_u, d_v);  // distance
    dat.push(den, ang, loc, d_u, d_v, dis, "anchor");
    pathData.push(dat);

    //console.log("loc:", loc, "d_u:", d_u, "d_v:", d_v);
    //console.log("den:", den, "ang:", ang, "dis:", dis, "dat:", dat);
    //console.log("1:", pathData);

    // tail half, backwards from middle to first segment
    for (segi = half; segi > 0; segi--) {
      try {
        dat = stepBackward(loc, segi, stri);
      }
      catch (error) {
        console.error("- segi: " + segi + ", segn: " + segn + ", stri: " + stri);
        throw error;
      }
      pathData.unshift(dat);
      loc = dat[pdi_location];
    }

    // front half, forwards from middle to last segment:
    loc = anchorLoc;
    for (segi = half; segi < segn; segi++) {
      try {
        dat = stepForward(loc, segi, stri);
      }
      catch (error) {
        console.error("- segi: " + segi + ", segn: " + segn + ", stri: " + stri);
        throw error;
      }
      pathData.push(dat);
      loc = dat[pdi_location];
    }

    // remove all data points with speed = 0:
    var len = pathData.length;
    var i = 0;
    while (i < len) {
      if (pathData[i][pdi_distance] == 0) {
        pathData.splice(i, 1);
        len--;
      }
      else {
        i++;
      }
    }

    // minimize angle delta between subsequent angles:
    utils.minimizeAngleDelta(pathData.length,
      function (idx) { return pathData[idx][pdi_angle]; },
      function (idx, val) { pathData[idx][pdi_angle] = val; }
    );

    //DEBUG:
    //if (anchorLoc == app.anchorLocations[DEBUG_ANCHOR_IDX]) {
    //  var densities = [];
    //  var angles = [];
    //  var uSpeeds = [];
    //  var vSpeeds = [];
    //  var speeds = [];
    //  var segs = [];
    //  pathData.forEach(function (ary) {
    //    // [x, y, de, a2, l2, u2, v2, segi]
    //    densities.push(ary[2]);
    //    angles.push(ary[3]);
    //    uSpeeds.push(ary[5]);
    //    vSpeeds.push(ary[6]);
    //    speeds.push(ary[7]);
    //    segs.push(ary[8]);
    //  });
    //  console.log("pathData", pathData);
    //  console.log("densities", densities);
    //  console.log("angles", angles);
    //  console.log("uSpeeds", uSpeeds);
    //  console.log("vSpeeds", vSpeeds);
    //  console.log("speeds", speeds);
    //  console.log("segs", segs);
    //}

    return pathData;
  };

  /**
   * @private
   * Generates the outline of a path with a variable width that reflects the
   * density variability.
   *
   * @param pathData {array} A data structure as returned by paths.buildPathData.
   * @returns {Array} [[<x>, <y>], ...]
   */
  paths.buildOutline = function (pathData) {
    var lineData = [];
    if (pathData.length == 0) { return lineData; }

    var segn = pathData.length - 1;
    var segi, segd, angle, radius, dx, dy;
    var minRadius = .25;

    segd = pathData[0];
    if (segd == undefined) {
      console.error(pathData);
      throw new Error();
    }
    radius = minRadius + segd[pdi_density] * radiusFactor;
    angle = segd[pdi_angle] + Math.PI * .5;
    dx = Math.sin(angle) * radius;
    dy = -Math.cos(angle) * radius;
    lineData.push([segd[pdi_x] + dx, segd[pdi_y] + dy]);
    lineData.unshift([segd[pdi_x] - dx, segd[pdi_y] - dy]);

    for (segi = 1; segi < segn; segi++) {
      segd = pathData[segi];
      angle = (pathData[segi - 1][pdi_angle] + segd[pdi_angle] + Math.PI) * .5;
      radius = minRadius + segd[pdi_density] * radiusFactor;
      dx = Math.sin(angle) * radius;
      dy = -Math.cos(angle) * radius;
      lineData.push([segd[pdi_x] + dx, segd[pdi_y] + dy]);
      lineData.unshift([segd[pdi_x] - dx, segd[pdi_y] - dy]);
    }

    segd = pathData[segn];
    radius = minRadius + segd[pdi_density] * radiusFactor;
    angle = segd[pdi_angle] + Math.PI * .5;
    dx = Math.sin(angle) * radius;
    dy = -Math.cos(angle) * radius;
    lineData.push([segd[pdi_x] + dx, segd[pdi_y] + dy]);
    lineData.unshift([segd[pdi_x] - dx, segd[pdi_y] - dy]);

    return lineData;
  };

  /**
   * @private
   * Draws a path with variable thickness.
   *
   * @param flowG {object} The svg group element in which to draw the path.
   * @param pathData {array} A data structure as returned by paths.buildPathData.
   * @param lineData {array} A data structure as returned by paths.buildOutline.
   * @param pathColor {string} Hex-string that represents a color.
   */
  paths.drawPath = function (flowG, pathData, lineData, pathColor) {
    //console.log(lineData.map(function (d) {
    //  return '[' + d[0] + ', ' + d[1] + ']';
    //}));

    var segn = pathData.length - 1;
    var radius;

    // draw paths:
    var opacity = config.arty ? .6 : .7;
    flowG.append("path")
      .attr("d", paths._lineFn(lineData))
      .style({fill: pathColor, "fill-opacity": opacity });

    // draw head dot:
    if (config.arty) {
      radius = 0;
      pathData.forEach(function (d) { radius += d[2]; });
      radius = Math.max(1, radius / pathData.length);
      opacity = .5;
    }
    else {
      radius = utils.constrain(pathData[segn][2] * radiusFactor + .5, 1.5, 3);
      opacity = 1;
    }
    flowG.append('circle')
      .attr('cx', pathData[segn][0])
      .attr('cy', pathData[segn][1])
      .attr('r', radius)
      .attr("style", "fill: " + pathColor + "; fill-opacity: " + opacity + ";");
  };

  /**
   * @private
   * D3 line function used in paths.drawPath.
   */
  paths._lineFn = d3.svg.line()
    .x(function (d) { return d[0]; })
    .y(function (d) { return d[1]; })
    .interpolate("cardinal-closed");

  return paths;
}

"use strict";

function viz_(_config, _utils) {

  // dependencies:
  var config = _config;
  var utils = _utils;
  var paths = viz_paths_(_config, _utils);
  var legends = viz_legends_(_config, _utils);

  // service object:
  var viz = {};

  // private properties:
  var svg;
  var pathsG;
  var clipG;
  var mapW = 0;         // the width of the map
  var mapH = 0;         // the height of the map
  var projection;       // the d3.geo projection used to map locations to pixels
  var projectionPath;   // the d3.geo.path object with which to draw the geography
  var anchorLocations;

  /**
   * Updates all the base map related data, such as it's size, the size of the
   * legends, the geographic projection, etc.
   *
   * @param caseStudy {object} The models.caseStudy object.
   */
  viz.updateMapData = function (caseStudy) {
    //console.log(">> viz.updateMapData()");
    var svgRect = d3.select("#map-container").node().getBoundingClientRect();
    mapW = svgRect.width;
    mapH = mapW * config.mapHeightFactor;

    // specify the projection based of the size of the map:
    projection = caseStudy.getProjection(caseStudy, mapW, mapH);

    // initialize the d3 path with which to draw the geography:
    projectionPath = d3.geo.path().projection(projection);

    // Update pixels properties of radar objects. These properties are objects
    // with an x and a y property, the position of the radar in pixel-space.
    caseStudy.radars.forEach(function (radar) {
      var projected = projection(radar.location);
      radar.pixels = { x: projected[0], y: projected[1] }
    });

    // Update the anchors:
    this.initAnchors(caseStudy);
  };

  /** @private Initialize the anchors. */
  viz.initAnchors = function (caseStudy) {
    //console.log(">> viz.initAnchors()");
    var locTopLeft = projection.invert([0, 0]);  // the location at the top-left corner
    var locBotRight = projection.invert([mapW, mapH]);  // the loc. at the bottom-right
    var rra = utils.geo.distAngle(config.radarAnchorRadius);  // radar radius as angle
    var dlon = utils.geo.destination(caseStudy.mapCenter, 90, caseStudy.anchorInterval)[0]
      - caseStudy.mapCenter[0];  // longitude delta
    var dlat = utils.geo.destination(caseStudy.mapCenter, 0, caseStudy.anchorInterval)[1]
      - caseStudy.mapCenter[1];  // latitude delta
    anchorLocations = [];
    for (var lon = locTopLeft[0]; lon < locBotRight[0]; lon += dlon) {
      for (var lat = locTopLeft[1]; lat > locBotRight[1]; lat -= dlat) {
        caseStudy.radars.forEach(function (radar) {
          if (utils.degrees(d3.geo.distance(radar.location, [lon, lat])) <= rra) {
            anchorLocations.push([lon, lat]);
          }
        });
      }
    }
  };

  /**
   * Redraws the base map (not the paths).
   *
   * @param caseStudy {object} The models.caseStudy object.
   */
  viz.redrawMap = function (caseStudy) {
    // create/replace svg object:
    if (svg) { svg.remove(); }
    svg = d3.select("#map-container").append("svg")
      .attr("width", mapW)
      .attr("height", mapH)
      .classed("visualisation", true);

    // add clip-path:
    svg.append("defs")
      .append("clipPath")
      .attr("id", "clipRect")
      .append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", mapW)
      .attr("height", mapH);

    clipG = svg.append("g");
    clipG.attr("style", "clip-path: url(#clipRect);");
    if (config.arty) {
      clipG.attr("style", "background: #fff;");
    }
    else {
      var mapG = clipG.append("g").attr("id", "map");
      this.drawMap(mapG, caseStudy);
    }
    pathsG = clipG.append("g").attr("id", "paths");

  };

  /* @private Map draw helper */
  viz.drawMap = function (mapG, caseStudy) {
    mapG.append("rect")
      .attr("id", "background")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", mapW)
      .attr("height", mapH);
    mapG.append("path")
      .attr("id", "land")
      .datum(topojson.feature(
        caseStudy.topoJson,
        caseStudy.topoJson.objects.countries
      ))
      .attr("d", projectionPath);
    mapG.append("path")
      .attr("id", "country-boundary")
      .datum(topojson.mesh(
        caseStudy.topoJson,
        caseStudy.topoJson.objects.countries,
        function(a, b) { return a !== b; }
      ))
      .attr("d", projectionPath);
    mapG.append("path")
      .attr("id", "graticule")
      .datum(d3.geo.graticule().step([1, 1]))
      .attr("d", projectionPath);

    // draw radars:
    var rra = utils.geo.distAngle(config.radarAnchorRadius); // radar radius as angle:
    var radarG = mapG.append("g").attr("id", "radars");
    caseStudy.radars.forEach(function (radar) {
      radarG.append("path")
        .attr("id", "radar-radius")
        .datum(d3.geo.circle().origin(radar.location).angle(rra))
        .attr("d", projectionPath);

      // Draw series points around radar at the marker radius:
      //var n = 36;
      //for (var i = 0; i < n; i++) {
      //  var bearing = utils.mapRange(i, 0, n, 0, 360);
      //  var dest = utils.geo.destination(radar.location, bearing, config.radarAnchorRadius);
      //  radarG.append("path")
      //    .datum(d3.geo.circle().origin(dest).angle(.01))
      //    .attr("d", projectionPath)
      //    .classed("highlight3", true);
      //}
    });

    // optionally draw radar labels:
    if (config.showRadarLabels) {
      var radarLabelsG = mapG.append("g").attr("id", "radar-labels");
      caseStudy.radars.forEach(function (radar) {
        radarLabelsG.append('circle')
          .attr('cx', radar.pixels.x)
          .attr('cy', radar.pixels.y)
          .attr('r', 1.5)
          .classed("radar-center", true);
        radarLabelsG
          .append("text")
          .attr("x", radar.pixels.x + 4)
          .attr("y", radar.pixels.y + 10)
          .text(radar.id)
          .classed("radar-label", true);
      });
    }
  };

  /**
   * Draw the paths.
   *
   * @param data
   */
  viz.drawPaths = function (data) {
    paths.drawPaths(data, anchorLocations, projection, pathsG);
  };

  /**
   * draw the legends
   */
  viz.drawLegends = function (caseStudy, focus) {
    if (!config.arty) {
      var legendG = clipG.append("g").attr("id", "color-legend");
      legends.drawColorLegend(legendG, caseStudy, focus);

      legendG = clipG.append("g").attr("id", "scale-legend");
      legends.drawScaleLegend(legendG, mapW, mapH, projection, caseStudy);

      if (config.writeMetaDataInViz) {
        var mdG = clipG.append("g").attr("id", "meta-data");
        legends.writeMetaData(mdG, mapH, focus);
      }
    }
  };

  return viz;
}

/**
 * eu15a case-study.
 */
function eu15a(models) {
  return models.caseStudy("eu15a", jsonDataService(models));
}

/**
 * us15a case-study.
 */
function us15a(models) {
  return models.caseStudy("us15a", jsonDataService(models));
}

//# sourceMappingURL=app.js.map
