'use strict'

var util      = require('util'),
    _         = require('lodash'),
    columnify = require('columnify'),
    fig       = require('figures')

var Line     = require('./line'),
    utility  = require('./utility'),
    Readline = require('./readline')

var CR            = '\r\n';
var IGNORED_CHARS = ['~', '<', '>', '±']
var QUERY_CHARS   = ['?']

function Clift(opts) {
  if (!(this instanceof Clift)) { return new Clift(opts) }

  var self   = this
  var config = {}
  var colors
  var prompt

  opts            = opts || {}

  // clift -> Readline -> EventEmitter
  Readline.Interface.call(this)
  this.on('line', processor)
  this.on('tab', tab)
  this.on('CTRL-C', function () {
    self.processing = false
  })
  this.processing = false

  colors = !!opts.colors
  prompt = opts.prompt || '##>'

  config.appendGroup   = !!opts.appendGroup
  config.appendDefault = !!opts.appendDefault

  this._possibleMsg = opts.possibleMsg || null
  this._motd        = _.isFunction(opts.motd) ? opts.motd : function () {}
  this._commands    = opts.commands || []
  this._config      = config

  colors = colors ? '' : '--no-color'
  process.argv.push(colors)
  require('colors')

  this.setPrompt(prompt)

  // called on each pressed char
  process.stdin.on('keypress', function (ch, key) {
    self._reformatLine(ch, key)
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
  var line


  line = Line(this)
  line.parse()
  return line.complete()
}

// The main method for execution
// called on (ENTER)
function processor(line) {
  var self = this

  var errors = function () {
    var emsg = '% ' + line._errorMsg + CR
    var eloc = line._errorLocation
    if (eloc >= 0) {
      var spacesCount = eloc + self._prompt.length
      var spaces      = _.repeat(' ', spacesCount)
      self.write(util.format('%s%s%s', spaces, fig.arrowUp, CR).red)
    }
    self.write(emsg.red)
  }

  var done = function () {
    self.line = ''
    self.processing = false
    self._refreshLine()
  }

  if (!line) { return } // ignore empty line

  this.line = line
  this.line += ' ' // terminate the line (no partial)

  line = Line(this)
  if (!line.parse()) {
    errors()
    done()
    return
  }

  self.processing = true
  line.run(done)
}

function tab(show) {
  this.line    = this.line.slice(0, this.cursor)
  var self     = this
  var lastWord = _.last(_.words(this.line, /[^ ]+/g))
  var common
  var primary, name, help, color
  var complete
  var otherList
  var table
  var i
  var data     = []

  var done = function () {
    if (!show) { self.write('\r\n') }

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

  complete = completer.call(this)
  if (!complete) { return }

  var copy         = _.cloneDeep(complete)
  var multipleList = function (element) { return element.help[0] === '!' }
  var primaryList  = function (element) { return element.help[0] === '_' }

  if (show && this._possibleMsg) {
    this.write(CR)
    this.write(this._possibleMsg.grey)
  }

  primaryList  = _.remove(copy, primaryList)
  multipleList = _.remove(copy, multipleList)
  multipleList = _.sortBy(multipleList, function (selection) { return _.contains(selection, 'selected') })
  otherList    = _.sortByAll(
    copy,
    [function (item) { return item.name[0] === '<' }, 'name']
  )

  if (complete.length === 1 && complete[0].completeOn) {
    var insert = complete[0].name
    if (_.last(this.line) !== ' ') { insert = insert.slice(lastWord.length) }
    this._insertString(insert + ' ')
    return
  }

  if (!show) return done()

  this.write(CR)

  primary = _.remove(otherList, { primary: true }) // there should be only one
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
  for (i = 0; i < otherList.length; i++) {
    name = otherList[i].name
    help = otherList[i].help
    data.push({ name: name.cyan, help: help.white })
  }

  // multiple options
  for (i = 0; i < multipleList.length; i++) {
    name  = multipleList[i].name
    help  = _.trimLeft(multipleList[i].help || '', '!')
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
  return done()
}

Clift.prototype._reformatLine = function (key, ch) {
  if (this.processing) return

  /* Replace multipleList spaces with a single */
  this.line = this.line.replace(/\s{1,}/g, ' ')
  if (this.line === ' ') { this.line = '' }

  var query  = _.contains(QUERY_CHARS, key)
  var ignore = _.contains(IGNORED_CHARS, key)

  if (ignore) { this._deleteLeft() }

  if (query) {
    this._deleteLeft()
    this.emit('tab', true)
  }

  this._refreshLine()
}

Clift.prototype.write = function (chunk) {
  this._write(chunk)
}

Clift.prototype.start = function () {
  var write = this.write.bind(this)
  this._motd(write)
  this.write(CR + '[type ? for help]' + CR + CR)
  this.prompt()
}

module.exports = Clift
