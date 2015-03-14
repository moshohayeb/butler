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

  function parseCmd() {
    this.cmdParser = new Command(this.commands, this.tokens);
    if (!this.cmdParser.parse()) return false;
    this.tokens    = this.cmdParser.getRemainingTokens();
    return true;
  }

  function parseOpts() {
    var cmd         = this.cmdParser;
    this.optsParser = new Option(cmd.getCommandOpts(), cmd.isPipeable(), this.tokens);
    if (!this.optsParser.parse()) return false;
    this.tokens     = this.optsParser.getRemainingTokens();
    return true;
  }

  function parsePipe() {
    this.pipeParser = new Pipe(this.tokens);
    if (!this.pipeParser.parse()) return false;
    this.tokens     = this.pipeParser.getRemainingTokens();
    return true;
  }

  function parse() {
    var context = {};
    var parsers = {}
    var rv, p;

    this._errorLocation = -1;
    this._errorMsg      = '';
    this._errorToken    = '';

    context['tokens']   = this.tokens;
    context['commands'] = this.commands;

    // initialize and parse each component
    _.each(this.components, function (component) {
      p = parsers[component] = require('./' + component)(context);
      rv = p.parse(); // context will be changed/augmented
      if (!rv) {
        this._errorMsg      = p._errorMsg;
        this._errorToken    = p._errorToken;
        this._errorLocation = this.line.lastIndexOf(this._errorToken);
        return false;
      }
    }, this);

    this.parsers = parsers;
    return this._errorMsg === '' ? this : null;
  }

  function validate() {
    // check if parse failed first
    if (this._errorMsg !== '') return false;

    _.each(this.parsers, function (parser) {
      if (!_.isFunction(parser.validate)) return;

      var rv = parser.validate();
      if (!rv) {
        this._errorMsg      = parser._errorMsg;
        this._errorToken    = '';
        this._errorLocation = -1;
        return false;
      }
    }, this);

    return this._errorMsg === '' ? this : null;
  }


  function getCompleteList() {
    var list;
    var commandCompletion = this.parsers.command.getCompleteList();
    var optionCompletion  = this.parsers.option.getCompleteList();
    var pipeCompletion    = this.parsers.pipe.getCompleteList();

    function sanitaize(list) {
      if (_.isArray(list) && list.length > 0) return list;
      return null;
    }

    // hack
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

  function Line(line, commands) {
    if (!(this instanceof Line)) {
      return new Line(line, commands);
    }

    this.components = ['command', 'option', 'pipe'];

    this.commands    = commands;
    this.line        = line;
    this.tokens      = _.words(this.line, /[^ ]+/g);
    this.partialWord = _.last(this.line) !== ' ' ? this.tokens.pop() : null;

    this.parse           = parse;
    this.validate        = validate;
    this.getCompleteList = getCompleteList;
  }

  Line.prototype = new Base();
  module.exports = Line;
}.call(this));

