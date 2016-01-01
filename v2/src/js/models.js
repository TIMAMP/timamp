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