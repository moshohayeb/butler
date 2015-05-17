'use strict'

var util = require('util')

var _     = require('lodash')
var xtend = require('xtend')

var Readline = require('./readline')
var listerns = require('./listeners')

var CR = require('./common').CR

var RLI_SETPROMPT = Readline.Interface.prototype.setPrompt

function Clift(commands, config) {
  if (!(this instanceof Clift)) { return new Clift(commands, config) }

  var self = this
  var colors

  this.config     = {
    appendDefault: false,
    colors:        true,
    prompt:        'CLI> ',
    motd:          function () {}
  }

  // clift -> Readline -> EventEmitter
  Readline.Interface.call(this)
  this.input.on('keypress', listerns.keypress.bind(self))
  this.on('line', listerns.line)
  this.on('autocomplete', listerns.autocomplete)
  this.on('CTRL-C', function () {
    this.input.pause()
    this.emit('SIGINT')
    try { this.modifier.kill('SIGTERM') }
    catch (e) { }
    this.input.resume()
  })
  this.processing = false

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
util.inherits(Clift, Readline.Interface)

Clift.prototype.setConfig = function (config) {
  // Run some validation here maybe
  if (!_.isPlainObject(config)) { return }
  this.config = xtend(this.config, config)
}

Clift.prototype.setCommands = function (commands) {
  // Run some validation here maybe
  this.commands = commands
}

Clift.prototype.getCommands = function () {
  return this.commands
}

Clift.prototype.setPrompt = function (prompt) {
  var p = this.config.prompt = prompt
  RLI_SETPROMPT.call(this, p)
}

Clift.prototype.start = function () {
  var write = this.write.bind(this)

  this.config.motd(write)
  this.setPrompt(this.config.prompt)
  this.write(CR + '[type ? for help]' + CR + CR)
  this.prompt()
}

module.exports = Clift
