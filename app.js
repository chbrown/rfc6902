/*jslint browser: true, esnext: true */
import {applyPatch, createPatch} from 'rfc6902';
// angular annotation doesn't work with `import ...` syntax
var angular = require('angular');
import 'ngstorage';
import 'flow-copy';

angular.module('app', [
  'ngStorage',
  'flow-copy',
])
.directive('json', () => {
  return {
    restrict: 'E',
    template: `
      <textarea ng-model="raw" ng-change="change()" ng-blur="blur()" ng-class="className"></textarea>
      <div ng-if="model.$valid" class="valid">Valid JSON</div>
      <div ng-if="model.$invalid" class="invalid">Invalid JSON: {{error}}</div>
    `,
    scope: {},
    require: 'ngModel',
    link: (scope, el, attrs, ngModel) => {
      scope.model = ngModel;

      scope.className = attrs.class;

      // scope.raw.viewChangeListeners = [];
      scope.change = () => {
        ngModel.$setViewValue(scope.raw);
      };

      ngModel.$parsers = [(string) => {
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

      ngModel.$render = () => {
        // just set the textarea to the JSON, but only if the current raw value is valid JSON
        if (ngModel.$valid) {
          scope.raw = angular.toJson(ngModel.$modelValue, true);
        }
      };
    }
  };
})
.controller('demoCtrl', ($scope, $localStorage) => {
  $scope.$storage = $localStorage.$default({
    createPatch: {
      input: {"name": "Chris Brown", "repositories": ["amulet", "flickr-with-uploads"]},
      output: {"name": "Christopher Brown", "repositories": ["amulet", "flickr-with-uploads", "rfc6902"]},
    },
    applyPatch: {
      original: {"name": "Chris Brown", "repositories": ["amulet", "flickr-with-uploads"]},
      patch: [
        {"op": "replace", "path": "/name", "value": "Christopher Brown"},
        {"op": "add", "path": "/repositories/-", "value": "rfc6902"}
      ],
    },
  });
  $scope.createPatch = {patch: []};
  $scope.applyPatch = {output: null};

  $scope.$watchGroup(['$storage.createPatch.input', '$storage.createPatch.output'], () => {
    var input = $scope.$storage.createPatch.input;
    var output = $scope.$storage.createPatch.output;
    $scope.createPatch.patch = createPatch(input, output);
  });

  $scope.$watchGroup(['$storage.applyPatch.original', '$storage.applyPatch.patch'], () => {
    $scope.applyPatch.output = angular.copy($scope.$storage.applyPatch.original);
    applyPatch($scope.applyPatch.output, $scope.$storage.applyPatch.patch);
  });

  $scope.copy = () => {
    $scope.$storage.applyPatch.original = $scope.$storage.createPatch.input;
    $scope.$storage.applyPatch.patch = $scope.createPatch.patch;
  };
});
