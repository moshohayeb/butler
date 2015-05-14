'use strict'

var util = require('util')

var _         = require('lodash')
var columnify = require('columnify')
var fig       = require('figures')

var Line     = require('./line')
var Readline = require('./readline')
var utility  = require('./utility')

var CR            = '\r\n';
var IGNORED_CHARS = ['~', '<', '>', '±']
var QUERY_CHARS   = ['?']

function Clift(commands, config) {
  if (!(this instanceof Clift)) { return new Clift(commands, config) }

  var self = this
  var colors
  var prompt

  commands        = commands || {}
  config          = config || {}

  // clift -> Readline -> EventEmitter
  Readline.Interface.call(this)
  this.on('line', _line)
  this.on('autocomplete', _autocomplete)
  this.on('CTRL-C', function () {
    this.input.pause()
    this.emit('SIGINT')
    try { this.modifier.kill() }
    catch (e) { }
    this.input.resume()
  })
  this.processing = false


  // plug defaults
  config.appendGroup   = !!config.appendGroup
  config.appendDefault = !!config.appendDefault
  config.colors        = !!config.colors
  config.prompt        = config.prompt || 'CLI> '
  config.possibleMsg   = config.possibleMsg || null
  config.motd          = _.isFunction(config.motd) ? config.motd : function () {}

  this.commands = commands
  this.config   = config

  colors = config.colors ? '' : '--no-color'
  process.argv.push(colors)
  require('colors')

  this.setPrompt(config.prompt)

  // called on each pressed char
  process.stdin.on('keypress', function (ch, key) {
    self._keypress(ch, key)
  })

  // on any exception write stack trace
  // TODO: better handling on uncaught exceptions
  process.on('uncaughtException', function (e) {
    console.log(e.stack.red)
    self.prompt()
  })
}
util.inherits(Clift, Readline.Interface)

// The main method for auto completion.
// called on (TAB/QUERY_CHAR)
function completer() {
  // there may be errors but we dont care
  // cause it will just return empty result
  var currentLine = _.trimLeft(this.line)
  var commands    = this.commands
  var config      = this.config
  var line

}

// The main method for execution
// called on (ENTER)
function _line(line) {
  var self        = this
  var commands    = this.commands
  var config      = this.config
  var currentLine = line

  var displayErrors = function () {
    var emsg = '% ' + line._errorMsg + CR
    var eloc = line._errorLocation
    if (eloc >= 0) {
      var spacesCount = eloc + self._prompt.length
      var spaces      = _.repeat(' ', spacesCount)
      self.write(util.format('%s%s%s', spaces, fig.arrowUp, CR).red)
    }
    self.write(emsg.red)
    return self
  }

  var done = function () {
    self.processing = false
    self._refreshLine()
  }

  if (!currentLine) { return } // ignore empty line

  currentLine = _.trimLeft(currentLine)
  currentLine += ' ' // terminate the line (no partial)

  line            = Line(currentLine, commands, config)
  if (!line.parse()) {
    displayErrors()
    done()
    return
  }

  self.removeAllListeners('SIGINT')
  self.modifier   = null
  self.processing = true

  try { line.run(this, done) }
  catch (e) { done() }
}

function _autocomplete(show) {
  this.line = this.line.slice(0, this.cursor)

  var self     = this
  var lastWord = _.last(_.words(this.line, /[^ ]+/g))
  var data     = []
  var common
  var primary
  var name
  var help
  var color
  var complete
  var table
  var line
  var currentLine
  var copy
  var normalList
  var multipleList
  var primaryList
  var i

  var done = function () {
    if (!show) { self.write(CR) }

    // append common prefix of ALL available autocomplete
    var prefix = _.filter(
      _.pluck(complete, 'name'),
      function (name) { return _.startsWith(name, lastWord) }
    )

    common = utility.commonPrefix(prefix)
    if (common.length > lastWord.length) { self._insertString(common.slice(lastWord.length)) }

    self._refreshLine()
  }

  lastWord = lastWord ? lastWord : ''

  currentLine = _.trimLeft(this.line)
  line        = Line(currentLine, this.commands, this.config)
  line.parse()
  complete    = line.complete()
  if (!complete) { return }

  copy         = _.cloneDeep(complete)
  multipleList = function (element) { return element.help[0] === '!' }
  primaryList  = function (element) { return element.help[0] === '_' }

  if (show && this.config.possibleMsg) {
    this.write(CR)
    this.write(this.config.possibleMsg.yellow)
  }

  primaryList  = _.remove(copy, primaryList)
  multipleList = _.sortBy(
    _.remove(copy, multipleList),
    function (selection) { return _.contains(selection, 'selected') }
  )
  normalList   = _.sortByAll(
    copy,
    [function (item) { return item.name[0] === '<' }, 'name']
  )

  if (complete.length === 1 && complete[0].completeOn) {
    var insert = complete[0].name
    if (_.last(this.line) !== ' ') { insert = insert.slice(lastWord.length) }
    this._insertString(insert + ' ')
    return
  }

  if (!show) {
    done.call(null)
    return
  }

  this.write(CR)

  primary = _.remove(normalList, { primary: true }) // there should be only one
  primary = _.first(primary)
  if (primary) {
    name = primary.name
    help = primary.help
    data.push({ name: name.blue, help: help.white })
  }

  // If primary has different values, this shows it
  for (i = 0; i < primaryList.length; i++) {
    name = primaryList[i].name
    help = _.trimLeft(primaryList[i].help, '_')
    if (name[0] === '<') continue
    data.push({ name: (' ' + fig.arrowRight + ' ' + name).blue, help: help.white })
  }

  // the rest of the options
  for (i = 0; i < normalList.length; i++) {
    name = normalList[i].name
    help = normalList[i].help
    data.push({ name: name.cyan, help: help.white })
  }

  // multiple options
  for (i = 0; i < multipleList.length; i++) {
    name  = multipleList[i].name
    help  = _.trimLeft(multipleList[i].help, '!')
    color = multipleList.help ? 'green' : 'blue'
    data.push({ name: name[color], help: help.yellow })
  }

  table = columnify(data, {
    truncate:         false,
    preserveNewLines: true,
    showHeaders:      false,
    minWidth:         6
  })
  this.write(table + CR)
  done.call(null)
}

Clift.prototype._keypress = function (key, ch) {
  if (this.processing) return

  /* Replace multipleList spaces with a single */
  this.line = this.line.replace(/\s{1,}/g, ' ')
  if (this.line === ' ') { this.line = '' }

  var query  = _.contains(QUERY_CHARS, key)
  var ignore = _.contains(IGNORED_CHARS, key)

  if (ignore) { this._deleteLeft() }

  if (query) {
    this._deleteLeft()
    this.emit('autocomplete', true)
  }

  this._refreshLine()
}

Clift.prototype.write = function (chunk) {
  this._write(chunk)
}

Clift.prototype.start = function () {
  var write = this.write.bind(this)
  this.config.motd(write)
  this.write(CR + '[type ? for help]' + CR + CR)
  this.prompt()
}

module.exports = Clift
