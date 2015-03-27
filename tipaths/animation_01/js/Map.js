define(["proj4"], function(proj4) {
    "use strict";
    
    /**
     * Represents a concrete map.
     * @param {Number} height The target height of the shown map.
     */
    var Map = function (height) {
        this.height = height;
        // The scale of this map with respect to the basemap.
        this.scaleToBase = height / this.basemap.height;
        // The derived width of the shown map.
        this.width = Math.ceil(this.basemap.width * this.scaleToBase);
        // X-coordinate of the upper left corner of the image in map units.
        this.x0 = this.basemap.x0 - this.basemap.mppX / 2;
        // Y-coordinate of the upper left corner of the image in map units.
        this.y0 = this.basemap.y0 - this.basemap.mppY / 2;
        // Size in the x-direction in map units/pixel, here meters/pixel.
        this.mppX = this.basemap.mppX / this.scaleToBase;
        // Size in the y-direction in map units/pixel, here meters/pixel.
        this.mppY = this.basemap.mppY / this.scaleToBase;
    }
    
    // Standard longitude/latitude projection for use in proj4.js
    // See http://spatialreference.org/ref/epsg/wgs-84/.
    Map.prototype.lolaProj = proj4('EPSG:4326');
    
    // These data concern the basemap provided in the given case study.
    // The projection used by the worldfile for this basemap is EPSG:28992.
    // See http://spatialreference.org/ref/epsg/amersfoort-rd-new/ for more details.
    Map.prototype.basemap = {
        // The height of the given basemap.
        width : 3962,
        // The height of the given basemap.
        height : 5175,
        // x-coordinate of the center of the upper left pixel
        x0 : -65935.169243143609000,
        // y-coordinate of the center of the upper left pixel
        y0 : 644004.237730283760000,
        // Pixel size in the x-direction in map units/pixel, here meters/pixel.
        mppX : 95.178584108128206,
        // Pixel size in the y-direction in map units/pixel, here meters/pixel.
        mppY : -95.166574192152410,
        // The projection specification for use in proj4.js.
        proj : "+proj=sterea +lat_0=52.15616055555555 +lon_0=5.38763888888889 +k=0.9999079 +x_0=155000 +y_0=463000 +ellps=bessel +units=m +no_defs "
    };
    
    /**
     * Project a longitute/latitude location to a pixel coordinate on the map.
     * @param   {Number} lon Longitude
     * @param   {Number} lat Latitude
     * @returns {Object} Object with x and y coordinates as properties.
     */
    Map.prototype.locToPxl = function (lon, lat) {
        var p = { x : lon, y : lat };
        proj4(this.lolaProj, this.basemap.proj, p);
        p.x = (p.x - this.basemap.x0) / this.basemap.mppX * this.scaleToBase;
        p.y = (p.y - this.basemap.y0) / this.basemap.mppY * this.scaleToBase;
        return p;
    }

    /**
     * Project a pixel coordinate on the map to a longitude/latitude location.
     * @param   {Number} x Pixel's x coordinate.
     * @param   {Number} y Pixel's y coordinate.
     * @returns {Object} Object with lon and lat coordinates as properties.
     */
    Map.prototype.pxlToLoc = function (x, y) {
        var p = {
            x : this.basemap.x0 + x / this.scaleToBase * this.basemap.mppX,
            y : this.basemap.y0 + y / this.scaleToBase * this.basemap.mppY
        };
        proj4(this.basemap.proj, this.lolaProj, p);
        return p;
    }
    
    /**
     * Approximately map a horizontal distance in meters to the corresponding
     * distance in pixels.
     * @param   {Number} dis A distance in meters.
     * @returns {Number} The corresponding distance in pixels.
     */
    Map.prototype.dmxToPxl = function (dis) {
        return dis / this.mppX;
    }
    
    Map.prototype.logSpecs = function () {
        var m = this;
        console.log("# Map data:");
        console.log(" - width/height: " + m.width + " / " + m.height);
        console.log(" - scaleToBase: " + m.scaleToBase);
        console.log(" - x0/y0: " + m.x0 + " / " + m.y0);
        console.log(" - mppX/mppY: " + m.mppX + " / " + m.mppY);
        //console.log(" - wm/hm: " + (m.x0 + m.width * m.mppX) + " / " + (m.y0 + m.height * m.mppY));
    }

    Map.prototype.logBasemapSpecs = function () {
        var m = this.basemap;
        console.log("# Basemap data:");
        console.log(" - width/height: " + m.width + " / " + m.height);
        console.log(" - scale: " + m.scale);
        console.log(" - x0/y0" + m.x0 + " / " + m.y0);
        console.log(" - mppX/mppY: " + m.mppX + " / " + m.mppY);
        //console.log(" - wm/hm: " + (m.x0 + m.width * m.mppX) + " / " + (m.y0 + m.height * m.mppY));
    };
    
    return Map;
});