
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
