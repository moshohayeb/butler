;
(function () {
    "use strict";

    var _ = require('lodash');

    var command
    var commandList;
    var tokens;
    var executable;
    var error = true;

    function dive(currentObject, currentKey) {
        if (!currentKey || !currentObject) return null;
        if (!_.isArray(currentObject))     return null;
        return _.find(currentObject, {'name': currentKey});
    }

    function parse() {
        var currentKey;
        var currentCommand;

        command = currentCommand = commandList;
        while (tokens.length !== 0) {
            currentKey     = tokens.shift();
            currentCommand = dive(currentCommand, currentKey);

            if (!currentCommand) {
                command = null;
                return false;
            }


            if (_.has(currentCommand, 'commands')) {
                currentCommand = currentCommand['commands'];
            } else {
                // we `hopefully` reached a specific command
                executable = true;
                break;
            }
        }

        command = currentCommand;
        return true;
    }

    function getCommandOpts() {
        return _.has(command, 'options') ? command['options'] : [];
    }

    function isPipeable() {
        return _.has(command, 'meta') && _.contains(command['meta'], 'pipeable');
    }

    function getCompleteList() {
        var completions = [];
        if (executable && !_.has(command, 'options')) {
            completions.push({name: '<cr>', help: 'execute command'})
            if (isPipeable())
                completions.push({name: '|', help: 'pipe output to an external command'})
        }

        return completions.length ? completions : command;
    }

    function getRemainingTokens() {
        return _.clone(tokens);
    }

    function getError() {
      return error;
    }

    function getErrorMsg() {
      return 'Unkowen token koar';
    }

    function init(commands, tks) {
        commandList = commands;
        tokens      = _.clone(tks);
        executable  = false;
        command     = null

        var lib                = {};
        lib.parse              = parse;
        lib.getCommandOpts     = getCommandOpts;
        lib.getCompleteList    = getCompleteList;
        lib.isPipeable         = isPipeable;
        lib.getError           = getError;
        lib.getErrorMsg        = getErrorMsg;
        lib.getRemainingTokens = getRemainingTokens;
        return lib;
    }

    module.exports = init;
}.call(this));
