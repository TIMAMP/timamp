"use strict";

define(["jquery"], function($) {
    
    var util = {};
    
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
    util.hsvToRgb = function (h, s, v) {
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
    util.rgbToHsv = function (r, g, b) {
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
    util.rgbToHex = function (r, g, b) {
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
    
    util.hsvToHex = function (h, s, v) {
        return util.rgbToHex(util.hsvToRgb(h, s, v));
    };
    
    util.hsvaToRgba = function (h, s, v, a) {
        var rgb = util.hsvToRgb(h, s, v);
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
    util.average = function (ary, undefAv) {
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
    util.averageDisplacement = function (angles, speeds, undefAv) {
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
    // Support functions
    // -----------------------------------------------------------------------------
    
    /**
     * Maps the value v from the source range [a, b] to the target range [c, d].
     * @param   {Number} v The value to map.
     * @param   {Number} a The first bound of the source range.
     * @param   {Number} b The second bound of the source range.
     * @param   {Number} c The first bound of the target range.
     * @param   {Number} d The second bound of the target range.
     * @returns {Number} The mapped value. 
     */
    util.map = function (v, a, b, c, d) {
        return (v - a) / (b - a) * (d - c) + c;
    }
    
    /**
     * Calculates the length of the vector (dx, dy).
     * @param   {[[Type]]} dx [[Description]]
     * @param   {[[Type]]} dy [[Description]]
     * @returns {[[Type]]} [[Description]]
     */
    util.vectorLength = function (dx, dy) {
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    /**
     * Constrains the given value v to the range [min, max]
     * @param   {Number} v   The value to constrain.
     * @param   {Number} min The minimum value of the range.
     * @param   {Number} max The maximum value of the range.
     * @returns {Number} The constrained value.
     */
    util.constrain = function (v, min, max) {
        if (v < min) { return min; }
        else if (v > max) { return max; }
        else return v;
    }
    
    /**
     * Creates a list with n zeros.
     * @param   {Number}   length The number of zeros to 
     * @returns {[[Type]]} [[Description]]
     */
    util.zeroArray = function (length) {
        var result = [];
        for (var i = 0; i < length; i++) {
            result.push(0);
        }
        return result;
    }
    
    // -----------------------------------------------------------------------------
    
    util.debug = function (name, value) {
        //$("#debug").append("<p>" + name + ": " + value + "</p>");
        if (name && value === undefined) {
            console.log(name);
        }
        else {
            console.log(name + ": " + value);
        }
    }
        
    // -----------------------------------------------------------------------------
    
    return util;

});