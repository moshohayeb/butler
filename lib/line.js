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

    _.each(this.pipeline, function (component) {
      p = parsers[component];
      if (!p) return;
      if (!_.isFunction(p.validate)) return;

      rv = p.validate();
      if (!rv) {
        this._errorMsg      = p._errorMsg;
        this._errorToken    = p._errorToken;
        this._errorLocation = p._errorLocation;
        return false;
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
    this._errorToken    = '';

    context['tokens']   = this.tokens;
    context['commands'] = this.commands;

    // initialize and parse each component
    _.each(this.pipeline, function (component) {
      p  = require('./' + component)(context);
      rv = p.parse(); // context will be changed/augmented

      if (!rv) {
        this._errorMsg      = p._errorMsg;
        this._errorToken    = p._errorToken;
        this._errorLocation = this.line.lastIndexOf(this._errorToken);
        return false;
      }

      parsers[component] = p;
    }, this);

    this.parsers = parsers;
    return this._errorMsg === '' ? validate.call(this) : false;
  }


  function completes() {
    var list;
    var command = this.parsers['command'];
    var option  = this.parsers['option'];
    var pipe    = this.parsers['pipe'];

    function sanitaize(component) {
      var list;

      if (!component) return null;
      if (!_.isFunction(component['completes'])) return null

      list = component.completes();
      if (_.isArray(list) && list.length > 0) return list;

      return null;
    }

    // hack
    if (_.last(this.line) === '|') return [{name: '|', help: 'pipe to cmd'}];

    pipe    = sanitaize(pipe);
    option  = sanitaize(option);
    command = sanitaize(command);

    list = pipe || option || command;
    list = utility.transform(list);


    // filter on partial if partial is not a query char
    if (this.partialWord && !_.contains(['?', '|'], this.partialWord)) {
      list = _.filter(list, function (c) {
        return _.startsWith(c.name, this.partialWord)
      }, this);
    }

    return list;
  }

  function run() {
    var runnable = this.parsers.command.run;
    runnable(this.context.store);
  }

  function Line(line, commands) {
    if (!(this instanceof Line)) {
      return new Line(line, commands);
    }

    this.pipeline = ['command', 'option', 'pipe'];

    this.commands    = commands;
    this.line        = line;
    this.tokens      = _.words(this.line, /[^ ]+/g);
    this.partialWord = _.last(this.line) !== ' ' ? this.tokens.pop() : null;

    this.context = {};

    this.parse     = parse;
    this.completes = completes;
    this.run       = run;
  }

  Line.prototype = new Base();
  module.exports = Line;
}.call(this));

