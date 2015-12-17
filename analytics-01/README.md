<h1>Enram Analytics</h1>

**Author: Wouter Van den Broeck**

[toc]

# Introduction

This project builds on [Angular-UI Bootstrap][1], which provides native [AngularJS][3] directives for [Bootstrap][2]. The build set-up is derived from the [Foundation for Apps][6] template (version: sept 21, 2015).

# Prerequisites

You'll need the following software installed to get started.

- [Node.js](http://nodejs.org) – Use the [installer](https://nodejs.org/en/download/) for your OS.
- [Gulp][4] – This depedency is required in the `./package.json` and thus installed by _npm_, but It is probably best to install it globally by running the following command: `npm install -g gulp`. Depending on how Node is configured on your machine, you may need to run `sudo npm install -g gulp` instead, if you get an error with the first command.
- [SASS][5] – See the [instructions](http://sass-lang.com/install) to install SASS on your system.
- Git – command line [Git](http://git-scm.com/downloads) or the convenient [SourceTree](https://www.sourcetreeapp.com/) app.

# Building the app

The client source code (HTML, JS, CSS, ...) is maintained in the `./client/` directory.
The publishable code is constructed in the `build` directory.
While you're working on your project, run:

```bash
npm start
```

This will:

- Compile the LESS/SASS files.
- Concatenate the client JS files in `app.js`.
- Copy all necessary files to `./build/`.
- Open the (built) app in a browser.
- Start a filechange watcher that recompiles the build and reloads the browser when source files are modified.

# Dependencies

Npm is used for managing 3rd-party dependencies. The npm configuration is specified in the file `./package.json` while the packages are located in the directory `./node_modules/`. The file `./npm-debug.log` contains npm related debug/log messages.

## Development dependencies

The development setup depends on the following libraries and tools:

- [Gulp][4] – Build tool.
- [SASS][5] – CSS extension language and compiler.
- [Front Router](https://github.com/zurb/front-router) – Simplifies the creation of routes in AngularJS by allowing you to define them directly in your view templates.

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

## Client dependencies

This project depends on the following framework libraries:

- Bootstrap's CSS
- [AngularJS][3]
- [Angular UI Bootstrap][1] – Note that npm has the more recent version 0.14.3 (on 7 nov, '15') and we will be using that version.
- [Angular Animate](http://www.nganimate.org/) – For transitions and animations, such as the accordion, carousel, etc.
- [Angular-UI Router](https://github.com/angular-ui/ui-router) – Simplifies  routing.

This project additionally depends on the following problem solvers:

- [html5shiv](https://github.com/afarkas/html5shiv) – Enables use of HTML5 sectioning elements in legacy Internet Explorer and provides basic HTML5 styling for Internet Explorer 6-9, Safari 4.x (and iPhone 3.x), and Firefox 3.x.
- [Respond.js](https://github.com/scottjehl/Respond) – A fast & lightweight polyfill for min/max-width CSS3 Media Queries (for IE 6-8, and more).
- [FastClick](https://github.com/ftlabs/fastclick) – Eliminates the 300ms delay between a physical tap and the firing of a click event on mobile browsers, thus making the application feel less laggy and more responsive while avoiding any interference with your current logic.

This project finally also depends on a number of components:

- [D3][7] – A JavaScript library for manipulating documents based on data.
- [TopoJSON](https://github.com/mbostock/topojson/wiki)
- [Moment](http://momentjs.com/) – Parse, validate, manipulate, and display dates in JavaScript.
- [HUSL](https://github.com/husl-colors/husl) – Human-friendly HSL, canonical implementation.

# Development notes

## Bootstrap

This project uses [Angular-UI Bootstrap][1]. This library provides a version of Bootstrap that integrates nicely in Angular. It provides a set of directives that use Bootstrap. It does not, however, use the standard Bootstrap javascript code. The upside is that it does not depend on JQuery. However, the regular Bootstrap styles to get interactive elements such as drop down menus cannot be used. You need to use specific directives instead. The following resources provide more information:

- [UI Bootstrap documentation][1]
- Templates in the [source code](https://github.com/angular-ui/bootstrap), in particular: `./misc/demo/index.html`. Note that these are not included in the _npm_ distribution.

	
## Fonts

The default font is [Open Sans](https://www.google.com/fonts/specimen/Open+Sans). This font is loaded from [Google Fonts](https://www.google.com/fonts).
The project loads the Latin set for the following font weights:

- Open Sans Regular (400)
- Open Sans Regular Italic (400)
- Open Sans Semi-Bold (600)
- Open Sans Bold (700)

The following custom SASS mixins are provided in `./client/scss/app.scss`. These mixing take the _font-size_ as first argument.

- `@include open-sans-regular(20px);`
- `@include open-sans-semibold(20px);`
- `@include open-sans-bold(20px);`

# Exposé API

## appCtrl – the main controller

The `reportError()` method returns the modal instance returned by the `open` method of the [uibModal service](https://angular-ui.github.io/bootstrap/#/modal). The `result` property of this modal instance is a promise that is resolved when the modal is closed (OK button) or rejected when a modal is dismissed (Cancel button). Handlers can be added by calling the `then` method of this promise, like in the following example.

```
reportError("Title", "Message.", true)
  .result.then(function (result) {
    $log.info("Modal closed: " + result);
  }, function (reason) {
    $log.info("Modal dismissed: " + reason);
});
```

# To consider

- [Angular Touch](https://docs.angularjs.org/api/ngTouch) – The ngTouch module provides touch events and other helpers for touch-enabled devices. The implementation is based on jQuery Mobile touch event handling (jquerymobile.com).


[1]: http://angular-ui.github.io/bootstrap/
[2]: http://getbootstrap.com
[3]: https://angularjs.org
[4]: http://gulpjs.com
[5]: http://sass-lang.com
[6]: http://foundation.zurb.com/apps/
[7]: http://d3js.org
