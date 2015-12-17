//
// Angular-UI-Bootstrap Template Gulpfile

// *****************************************************************************
// SETTINGS
// -----------------------------------------------------------------------------

var httpPort = 8102;

// *****************************************************************************
// LIBRARIES
// -----------------------------------------------------------------------------

var gulp     = require('gulp');
var plugins  = require('gulp-load-plugins')();
var argv     = require('yargs').argv;
var rimraf   = require('rimraf');
var router   = require('front-router');
var sequence = require('run-sequence');

// Check for --production flag
var isProduction = !!(argv.production);

// *****************************************************************************
// PATHS
// -----------------------------------------------------------------------------

var paths = {
  assets: [
    './client/**/*.*',
    '!./client/{scss,js,templates,vendor}/**/*.*',
    '!./client/data/**/*.js'
  ],
  // Sass will check these folders for files when you use @import.
  sass: [
    './client/scss'
  ],
  // the client javascript files that should be concatenated in app.js:
  appJS: [
    './client/js/utils.js',
    './client/js/expose/expose.js',
    './client/js/enram.js',
    './client/js/**/*.js',
    './client/data/**/*.js'
  ],
  // library js files that are merged to ./build/js/system.js
  vendorJS: [
    './node_modules/html5shiv/dist/html5shiv.js',
    './node_modules/respond.js/dest/respond.src.js',
    './node_modules/fastclick/lib/fastclick.js',
    './node_modules/angular/angular.js',
    './node_modules/angular-animate/angular-animate.js',
    //'./node_modules/angular-touch/angular-touch.min.js',
    './node_modules/angular-ui-router/release/angular-ui-router.js',
    './node_modules/angular-ui-bootstrap/ui-bootstrap-tpls.js',
    './node_modules/moment/moment.js',
    './node_modules/d3/d3.js',
    './node_modules/husl/husl.js'
  ],
  // system stylesheets that need to be copied:
  vendorCSS: [
    './node_modules/bootstrap/dist/css/bootstrap.min.css',
    './client/vendor/css/*/*.css'
  ]
};

// *****************************************************************************
// 3. TASKS
// -----------------------------------------------------------------------------

// Cleans the build directory
gulp.task('clean', function(cb) {
  rimraf('./build', cb);
});

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

// Copies everything in the client folder except templates, Sass, and JS
gulp.task('copy', function() {
  return gulp
    .src(paths.assets, { base: './client/' })
    .pipe(gulp.dest('./build'));
});

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

// Copies your app's page templates and generates URLs for them
gulp.task('copy:templates', function() {
  return gulp.src('./client/templates/**/*.html')
    .pipe(router({
      path: 'build/js/routes.js',
      root: 'client'
    }))
    .pipe(gulp.dest('./build/templates'));
});

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

// Compiles Sass
gulp.task('sass', function () {
  return gulp.src('client/scss/app.scss')
    .pipe(plugins.sourcemaps.init())
    .pipe(plugins.sass({
      includePaths: paths.sass,
      outputStyle: (isProduction ? 'compressed' : 'nested'),
      errLogToConsole: true
    }))
    .pipe(plugins.autoprefixer({
      browsers: ['last 2 versions', 'ie 10']
    }))
    .pipe(plugins.sourcemaps.write('.'))
    .pipe(gulp.dest('./build/css/'));
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
    .pipe(gulp.dest('./build/js/'));
});

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

gulp.task('vendor', ['vendorCSS', 'vendorJS']);

gulp.task('vendorCSS', function () {
  return gulp.src(paths.vendorCSS)
    .pipe(plugins.sourcemaps.init())
    .pipe(plugins.concat('vendor.css'))
    .pipe(plugins.sourcemaps.write('.'))
    .pipe(gulp.dest('./build/css/'));
});

gulp.task('vendorJS', function() {
  var uglify = plugins.if(isProduction, plugins.uglify()
    .on('error', function (e) {
      console.log(e);
    }));
  return gulp.src(paths.vendorJS)
    .pipe(plugins.sourcemaps.init())
    .pipe(plugins.concat('vendor.js'))
    .pipe(uglify)
    .pipe(plugins.sourcemaps.write('.'))
    .pipe(gulp.dest('./build/js/'));
});

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

// Starts a test server, which you can view at http://localhost:httpPort
gulp.task('server', ['build'], function() {
  return gulp.src('./build')
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
  sequence('clean', ['copy', 'sass', 'vendor', 'app'], 'copy:templates', cb);
});

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

// Default task: builds your app, starts a server, and recompiles assets when they change
gulp.task('default', ['server'], function () {
  // Watch Sass
  gulp.watch(['./client/scss/**/*'], ['sass']);

  // Watch app JavaScript
  gulp.watch(['./client/js/**/*.*', './client/data/**/*.js'], ['app']);

  // Watch app templates
  gulp.watch(['./client/templates/**/*.html'], ['copy:templates']);

  // Watch static files
  gulp.watch(['./client/**/*.*', '!./client/{templates,scss,js,vendor}/**/*.*'], ['copy']);

  // Watch vendor files
  gulp.watch(['./client/vendor/**/*.*'], ['vendor']);
});

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
