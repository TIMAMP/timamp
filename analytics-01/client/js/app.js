(function() {
  'use strict';

  //console.log("loading exposeApp module");

  var app = angular.module('exposeApp', [
    // Angular libraries:
    'ngAnimate',
    //'ngTouch',
    'ui.bootstrap',
    'ui.router',

    // app partials:
    'expose',
    'enram'
  ]);

  /**
   * Configures the app.
   */
  app.config(['$urlRouterProvider', '$locationProvider', '$httpProvider',
    function ($urlRouterProvider, $locationProvider, $httpProvider) {
      //console.log(">> app.config");
      $urlRouterProvider.otherwise('/');

      $locationProvider.html5Mode({
        enabled: false,
        requireBase: false
      });

      $locationProvider.hashPrefix('!');

      FastClick.attach(document.body);

      delete $httpProvider.defaults.headers.common['X-Requested-With'];
    }]);

  /**
   * Start the application.
   */
  app.run(function () {
    //console.log(">> app.run");
  });

  /**
   * Settings provider.
   */
  app.factory('settings', ['$log', function ($log) {
    var settings = {};

    // True when the browser supports svg.
    settings.svgSupported = document.implementation.hasFeature("http://www.w3.org/TR/SVG11/feature#Image", "1.1");

    // True when interface animations are enabled.
    settings.animationsEnabled = false;

    // The duration in hours of the focus interval.
    settings.focusDuration = 24;

    // The number of radar-graphs on one page.
    settings.radarsPerPage = 5;

    return settings;
  }]);

  /**
   * Main app controller.
   */
  app.controller('appCtrl', ['$scope', 'settings', 'enram', '$injector', '$uibModal', '$q', '$log',
    function ($scope, settings, enram, $injector, $uibModal, $q, $log) {
      //console.log(">> app.appCtrl constructor");
      //console.log(us15a);

      /**
       * Show 'LOADING' while loading something and returns a promise that is resolved
       * when the loading is complete.
       *
       * @param loader  A function that performs the loading and that takes a
       *                function as sole argument. This function is called when the
       *                loading is complete.
       */
      $scope.load = (function () {
        var counter = 0; // tracks overlapping calls
        return function (loader) {
          counter++;
          if (counter == 1) {
            // TODO: show 'LOADING' if this is not yet the case
          }
          return $q(function (resolve, reject) {
            loader(
              /* resolve handler */
              function () {
                resolve.apply(this, arguments);
                counter--;
                if (counter == 0) {
                  // TODO: stop show 'LOADING'
                }
              },
              /* reject handler */
              function () {
                reject.apply(this, arguments);
                counter--;
                if (counter == 0) {
                  // TODO: stop show 'LOADING'
                }
              });
          });
        }
      })();

      /** Returns the current focus. */
      function currentFocus() {
        return enram.focus($scope.model.dayOption.moment, settings.focusDuration);
      }

      /**
       * Helper function that load the data for the current focus in the current case study.
       *
       * <p>This function is typically called as follows:</p>
       *
       * <code>loadFocusData().then(function(data) { <handle data> });</code>
       *
       * @return  {promise}
       */
      function loadFocusData() {
        return $scope.load(function (resolve, reject) {
          $scope.model.caseStudy.loadFocusData(currentFocus(), function (data) {
            $scope.model.focusData = data;
            resolve(data);
          });
        });
      }

      /**
       * Sets the currently selected caseStudy.
       *
       * @param caseStudy
       */
      $scope.setCaseStudy = function (caseStudy) {
        if ($scope.model.caseStudy == caseStudy) { return; }
        //$log.info("Selected caseStudy:", caseStudy);
        $scope.model.caseStudy = caseStudy;

        // update the day options:
        var mom = moment(caseStudy.dataFrom).hours(0).minutes(0);
        while (mom.isBefore(caseStudy.dataTill)) {
          $scope.model.dayOptions.push({
            moment: mom,
            label: mom.format("MMM D, 'YY")
          });
          mom = moment(mom).add(24, "hours");
        }
        $scope.model.dayOption = $scope.model.dayOptions[3];

        // Update the radio options:
        var radarCnt = caseStudy.radars.length;
        var radarOption;
        caseStudy.radars.forEach(function (radar, i) {
          if (i % settings.radarsPerPage == 0) {
            var till = Math.min(i + settings.radarsPerPage, radarCnt);
            radarOption = {
              from: i,
              till: till,
              label: "Radars " + (i + 1) + "-" + till
            };
            $scope.model.radarOptions.push(radarOption);
          }
        });
        $scope.model.radarOption = $scope.model.radarOptions[0];

        // load the data:
        loadFocusData().then(function(data) {
          $scope.$broadcast('redrawExpose');
        });
      };

      /**
       * Sets the currently selected dayOption.
       *
       * @param dayOption
       */
      $scope.setDayOption = function (dayOption) {
        if ($scope.model.dayOption == dayOption) { return; }
        //$log.info("Selected dayOption:", dayOption);
        $scope.model.dayOption = dayOption;

        // load the data:
        loadFocusData().then(function(data) {
          $scope.$broadcast('redrawExpose');
        });
      };

      /**
       * Sets the currently selected radarOption.
       *
       * @param radarOption
       */
      $scope.setRadarOption = function (radarOption) {
        if ($scope.model.radarOption == radarOption) { return; }
        //$log.info("Selected radarOption:", radarOption);
        $scope.model.radarOption = radarOption;

        // load the data:
        loadFocusData().then(function(data) {
          $scope.$broadcast('redrawExpose');
        });
      };

      /**
       * Disable/Enable application-wide animations.
       */
      $scope.toggleAnimation = function () {
        $scope.settings.animationsEnabled = !$scope.settings.animationsEnabled;
        $animate.enabled($scope.settings.animationsEnabled);
      };

      /**
       * Opens a modal window with an error message.
       *
       * @param title The title to show in the window.
       * @param message The message to show in the window.
       * @param fatal True when the error is fatal.
       */
      $scope.reportError = function (title, message, fatal) {
        //console.log(">> appCtrl.reportError()");

        var modalScope = $scope.$new();
        modalScope.title = title;
        modalScope.message = message;
        modalScope.showOK = !fatal;
        modalScope.showCancel = false;

        return $uibModal.open({
          scope: modalScope,
          templateUrl: "modalErrorContent.html",
          animation: settings.animationsEnabled,
          keyboard: false,
          backdrop: 'static'
        });
      };

      // The settings are made available in the scope.
      $scope.settings = settings;

      /**
       * The main model object.
       *
       * We're using a model object to avoid scope inheritance problems due to
       * the fact that ng-model directives in a child-scope can create shadowing
       * properties hiding the actual properties in this scope.
       *
       * Model properties:
       * - caseStudies :  The potential case studies.
       * - caseStudy :    The currently selected case study.
       * - radarOptions : The potential radar-sets to show.
       * - radarOption :  The currently selected radar set.
       * - dayOptions :   The potential days to select.
       * - dayOption :    The currently selected day.
       * - focusData :    The currently shown focus data.
       */
      $scope.model = {
        caseStudies: [],
        caseStudy: null,
        radarOptions: [],
        radarOption: null,
        dayOptions: [],
        dayOption: null,
        focusData: null
      };

      // load the case studies:
      $scope.load(function (resolve, reject) {
        var caseStudies = [
          $injector.get('us15a.segmented'),
          $injector.get('us15a.raw')
        ];
        enram.loadCaseStudies(caseStudies, resolve);
      }).then(function (caseStudies) {
        //console.log("Initialised the case studies", caseStudies);
        $scope.model.caseStudies = caseStudies;
        $scope.setCaseStudy(caseStudies[0]);
      });

      // Assert that SVG is supported by the browser:
      if (!settings.svgSupported) {
        var msg = "SVG is not supported in this browser. Please use a recent browser.";
        $log.error(msg);
        $scope.reportError("Unsupported Browser", msg, true);
      }

    }]);

  /**
   * Navbar controller.
   */
  app.controller('navBarCtrl', ['$scope', function ($scope) {
    //console.log(">> app.navBarCtrl constructor");

    /**
     * True when the navbar is collapsed.
     * @type {boolean}
     */
    $scope.isCollapsed = true;

    /**
     * Sets the caseStudy in the appCtrl's scope and collapsed the navbar.
     * @param caseStudy
     */
    $scope.caseStudySelected = function (caseStudy) {
      $scope.setCaseStudy(caseStudy);
      $scope.isCollapsed = true;
    };

    /**
     * Sets the dayOption in the appCtrl's scope and collapsed the navbar.
     * @param dayOption
     */
    $scope.dayOptionSelected = function (dayOption) {
      $scope.setDayOption(dayOption);
      $scope.isCollapsed = true;
    };

    /**
     * Sets the radarOption in the appCtrl's scope and collapsed the navbar.
     * @param radarOption
     */
    $scope.radarOptionSelected = function (radarOption) {
      $scope.setRadarOption(radarOption);
      $scope.isCollapsed = true;
    };

  }]);

})();
