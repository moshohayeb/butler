'use strict'

var _ = require('lodash')

var Base = require('./base')

var pipeCommands = {
  grep:   { help: 'find a string in output', command: 'grep --line-buffered', additional: true },
  except: { help: 'exclude a string from output', command: 'grep -v', additional: true },
  tail:   { help: 'display only last x lines from output', command: 'tail', additional: false },
  count:  { help: 'count number of lines in output', command: 'wc -l', additional: false }
}

function parse() {
  var tokens = this.context.tokens
  var cmd
  var args

  cmd = args = ''
  this.piped   = false
  this.pipeCmd = ''

  this._errorMsg   = ''
  this._errorToken = ''

  if (!tokens || tokens.length === 0 || tokens[0] !== '|') {
    this.piped = false
    return true // not an error
  }

  if (!this.context.pipeable) {
    this._errorMsg   = 'Invalid PIPE character'
    this._errorToken = '|'
    return false
  }

  this.piped         = true
  this.context.state = this.STATES.ON_PIPE
  tokens.shift() // remove pipe char

  if (tokens.length === 0) { return true}

  cmd = tokens.shift()
  if (!_.contains(_.keys(pipeCommands), cmd)) {
    this._errorMsg   = 'Invalid modifier'
    this._errorToken = cmd
    return false
  }

  if (pipeCommands[cmd].additional) {
    args = tokens.length === 0 ? '\' \'' : tokens.join(' ')
  }

  this.pipeCmd      = cmd
  this.context.pipe = pipeCommands[cmd].command + ' ' + args
  return true
}

function complete() {
  var commands
  if (!this.piped) return null

  if (_.includes(_.keys(pipeCommands), this.pipeCmd)) { return [this.CR] }

  commands = _.map(pipeCommands, function (value, key) {
    return { name: key, help: value.help }
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
