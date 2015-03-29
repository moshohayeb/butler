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

  var _    = require('lodash');
  var util = require('util');

  var utility = require('./utility');
  var Base    = require('./base');

  function dive(currentObject, currentKey) {
    if (!currentKey || !currentObject) return null;
    if (!_.isArray(currentObject))     return null;
    return _.find(currentObject, { 'name': currentKey });
  }

  function cleanUpCommands(command) {
    // options and commands are mutually exclusive
    // if neither is present then it is a command
    var cleanCommand = {};

    if (_.isArray(command)) {
      var rv = _.map(command, cleanUpCommands);
      return _.compact(rv);
    }

    // reject commands that doesn't have a name
    if (!_.isString(command.name)) return null;

    cleanCommand.name = command.name;
    cleanCommand.help = _.isString(command.help) ? command.help : '';

    if (_.isArray(command.commands)) {
      // subcommand tree
      cleanCommand.commands = _.map(command.commands, cleanUpCommands);
    } else {
      // final command
      cleanCommand.options = _.isArray(command.options) ? command.options : []; // options will be sanitzed in options component
      cleanCommand.meta = _.isArray(command.meta) ?
        command.meta :
        (_.isString(command.meta) ? [command.meta] : []);
      cleanCommand.run  = _.isFunction(command.run) ? command.run : function () { throw new Error('Not Yet Implemented'); };
    }

    return cleanCommand;
  }

  function validate() {
    var path = _.trim(this.path);
    // check that the command is valid
    if (!this.executable) {
      this._errorMsg   = util.format('incomplete command `%s`', path);
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

  function parse() {
    var currentKey;
    var currentCommand;
    var blueprint;
    var tokens;
    var path;
    var options;

    this._errorMsg   = '';
    this._errorToken = null;

    blueprint = this.context.blueprint;
    tokens    = this.context.tokens;
    path      = '';

    this.blueprint = currentCommand = cleanUpCommands(blueprint);
    while (tokens.length !== 0) {
      this.context.state = this.STATES.ON_COMMAND;
      currentKey         = tokens.shift();
      currentCommand     = dive(currentCommand, currentKey);

      if (!currentCommand) {
        this.command     = null;
        this._errorMsg   = util.format('unknown command: %s', currentKey);
        this._errorToken = currentKey;
        return false;
      }

      path += (currentKey + ' ');
      if (_.isArray(currentCommand.commands)) {
        currentCommand = currentCommand.commands;
        continue;
      } else {
        // we `hopefully` reached a specific command
        this.executable = true;
        this.runnable   = currentCommand.run;
        options         = currentCommand.options;
        break;
      }
    }

    this.command = currentCommand;
    this.path    = path;

    // augment context for other components
    this.context.pipeable = _.contains(currentCommand.meta, 'pipeable');
    this.context.options  = _.isArray(options) ? options : [];
    return true;
  }

  function complete() {
    var pipeCommand = this.context.pipeable;

    if (this.executable) {
      var completions = [];
      completions.push(this.CR);
      completions.push(pipeCommand ? this.PIPE : null);
      return completions;
    }

    return this.command;
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

    this.validate = validate;
    this.parse    = parse;
    this.complete = complete;
    this.run      = run;
  }

  Command.prototype = new Base();
  module.exports    = Command;
}.call(this));
