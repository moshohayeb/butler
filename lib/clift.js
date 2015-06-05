'use strict'

var util = require('util')

var _ = require('lodash')
var xtend = require('xtend')

var rl = require('./readline')
var el = require('./events')

var CR = require('./support').CR

var setPrompt = rl.Interface.prototype.setPrompt

function Clift(commands, config) {
  if (!(this instanceof Clift)) { return new Clift(commands, config) }

  var self = this
  var colors

  this.processing = false
  this.config = {
    possibleMsg:   'Possible Completions:',
    appendDefault: false,
    appendGroup:   false,
    colors:        true,
    prompt:        'CLI> ',
    motd:          function () {}
  }

  // clift -> Readline -> EventEmitter
  rl.Interface.call(this)
  this.input.on('keypress', el.keypress.bind(self))
  this.on('line', el.line)
  this.on('autocomplete', el.autocomplete)
  this.on('CTRL-C', function () {
    this.input.pause()
    this.emit('SIGINT')
    this.input.resume()
  })

  this.setCommands(commands)
  this.setConfig(config)

  colors = config.colors ? '' : '--no-color'
  process.argv.push(colors)
  require('colors')

  // on any exception write stack trace
  // TODO: better handling on uncaught exceptions
  process.on('uncaughtException', function (e) {
    console.log(e.stack.red)
    self.prompt()
  })
}
util.inherits(Clift, rl.Interface)

Clift.prototype.setConfig = function (config) {
  // Run some validation here
  if (!_.isPlainObject(config)) { return }
  this.config = xtend(this.config, config)
}

Clift.prototype.setCommands = function (commands) {
  // Run some validation here
  this.commands = commands
}

Clift.prototype.setPrompt = function (prompt) {
  var p = this.config.prompt = prompt
  setPrompt.call(this, p)
}

Clift.prototype.start = function () {
  var write = this.write.bind(this)

  this.config.motd(write)
  this.setPrompt(this.config.prompt)
  this.write(CR + '[type ? for help]' + CR + CR)
  this.prompt()
}

module.exports = Clift
