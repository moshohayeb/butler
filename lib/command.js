;
(function () {
  "use strict";

  var _    = require('lodash');
  var util = require('util');

  var Base = require('./base');

  function dive(currentObject, currentKey) {
    if (!currentKey || !currentObject) return null;
    if (!_.isArray(currentObject))     return null;
    return _.find(currentObject, {'name': currentKey});
  }

  function parse() {
    var currentKey;
    var currentCommand;

    this.commandPath = '';
    this._errorMsg   = '';
    this._errorToken = '';

    this.command = currentCommand = this.commands;
    while (this.tokens.length !== 0) {
      currentKey     = this.tokens.shift();
      currentCommand = dive(currentCommand, currentKey);

      if (!currentCommand) {
        this.command     = null;
        this._errorMsg   = util.format('unknown command: %s', currentKey);
        this._errorToken = currentKey;
        return false;
      }

      if (_.has(currentCommand, 'commands')) {
        currentCommand = currentCommand['commands'];
        this.commandPath += (currentKey + ' ');
      } else {
        // we `hopefully` reached a specific command
        this.executable = true;
        this.commandPath += (currentKey + ' ');
        break;
      }
    }

    this.command = currentCommand;
    return true;
  }

  function getCommandOpts() {
    return _.isArray(this.command['options']) ? this.command['options'] : [];
  }

  function isPipeable() {
    return _.contains(this.command['meta'], 'pipeable');
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

  function validate() {
    // check that the command is valid

    if (!this.executable) {
      this._errorMsg = util.format('incomplete command `%s`', _.trim(this.commandPath));
    }
    return this.executable;
  }

  function Command(commands, tokens) {
    if (!(this instanceof Command)) {
      return new Command(commands, tokens);
    }

    this.commands    = commands;
    this.tokens      = _.clone(tokens);
    this.executable  = false;
    this.command     = null
    this.commandPath = ''

    this.parse           = parse;
    this.getCompleteList = getCompleteList;
    this.getCommandOpts  = getCommandOpts;
    this.isPipeable      = isPipeable;
    this.validate        = validate;
  }

  Command.prototype = new Base();
  module.exports    = Command;
}.call(this));
