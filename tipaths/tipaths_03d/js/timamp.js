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
   * Builds pathData.
   * @param caseStudy
   * @param stri strata index
   * @param anchorLoc anchor location
   */
  timamp.buildPathData = function (caseStudy, stri, anchorLoc) {

    var pathData = [];
    var data = caseStudy.data;
    var rlons = caseStudy.radLons;
    var rlats = caseStudy.radLats;
    var segn = Math.min(data.intervalCount, data.densities.length);
    var idw = util.idw;

    // This value is multiplied with uSpeed/vSpeed values, expressed in m/s, in order
    // to obtain the distance traveled during the segment interval, expressed in km.
    // Note: caseStudy.data.interval = the duration of a segment in minutes (e.g. 20 min).
    var tf1 = caseStudy.data.interval * 60 / 1000;

    var half = Math.floor(data.intervalCount / 2);
    var segi, loc, d_u, d_v, dat, ang, dis, den;

    /**
     * @param p_0 source position (in lat/lon)
     * @param t_i source segment index
     * @param s_i strata index
     */
    function stepBackward(p_0, t_i, s_i) {
      var a_u = -idw(p_0[0], p_0[1], data.uSpeeds[t_i][s_i], rlons, rlats, 2) * tf1;
      var a_v = -idw(p_0[0], p_0[1], data.vSpeeds[t_i][s_i], rlons, rlats, 2) * tf1;
      var a_d = util.vectorLength(a_u, a_v);  // distance a
      var a_a = Math.atan2(a_u, a_v);         // angle a
      var a_l = util.geo.destinationRad(p_0, a_a, a_d);  // location p_0 + a
      var b_u = -idw(a_l[0], a_l[1], data.uSpeeds[t_i - 1][s_i], rlons, rlats, 2) * tf1;
      var b_v = -idw(a_l[0], a_l[1], data.vSpeeds[t_i - 1][s_i], rlons, rlats, 2) * tf1;
      var f_u = (a_u + b_u) / 2;              // final u
      var f_v = (a_v + b_v) / 2;              // final v
      var f_d = util.vectorLength(f_u, f_v);  // final distance
      var f_a = Math.atan2(f_u, f_v);         // final angle
      var f_l = util.geo.destinationRad(p_0, f_a, f_d);  // final position p_0 + 1/2(a + b)
      var den = idw(f_l[0], f_l[1], data.densities[t_i - 1][s_i], rlons, rlats, 2);
      var dat = projection(f_l);  // projection of the location in pixel-space
      dat.push(den, f_a + Math.PI, f_l, -f_u, -f_v, f_d, t_i - 1);
      return dat;
    }

    function stepForward(p_0, t_i, s_i) {
      var a_u, a_v, a_d, a_a, a_l, f_u, f_v, f_d, f_a, f_l, den, dat;
      a_u = idw(p_0[0], p_0[1], data.uSpeeds[t_i][s_i], rlons, rlats, 2) * tf1;
      a_v = idw(p_0[0], p_0[1], data.vSpeeds[t_i][s_i], rlons, rlats, 2) * tf1;
      a_d = util.vectorLength(a_u, a_v);  // distance a
      a_a = Math.atan2(a_u, a_v);         // angle a
      a_l = util.geo.destinationRad(p_0, a_a, a_d);  // location p_0 + a
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
        } catch (error) {
          console.error("- a_l:", a_l);
          console.error("- t_i:", t_i);
          console.error("- s_i:", s_i);
          console.error("- data.uSpeeds:", data.uSpeeds);
          console.error("- data.uSpeeds[t_i + 1]:", data.uSpeeds[t_i + 1]);
          throw error;
        }
        f_u = (a_u + b_u) / 2;              // final u
        f_v = (a_v + b_v) / 2;              // final v
        f_d = util.vectorLength(f_u, f_v);  // final distance
        f_a = Math.atan2(f_u, f_v);         // final angle
        f_l = util.geo.destinationRad(p_0, f_a, f_d);  // final position p_0 + 1/2(a + b)
        den = idw(f_l[0], f_l[1], data.densities[t_i + 1][s_i], rlons, rlats, 2);
      }
      dat = projection(f_l);  // projection of the location in pixel-space
      dat.push(den, f_a, f_l, f_u, f_v, f_d, t_i + 1);
      return dat;
    }

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
    dis = util.vectorLength(d_u, d_v);  // distance
    dat.push(den, ang, loc, d_u, d_v, dis, "anchor");
    pathData.push(dat);

    // tail half, backwards from middle to first segment
    for (segi = half; segi > 0; segi--) {
      dat = stepBackward(loc, segi, stri);
      pathData.unshift(dat);
      loc = dat[pdi_location];
    }

    // front half, forwards from middle to last segment:
    loc = anchorLoc;
    for (segi = half; segi < segn - 0; segi++) {
      try {
        dat = stepForward(loc, segi, stri);
      } catch (error) {
        console.error("- segn: " + segn);
        console.error("- segn: " + segn);
        throw error;
      }
      pathData.push(dat);
      loc = dat[pdi_location];
    }

    // trim - remove data points with zero speed from the beginning and the end of the data:
    while (pathData.length > 0 && pathData[0][pdi_angle] == 0) {
      pathData.shift();
    }
    while (pathData.length > 0 && pathData[pathData.length - 1][pdi_angle] == 0) {
      pathData.pop();
    }

    // minimize angle delta between subsequent angles:
    util.minimizeAngleDelta(pathData.length,
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
   *
   * @param pathData
   * @param radiusFactor
   *
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