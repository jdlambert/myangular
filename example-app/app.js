angular.module('myExampleApp', [])
    .controller('ExampleController', function() {
        this.counter = 0;
        this.increment = function() {
            this.counter++;
        };
        this.decrement = function() {
            this.counter--;
        };
    });
