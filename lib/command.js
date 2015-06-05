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
var util = require('util')
var spawn = require('child_process').spawn
var domain = require('domain')

var _ = require('lodash')
var es = require('event-stream')
var shell = require('shell-quote')
var slug = require('slug')
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
  var modifiers = _.clone(MODIFIERS)
  var rv

  command = command || {}

  if (_.isArray(command)) {
    rv = _.map(command, cleanUpCommands)
    return _.compact(rv)
  }

  // reject commands that doesn't have a name
  if (!_.isString(command.name)) return null

  cleanCommand.name = slug(command.name)
  cleanCommand.help = _.isString(command.help) ? command.help : ''
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

function Command(context) {
  if (!(this instanceof Command)) { return new Command(context) }
  Base.call(this)

  this.context = context
}
util.inherits(Command, Base)

Command.prototype.validate = function () {
  var path = _.trim(this.path)

  // query that the command is valid
  if (!this.executable) {
    this._errorMsg = util.format('incomplete command `%s`', path)
    this._errorToken = null
    return false
  }

  // query that there is a run context for the command
  if (!_.isFunction(this.command.run)) {
    this._errorMsg = util.format('command `%s` has no run context', path)
    return false
  }

  return true
}

Command.prototype.parse = function () {
  var currentKey
  var currentCommand
  var blueprint
  var tokens
  var path
  var options

  this._errorMsg = ''
  this._errorToken = null

  blueprint = this.context.blueprint
  tokens = this.context.tokens
  path = ''

  this.blueprint = currentCommand = cleanUpCommands(blueprint)

  while (tokens.length !== 0) {
    this.context.state = this.STATES.ON_COMMAND
    currentKey = tokens.shift()
    currentCommand = dive(currentCommand, currentKey)

    if (!currentCommand) {
      this.command = null
      this._errorMsg = util.format('unknown token: %s', currentKey)
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
      options = currentCommand.options
      break
    }
  }

  this.command = currentCommand
  this.path = path

  // augment context for other components
  this.context.modifiers = currentCommand.modifiers || MODIFIERS
  this.context.options = _.isArray(options) ? options : []
  return true
}

Command.prototype.complete = function () {
  var completions = []
  var pipeable = this.context.modifiers.pipe

  if (this.executable) {
    completions.push(this.CR)
    completions.push(pipeable ? this.PIPE : null)
    return completions
  }

  return this.command
}

Command.prototype.run = function (clift, done) {
  var self = this
  var pre, post
  var pipes, pipe, va
  var runnable
  var start, end
  var command
  var pipeline

  runnable = self.command.run
  pipes = self.context.pipes
  pipeline = []

  pre = es.through()
  post = es.through(function (data) {
    this.queue(data + '\n')
  })

  _.each(pipes, function (command) {
    va = shell.parse(command)
    pipe = va.shift()
    pipeline.push(es.child(spawn(pipe, va)))
  })

  switch (pipeline.length) {
    case 0:
      pipeline.push(es.through())
    // fallthrough
    case 1:
      pipeline.push(es.through())
      break
    default:
      break
  }

  for (var i = 0; i < pipeline.length - 1; i++) {
    var current, next
    current = pipeline[i]
    next = pipeline[i + 1]
    current.pipe(next)
  }
  start = _.first(pipeline)
  end = _.last(pipeline)


  var container = domain.create()
  container.on('error', function (e) {
    pre.end(('% command failed: ' + e.message).red)
  })

  post.on('end', function () { })
  post.on('close', function () { process.nextTick(done) })

  container.run(function () {
    pre.pipe(start)
    end.pipe(es.split()) // we `mostly` care about lines
      .pipe(post) // post processing
      .pipe(clift.output) // display to terminal
    runnable.call(clift, pre, self.context.store)
  })
}

module.exports = Command
