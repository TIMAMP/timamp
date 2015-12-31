
var utils = (function () {

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

})();
/*jshint undef: false, unused: true, laxbreak: true*/
/*jslint vars: true, plusplus: true*/
/*global define*/

"use strict";

// -----------------------------------------------------------------------------
// Json-based DataService
// -----------------------------------------------------------------------------

function JsonDataService() {
  var dataService = {};
  var checkData = true;
  var sourceData = null;
  var currFocus = null;

  /**
   * Initializes the dataService.
   * @param caseStudy {enram.caseStudy}
   * @param handler {function}
   */
  dataService.initialize = function(caseStudy, handler) {
    handler();
  };

  /**
   * Loads the data for the given focus.
   * @param caseStudy {enram.caseStudy}
   * @param focus     {enram.focus}
   * @param handler   {function(dataObject)} called when the data is loaded
   */
  dataService.loadFocusData = function (caseStudy, focus, handler) {
    //console.log(">> dataService.loadFocusData()");
    if (currFocus == undefined || currFocus.strataOptionIdx != focus.strataOptionIdx) {
      // update source data:
      var dataPath = caseStudy.urlBase + "data-" + focus.strataOptionIdx + ".json";
      d3.json(dataPath, function (error, json) {
        if (error) {
          console.error(error);
          //throw new Error("Error in dataService.loadCaseStudy. "
          //    + JSON.parse(error.responseText).error.join("; "));
          return;
        }

        sourceData = json;
        currFocus = focus;
        dataService._loadFocusData_next(caseStudy, focus, handler);
      });
    }
    else {
      this._loadFocusData_next(caseStudy, focus, handler);
    }
  };

  dataService._loadFocusData_next = function (caseStudy, focus, handler) {
    var data = timamp.dataObject(caseStudy, focus);
    var dt = focus.from.valueOf() - caseStudy.dataFrom.valueOf();
    var segmentSec = caseStudy.segmentSize * 60 * 1000;
    var iFrom = Math.floor(dt / segmentSec);
    // add one in the following to allow for the 2-stage Runge–Kutta interpolation
    var iTill = iFrom + data.segmentCount + 1;
    var iMax = sourceData.densities.length;
    //console.log(iFrom, caseStudy.dataFrom.toDate(), focus.from.toDate());

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
    //console.log(iFrom, iTill, iMax, prepend, append);

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
      this._checkData(data);
    }

    handler(data);
  };

  /** Check if the given data is OK:
   * - densities: data matrix with dimensions: [segments, strata, radars].
   * - uSpeeds: data matrix with dimensions: [segments, strata, radars].
   * - vSpeeds: data matrix with dimensions: [segments, strata, radars].
   * - speeds: data matrix with dimensions: [segments, strata, radars].
   * - avDensities: data matrix with dimensions: [strata, radars].
   */
  dataService._checkData = function (data) {
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
} // end dataService

/**
 * Created by wouter on 15/12/2015.
 */

