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
    var tokens = this.tokens;

    if (!tokens || tokens.length == 0 || tokens[0] != '|') {
      this.piped = false;
      return false;
    }

    this.piped   = true;
    tokens.shift(); // remove pipe char
    this.pipeCmd = tokens.length >= 1 ? tokens.shift() : '';
  }

  function getCompleteList() {
    if (!this.piped) return [];

    var cmds = _.map(pipeCommands, function (c) {
      return c.name
    });

    if (_.includes(cmds, this.pipeCmd))
      return [{name: '<cr>', help: 'execute command'}];

    return pipeCommands;
  }

  function Pipe(tokens) {
    if (!(this instanceof Pipe)) {
      return new Pipe(tokens);
    }

    this.tokens  = _.clone(tokens);
    this.piped   = false;
    this.pipeCmd = ''

    this.parse           = parse;
    this.getCompleteList = getCompleteList;
  }

  Pipe.prototype = new Base();
  module.exports = Pipe;
}.call(this));
