/**
 * Created by wouter on 28/11/2015.
 */

/**
 * caseStudy form:
 * {
     *   <see properties in README.md>
     *   defaultFocusFrom: {moment}
     *   segmentCount: {number} The number of segments in the source data
     * }
 *
 * @param basePath {String}
 * @param dataService {object}
 * @returns The caseStudy object.
 */
enram.caseStudy = function (basePath, dataService) {
  var caseStudy = {
    basePath: basePath,
    dataService: dataService,
    isCaseStudy: true
  };

  /**
   * Asynchronously loads the case study metadata and other necessary data.
   * @param handler
   */
  caseStudy.load = function (handler) {
    this.loadMetaData(function () {
      this.dataService.initialize(caseStudy, handler);
    });
  };

  /**
   * Load case study data from properly formatted json file.
   * @param handler {function(Object)} Called when loading is complete.
   */
  caseStudy.loadMetaData = function (handler) {
    //console.log(this);
    caseStudy.urlBase = "src/data/" + this.basePath + "/";
    d3.json(caseStudy.urlBase + "metadata.json", function (error, json) {
      if (error) {
        throw new Error("Error loading metadata.json in " + caseStudy.urlBase +
          + " in caseStudy.loadMetaData(). " + error);
            //+ JSON.parse(error.responseText).error.join("; "));
      }

      for (var attr in json) {
        if (json.hasOwnProperty(attr)) caseStudy[attr] = json[attr];
      }
      caseStudy.dataFrom = moment.utc(caseStudy.dataFrom);
      caseStudy.dataTill = moment.utc(caseStudy.dataTill);
      caseStudy.defaultFocusFrom = moment.utc(caseStudy.defaultFocusFrom);

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

      console.info("Loaded case study", caseStudy.label);
      handler.call(caseStudy);
    });
  };

  /**
   * Loads the data for the given focus.
   * @param focus    {enram.focus}
   * @param handler  {function(dataObject)}  called when the data is loaded
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

  caseStudy.getProjection = function (caseStudy, mapWidth, mapHeight) {
    console.error("There is no implementation for getProjection in case study '" + basePath + "'.");
  };

  return caseStudy;

};