var enram = (function () {
  //console.log(">> enram service constructor ", enram);

  var enram = {};

  /**
   * Creates and returns a focus object.
   * @param from      {moment}  the start of the focus window
   * @param duration  {number}  the focus duration in hours
   * @param strataOptionIdx {number}
   * @param migrantsPerPath {number}
   */
  enram.focus = function (from, duration, strataOptionIdx, migrantsPerPath) {
    var focus = {
      from: from,
      till: moment(from).add(duration, 'hours'),
      duration: duration,
      strataOptionIdx: strataOptionIdx,
      migrantsPerPath: migrantsPerPath,
      isFocus: true
    };

    /**
     * @return the number of segments for the focus and the given case study
     */
    focus.segmentCount = function (caseStudy) {
      return this.duration * 60 / caseStudy.segmentSize;
    };

    /**
     * @return the strata option for the focus and the given case study
     */
    focus.strataOption = function (caseStudy) {
      return caseStudy.strataOptions[this.strataOptionIdx];
    };

    /**
     * @return the number of strata for the focus and the given case study
     */
    focus.strataCount = function (caseStudy) {
      return this.strataOption(caseStudy).length;
    };

    /**
     * Returns a list with the lowest and the highest altitude.
     * @param caseStudy
     */
    focus.altitudeRange = function (caseStudy) {
      var strataOption = this.strataOption(caseStudy);
      return [strataOption[0][0], strataOption[strataOption.length - 1][1]];
    };

    /**
     * Constrains the focus period to fall within the available data period.
     * @param caseStudy {enram.caseStudy}
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
      for (var attr in focus) {
        if (focus.hasOwnProperty(attr)) { clone[attr] = focus[attr]; }
      }
      return clone;
    };

    return focus;
  };

  return enram;

})();
/*jshint unused: false, latedef: false */
/*jslint vars: true, plusplus: true, undef: true, continue: true */
/*global requirejs, require */

"use strict";

// -----------------------------------------------------------------------------
// Configuration settings that do not change:

/**
 * The radius around radars in km in which path anchors are considered.
 * @type {number}
 */
var radarAnchorRadius = 75;

/**
 * The migrants-per-path options.
 */
var migrantsPerPathOptions = [
  { value: 10000, text: "10K" },
  { value: 25000, text: "25K" },
  { value: 50000, text: "50K" },
  { value: 100000, text: "100K" },
  { value: 250000, text: "250K" },
  { value: 500000, text: "500K" }
];

/**
 * The height of the template map divided by its width, used to obtain the actual
 * height of the map, given the actual width after resizing.
 * @type {number}
 */
var mapHeightFactor = 940 / 720;

/**
 * The template legend width divided by the template map width, used to obtain the
 * actual width of the legend, given the actual width after resizing.
 * @type {number}
 */
var legendWidthFactor = 200 / 720;

/**
 * The minimum value of the range of hues to pick from for strata colors.
 * @type {number}
 */
var altiHueMin = 0.5;

/**
 * The maximum value of the range of hues to pick from for strata colors.
 * @type {number}
 */
var altiHueMax = 1;

/**
 * The saturation for strata colors.
 * @type {number}
 */
var altiSaturation = 1;

/**
 * The brightness for strata colors.
 * @type {number}
 */
var altiBrightness = 0.7;

/**
 * The initial focus duration, in hours.
 * @type {number}
 */
var defaultFocusDuration = 6;

/**
 * When true then only one path per radar is drawn.
 * @type {boolean}
 */
var singlePath = false;

/**
 * When true then basic metadata is provided in the visualisation.
 * @type {boolean}
 */
var writeMetaDataInViz = true;

/**
 * When true the special 'arty' mode is activated.
 * @type {boolean}
 */
var arty = false;

var showRadarLabels = true;

// -----------------------------------------------------------------------------
// System variables:

/** @type {number} */ var mapW = 0;
/** @type {number} */ var mapH = 0;
/** @type {number} */ var legendW = 0;
/** @type {number} */ var anchorArea;
/** @type {array}  */ var anchorLocations;
/** @type {Object} */ var svg;
/** @type {Object} */ var projection;
/** @type {Object} */ var projectionPath;
/** @type {Object} */ var currentData;

// -----------------------------------------------------------------------------

/**
 * Start the app. Call this function from a script element at the end of the html-doc.
 * @param _caseStudy {string} The initial case study object as initialized in the
 *                            init.js files for each case study.
 */
function startApp(caseStudy) {
  // assert that SVG is supported by the browser:
  if (!document.implementation.hasFeature("http://www.w3.org/TR/SVG11/feature#Image", "1.1")) {
    alert('SVG is not supported in your browser. Please use a recent browser.');
    return;
  }

  d3.select("#radar-anchor-radius").text(radarAnchorRadius);

  // load the case study data:
  caseStudy.load(function () {
    //console.log(caseStudy);

    // The initial focus:
    focus = enram.focus(
      caseStudy.defaultFocusFrom,
      defaultFocusDuration,
      caseStudy.defaultStrataOption,
      caseStudy.defaultMigrantsPerPath
    );
    focus.constrain(caseStudy);

    d3.select("#path-bird-count").text(numeral(focus.migrantsPerPath).format('0,0'));

    // parse the url query:
    var urlQuery = {};
    location.search.replace('\?','').split('&').map(function (nvPair) {
      nvPair = nvPair.split('=');
      urlQuery[nvPair[0]] = nvPair[1];
    });
    if (urlQuery["strata-count"]) {
      setStrataCount(parseInt(urlQuery["strata-count"]));
    }
    else if (urlQuery.altBands) {  // legacy
      setStrataCount(urlQuery.altBands);
    }
    if (urlQuery["single-path"]) {
      singlePath = urlQuery["single-path"] == "true";
    }
    if (urlQuery["length"]) {
      defaultFocusDuration = parseInt(urlQuery["length"]);
    }

    var busy = 2;

    // load the topography:
    d3.json(caseStudy.topoJsonUrl, function (error, json) {
      if (error) {
        console.error(error);
        return;
      }
      caseStudy.topoJson = json;
      if (--busy == 0) initDone(caseStudy);
    });

    //updateAnchors();
    updateColors(caseStudy, focus);

    anchorArea = caseStudy.anchorInterval * caseStudy.anchorInterval;

    if (--busy == 0) initDone(caseStudy);
  });
}

/**
 * This function assumes that seconds and milliseconds are zero.
 * @param from {moment}
 * @param focus {enram.focus}
 * @param caseStudy {enram.caseStudy}
 * @returns {moment}
 */
function constrainFrom(from, focus, caseStudy) {
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
}

function initDone(caseStudy) {

  function dateUpdateHandler() {
    var inputDay = d3.select("#input-day");
    var inputHour = d3.select("#input-hour");

    // derive and constrain new focus from moment:
    var newFocusFrom = moment(focus.from);
    newFocusFrom.date(parseInt(inputDay.property('value')));
    newFocusFrom.hour(parseInt(inputHour.property('value')));
    constrainFrom(newFocusFrom, focus, caseStudy);

    // update the input widget to the constrained values:
    inputDay.property('value', newFocusFrom.date());
    inputHour.property('value', newFocusFrom.hour());
    d3.select("#focus-month").text(focus.from.format("MMM"));
    d3.select("#focus-year").text(focus.from.format("YYYY"));

    // update focus and view if focus has changed:
    if (!newFocusFrom.isSame(focus.from)) {
      focus.setFrom(newFocusFrom);
      updateVisualisation(caseStudy, focus, true, false);
    }
  }

  function durationUpdateHandler() {
    var inputDuration = d3.select("#input-length");
    var newDuration = parseInt(inputDuration.property('value'));
    if (newDuration != focus.duration) {
      focus.setDuration(newDuration);
      updateVisualisation(caseStudy, focus, true, false);
    }
  }

  function strataCountUpdateHandler() {
    var newStrataOptionIdx = d3.select("#input-strata").property('value');
    if (newStrataOptionIdx != focus.strataOptionIdx) {
      //console.log("input-strata changed:", newStrataOptionIdx);
      setStrataOptionIdx(newStrataOptionIdx);
      updateColors(caseStudy, focus);
      updateVisualisation(caseStudy, focus, true, true);
    }
  }

  function migrantsPerPathUpdateHandler() {
    var newMPP = d3.select(this).property('value');
    if (newMPP != focus.migrantsPerPath) {
      //console.log("input-migrants-per-path changed:", newMPP);
      setMigrantsPerPath(newMPP);
      updateVisualisation(caseStudy, focus, false, false);
    }
  }

  // configure the date input widgets:
  d3.select("#input-day")
    .property('value', focus.from.date())
    //.attr('min', caseStudy.dataFrom.date())
    //.attr('max', moment(caseStudy.dataTill).subtract(1, 'minute').date())
    .on('change', dateUpdateHandler);
  d3.select("#focus-month").text(focus.from.format("MMM"));
  d3.select("#focus-year").text(focus.from.format("YYYY"));
  d3.select("#input-hour")
    .property('value', focus.from.hour())
    .on('change', dateUpdateHandler);

  // configure the duration input widget:
  d3.select("#input-length")
    .property('value', focus.duration)
    .on('change', durationUpdateHandler);

  // configure the strata-count input widget:
  d3.select("#input-strata")
    .selectAll('option')
    .data(caseStudy.strataOptions)
    .enter().append("option")
    .property('value', function (strataOption, i) { return i; })
    .text(function (strataOption) { return strataOption.length; });
  d3.select("#input-strata")
    .property('value', caseStudy.defaultStrataOption)
    .on('change', strataCountUpdateHandler);

  // configure the migrants-per-path input widget:
  d3.select("#input-migrants-per-path")
    .selectAll('option')
    .data(migrantsPerPathOptions)
    .enter().append("option")
    .property("value", function (d) { return d.value; })
    //.property("selected", function(d) { return d === focus.migrantsPerPath; })
    .text(function (d) { return d.text; });
  d3.select("#input-migrants-per-path")
    .property('value', focus.migrantsPerPath)
    .on('change', migrantsPerPathUpdateHandler);

  // set resize handler that updates the visualisation:
  d3.select(window)
    .on('resize', Foundation.utils.throttle(function(e) {
      if (d3.select("#map-container").node().getBoundingClientRect().width != mapW) {
        updateVisualisation(caseStudy, focus, false, true);
      }
    }, 25));

  // First update the map data and add the svg element to avoid miscalculation
  // of the actual size of the svg content (on Chrome).
  updateMapData(caseStudy);

  // Now update the map for real:
  updateVisualisation(caseStudy, focus, true, true);
}

/**
 * Use this function to update the strata-option value.
 * @param {number} strataOptionIdx
 */
function setStrataOptionIdx(strataOptionIdx) {
  focus.strataOptionIdx = strataOptionIdx;
}

/**
 * Use this function to update the migrants-per-path value.
 * @param {number} migrantsPerPath
 */
function setMigrantsPerPath(migrantsPerPath) {
  focus.migrantsPerPath = migrantsPerPath;
  d3.select("#path-bird-count").text(numeral(migrantsPerPath).format('0,0'));
}

/**
 * Prepare the hues for the altitude strata.
 * @param caseStudy {enram.caseStudy}
 * @param focus {enram.focus}
 */
function updateColors(caseStudy, focus) {
  caseStudy.hues = [];
  caseStudy.altHexColors = [];
  var altn = focus.strataCount(caseStudy);
  var hue;
  if (altn == 1) {
    hue = (altiHueMin + altiHueMax) / 2;
    caseStudy.hues.push(hue);
    caseStudy.altHexColors.push(utils.hsvToHex(hue, altiSaturation, altiBrightness));
  }
  else {
    for (var alti = 0; alti < altn; alti++) {
      hue = utils.mapRange(alti, 0, altn - 1, altiHueMin, altiHueMax);
      caseStudy.hues.push(hue);
      caseStudy.altHexColors.push(utils.hsvToHex(hue, altiSaturation, altiBrightness));
    }
  }
}

/**
 * @param caseStudy {enram.caseStudy}
 * @param focus {enram.focus}
 * @param dataDirty {boolean}
 * @param mapDirty {boolean}
 */
function updateVisualisation(caseStudy, focus, dataDirty, mapDirty) {
  if (mapDirty) updateMapData(caseStudy);

  // create/replace svg object:
  if (svg) { svg.remove(); }
  svg = d3.select("#map-container").append("svg")
    .attr("width", mapW)
    .attr("height", mapH)
    .classed("visualisation", true);

  svg.append("defs")
    .append("clipPath")
    .attr("id", "clipRect")
    .append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", mapW)
    .attr("height", mapH);

  var clipG = svg.append("g");
  clipG.attr("style", "clip-path: url(#clipRect);");
  if (arty) {
    clipG.attr("style", "background: #fff;");
  }
  else {
    var mapG = clipG.append("g").attr("id", "map");
    drawMap(mapG, caseStudy);
  }

  var pathsG = clipG.append("g").attr("id", "paths");
  if (dataDirty) {
    // A clone of the focus is passed to the loader. This focus will be set
    // as focus property on the resulting data object.
    caseStudy.loadFocusData(focus.clone(), function (data) {
      //console.log(data);
      currentData = data;
      drawPaths(data, pathsG);
    });
  }
  else {
    currentData.focus = focus;
    drawPaths(currentData, pathsG);
  }

  if (!arty) {
    // draw legends:
    var legendG = clipG.append("g").attr("id", "color-legend");
    drawColorLegend(caseStudy, focus, legendG);

    legendG = clipG.append("g").attr("id", "scale-legend");
    drawScaleLegend(caseStudy, legendG, caseStudy.scaleLegendMarkers);

    writeMetaData(caseStudy, focus, clipG);
  }
}

function updateMapData(caseStudy) {
  var svgRect = d3.select("#map-container").node().getBoundingClientRect();
  mapW = svgRect.width;
  //console.log("- mapW:", mapW);
  mapH = mapW * mapHeightFactor;
  legendW = mapW * legendWidthFactor;

  // specify the projection based of the size of the map:
  projection = caseStudy.getProjection(caseStudy, mapW, mapH);

  // initialize the d3 path with which to draw the geography:
  projectionPath = d3.geo.path().projection(projection);

  caseStudy.radars.forEach(function (radar) {
    radar.projection = projection(radar.location);
  });

  initAnchors(caseStudy);
}

/** Initialize the anchors. */
function initAnchors(caseStudy) {
  var locTopLeft = projection.invert([0, 0]);  // the location at the top-left corner
  var locBotRight = projection.invert([mapW, mapH]);  // the loc. at the bottom-right
  var rra = utils.geo.distAngle(radarAnchorRadius);  // radar radius as angle
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
}

function drawMap(mapG, caseStudy) {
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
  var rra = utils.geo.distAngle(radarAnchorRadius); // radar radius as angle:
  var radarG = mapG.append("g").attr("id", "radars");
  if (showRadarLabels) {
    var radarLabelsG = mapG.append("g").attr("id", "radar-labels");
  }
  caseStudy.radars.forEach(function (radar) {
    radarG.append("path")
      .attr("id", "radar-radius")
      .datum(d3.geo.circle().origin(radar.location).angle(rra))
      .attr("d", projectionPath);

    if (showRadarLabels) {
      var rp = projection(radar.location);
      radarLabelsG.append('circle')
        .attr('cx', rp[0])
        .attr('cy', rp[1])
        .attr('r', 1.5)
        .classed("radar-center", true);
      radarLabelsG
        .append("text")
        .attr("x", rp[0] + 4)
        .attr("y", rp[1] + 10)
        .text(radar.id)
        .classed("radar-label", true);
    }

    // Draw series points around radar at the marker radius:
    //var n = 36;
    //for (var i = 0; i < n; i++) {
    //  var bearing = utils.mapRange(i, 0, n, 0, 360);
    //  var dest = utils.geo.destination(radar.location, bearing, radarAnchorRadius);
    //  radarG.append("path")
    //    .datum(d3.geo.circle().origin(dest).angle(.01))
    //    .attr("d", projectionPath)
    //    .classed("highlight3", true);
    //}
  });
}

/**
 * Draw the paths.
 */
function drawPaths(data, pathsG) {
  if (singlePath) {
    drawPaths_singlePath(data, pathsG);
  }
  else {
    drawPaths_multiPath(data, pathsG);
  }
}

// Debug
//var debugAnchorId = 540;
//function anchorId(anchorLoc) {
//  return anchorLocations.indexOf(anchorLoc);
//}
//function isDebug(anchorLoc) {
//  return anchorLoc == anchorLocations[debugAnchorId];
//}

/**
 * @param data {timamp.dataObject}
 * @param pathsG {svg.g}
 */
function drawPaths_multiPath(data, pathsG) {
  //console.log(">> app.drawPaths_multiPath");
  Math.seedrandom('ENRAM');
  var rlons = data.caseStudy.radLons;
  var rlats = data.caseStudy.radLats;
  var idw = utils.idw;
  var strn = data.strataCount;
  var radiusFactor = 0.05;
  var probf = anchorArea / data.focus.migrantsPerPath;
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

        var pathData = timamp.buildPathData(data, stri, anchorLoc);
        if (pathData.length == 0) {
          //console.log("got empty pathData");
          return;
        }

        var lineData = timamp.buildOutline(pathData, radiusFactor);
        var flowG = pathsG.append("g").classed("flow-line", true);
        var lcolor = data.caseStudy.altHexColors[stri];
        drawPath_variableThickness(flowG, pathData, lineData, stri, radiusFactor, lcolor);

        // DEBUG:
        //if (isDebug(anchorLoc)) {
        //  console.log(pathData);
        //  flowG.select("path").style("fill", "#f00");
        //}
      }
    });
  }
}

