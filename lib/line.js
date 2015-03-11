;
(function () {
  "use strict";
  var _ = require('lodash');

  var utility = require('./utility');

  var Base    = require('./base');
  var Option  = require('./option');
  var Pipe    = require('./pipe');
  var Command = require('./command');

  function parseCmd() {
    this.cmdParser = Command(this.commands, this.tokens);
    if (!this.cmdParser.parse()) return false;
    this.tokens    = this.cmdParser.getRemainingTokens();
    return true;
  }

  function parseOpts() {
    var cmd         = this.cmdParser;
    this.optsParser = Option(cmd.getCommandOpts(), this.tokens, cmd.isPipeable());
    if (!this.optsParser.parse()) return false;
    this.tokens     = this.optsParser.getRemainingTokens();
    return true;
  }

  function parsePipe() {
    this.pipeParser = Pipe(this.tokens);
    if (!this.pipeParser.parse()) return false;
    this.tokens     = this.pipeParser.getRemainingTokens();
    return true;
  }

  function parse() {
    var rv;

    rv = parseCmd.call(this);
    if (!rv) return false;

    rv = parseOpts.call(this);
    if (!rv) return false;

    rv = parsePipe.call(this);
    if (!rv) return false;

    return true;
  }

  function getCompleteList() {
    var list;
    var commandCompletion = this.cmdParser.getCompleteList();
    var optionCompletion  = this.optsParser.getCompleteList();
    var pipeCompletion    = this.pipeParser.getCompleteList();

    function sanitaize(list) {
      if (_.isArray(list) && list.length > 0) return list;
      return null;
    }

    if (_.last(this.line) === '|') return [{name: '|', help: 'pipe to cmd'}];

    pipeCompletion    = sanitaize(pipeCompletion);
    optionCompletion  = sanitaize(optionCompletion);
    commandCompletion = sanitaize(commandCompletion);

    list = pipeCompletion || optionCompletion || commandCompletion;
    list = utility.transform(list);

    // filter on partial if partial is not a query char
    if (this.partialWord && !_.contains(['?', '|'], this.partialWord)) {
      list = _.filter(list, function (c) {
        return _.startsWith(c.name, this.partialWord)
      }, this);
    }

    return list;
  }

  function getErrorMsg() {
    return 'You are a dick';
  }

  function Line(line, commands) {
    if (!(this instanceof Line)) {
      return new Line(line, commands);
    }

    this.commands    = commands;
    this.line        = line;
    this.tokens      = _.words(this.line, /[^ ]+/g);
    this.partialWord = _.last(this.line) !== ' ' ? this.tokens.pop() : null;

    this.parse           = parse;
    this.getCompleteList = getCompleteList;
    this.getErrorMsg     = getErrorMsg;
  }

  Line.prototype = new Base();
  module.exports = Line;
}.call(this));

