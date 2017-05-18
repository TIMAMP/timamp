<h1>TIMAMP v2</h1>

[toc]

# Introduction

This project offers a web-based data visualization of bird migration data. See below more details about the visualization.

# Development Notes

## Prerequisites

To edit this project, you will need the following software:

- [Node.js][1] – Use the [installer](https://nodejs.org/en/download/) for your OS.
- [Gulp][4] – This depedency is required in the `./package.json` and thus installed by _npm_, but It is probably best to install it globally by running the following command: `npm install -g gulp`. Depending on how Node is configured on your machine, you may need to run `sudo npm install -g gulp` instead, if you get an error with the first command.

## Building the app

The source code (HTML, JS, CSS, ...) is maintained in the `./src/` directory.
The build website consists of html files in the project's root directory (`v2`) and js/css and other assets in the `./assets` directory.
The website is published as GitHub ghpages.

To build the project, run:

```bash
npm start
```

This will:

- concatenate and minify the client js-files in `./assets/js/app.js`;
- concatenate and minify the vendor css-files in `./assets/css/vendor.css`;
- concatenate and minify the vendor js-files in `./assets/js/vendor.js`;
- copy all asset files to `./assets/...`;
- open the (built) app in a browser; and
- start a file-change watcher that recompiles the build and reloads the browser when source files are modified.

## Dependencies

Npm is used for managing 3rd-party dependencies. The npm configuration is specified in the file `./package.json` while the packages are located in the directory `./node_modules/`. The file `./npm-debug.log` contains npm related debug/log messages.

### Development dependencies

The development setup depends on the following libraries and tools:

- [Gulp][4] – Build tool

And a number of Gulp extensions:

- gulp-autoprefixer
- gulp-concat
- gulp-if
- gulp-load-plugins
- gulp-ng-html2js
- gulp-sass
- gulp-sourcemaps
- gulp-uglify
- gulp-webserver
- rimraf – Deleting folders.
- run-sequence
- yargs

### Client dependencies

This project depends on the following framework libraries:

- Foundation – See below for more details.
- [D3][7] – A JavaScript library for manipulating documents based on data.
- jquery – This is (only) needed for Foundation.
- [Moment](http://momentjs.com/) – Parse, validate, manipulate, and display dates in JavaScript.
- [Numeral.js](http://numeraljs.com/) – A javascript library for formatting and manipulating numbers.
- [Seedrandom.js](https://github.com/davidbau/seedrandom) – Seeded random number generator for JavaScript.
- [TopoJSON](https://github.com/mbostock/topojson/wiki) – D3 plugin for drawing topography from topojson data.

This project additionally depends on the following problem solvers:

- [FastClick](https://github.com/ftlabs/fastclick) – Eliminates the 300ms delay between a physical tap and the firing of a click event on mobile browsers, thus making the application feel less laggy and more responsive while avoiding any interference with your current logic.

### Foundation

This app uses Foundation for its responsiveness.
This Foundation is a custom build of v5.5.2 that includes:

* grid
* visibility

The js and css files are maintained in the `./vendor` directory.

## Module system

The client code is organized in a set of modules that have no outside dependencies except those injected in the constructor function. The only exception is jsonDataService in jsonDataService.js. Each module is conceived to represent a 'service' that provides a number of functions. Each module is provided as a constructor function, which should be called with the dependent modules. These constructor functions have names with a trailing underscore.

# About this visualisation

Flow visualization techniques are commonly used to visualize vector fields in various domains of science and engineering. Using these techniques to visualize the migration data entails the interpretation of this data in terms of a sparsely sampled vector field. Each sample is a point-vector pair with the point being the location of the radar and the vector being the migrant velocity (the u and v components). Given these sparse samples, the complete vector field can be reconstructed by means of interpolation. The migrant density data can similarly be interpreted as a sparse scattered scalar field on the basis of which a complete scalar field can be reconstructed using interpolation. Both the velocity vector field and the density scalar field are time dependent.

This visualization uses a local flow visualization technique based on particle tracing (Weiskopf and Erlebacher, 2005). It shows a number of pathlines, which trace particles through the dynamic vector field, keeping integration time in sync with vector field time. This allows changes in both the spatial and temporal dimensions to be shown in a single static visualization.

The resulting static visualization is meant to provide a holistic picture of the spatial and temporal variation in migration activity during a period of one to eight hours. To this end it shows a number of pathlines on a geographic map. Each pathline represents the expected travel path of an imaginary swarm of average migrants during the selected time period. This visualization does thus not show the travel paths of actual migrants but rather describes average migration patterns based on the data detailed in the previous sections.
The user can interactively select the starting date/time and the duration (in hours) of the visualized time period. The user can also select the number of strata the full altitude range (0–4000 m) is divided into. For each strata a separate set of pathlines is drawn with a different color, using the aggregated migrant density and velocity data within that strata. This enables the user to get a picture of the variation of the migration patterns at different altitudes. The color-strata correspondence can be found in the color legend.

Each pathline represents a number of migrants. This number can be set by the user. The number of pathlines shown in a visualization corresponds approximately to the average number of migrants observed during the selected time period divided by the number of migrants each pathline represents. Their spatial distribution is corresponds to the spatial distribution of the average migrant densities during the selected time period. The pathlines are instantiated by considering potential anchor points from a matrix with 10 by 10 km intervals, that lie within a 75 km radius around one of the radars. For each of these anchor points, a pathline is instantiated with a probability equal to the estimate migrant count for that anchor point divided by the number of migrants each pathline represents. The estimate migrant count for an anchor is calculated using the averaged migrant density at that anchor's position, the anchor area (10 by 10 km) and the height of the strata.

The pathlines are obtained with numerical integration using Euler's method with 20 minute time increments matching the 20 minute time windows used for the temporal aggregation of the samples. The integration proceeds backwards from the anchor point for the first half of these intervals, and forwards from the anchor point for the second half, yielding centrally anchored pathlines. The varying thickness of each pathline reflects the changing migrant density during the selected time period. A dot marks the endpoint of each integration and as such indicates the direction of the migration.

The visualization is implemented as an interactive web application written in HTML, CSS and JavaScript. It loads the same data as the ‘bird migration flow visualization’. The migration densities and velocities are spatially interpolated using inverse distance weighting (Shepard's Method) with power 2, assuming a smooth continuous variation of the conditions that affect the migrant velocities in between these samples, while considering that the sampled values hold for a considerable radius around the radars. The smooth curvature of the resulting pathline shapes is obtained by applying B-spline interpolation using the default tension settings provided in the D3 javascript-library.

## Future work

The reconstruction of the full migration velocity vector field from the sparse scattered data is done using a naive interpolation technique that assumes a smooth continuous variation of the conditions that affect the migrant velocities in between these samples. This assumption can be expected to not correspond with reality due to the impact of geographical features such as mountain ranges or meteorological features such as weather fronts. Knowledge on the impact of such features on migration patterns is, however, currently rather limited. Indeed, large scale migration data collection efforts, such as the one from which the shown data was sourced, can help expand this knowledge, while tailored visualisation techniques, such as the ones discussed here, are meant to facilitate as well as profit from such progress.

The fidelity of the reconstructed migrant density scalar field might benefit from an interpolation approach that takes the correlation with the migrant velocity vector field into account (Streletz ea, 2012).

# Case study metadata json format

For each case study a set of metadata is provided in a json file. This file contains a json 
object with the following properties:

* `label` - Text label.
* `dataFrom` - The first day for which data is available, expressed as an object that can be passed to the moment constructor.
* `dataTill` - The last day for which data is available, expressed as an object that can be passed to the moment constructor.
* `defaultFocusFrom` - The initial focus moment, expressed as an object that can be passed to the moment constructor.
* `minAltitude` - The lowest altitude for which data is available, expressed in meters.
* `maxAltitude` - The highest altitude for which data is available, expressed in meters.
* `strataOptions` - Describes de different possible segmentations in strata. An array of arrays, one for each option. Each option-array contains one or more arrays, one for each stratum. Each stratum-array contains two numbers, the bottom and the ceiling of the stratum expressed in meters.
* `defaultStrataOption` - The default strata option as an index in the `strataOptions`.
* `defaultMigrantsPerPath` - The number of migrants each pathline represents.
* `segmentSize` - The duration of each segment, expressed in minutes.
* `anchorInterval` - The interval between potential anchors, expressed in km.
* `mapCenter` - A list with two elements, the longitude and latitude (in degrees) on which to center the map.
* `mapScaleFactor` - The factor with which the map-width needs to be multiplied to get the map scaling.
* `scaleLegendMarkers` - The markers to be shown in the scale legend.
* `topoJsonUrl` - [Optional] The url of the TopoJson file used for the base map. Default to `urlBase + "topo.json"`.
* `radars` - Array with objects, one for each radar, containing the following properties:
    * `id` - The unique id.
    * `name` - Text label (optional).
    * `country` - country code (currently unused)
    * `type` - type tag (currently unused)
    * `longitude` - expressed as a decimal degrees value
    * `latitude` - expressed as a decimal degrees value

# References

- __[Darmofal_96a]__ _An Analysis of 3D Particle Path Integration Algorithms._ Darmofal, D. L. Journal of Computational Physics 123, 182–195 .
- __[Shepard_68a]__ _A two-dimensional interpolation function for irregularly-spaced data._ Shepard, Donald. Proceedings of the 1968 23rd ACM national conference, ACM. 1968.
- __[Streletz_12a]__ _Interpolating Sparse Scattered Oceanographic Data Using Flow Information._ Streletz, G. J., Gebbie, G., Spero, H. J., Kreylos, O., Kellogg, L. H. & Hamann, B. Dec 2012.
- __[Weiskopf_05a]__ _Overview of flow visualization._ Weiskopf, D. & Erlebacher, G. The Visualization Handbook (eds C. D. Hansen & C. R. Johnson), pp. 261-278. Elsevier Butterworth-Heinmann, Burlington, 2005.

[1]: http://nodejs.org
[4]: http://gulpjs.com
[5]: http://sass-lang.com
[6]: http://foundation.zurb.com/apps/
[7]: http://d3js.org
