;
(function () {
  "use strict";

  var _ = require('lodash');

  function Base() {
  }

  Base.prototype.getRemainingTokens = function () {
    return _.clone(this.tokens);
  }

  Base.prototype.getCompleteList = function () {
    return [];
  }

  Base.prototype.parse = function () {
    return;
  }

  module.exports = Base;
}.call(this));
