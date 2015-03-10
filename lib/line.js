;
(function () {
    "use strict";
    var util = require('util');
    var _ = require('lodash');

    var utility = require('./utility');

    var Base    = require('./base');
    var Option  = require('./option');
    var Pipe    = require('./pipe');
    var Command = require('./command');

    var commandList;

    var partialWord;
    var cline;
    var tokens;
    var error;

    var optsParser;
    var pipeParser;
    var cmdParser;

    function parsePipe() {
        pipeParser = Pipe(tokens, cmdParser, optsParser);
        pipeParser.parse();
        tokens = pipeParser.getRemainingTokens();
        return pipeParser;
    }

    function parseOpts() {
        optsParser = Option(tokens, cmdParser);
        optsParser.parse();
        tokens     = optsParser.getRemainingTokens();
        return optsParser;
    }

    function parseCmd() {
        cmdParser = Command(commandList, tokens);
        cmdParser.parse();
        tokens    = cmdParser.getRemainingTokens();
        return cmdParser;
    }

    function parse() {
        var rvcmd = parseCmd();
        var rvopt = parseOpts();
        var rvpip = parsePipe();
    }

    function getCompleteList() {
        var list;
        var commandCompletion = cmdParser.getCompleteList();
        var optionCompletion  = optsParser.getCompleteList();
        var pipeCompletion    = pipeParser.getCompleteList();

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

    function getErrorMsg() {

    }

    function Line(currentLine, commandTree) {
        if (!(this instanceof Line)) {
          return new Line(currentLine, commandTree);
        }

        commandList = commandTree;
        cline       = currentLine;
        tokens      = _.words(cline, /[^ ]+/g);
        partialWord = _.last(cline) !== ' ' ? tokens.pop() : null;

        this._error      = true;

        this.parse       = parse;
        this.getErrorMsg = function() {return 'just error'}
        this.getCompleteList = getCompleteList;
    }

    Line.prototype = new Base();
    module.exports = Line;
}.call(this));


