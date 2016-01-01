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
