'use strict'

var _ = require('lodash')

var sq      = require('shell-quote')
var utility = require('./utility')
var Base    = require('./base')

function validate() {
  var parsers = this.parsers
  var rv, parser

  _.each(this.pipeline, function (component) {
    parser = parsers[component]

    if (!parser) return
    if (!_.isFunction(parser.validate)) return

    rv = parser.validate()
    if (!rv) {
      this._errorMsg      = parser._errorMsg
      this._errorToken    = parser._errorToken
      this._errorLocation = this.context.line.lastIndexOf(this._errorToken)
      return false // stop
    }
  }, this)

  return this._errorMsg === ''
}

function parse() {
  var context = this.context
  var parsers = {}
  var rv, parser

  this._errorLocation = -1
  this._errorMsg      = ''
  this._errorToken    = null

  // initialize and parse each component
  _.each(this.pipeline, function (component) {
    parser = require('./' + component)(context)

    rv = parser.parse() // context will be changed/augmented
    if (!rv) {
      this._errorMsg      = parser._errorMsg
      this._errorToken    = parser._errorToken
      this._errorLocation = this.context.line.lastIndexOf(this._errorToken)
    }

    parsers[component] = parser
  }, this)

  this.parsers = parsers
  return this._errorMsg === '' ? validate.call(this) : false
}

function complete() {
  var command = this.parsers.command
  var option  = this.parsers.option
  var pipe    = this.parsers.pipe
  var partial = this.context.partialWord
  var list

  function process(component) {
    var clist

    if (!component) return null
    if (!_.isFunction(component.complete)) return null

    try { clist = component.complete() } catch (e) { clist = null }

    if (_.isArray(clist) && clist.length > 0) return clist
    else if (_.has(clist, 'name')) return [clist]

    return null
  }

  pipe    = process(pipe)
  option  = process(option)
  command = process(command)

  list = pipe || option || command
  list = utility.transform(list)

  if (partial) {
    list = _.filter(list, function (candidate) {
      return _.startsWith(candidate.name, partial)
    })
  }

  return list
}

function run(clift, done) {
  return this.parsers.command.run(clift, done)
}

function Line(line, blueprint, config) {
  if (!(this instanceof Line)) { return new Line(line, blueprint, config) }

  // line should be a string
  try { line = line.toString() } catch (e) { line = '' }

  // parsing pipeline
  this.pipeline = ['command', 'option', 'pipe']

  // context will be sent to all components
  // and may be modified. It basically acts
  // as a container.
  this.context             = {}
  this.context.state       = this.STATES.ON_NONE
  this.context.line        = line
  this.context.tokens      = _.map(sq.parse(line), function (q) { return _.isObject(q) ? q.op : q })
  this.context.partialWord = _.last(line) !== ' ' ? this.context.tokens.pop() : null
  this.context.blueprint   = _.isArray(blueprint) ? blueprint : []
  this.context.config      = config || {}

  this.parse    = parse
  this.complete = complete
  this.run      = run
}

Line.prototype = Base
module.exports = Line