function drawPaths_singlePath(data, pathsG) {
  var strn = data.strataCount;
  var tdy = Math.min(12 * strn, 150);
  var radiusFactor = 0.05;
  for (var stri = 0; stri < strn; stri++) {
    data.caseStudy.radars.forEach(function (radar, radi) {
      var oy = utils.mapRange(stri, 0, strn - 1, tdy / 2, -tdy / 2);
      // draw anchor marks:
      pathsG.append('circle')
        .attr('cx', radar.projection[0])
        .attr('cy', radar.projection[1] + oy)
        .attr('r', 1)
        .classed("acchor", true);
      if (data.avDensities[stri][radi] == 0) {
        return;  // do not draw empty paths
      }
      var pathData = buildPathData_singlePath(data, stri, radi, radar.location);
      pathData = pathData.map(function (d) {
        return [d[0], d[1] + oy, d[2], d[3]];
      });
      var lineData = timamp.buildOutline(pathData, radiusFactor);
      var lcolor = data.caseStudy.altHexColors[stri];
      drawPath_variableThickness(pathsG.append("g"),
        pathData, lineData, stri, radiusFactor, lcolor);
    });
  }
}

function buildPathData_singlePath(data, stri, radi, anchorLoc) {
  var pathData = [];
  var segi, segn = data.segmentCount;
  var loc, dlon, dlat, pp, angl, dist, dens;
  var tf1 = data.caseStudy.segmentSize * 0.06;  // 0.06 = 60 sec. * 0.001 km/m
  var half = Math.floor(data.segmentCount / 2);

  // tail half:
  loc = anchorLoc;
  pp = projection(loc);
  for (segi = half - 1; segi >= 0; segi--) {
    dlon = data.uSpeeds[segi][stri][radi] * tf1;
    dlat = data.vSpeeds[segi][stri][radi] * tf1;
    angl = Math.atan2(-dlon, -dlat);
    dist = utils.vectorLength(dlon, dlat);
    loc = utils.geo.destinationRad(loc, angl, dist);
    dens = data.densities[segi][stri][radi];
    pp = projection(loc);
    pp.push(dens, angl + Math.PI);
    pathData.unshift(pp);
  }

  // front half:
  loc = anchorLoc;
  pp = projection(loc);
  for (segi = half; segi < segn; segi++) {
    pp = projection(loc);
    dens = data.densities[segi][stri][radi];
    dlon = data.uSpeeds[segi][stri][radi] * tf1;
    dlat = data.vSpeeds[segi][stri][radi] * tf1;
    angl = Math.atan2(dlon, dlat);
    pp.push(dens, angl);
    pathData.push(pp);
    dist = utils.vectorLength(dlon, dlat);
    loc = utils.geo.destinationRad(loc, angl, dist);
  }

  pp = projection(loc);
  pp.push(dens, 0);  // same density as last segment
  pathData.push(pp);

  return pathData;
}

