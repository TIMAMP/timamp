"use strict";

function viz_paths_(_config, _utils) {

  // dependencies:
  var config = _config;
  var utils = _utils;

  // service object:
  var paths = {};

  // private properties:
  var radiusFactor = 0.025;  // Determines the thickness of the paths.

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
