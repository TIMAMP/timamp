# About this visualization

This visualization shows a number of lines -paths- on a geographic map. These paths are meant to give an indication of the migration flows during a certain time window. The user can interactively select the starting date/time and the duration of this time window in the web app. The visualization will be updated accordingly.

This visualization is also meant to expose differences in the migration flows at different altitudes. This is done by aggregating the data in different strata (altitude bands) and drawing separate color coded paths for each strata. The user can interactively select the number of strata to consider.

Each path has a dot as its *head* on one end and a fading *tail* on the other. The head marks the direction in which the migration flows.

The density of the paths is meant to give an indication of the number of birds involved in the represented migration flows. For each radar and for each strata, a number of paths are drawn in the vicinity of that radar. The exact number of path is a function of the average bird density for the concerned radar and strata during the given time window. To be exact, the number of paths for a given radar and strata equals the rounded result of the average bird densities (as birds/kmˆ3) for all observations within the given time window, the given radar and all altitudes within the given strata, multiplied by the height of the strata, yielding a bird density expressed as birds/kmˆ2.

The mid-path anchor point is randomly positioned within a 75 km radius.

The number of paths depends on the average bird density 

Each path consists of a number of segments, one for each 20-minute interval in the shown time window. 

### Future work:

- Currently for each radar independently a number of paths are instantiated at random locations within a certain radius of that radar. As a consequence, there are  too many paths where these circular areas overlap.

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
* __moment__ - better date/time handling
* __d3__ - visualization
* __topojson__ - d3 plugin for drawing topography from topojson data
* __jquery__ - actually only needed for Foundation
* [__file-saver.js__](https://github.com/Teleborder/FileSaver.js)

## Foundation

This app uses Foundation for its responsiveness.
This Foundation is a custom build of v5.5.2 that includes:

* grid
* visibility

The js and css files are maintained in the ./vendor directory.


