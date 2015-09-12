

# Case study metadata json format

For each case study a set of metadata is provided in a json file. This file contains a json 
object with the following properties:

* __label__ - Text label.
* __dateMin__ - The first day for which data is available, expressed as an object that can be passed to the moment constructor.
* __dateMax__ - The last day for which data is available, expressed as an object that can be passed to the moment constructor.
* __dateFocus__ - The initial focus moment, expressed as an object that can be passed to the moment constructor.
* __mapCenter__ - The coordinate (in degrees) on which to center the map.
* __mapScaleFactor__ - The factor with which the map-width needs to be multiplied to get the map scaling.
* __topoJsonUrl__ - The url of the topography data, relative to the app's base.
* __queryTemplateUrl__ - The url of the query template, relative to the app's base.
* __queryBaseUrl__ - The base url for the CartoDB queries, relative to the app's base.
* __colorLegendMarkers__ - The markers to be shown in the color legend. (currently unused)
* __scaleLegendMarkers__ - The markers to be shown in the scale legend.
* __radars__ - Array with objects, one for each radar, containing the following properties:
    * __id__ - The unique id.
    * __name__ 
    * __country__ - country code (currently unused)
    * __type__ - type tag (currently unused)
    * __longitude__ - expressed as a decimal degrees value
    * __latitude__ - expressed as a decimal degrees value
* __altitudes__ - Array with objects, one for each altitude, containing the following properties:
    * __min__ - the minimum of the altitude range
    * __max__ - the maximum of the altitude range
    * __idx__ - the index

# 3rd-Party libraries

Most 3rd-party client libraries are managed through Bower, except for the Foundation library, which is a custom build. See below for more details.

## Bower components

* __modernizr__
* __fastclick__
* __moment__ - beter date/time handling
* __d3__ - visualisation
* __topojson__ - d3 plugin for drawing topography from topojson data
* __jquery__ - actually only needed for Foundation
* [__file-saver.js__](https://github.com/Teleborder/FileSaver.js)

## Foundation

This app uses Foundation for its responsiveness.
This Foundation is a custom build of v5.5.2 that includes:

* grid
* visibility

The js and css files are maintained in the ./vendor directory.


