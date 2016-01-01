// *****************************************************************************
// SETTINGS
// -----------------------------------------------------------------------------

var httpPort = 8103;

// *****************************************************************************
// LIBRARIES
// -----------------------------------------------------------------------------

var gulp     = require('gulp');
var plugins  = require('gulp-load-plugins')();
var argv     = require('yargs').argv;
var rimraf   = require('rimraf');
var sequence = require('run-sequence');

// Check for --production flag
var isProduction = !!(argv.production);

// *****************************************************************************
// PATHS
// -----------------------------------------------------------------------------

var paths = {
  html: [
    './src/*.html'
  ],
  assets: [
    './src/**/*.*',
    '!./src/*.html',
    '!./src/{scss,js,vendor}/**/*.*',
    '!./src/data/**/*.{js,md}'
  ],
  // the client javascript files that should be concatenated in app.js:
  appJS: [
    './src/js/utils.js',
    './src/js/models.js',
    './src/js/gui.js',
    './src/js/jsonDataService.js',
    './src/js/**/*.js',
    './src/data/**/*.js'
  ],
  // library js files that are merged to ./build/js/system.js
  vendorJS: [
    './node_modules/fastclick/lib/fastclick.js',
    './node_modules/moment/moment.js',
    './node_modules/d3/d3.js',
    './node_modules/topojson/topojson.js',
    './node_modules/jquery/dist/jquery.js',
    './node_modules/seedrandom/seedrandom.js',
    './node_modules/numeral/numeral.js',
    './src/vendor/foundation-5.5.2.custom/js/vendor/modernizr.js',
    './src/vendor/foundation-5.5.2.custom/js/foundation.js'
  ],
  // system stylesheets that need to be copied:
  vendorCSS: [
    './src/vendor/foundation-5.5.2.custom/css/normalize.css',
    './src/vendor/foundation-5.5.2.custom/css/foundation.css'
  ]
};

// *****************************************************************************
// 3. TASKS
// -----------------------------------------------------------------------------

// Cleans the build directory
gulp.task('clean', function(cb) {
  rimraf('{./*.html,./assets}', cb);
});

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

gulp.task('copy', ['copy:html', 'copy:assets']);

// Copies html files in root:
gulp.task('copy:html', function() {
  return gulp
    .src(paths.html, { base: './src/' })
    .pipe(gulp.dest('.'));
});

// Copies everything else in the assets folder except js, data, sass, etc.
gulp.task('copy:assets', function() {
  return gulp
    .src(paths.assets, { base: './src/' })
    .pipe(gulp.dest('./assets'));
});

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

gulp.task('app', function() {
  var uglify = plugins.if(isProduction, plugins.uglify()
    .on('error', function (e) {
      console.log(e);
    }));
  return gulp.src(paths.appJS)
    .pipe(plugins.sourcemaps.init())
    .pipe(plugins.concat('app.js'))
    .pipe(uglify)
    .pipe(plugins.sourcemaps.write('.'))
    .pipe(gulp.dest('./assets/js/'));
});

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

gulp.task('vendor', ['vendor:css', 'vendor:js']);

gulp.task('vendor:css', function () {
  return gulp.src(paths.vendorCSS)
    .pipe(plugins.sourcemaps.init())
    .pipe(plugins.concat('vendor.css'))
    .pipe(plugins.sourcemaps.write('.'))
    .pipe(gulp.dest('./assets/css/'));
});

gulp.task('vendor:js', function() {
  var uglify = plugins.if(isProduction, plugins.uglify()
    .on('error', function (e) {
      console.log(e);
    }));
  return gulp.src(paths.vendorJS)
    .pipe(plugins.sourcemaps.init())
    .pipe(plugins.concat('vendor.js'))
    .pipe(uglify)
    .pipe(plugins.sourcemaps.write('.'))
    .pipe(gulp.dest('./assets/js/'));
});

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

// Starts a test server, which you can view at http://localhost:httpPort
gulp.task('server', ['build'], function() {
  return gulp.src('.')
    .pipe(plugins.webserver({
      port: httpPort,
      host: 'localhost',
      fallback: 'index.html',
      livereload: true,
      open: true
    }));
});

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

// Builds your entire app once, without starting a server
gulp.task('build', function(cb) {
  sequence('clean', ['copy', 'vendor', 'app'], cb);
});

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

// Default task: builds your app, starts a server, and recompiles assets when they change
gulp.task('default', ['server'], function () {
  // Watch app JavaScript
  gulp.watch(['./src/js/**/*.*', './src/data/**/*.js'], ['app']);

  // Watch static files
  gulp.watch(['./src/**/*.*', '!./src/{js,vendor}/**/*.*', '!./src/data/**/*.js'], ['copy']);

  // Watch vendor files
  gulp.watch(['./src/vendor/**/*.*'], ['vendor']);
});

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
