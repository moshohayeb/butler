;
(function () {
    "use strict";

    var _ = require('lodash');

    var tokens;
    var isPiped;
    var pipeCmd;

    var cmdParser;
    var optsParser;

    var pipeCommands = [
        {name: 'grep', help: 'pipe output to the grep command'},
        {name: 'more', help: 'pipe output to the more command'},
        {name: 'tail', help: 'pipe output to the tail command'}
    ];

    function parse() {
        if (!tokens || tokens.length == 0 || tokens[0] != '|') {
            isPiped = false;
            return false;
        }

        isPiped = true;
        tokens.shift(); // remove pipe char
        pipeCmd = tokens.length >= 1 ? tokens.shift() : '';
    }

    function getCompleteList() {
        var cmds = _.map(pipeCommands, function (c) {
            return c.name
        });

        if (!isPiped)
            return [];

        if (_.includes(cmds, pipeCmd))
            return [{name: '<cr>', help: 'execute command'}];

        return pipeCommands;
    }

    function getRemainingTokens() {
        return _.clone(tokens);
    }

    function init(tks, commandp, optsp) {
        tokens     = _.clone(tks);
        cmdParser  = commandp;
        optsParser = optsp;

        isPiped = false;
        pipeCmd = ''

        var lib                = {};
        lib.parse              = parse;
        lib.getCompleteList    = getCompleteList;
        lib.getRemainingTokens = getRemainingTokens;
        return lib;
    }

    module.exports = init;
}.call(this));
