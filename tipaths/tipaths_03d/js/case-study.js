/**
 * Created by wouter on 28/11/2015.
 */

/**
 *
 * @param id
 * @param dataServiceFn A function that initialises and returns the data service object.
 *                      This function should take the caseStudy object as sole argument.
 *                      The returned data service object should have a initialize
 *                      method that takes a handler which is called when the
 *                      initialisation is complete.
 * @returns The case study object.
 */
function initCaseStudy(id, dataServiceInitializer) {

  var caseStudy = { id: id };

  caseStudy.initialize = function (handler) {
    this.loadMetaData(function () {
      this.dataService = dataServiceInitializer(caseStudy);
      this.dataService.initialize(handler);
    });
  };

  /**
   * Load case study data from properly formatted json file.
   * @param {Object}           caseStudy  An object that represents the case study.
   * @param {function(Object)} handler    This handler is called with the caseStudy
   *                                      as this.
   */
  caseStudy.loadMetaData = function (handler) {
    //console.log(this);
    caseStudy.urlBase = "data/" + this.id + "/";
    d3.json(caseStudy.urlBase + "metadata.json", function (error, json) {
      //console.log(caseStudy);
      if (error) {
        console.error(error);
        //throw new Error("Error in dataService.loadCaseStudy. "
        //    + JSON.parse(error.responseText).error.join("; "));
      }
      else {
        for (var attr in json) {
          if (json.hasOwnProperty(attr)) caseStudy[attr] = json[attr];
        }
        caseStudy.minMoment = moment.utc(caseStudy.dateMin);
        caseStudy.maxMoment = moment.utc(caseStudy.dateMax);
        caseStudy.focusMoment = moment.utc(caseStudy.dateFocus);

        // Create mapping from radar ids to indices:
        caseStudy.radarIndices = {};
        caseStudy.radLons = [];
        caseStudy.radLats = [];
        caseStudy.radars.forEach(function (radar, i) {
          radar.location = [radar.longitude, radar.latitude];
          caseStudy.radarIndices[radar.id] = i;
          caseStudy.radLons.push(radar.longitude);
          caseStudy.radLats.push(radar.latitude);
        });

        caseStudy.selectedRadar = caseStudy.radars[0];
        caseStudy.radarCount = caseStudy.radars.length;

        caseStudy.topoJsonUrl = caseStudy.urlBase + "topo.json";

        //console.log(caseStudy.topoJsonUrl);
        console.log("Loaded case study", caseStudy.label);
        handler.call(caseStudy);
      }
    });
  };

  /**
   * This method should be implemented in concrete case studies. It should
   * further initialize the bare dataService object, accessible through
   * this.dataService.
   *
   * @param handler
   */
  caseStudy.initDataService = function (dataService, handler) {
    handler();
  };

  caseStudy.loadData = function (handler) {
    //console.log(">> caseStudy.loadData()");
    this.dataService.loadData(function (data) {
      caseStudy.data = data;
      handler(data);
    });
  };

  caseStudy.getProjection = function (caseStudy, mapWidth, mapHeight) {
    console.error("There is no implementation for getProjection in case study '" + id + "'.");
  };

  return caseStudy;
}
