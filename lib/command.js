// command object has the following keys
// name: string (required)
// help: string (optional)

// -> HAS SUB COMMANDS
// commands: array (optional)
//       If it has subcommands
//       or ...

// -> IS A LEAF COMMAND
// run: function (optional)
// options: array (optional)
//       If it has options (modifiers). See option.js
// modifiers: object (optional) -> If leaf command
//       -> { pipe: true/false, minOptsRequired: XX }

'use strict'
var util   = require('util')
var spawn  = require('child_process').spawn
var domain = require('domain')

var _     = require('lodash')
var es    = require('event-stream')
var shell = require('shell-quote')
var slug  = require('slug')
var xtend = require('xtend')

var Base = require('./base')

var MODIFIERS = { pipe: false, minOptsRequired: 1 }

function dive(currentObject, currentKey) {
  if (!currentKey || !currentObject) return null
  if (!_.isArray(currentObject))     return null
  return _.find(currentObject, { name: currentKey })
}

function cleanUpCommands(command) {
  // options and commands are mutually exclusive
  // if neither is present then it is a command
  var cleanCommand = {}
  var modifiers    = _.clone(MODIFIERS, true)
  var rv

  command = command || {}

  if (_.isArray(command)) {
    rv = _.map(command, cleanUpCommands)
    return _.compact(rv)
  }

  // reject commands that doesn't have a name
  if (!_.isString(command.name)) return null

  cleanCommand.name      = slug(command.name)
  cleanCommand.help      = _.isString(command.help) ? command.help : ''
  cleanCommand.modifiers = xtend(modifiers, command.modifiers)

  if (_.isArray(command.commands)) {
    // subcommand tree
    cleanCommand.commands = _.map(command.commands, cleanUpCommands)
  } else {
    // leaf command
    cleanCommand.options = _.isArray(command.options) ? command.options : [] // options will be sanitzed in options component
    cleanCommand.run = _.isFunction(command.run) ? command.run : function () { throw new Error('Not Yet Implemented') }
  }

  return cleanCommand
}

function validate() {
  var path = _.trim(this.path)
  // query that the command is valid
  if (!this.executable) {
    this._errorMsg   = util.format('incomplete command `%s`', path)
    this._errorToken = null
    return false
  }

  // query that there is a run context for the command
  if (!_.isFunction(this.runnable)) {
    this._errorMsg = util.format('command `%s` has no runnable context', path)
    return false
  }

  return true
}

function parse() {
  var currentKey
  var currentCommand
  var blueprint
  var tokens
  var path
  var options

  this._errorMsg   = ''
  this._errorToken = null

  blueprint = this.context.blueprint
  tokens    = this.context.tokens
  path      = ''

  this.blueprint = currentCommand = cleanUpCommands(blueprint)

  while (tokens.length !== 0) {
    this.context.state = this.STATES.ON_COMMAND
    currentKey         = tokens.shift()
    currentCommand     = dive(currentCommand, currentKey)

    if (!currentCommand) {
      this.command     = null
      this._errorMsg   = util.format('unknown token: %s', currentKey)
      this._errorToken = currentKey
      return false
    }

    path += (currentKey + ' ')
    if (_.isArray(currentCommand.commands)) {
      currentCommand = currentCommand.commands
      continue
    } else {
      // we `hopefully` reached a specific command
      this.executable = true
      this.runnable   = currentCommand.run
      options         = currentCommand.options
      break
    }
  }

  this.command = currentCommand
  this.path    = path

  // augment context for other components
  this.context.modifiers = currentCommand.modifiers || MODIFIERS
  this.context.options   = _.isArray(options) ? options : []
  return true
}

function complete() {
  var completions = []
  var pipeable    = this.context.modifiers.pipe

  if (this.executable) {
    completions.push(this.CR)
    completions.push(pipeable ? this.PIPE : null)
    return completions
  }

  return this.command
}

function run(clift, done) {
  var self = this
  var modifier, pre, post
  var pipe, va
  var runnable

  runnable = self.runnable
  pipe     = self.context.pipe

  pre  = es.through()
  post = es.through(function (data) {
    this.queue(data + '\n')
  })

  if (pipe) {
    va       = shell.parse(pipe)
    pipe     = va.shift()
    modifier = es.child(spawn(pipe, va))
  } else {
    modifier = es.through()
  }
  clift.modifier = modifier

  var container = domain.create()
  container.on('error', function (e) {
    pre.end(('% command failed: ' + e.message).red)
  })

  post.on('end', function () { })
  post.on('close', function () { process.nextTick(done) })

  container.run(function () {
    pre
      .pipe(modifier) // pipe
      .pipe(es.split()) // we `mostly` care about lines
      .pipe(post) // post processing
      .pipe(clift.output) // display to terminal
    runnable.call(clift, pre, self.context.store)
  })

}

function Command(context) {
  if (!(this instanceof Command)) { return new Command(context) }

  this.context = context

  this.validate = validate
  this.parse    = parse
  this.complete = complete
  this.run      = run
}

Command.prototype = Base
module.exports    = Command
