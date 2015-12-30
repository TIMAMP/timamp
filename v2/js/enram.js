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
   * @param strataCount {number}
   * @param migrantsPerPath {number}
   */
  enram.focus = function (from, duration, strataCount, migrantsPerPath) {
    var focus = {
      from: from,
      till: moment(from).add(duration, 'hours'),
      duration: duration,
      strataCount: strataCount,
      migrantsPerPath: migrantsPerPath,
      isFocus: true
    };

    /**
     * @return the number of segments within the focus
     */
    focus.segmentCount = function (caseStudy) {
      return this.duration * 60 / caseStudy.segmentSize;
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