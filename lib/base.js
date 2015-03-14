;
(function () {
  "use strict";

  function Base() {
  }

  Base.prototype.getCompleteList = function () {
    return [];
  }

  Base.prototype.parse = function () {
    return;
  }

  module.exports = Base;
}.call(this));
