/*global define */

define(["kriging"], function (kriging) {
    "use strict";
    
    var interpolation = {};
    
    /**
     * Create an interpolator function that uses kriging configured by means
     * of the given config object. This object mush have the following properties:
     * - tValues: The known training values.
     * - xValues: The corresponding x-positions for the given training values.
     * - yValues: The corresponding y-positions for the given training values.
     * - variogram: The variogram model, as string, either "spherical",
     *   "exponential" or "gaussian".
     * - sigma2: The variance of the noise/gaussian process.
     * - alpha: The prior of the variogram model.
     * See https://github.com/oeo4b/kriging.js/ for more details.
     * @param   {Object}   config The kriging-config object.
     * @returns {Function} The interpolator function that takes two arguments,
     *                     the x and y coordinates of the point for which to
     *                     interpolate the value.
     */
    interpolation.krigingInterpolator = function (config) {
        if (config.tValues.length != config.xValues.length) {
            throw "config.tValues.length != config.xValues.length";
        }
        if (config.xValues.length != config.yValues.length) {
            throw "config.xValues.length != config.yValues.length";
        }
        var model = kriging.train(config.tValues,
                                  config.xValues,
                                  config.yValues,
                                  config.variogram,
                                  config.sigma2,
                                  config.alpha);
        return function (x, y) {
            return kriging.predict(x, y, model);
        };
    };
    
    interpolation.IDWInterpolator = function (tValues, xValues, yValues, power) {
        if (tValues.length != xValues.length) {
            throw "tValues.length != xValues.length";
        }
        if (xValues.length != yValues.length) {
            throw "xValues.length != yValues.length";
        }
        var len = tValues.length;
        return function (x, y, debug) {
            var i,
                dx,
                dy,
                wi,
                ws = 0,
                r = 0;
            for (i = 0; i < len; i++) {
                dx = x - xValues[i];
                dy = y - yValues[i];
                wi = 1 / Math.pow(Math.sqrt(dx * dx + dy * dy), power);
                r += wi * tValues[i];
                ws += wi;
            }
            return r / ws;
        };
    };
    
    interpolation.idw = function (x, y, tValues, xValues, yValues, power) {
        if (tValues.length != xValues.length) {
            throw "tValues.length != xValues.length";
        }
        if (xValues.length != yValues.length) {
            throw "xValues.length != yValues.length";
        }
        var len = tValues.length,
            i,
            dx,
            dy,
            wi,
            ws = 0,
            r = 0;
        for (i = 0; i < len; i++) {
            dx = x - xValues[i];
            dy = y - yValues[i];
            if (dx === 0 && dy ===0) {
                console.log("IDW: dx=0 & dy=0 : x: " + x + ", y: " + y + ", tValues: [" + tValues + "], xValues: [" + xValues + "], yValues: [" + yValues + "], power: " + power + ", i: " + i + ", dx: " + dx + ", dy: " + dy + ", wi: " + wi + ", r: " + r + ", ws: " + ws);
//                return tValues[i];
            }
            if (dx === 0) {
                throw new Error("The given x (" + x + ") equals the " + i + "-th value in the given x-positions");
            }
            wi = 1 / Math.pow(Math.sqrt(dx * dx + dy * dy), power);
            r += wi * tValues[i];
            ws += wi;
        }
        return r / ws;
    };
    
    return interpolation;
});