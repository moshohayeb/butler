;
(function () {
    "use strict";

    function Base() { }

    Base.prototype.getError = function() { return this._error; };

    module.exports = Base;
}.call(this));
