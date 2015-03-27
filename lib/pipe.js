;
(function () {
  "use strict";
  var _ = require('lodash');

  var Base = require('./base');

  var pipeCommands = [
    {name: 'grep', help: 'pipe output to the grep command'},
    {name: 'more', help: 'pipe output to the more command'},
    {name: 'tail', help: 'pipe output to the tail command'}
  ];

  function parse() {
    var tokens = this.context.tokens || [];

    this.piped   = false;
    this.pipeCmd = '';

    this._errorMsg   = '';
    this._errorToken = '';

    if (!tokens || tokens.length == 0 || tokens[0] != '|') {
      this.piped = false;
      return true; // not an error
    }

    this.piped = true;
    this.context.state = this.STATES.ON_PIPE;
    tokens.shift(); // remove pipe char
    this.pipeCmd = tokens.length >= 1 ? tokens.shift() : '';
    return true;
  }

  function complete() {
    if (!this.piped) return null;

    var commands = _.map(pipeCommands, 'name');
    if (_.includes(commands, this.pipeCmd))
      return [{name: '<cr>', help: '', completeOn: false}];

    return pipeCommands;
  }

  function Pipe(context) {
    if (!(this instanceof Pipe)) {
      return new Pipe(context);
    }

    this.context = context;

    this.parse    = parse;
    this.complete = complete;
  }

  Pipe.prototype = new Base();
  module.exports = Pipe;
}.call(this));