var lineFn = d3.svg.line()
  .x(function (d) { return d[0]; })
  .y(function (d) { return d[1]; })
  .interpolate("cardinal-closed");

function drawPath_fixedThickness(data, pathG, pathData, stri) {
  var lcolor = caseStudy.altHexColors[stri];
  var segi, segn = data.segmentCount;
  for (segi = 0; segi < segn; segi++) {
    var node1 = pathData[segi];
    var node2 = pathData[segi + 1];
    var dens = (node1[2] + node2[2]) / 2;
    var lwidth = utils.mapRange(dens, 0, 100, 0, 10);
    //console.log(node1, node2, dens, lwidth, lcolor);
    pathG.append("line")
      .attr("x1", node1[0]).attr("y1", node1[1])
      .attr("x2", node2[0]).attr("y2", node2[1])
      .attr("style", "stroke:" + lcolor
      + ";stroke-width: " + lwidth
      + ";stroke-linecap: round"
      + ";opacity: 1");
  }
}

function drawPath_variableThickness(flowG, pathData, lineData, stri, radiusFactor, lcolor) {
  //console.log(lineData.map(function (d) {
  //  return '[' + d[0] + ', ' + d[1] + ']';
  //}));
  var segn = pathData.length - 1;
  var radius;

  // draw paths:
  var opacity = arty ? .6 : .7;
  flowG.append("path")
    .attr("d", lineFn(lineData))
    .style({fill: lcolor, "fill-opacity": opacity });

  // draw head dot:
  if (arty) {
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
    .attr("style", "fill: " + lcolor + "; fill-opacity: " + opacity + ";");
}

/**
 * Draws the color legend in a horizontal layout.
 * @param caseStudy {enram.caseStudy}
 * @param focus {enram.focus}
 * @param legendG
 */
function drawColorLegend_hor(caseStudy, focus, legendG) {
  var legendH = 12;
  var legendL = 25;
  //var tx0 = legendL;
  //var td = 6;
  var ty = mapH - 20 - legendH - 8;
  var markerGr = legendG.append("g");
  markerGr.append("text")
    .classed("legend-label", true)
    .attr("x", legendL)
    .attr("y", ty)
    .attr("text-anchor", "middle")
    .text("0");
  markerGr.append("text")
    .classed("legend-label", true)
    .attr("x", legendL + legendW / 2)
    .attr("y", ty)
    .attr("text-anchor", "middle")
    .text("2");
  markerGr.append("text")
    .classed("legend-label", true)
    .attr("x", legendL + legendW + 6)
    .attr("y", ty)
    .attr("text-anchor", "middle")
    .text("4 km");

  var lineH = 7;
  legendG.append("line")
    .classed("scale-legend-line", true)
    .attr("x1", legendL)
    .attr("y1", mapH - 20 - legendH - lineH)
    .attr("x2", legendL)
    .attr("y2", mapH - 20);
  legendG.append("line")
    .classed("scale-legend-line", true)
    .attr("x1", legendL + legendW / 2)
    .attr("y1", mapH - 20 - legendH - lineH)
    .attr("x2", legendL + legendW / 2)
    .attr("y2", mapH - 20);
  legendG.append("line")
    .classed("scale-legend-line", true)
    .attr("x1", legendL + legendW)
    .attr("y1", mapH - 20 - legendH - lineH)
    .attr("x2", legendL + legendW)
    .attr("y2", mapH - 20);

  var tx = legendL;
  ty = mapH - 20 - legendH;
  var alti, altn = focus.strataCount(caseStudy);
  var dx = legendW / altn;
  for (alti = 0; alti < altn; alti++) {
    legendG.append("rect")
      .attr("x", tx)
      .attr("y", ty)
      .attr("width", Math.ceil(dx))
      .attr("height", legendH)
      .attr("style", "fill:" + caseStudy.altHexColors[alti] + ";");
    tx += dx;
  }
}

/**
 * Draws the color legend in a vertical layout.
 * @param caseStudy {enram.caseStudy}
 * @param focus {enram.focus}
 * @param legendG
 */
function drawColorLegend(caseStudy, focus, legendG) {
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
      .attr("style", "fill:" + caseStudy.altHexColors[alti] + ";");
    ty += dy;
  }

  var lineW = 7;
  var x2 = margin + legendW + lineW;
  legendG.append("line")
    .classed("scale-legend-line", true)
    .attr("x1", margin)
    .attr("y1", legendT)
    .attr("x2", x2)
    .attr("y2", legendT);
  legendG.append("line")
    .classed("scale-legend-line", true)
    .attr("x1", margin + legendW)
    .attr("y1", legendT + legendH / 2)
    .attr("x2", x2)
    .attr("y2", legendT + legendH / 2);
  legendG.append("line")
    .classed("scale-legend-line", true)
    .attr("x1", margin)
    .attr("y1", legendT + legendH)
    .attr("x2", x2)
    .attr("y2", legendT + legendH);

  var x2 = margin + legendW + lineW + 4;
  legendG.append("text")
    .classed("legend-label", true)
    .attr("x", x2)
    .attr("y", legendT + 8)
    .text(maxHeight + "km");
  legendG.append("text")
    .classed("legend-label", true)
    .attr("x", x2)
    .attr("y", legendT + legendH / 2 + 4)
    .text(midHeight + " km");
  legendG.append("text")
    .classed("legend-label", true)
    .attr("x", x2)
    .attr("y", legendT + legendH)
    .text(minHeight + " km");
  legendG.append("text")
    .classed("legend-label", true)
    .attr("x", margin + legendW + lineW + 2)
    .attr("y", legendT + legendH + 12)
    .text("altitude");
}

