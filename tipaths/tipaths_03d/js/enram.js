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
      till: moment.utc(from).add(duration, 'hours'),
      duration: duration,
      strataCount: strataCount,
      migrantsPerPath: migrantsPerPath
    };

    /**
     * @return the number of
     */
    focus.segmentCount = function (caseStudy) {
      return this.duration * 60 / caseStudy.segmentSize;
    };

    focus.clone = function () {
      var copy = {};
      for (var attr in focus) {
        if (focus.hasOwnProperty(attr)) { copy[attr] = focus[attr]; }
      }
      return copy;
    };

    return focus;
  };

  return enram;

})();