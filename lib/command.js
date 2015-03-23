// command object has the following keys
// name: string (required)
// help: string (optional)
// meta: array (optional)
//       -> ['pipeable']
// run: function (optional)

// commands: array (optional)
//       If it has subcommands
//       or ...
// options: array (optional)
//       If it has options (modifiers). See option.js
;
(function () {
  "use strict";

  var _ = require('lodash');
  var util = require('util');

  var Base = require('./base');

  function dive(currentObject, currentKey) {
    if (!currentKey || !currentObject) return null;
    if (!_.isArray(currentObject))     return null;
    return _.find(currentObject, { 'name': currentKey });
  }

  function cleanupCommand(command) {
    // options and commands are mutually exclusive
    // if neither is present then it is a final command
    var nCommand = {}
    var recursiveDeep = function (cmd) { return cleanupCommand(cmd) }

    if (_.isArray(command)) {
      var rv = _.map(command, recursiveDeep);
      return _.compact(rv);
    }

    if (!_.isString(command.name)) return null;

    nCommand.name = command.name;
    nCommand.help = _.isString(command.help) ? command.help : '';

    if (_.has(command, 'commands')) {
      // subcommand tree
      nCommand.commands = _.map(command.commands, recursiveDeep);
    } else {
      // final command
      nCommand.options = _.isArray(command.options) ? command.options : [];
      nCommand.meta = _.isArray(command.meta) ?
        command.meta :
        (_.isString(command.meta) ? [command.meta] : []);
      nCommand.run = _.isFunction(command.run) ? command.run : function () { throw new Error('Not Yet Implemented'); };
    }

    return nCommand;
  }

  function parse() {
    var currentKey;
    var currentCommand;
    var commands;
    var tokens;
    var path;

    this._errorMsg = '';
    this._errorToken = null;

    path = '';
    commands = _.isArray(this.context.commands) ?
      this.context.commands : [this.context.commands];
    tokens = this.context.tokens || [];

    this.command = currentCommand = cleanupCommand(commands);
    while (tokens.length !== 0) {
      currentKey = tokens.shift();
      currentCommand = dive(currentCommand, currentKey);

      if (!currentCommand) {
        this.command = null;
        this._errorMsg = util.format('unknown command: %s', currentKey);
        this._errorToken = currentKey;
        return false;
      }

      path += (currentKey + ' ');
      if (_.has(currentCommand, 'commands')) {
        currentCommand = currentCommand['commands'];
      } else {
        // we `hopefully` reached a specific command
        this.executable = true;
        this.runnable = currentCommand.run;
        break;
      }
    }

    this.command = currentCommand;
    this.path = path;

    this.context.pipeable = _.contains(currentCommand['meta'], 'pipeable');
    this.context.options = _.isArray(currentCommand['options']) ? this.command['options'] : [];
    return true;
  }

  function complete() {
    var completions = [];

    if (this.executable) {
      completions.push({ name: '<cr>', help: 'execute command', completeOn: false });
      if (this.context.pipeable)
        completions.push({ name: '|', help: 'pipe output to an external command' })
    }

    return completions.length ? completions : this.command;
  }

  function validate() {
    var path = _.trim(this.path);
    // check that the command is valid
    if (!this.executable) {
      this._errorMsg = util.format('incomplete command `%s`', path);
      this._errorToken = null;
      return false;
    }

    // check that there is a run context for the command
    if (!_.isFunction(this.runnable)) {
      this._errorMsg = util.format('command `%s` has no runnable context', path);
      return false;
    }

    return true;
  }

  function run() {
    var runnable = this.runnable;
    return runnable(this.context.store);
  }

  function Command(context) {
    if (!(this instanceof Command)) {
      return new Command(context);
    }

    this.context = context;

    this.parse = parse;
    this.validate = validate;
    this.complete = complete;
    this.run = run;
  }

  Command.prototype = new Base();
  module.exports = Command;
}.call(this));
