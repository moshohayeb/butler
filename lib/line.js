;
(function () {
  "use strict";
  var util = require('util');

  var _ = require('lodash');

  var utility = require('./utility');
  var Base    = require('./base');

  function validate() {
    var parsers = this.parsers;
    var rv, p;

    _.each(this.pipeline, function (part) {
      p = parsers[part];

      if (!p) return;
      if (!_.isFunction(p.validate)) return;

      rv = p.validate();
      if (!rv) {
        this._errorMsg      = p._errorMsg;
        this._errorToken    = p._errorToken;
        this._errorLocation = this.context.line.lastIndexOf(this._errorToken);
        return false; // stop
      }
    }, this);

    return this._errorMsg === '';
  }

  function parse() {
    var context = this.context;
    var parsers = {}
    var rv, p;

    this._errorLocation = -1;
    this._errorMsg      = '';
    this._errorToken    = null;

    // initialize and parse each component
    _.each(this.pipeline, function (part) {
      p  = require('./' + part)(context);
      rv = p.parse(); // context will be changed/augmented

      if (!rv) {
        this._errorMsg      = p._errorMsg;
        this._errorToken    = p._errorToken;
        this._errorLocation = this.context.line.lastIndexOf(this._errorToken);
        return false;
      }

      parsers[part] = p;
    }, this);

    this.parsers = parsers;
    return this._errorMsg === '' ? validate.call(this) : false;
  }

  function complete() {
    var command = this.parsers.command;
    var option  = this.parsers.option;
    var pipe    = this.parsers.pipe;
    var partial = this.context.partialWord;
    var list;

    function process(part) {
      var clist;

      if (!part) return null;
      if (!_.isFunction(part.complete)) return null;

      try { clist = part.complete() }
      catch (e) { clist = null; }

      if (_.isArray(clist) && clist.length > 0) return clist;

      return null;
    }

    // hack
    if (_.last(this.context.line) === '|')
      return [{name: '|', help: 'pipe to cmd', completeOn: true}];

    pipe    = process(pipe);
    option  = process(option);
    command = process(command);

    list = pipe || option || command;
    list = utility.transform(list);

    if (partial) {
      list = _.filter(
        list,
        function (candidate) { return _.startsWith(candidate.name, partial) }
      )
    }

    return list;
  }

  function run() {
    var runnable = this.context.run;
    runnable(this.context.store);
  }

  function Line(line, commands) {
    if (!(this instanceof Line)) {
      return new Line(line, commands);
    }

    this.pipeline = ['command', 'option', 'pipe'];

    // context will be sent to all components
    // any may be modified. It basically acts
    // as a container.
    this.context             = {};
    this.context.line        = line;
    this.context.tokens      = _.words(this.context.line, /[^ ]+/g);
    this.context.partialWord = _.last(this.context.line) !== ' ' ? this.context.tokens.pop() : null;
    this.context.commands    = commands;

    this.parse    = parse;
    this.complete = complete;
    this.run      = run;
  }

  Line.prototype = new Base();
  module.exports = Line;
}.call(this));

