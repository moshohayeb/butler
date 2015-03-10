;
(function () {
  "use strict";

  var _ = require('lodash');

  var Base = require('./base');

  function dive(currentObject, currentKey) {
    if (!currentKey || !currentObject) return null;
    if (!_.isArray(currentObject))     return null;
    return _.find(currentObject, {'name': currentKey});
  }

  function parse() {
    var currentKey;
    var currentCommand;

    this.command = currentCommand = this.commands;
    while (this.tokens.length !== 0) {
      currentKey     = this.tokens.shift();
      currentCommand = dive(currentCommand, currentKey);

      if (!currentCommand) {
        this.command = null;
        return false;
      }

      if (_.has(currentCommand, 'commands')) {
        currentCommand = currentCommand['commands'];
      } else {
        // we `hopefully` reached a specific command
        this.executable = true;
        break;
      }
    }

    this.command = currentCommand;
    return true;
  }

  function getCommandOpts() {
    return _.has(this.command, 'options') ? this.command['options'] : [];
  }

  function isPipeable() {
    var self = this;
    return _.has(self.command, 'meta') && _.contains(self.command['meta'], 'pipeable');
  }

  function getCompleteList() {
    var completions = [];
    if (this.executable && !_.has(this.command, 'options')) {
      completions.push({name: '<cr>', help: 'execute command'})
      if (this.isPipeable())
        completions.push({name: '|', help: 'pipe output to an external command'})
    }

    return completions.length ? completions : this.command;
  }

  function Command(commands, tokens) {
    if (!(this instanceof Command)) {
      return new Command(commands, tokens);
    }

    this.commands   = commands;
    this.tokens     = _.clone(tokens);
    this.executable = false;
    this.command    = null
    this.error      = false;

    this.parse           = parse;
    this.getCompleteList = getCompleteList;
    this.getCommandOpts  = getCommandOpts;
    this.isPipeable      = isPipeable;
  }

  Command.prototype = new Base();
  module.exports    = Command;
}.call(this));