/**
 * Draws the scale legend.
 * @param caseStudy {enram.caseStudy}
 * @param legendG
 * @param markers
 */
function drawScaleLegend(caseStudy, legendG, markers) {
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
}

/**
 * @param caseStudy {enram.caseStudy}
 * @param focus {enram.focus}
 * @param clipG
 */
function writeMetaData(caseStudy, focus, clipG) {
  if (!writeMetaDataInViz) return;

  var mdG = clipG.append("g").attr("id", "meta-data");
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
}


/**
 * Created by wouter on 28/11/2015.
 */

/**
 * caseStudy form:
 * {
     *   <see properties in README.md>
     *   defaultFocusFrom: {moment}
     *   segmentCount: {number} The number of segments in the source data
     * }
 *
 * @param basePath {String}
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
    this.loadMetaData(function () {
      this.dataService.initialize(caseStudy, handler);
    });
  };

  /**
   * Load case study data from properly formatted json file.
   * @param handler {function(Object)} Called when loading is complete.
   */
  caseStudy.loadMetaData = function (handler) {
    //console.log(this);
    caseStudy.urlBase = "src/data/" + this.basePath + "/";
    d3.json(caseStudy.urlBase + "metadata.json", function (error, json) {
      if (error) {
        throw new Error("Error loading metadata.json in " + caseStudy.urlBase +
          + " in caseStudy.loadMetaData(). " + error);
            //+ JSON.parse(error.responseText).error.join("; "));
      }

      for (var attr in json) {
        if (json.hasOwnProperty(attr)) caseStudy[attr] = json[attr];
      }
      caseStudy.dataFrom = moment.utc(caseStudy.dataFrom);
      caseStudy.dataTill = moment.utc(caseStudy.dataTill);
      caseStudy.defaultFocusFrom = moment.utc(caseStudy.defaultFocusFrom);

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

      caseStudy.selectedRadar = caseStudy.radars[0];
      caseStudy.radarCount = caseStudy.radars.length;

      caseStudy.strataOptions.forEach(function (strataOption) {
        strataOption.forEach(function (strata) {
          strata.push(strata[1] - strata[0]);
        })
      });

      caseStudy.topoJsonUrl = caseStudy.urlBase + "topo.json";
      //console.log(caseStudy.topoJsonUrl);

      console.info("Loaded case study", caseStudy.label);
      handler.call(caseStudy);
    });
  };

  /**
   * Loads the data for the given focus.
   * @param focus    {enram.focus}
   * @param handler  {function(dataObject)}  called when the data is loaded
   */
  caseStudy.loadFocusData = function (focus, handler) {
    //console.log(">> caseStudy.loadFocusData()");
    this.dataService.loadFocusData(this, focus, handler);
  };

  /**
   * @return the number of strata for the different strata options.
   */
  caseStudy.strataCounts = function () {
    if (this.__strataCounts == undefined) {
      this.__strataCounts = this.strataOptions.map(function (strataOption) {
        return strataOption.length;
      });
    }
    return this.__strataCounts;
  };
  caseStudy.__strataCounts = undefined;

  /**
   * @return the segment duration in milliseconds
   */
  caseStudy.segmentMillis = function () {
    return this.segmentSize * 60 * 1000;
  };

  caseStudy.getProjection = function (caseStudy, mapWidth, mapHeight) {
    console.error("There is no implementation for getProjection in case study '" + basePath + "'.");
  };

  return caseStudy;

};

