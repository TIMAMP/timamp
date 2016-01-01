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
