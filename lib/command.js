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
    var commands;
    var tokens;
    var path;

    this._errorMsg   = '';
    this._errorToken = '';

    path     = '';
    commands = this.context['commands'] || [];
    tokens   = this.context['tokens'] || [];

    this.command = currentCommand = commands;
    while (tokens.length !== 0) {
      currentKey     = tokens.shift();
      currentCommand = dive(currentCommand, currentKey);

      if (!currentCommand) {
        this.command     = null;
        this._errorMsg   = util.format('unknown command: %s', currentKey);
        this._errorToken = currentKey;
        return false;
      }

      if (_.has(currentCommand, 'commands')) {
        currentCommand = currentCommand['commands'];
        path += (currentKey + ' ');
      } else {
        // we `hopefully` reached a specific command
        this.executable = true;
        this.run        = currentCommand.run;
        path += (currentKey + ' ');
        break;
      }
    }

    this.command = currentCommand;
    this.path    = path;

    this.context['pipeable'] = _.contains(currentCommand['meta'], 'pipeable');
    this.context['options']  = _.isArray(currentCommand['options']) ? this.command['options'] : [];
    return true;
  }

  function completes() {
    var completions = [];

    if (this.executable && !_.has(this.command, 'options')) {
      completions.push({name: '<cr>', help: 'execute command'})
      if (this.isPipeable())
        completions.push({name: '|', help: 'pipe output to an external command'})
    }

    return completions.length ? completions : this.command;
  }

  function validate() {
    var path = _.trim(this.path);
    // check that the command is valid
    if (!this.executable) {
      this._errorMsg = util.format('incomplete command `%s`', path);
      return false;
    }

    // check that there is a run context for the command
    if (!_.isFunction(this.run)) {
      this._errorMsg = util.format('command `%s` has no runnable context', path);
      return false;
    }

    return true;
  }

  function Command(context) {
    if (!(this instanceof Command)) {
      return new Command(context);
    }

    this.context = context;

    this.parse     = parse;
    this.validate  = validate;
    this.completes = completes;
  }

  Command.prototype = new Base();
  module.exports    = Command;
}.call(this));
