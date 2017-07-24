angular.module('myExampleApp', [])
    .component('exampleClicker', {
        controller: function() {
            this.counter = 0;
            this.increment = function() {
                this.counter++;
            }
            this.decrement = function() {
                this.counter--;
            }
        },
        transclude: true,
        controllerAs: 'ctrl',
        template: ` <div>
                        <button ng-click="ctrl.increment()">+</button>
                        CLICKER NUMBER <ng-transclude></ng-transclude>
                        VALUE: {{ctrl.counter}}
                        <button ng-click="ctrl.decrement()">-</button>
                    </div>
                  `
    });
