'use strict'

var _ = require('lodash')

var Base = require('./base')

var format = require('util').format

var PIPE_CHR
var pipeCommands = [
  {
    name:    'grep',
    help:    'find a string in output',
    command: 'grep --line-buffered %s',
    args:    {
      required: true,
      command:  '<PATTERN>',
      help:     'the pattern to look for'
    }
  },
  {
    name:    'except',
    help:    'exclude a string from output',
    command: 'grep -v %s',
    args:    {
      required: true,
      command:  '<PATTERN>',
      help:     'the pattern to look for'
    }
  },
  {
    name:    'tail',
    help:    'display last x lines from output',
    command: 'tail -n %s',
    args:    {
      required: false,
      command:  '<PATTERN>',
      help:     'the pattern to look for',
      default:  10
    }
  },
  {
    name:    'count',
    help:    'count number of lines in output',
    command: 'wc -l',
    args:    null
  }
];

var MODIFIERS = _.pluck(pipeCommands, 'name')
Pipe.PIPE_CHR = PIPE_CHR = '|'

function parse() {
  var tokens = this.context.tokens
  var segments

  this.piped       = false
  this.pipeline    = []
  this._errorMsg   = ''
  this._errorToken = null

  if (!tokens || tokens.length === 0 || tokens[0] !== PIPE_CHR) {
    return true // not an error
  }

  if (!this.context.modifiers.pipe) {
    this._errorMsg   = 'Invalid PIPE character'
    this._errorToken = PIPE_CHR
    return false
  }

  segments = _.compact(_.map(tokens.join(' ').split('|'), _.trim));

  this.piped = true
  function processSegment(segment) {
    var command
    var modifier
    var extra
    var required
    var def
    var tokens

    tokens = segment.split(/(\s+)/)
    tokens = _.reject(tokens, function (token) { return token.trim() === '' })

    if (tokens.length === 0) {
      this._errorMsg   = 'invalid modifiers usage'
      this._errorToken = null
      return false
    }

    command = tokens.shift()
    if (!_.contains(MODIFIERS, command)) {
      this._errorMsg   = 'unknown modifier'
      this._errorToken = command
      return false
    }

    modifier = _.find(pipeCommands, { name: command })
    required = _.get(modifier, 'args.required', false)
    def      = _.get(modifier, 'args.default', '')
    extra    = tokens.length ? tokens.shift() : def // only 1 extra argument is accepted
    if (required && !extra) {
      this._errorMsg   = format('required argument for modifier `%s` not provided', command)
      this._errorToken = command
      return false
    }

    this.pipeline.push(format(modifier.command, extra))
    return true
  }

  if (!_.every(segments, processSegment, this)) { return false } // validate set the errors

  this.context.pipes = this.pipeline
  return true
}

function complete() {
  var commands

  if (!this.piped) return null

  commands = _.map(pipeCommands, function (value) {
    return { name: value.name, help: value.help }
  })

  return commands
}

function Pipe(context) {
  if (!(this instanceof Pipe)) { return new Pipe(context) }

  this.context = context

  this.parse    = parse
  this.complete = complete
}


Pipe.prototype = Base
module.exports = Pipe

