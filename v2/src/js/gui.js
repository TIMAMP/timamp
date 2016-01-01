"use strict";

function gui_(_app, _models, _config) {

  // dependencies:
  var app = _app;
  var models = _models;
  var config = _config;

  // service object:
  var gui = {};

  /**
   * @private
   * Initialize the gui service.
   */
  gui.initialize = function () {
    var caseStudy = app.caseStudy();
    var focus = app.focus();

    d3.select("#radar-anchor-radius").text(config.radarAnchorRadius);
    this.updateText(true);

    // configure the date input widgets:
    d3.select("#input-day")
      .property('value', focus.from.date())
      .on('change', this.dateUpdateHandler);
    d3.select("#focus-month").text(focus.from.format("MMM"));
    d3.select("#focus-year").text(focus.from.format("YYYY"));
    d3.select("#input-hour")
      .property('value', focus.from.hour())
      .on('change', this.dateUpdateHandler);
    
    // configure the duration input widget:
    d3.select("#input-length")
      .property('value', focus.duration)
      .on('change', this.durationUpdateHandler);
    
    // configure the strata-count input widget:
    d3.select("#input-strata")
      .selectAll('option')
      .data(caseStudy.strataOptions)
      .enter().append("option")
      .property('value', function (strataOption, i) { return i; })
      .text(function (strataOption) { return strataOption.length; });
    d3.select("#input-strata")
      .property('value', caseStudy.defaultStrataOption)
      .on('change', this.strataCountUpdateHandler);
    
    // configure the migrants-per-path input widget:
    d3.select("#input-migrants-per-path")
      .selectAll('option')
      .data(config.migrantsPerPathOptions)
      .enter().append("option")
      .property("value", function (d) { return d.value; })
      //.property("selected", function(d) { return d === focus.migrantsPerPath; })
      .text(function (d) { return d.text; });
    d3.select("#input-migrants-per-path")
      .property('value', focus.migrantsPerPath)
      .on('change', this.migrantsPerPathUpdateHandler);
    
    // set resize handler that updates the visualisation:
    d3.select(window)
      .on('resize', Foundation.utils.throttle(function(e) {
        if (d3.select("#map-container").node().getBoundingClientRect().width != app.mapW) {
          app.updateVisualisation(false, true);
        }
      }, 25));
  };

  /**
   * Update the text in the gui.
   *
   * @param migrantsPerPathChanged {boolean}
   */
  gui.updateText = function (migrantsPerPathChanged) {
    var focus = app.focus();
    if (migrantsPerPathChanged == undefined || migrantsPerPathChanged) {
      d3.select("#migrants-per-path").text(numeral(focus.migrantsPerPath).format('0,0'));
    }
  };

  /* @private update handler. */
  gui.dateUpdateHandler = function () {
    //console.log(">> gui.dateUpdateHandler");
    var caseStudy = app.caseStudy();
    var focus = app.focus();
    var inputDay = d3.select("#input-day");
    var inputHour = d3.select("#input-hour");
    
    // derive and constrain new focus from moment:
    var newFocusFrom = moment(focus.from);
    newFocusFrom.date(parseInt(inputDay.property('value')));
    newFocusFrom.hour(parseInt(inputHour.property('value')));
    models.constrainFrom(newFocusFrom, focus, caseStudy);
    
    // update the input widget to the constrained values:
    inputDay.property('value', newFocusFrom.date());
    inputHour.property('value', newFocusFrom.hour());
    d3.select("#focus-month").text(focus.from.format("MMM"));
    d3.select("#focus-year").text(focus.from.format("YYYY"));
    
    // update focus and view if focus has changed:
    if (!newFocusFrom.isSame(focus.from)) {
      app.updateFocusFrom(newFocusFrom);
    }
  };

  /* @private update handler. */
  gui.durationUpdateHandler = function () {
    var focus = app.focus();
    var inputDuration = d3.select("#input-length");
    var newDuration = parseInt(inputDuration.property('value'));
    if (newDuration != focus.duration) {
      app.updateFocusDuration(newDuration);
    }
  };

  /* @private update handler. */
  gui.strataCountUpdateHandler = function () {
    var focus = app.focus();
    var newIdx = d3.select("#input-strata").property('value');
    if (newIdx != focus.strataOptionIdx) {
      app.updateStrataOptionIdx(newIdx)
    }
  };

  /* @private update handler. */
  gui.migrantsPerPathUpdateHandler = function () {
    var focus = app.focus();
    var newMPP = d3.select(this).property('value');
    if (newMPP != focus.migrantsPerPath) {
      app.updateMigrantsPerPath(newMPP);
      gui.updateText(focus, true);
    }
  };
  
  gui.initialize();

  return gui;
}