/**
 * Created by wouter on 13/12/2015.
 */

var timamp = (function () {

  var timamp = {};

  // pathData indices:
  var pdi_x = 0;
  var pdi_y = 1;
  var pdi_density = 2;
  var pdi_angle = 3;
  var pdi_location = 4;
  var pdi_distance = 5;

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
      __strataOption: focus.strataOption(caseStudy),
      strataCount: focus.strataCount(caseStudy),
      segmentCount: focus.segmentCount(caseStudy),
      densities: [],
      uSpeeds: [],
      vSpeeds: [],
      speeds: [],
      avDensities: []
    };

    /**
     * Initializes the data structure to be filled with actual data.
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
     * Returns the size (height) of the strata with the given index.
     * @param strataIdx
     * @returns {number}
     */
    dataObject.strataSize = function (strataIdx) {
      return this.__strataOption[strataIdx][2] / 1000;
    };

    /**
     * Prepends data entries to replace missing data for a given amount of segments.
     * @param amount The number of segments for which to add data entries.
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
     * @param amount The number of segments for which to add data entries.
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

  /**
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
   * @param data {timamp.dataObject}
   * @param stri strata index
   * @param anchorLoc anchor location
   */
  timamp.buildPathData = function (data, stri, anchorLoc) {
    var pathData = [];
    var rlons = data.caseStudy.radLons;
    var rlats = data.caseStudy.radLats;
    var idw = utils.idw;

    // This value is multiplied with uSpeed/vSpeed values, expressed in m/s, in order
    // to obtain the distance traveled during the segment interval, expressed in km.
    // Note: data.caseStudy.segmentSize = the duration of a segment in minutes (e.g. 20 min).
    var tf1 = data.caseStudy.segmentSize * 60 / 1000;

    /**
     * @param p_0 source position (in lat/lon)
     * @param t_i source segment index
     * @param s_i strata index
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
      var f_d = utils.vectorLength(f_u, f_v);  // final distance
      var f_a = Math.atan2(f_u, f_v);         // final angle
      var f_l = utils.geo.destinationRad(p_0, f_a, f_d);  // final position p_0 + 1/2(a + b)
      var den = idw(f_l[0], f_l[1], data.densities[t_i - 1][s_i], rlons, rlats, 2);
      var dat = projection(f_l);  // projection of the location in pixel-space
      dat.push(den, f_a + Math.PI, f_l, f_d, -f_u, -f_v, t_i - 1);
      return dat;
    }

    function stepForward(p_0, t_i, s_i) {
      var a_u, a_v, a_d, a_a, a_l, f_u, f_v, f_d, f_a, f_l, den, dat;
      a_u = idw(p_0[0], p_0[1], data.uSpeeds[t_i][s_i], rlons, rlats, 2) * tf1;
      a_v = idw(p_0[0], p_0[1], data.vSpeeds[t_i][s_i], rlons, rlats, 2) * tf1;
      a_d = utils.vectorLength(a_u, a_v);  // distance a
      a_a = Math.atan2(a_u, a_v);         // angle a
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
        f_d = utils.vectorLength(f_u, f_v);  // final distance
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
    var loc, d_u, d_v, dat, ang, dis, den;
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
    //if (anchorLoc == anchorLocations[DEBUG_ANCHOR_IDX]) {
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
   * Generates the outline of a path whose variable width reflects the dynamic densities.
   * @param pathData
   * @param radiusFactor
   * @returns {Array} [[<x>, <y>], ...]
   */
  timamp.buildOutline = function (pathData, radiusFactor) {
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

  return timamp;

})();
/**
 * Created by wouter on 22/09/2015.
 */

/**
 * eu15a case study constructor.
 */
var eu15a = function () {

  var caseStudy = enram.caseStudy("eu15a", JsonDataService());

  caseStudy.getProjection = function (caseStudy, mapWidth, mapHeight) {
    return d3.geo.mercator()
      .scale(caseStudy.mapScaleFactor * mapWidth)
      .translate([mapWidth / 2, mapHeight / 2])
      .center(caseStudy.mapCenter);
  };

  return caseStudy;
}();

/**
 * Created by wouter on 22/09/2015.
 */

/**
 * us15a case study constructor.
 */
var us15a = function () {

  var caseStudy = enram.caseStudy("us15a", JsonDataService());

  caseStudy.getProjection = function (caseStudy, mapWidth, mapHeight) {
    return d3.geo.mercator()
      .scale(caseStudy.mapScaleFactor * mapWidth)
      .translate([mapWidth / 2, mapHeight / 2])
      .center(caseStudy.mapCenter);
  };

  return caseStudy;
}();

//# sourceMappingURL=app.js.map
