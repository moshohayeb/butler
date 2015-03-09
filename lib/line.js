;
(function () {
    "use strict";
    var _ = require('lodash');

    var utility = require('./utility');
    var Option  = require('./option');
    var Pipe    = require('./pipe');
    var Command = require('./command');

    var commandList;

    var partialWord;
    var cline;
    var tokens;

    var optsParser;
    var pipeParser;
    var cmdParser;

    function parsePipe() {
        //TODO: better error reporting
        pipeParser = Pipe(tokens, cmdParser, optsParser);
        pipeParser.parse();
        return true;
    }

    function parseOpts() {
        // TODO: Report error on invalid opts (after actually storing them)
        optsParser = Option(tokens, cmdParser);
        optsParser.parse();
        tokens     = optsParser.getRemainingTokens();
        return true;
    }

    function parseCmd() {
        //TODO: better error reporting
        cmdParser = Command(commandList, tokens);
        cmdParser.parse();
        tokens    = cmdParser.getRemainingTokens();
        return true;
    }

    function parse() {
        // no reason to continue on failure TODO: better error reporting
        parseCmd();
        parseOpts();
        parsePipe();
    }

    function getCompList() {
        var list;
        var commandCompletion = cmdParser.getCompList();
        var optionCompletion  = optsParser.getCompList();
        var pipeCompletion    = pipeParser.getCompList();

        function sanitaize(list) {
            if (_.isArray(list) && list.length > 0) return list;
            return null;
        }

        if (_.last(cline) === '|') return [{name: '|', help: 'pipe to cmd'}];

        pipeCompletion    = sanitaize(pipeCompletion);
        optionCompletion  = sanitaize(optionCompletion);
        commandCompletion = sanitaize(commandCompletion);

        list = pipeCompletion || optionCompletion || commandCompletion;
        list = utility.transform(list);

        // filter on partial if partial is not a query char
        if (partialWord && !_.contains(['?', '|'], partialWord)) {
            list = _.filter(list, function (c) {
                return _.startsWith(c.name, partialWord)
            });
        }

        return list;
    }

    function init(currentLine, commandTree) {
        commandList = commandTree;
        cline       = currentLine;
        tokens      = _.words(cline, /[^ ]+/g);
        partialWord = _.last(cline) !== ' ' ? tokens.pop() : null;

        var lib         = {};
        lib.parse       = parse;
        lib.getCompList = getCompList;
        return lib;
    }

    module.exports = init;
}.call(this));


