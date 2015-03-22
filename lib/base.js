;
(function () {
  "use strict";

  function Base() {
  }

  Base.prototype.complete = function () { return []; }
  Base.prototype.parse    = function () { return true; }
  Base.prototype.validate = function () { return true; }

  module.exports = Base;
}.call(this));
