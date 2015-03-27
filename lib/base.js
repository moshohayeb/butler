;
(function () {
  "use strict";

  function Base() {
  }

  Base.prototype.STATES   = { ON_NONE: 1, ON_COMMAND: 1, ON_OPTION: 2, ON_PIPE: 3 };
  Base.prototype.complete = function () { return []; };
  Base.prototype.parse    = function () { return true; };
  Base.prototype.validate = function () { return true; };

  module.exports = Base;
}.call(this));
