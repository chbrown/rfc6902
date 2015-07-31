/*jslint browser: true, esnext: true */
import {applyPatch, createPatch} from 'rfc6902';
import angular from 'angular';
import 'ngstorage';

angular.module('app', [
  'ngStorage'
])
.directive('json', function() {
  return {
    restrict: 'E',
    template: `
      <textarea ng-model="raw" ng-change="change()" ng-blur="blur()"></textarea>
      <div ng-if="model.$valid" class="valid">Valid JSON</div>
      <div ng-if="model.$invalid" class="invalid">Invalid JSON: {{error}}</div>
    `,
    scope: {},
    require: 'ngModel',
    link: function(scope, el, attrs, ngModel) {
      scope.model = ngModel;

      // scope.raw.viewChangeListeners = [];
      scope.change = function() {
        ngModel.$setViewValue(scope.raw);
      };

      ngModel.$parsers = [function(string) {
        try {
          var obj = angular.fromJson(string);
          ngModel.$setValidity('jsonInvalid', true);
          return obj;
        }
        catch (exc) {
          scope.error = exc.message.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
          ngModel.$setValidity('jsonInvalid', false);
          // otherwise return the last valid value so that we don't lose the original
          return ngModel.$modelValue;
        }
      }];

      ngModel.$render = function() {
        // just set the textarea to the JSON, but only if the current raw value is valid JSON
        if (ngModel.$valid) {
          scope.raw = angular.toJson(ngModel.$modelValue, true);
        }
      };
    }
  };
})
.controller('createPatchDemo', function($scope, $localStorage) {
  $scope.$storage = $localStorage.$default({
    input: {"name": "Chris Brown", "repositories": ["amulet", "flickr-with-uploads"]},
    output: {"name": "Christopher Brown", "repositories": ["amulet", "flickr-with-uploads", "rfc6902"]},
  });

  function refresh() {
    var input = $scope.$storage.input;
    var output = $scope.$storage.output;
    $scope.patch = createPatch(input, output);
  }

  $scope.$watchGroup(['$storage.input', '$storage.output'], refresh);
})
.controller('applyPatchDemo', function($scope, $localStorage) {
  $scope.$storage = $localStorage.$default({
    original: {"name": "Chris Brown", "repositories": ["amulet", "flickr-with-uploads"]},
    patch: [
      {"op": "replace", "path": "/name", "value": "Christopher Brown"},
      {"op": "add", "path": "/repositories/-", "value": "rfc6902"}
    ],
  });

  function refresh() {
    $scope.output = angular.copy($scope.$storage.original);
    applyPatch($scope.output, $scope.$storage.patch);
  }

  $scope.$watchGroup(['$storage.original', '$storage.patch'], refresh);
});
