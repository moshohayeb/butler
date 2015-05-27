'use strict'

var _ = require('lodash')

var Base = require('./base')

var format = require('util').format

var PIPE_CHR
var PIPE_STATE   = { ON_NONE: 0, ON_PIPE: 1, ON_MODIFIER: 2, ON_MODIFIER_ARGUMENT: 3 }
var pipeCommands = [
  {
    name:    'grep',
    help:    'find a string in output',
    command: 'grep --line-buffered %s',
    args:    { required: true, command: '<PATTERN>', help: 'the pattern to look for' }
  },
  {
    name:    'except',
    help:    'exclude a string from output',
    command: 'grep --line-buffered -v %s',
    args:    { required: true, command: '<PATTERN>', help: 'the pattern to look for' }
  },
  {
    name:    'tail',
    help:    'display last x lines from output',
    command: 'tail -n %s',
    args:    { required: false, command: '<PATTERN>', help: 'the pattern to look for', default: 10 }
  },
  {
    name:    'count',
    help:    'count number of lines in output',
    command: 'wc -l'
  }
];

Pipe.PIPE_CHR = PIPE_CHR = '|'

function parse() {
  var tokens = this.context.tokens
  var segments
  var processSegment

  this.modifier    = null
  this.state       = PIPE_STATE.ON_NONE
  this.piped       = false
  this.chain       = []
  this._errorMsg   = ''
  this._errorToken = null

  if (!tokens || tokens.length === 0 || _.first(tokens) !== PIPE_CHR) {
    /* no remaining tokens to process */
    return true
  }

  if (!this.context.modifiers.pipe) {
    this._errorMsg   = 'Invalid PIPE character'
    this._errorToken = PIPE_CHR
    return false
  }

  this.piped = true
  this.state = PIPE_STATE.ON_PIPE
  tokens.shift() // remove first pipe char

  processSegment = function (segment) {
    var command
    var modifier
    var args
    var commandArgs
    var required
    var defaulT
    var tokens

    tokens = segment.split(/(\s+)/)
    tokens = _.reject(tokens, function (token) { return token.trim() === '' }) // remove empty tokens

    this.state = PIPE_STATE.ON_PIPE
    if (tokens.length === 0) {
      this._errorMsg   = 'invalid modifiers usage'
      this._errorToken = null
      return false
    }

    this.state    = PIPE_STATE.ON_MODIFIER
    command       = tokens.shift()
    this.modifier = modifier = _.find(pipeCommands, { name: command })
    if (!modifier) {
      this._errorMsg   = 'unknown modifier'
      this._errorToken = command
      return false
    }

    args = modifier.args
    if (!args && tokens.length) {
      this._errorMsg   = format('modifier `%s` doesn\'t expect arguments', command)
      this._errorToken = command
      return false
    }

    this.state  = PIPE_STATE.ON_MODIFIER_ARGUMENT
    required    = _.get(modifier, 'args.required', false)
    defaulT     = _.get(modifier, 'args.default', null)
    commandArgs = tokens.shift() || defaulT // only 1 extra argument is accepted

    if (required && !commandArgs) {
      this._errorMsg   = format('required argument for modifier `%s` not provided', command)
      this._errorToken = command
      return false
    }

    if (tokens.length) {
      this._errorMsg   = format('modifier `%s` only expects one argument', command)
      this._errorToken = command
      return false
    }

    this.state = PIPE_STATE.ON_NONE
    args ?
      this.chain.push(format(modifier.command, commandArgs)) :
      this.chain.push(modifier.command)
    return true
  }

  segments = tokens.join(' ').split('|')
  if (!_.every(segments, processSegment, this)) { return false } // validate set the errors

  this.context.pipes = this.chain
  return true
}

function complete() {
  var commands
  var arg

  if (!this.piped) return null

  arg      = this.modifier && this.modifier.args
  commands = _.map(pipeCommands, function (value) {
    return { name: value.name, help: value.help }
  })

  switch (this.state) {
    case PIPE_STATE.ON_PIPE:
      return commands
    case PIPE_STATE.ON_MODIFIER_ARGUMENT:
      return [{ name: arg.command, help: arg.help, completeOn: false }]
    case PIPE_STATE.ON_NONE:
    case PIPE_STATE.ON_MODIFIER:
    default:
      return null
  }
}

function Pipe(context) {
  if (!(this instanceof Pipe)) { return new Pipe(context) }

  this.context = context

  this.parse    = parse
  this.complete = complete
}


Pipe.prototype = Base
module.exports = Pipe

