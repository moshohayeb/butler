var util = require('util')

var columnify = require('columnify')
var fig = require('figures')
var _ = require('lodash')

var support = require('./support')
var Line = require('./line')

var CR = support.CR
var IGNORED_CHARS = ['~', '<', '>', '±']
var QUERY_CHARS = ['?']


// Fired on 'keypress' event
function keypress(key, ch) {
  /* In the midst of performing a user action should not respond to key presses */
  if (this.processing) return

  /* Replace multi spaces with a single */
  this.line = this.line.replace(/\s{1,}/g, ' ')
  if (this.line === ' ') { this.line = '' }

  var query = _.contains(QUERY_CHARS, key)
  var ignore = _.contains(IGNORED_CHARS, key)

  if (ignore || query) { this._deleteLeft() }

  if (query) { this.emit('autocomplete', true) }

  this._refreshLine()
}

// Fired on 'line' event
function line(line) {
  var self = this
  var commands = this.commands
  var config = this.config
  var currentLine = line
  var rv

  var displayErrors = function () {
    var emsg = '% ' + line._errorMsg + CR
    var eloc = line._errorLocation
    if (eloc >= 0) {
      var spacesCount = eloc + self._prompt.length
      var spaces = _.repeat(' ', spacesCount)
      self.write(util.format('%s%s%s', spaces, fig.arrowUp, CR).red)
    }
    self.write(emsg.red)
  }

  var done = function () {
    // cleanup and continue with prompt
    self.processing = false // resume accepting user input
    self._refreshLine()
  }

  if (!currentLine) { return } // ignore empty line

  currentLine = _.trimLeft(currentLine)
  currentLine += ' ' // terminate the line (no partial)

  line = Line(currentLine, commands, config)
  rv = line.parse()
  if (!rv) {
    displayErrors()
    done()
    return
  }

  self.removeAllListeners('SIGINT')
  self.processing = true

  try { line.run(this, done) }
  catch (e) { done() }
}

// Fired on 'autocomplete' event
function autocomplete(show) {
  this.line = this.line.slice(0, this.cursor)

  var self = this
  var lastWord = _.last(_.words(this.line, /[^ ]+/g))
  var data = []
  var partial
  var common
  var primary
  var name
  var help
  var entry
  var execute
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

    common = support.commonPrefix(prefix)
    if (partial && common.length > lastWord.length) { self._insertString(common.slice(lastWord.length)) }

    self._refreshLine()
  }

  partial = _.last(this.line) !== ' '
  lastWord = lastWord ? lastWord : ''
  currentLine = _.trimLeft(this.line)

  line = Line(currentLine, this.commands, this.config)
  line.parse()
  complete = line.complete()
  if (!complete) { return }

  if (show && this.config.possibleMsg) {
    this.write(CR)
    this.write(this.config.possibleMsg.yellow)
  }

  copy = _.cloneDeep(complete)
  primaryList = _.remove(copy, function (element) { return element.help[0] === '_' })

  multipleList = _.remove(copy, function (element) { return element.help[0] === '!' })
  multipleList = _.sortBy(multipleList,
    function (selection) { return _.contains(selection, 'selected') })

  normalList = copy
  execute = _.remove(normalList, { name: '<CR>' })

  if (complete.length === 1 && complete[0].completeOn) {
    var insert = complete[0].name
    if (_.last(this.line) !== ' ') { insert = insert.slice(lastWord.length) }
    this._insertString(insert + ' ')
    return
  }

  if (!show) { return done.call(null) }

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
    entry = multipleList[i]
    help = _.contains(entry.help, 'selected') ? fig.tick : ' '
    name = ' ' + entry.name
    data.push({ name: name.blue, help: help.green })
  }

  if (_.first(execute)) { data.push({ name: execute[0].name.cyan, help: execute[0].help.white }) }

  table = columnify(data, {
    truncate:         false,
    preserveNewLines: true,
    showHeaders:      false,
    minWidth:         6
  })

  this.write(table + CR)
  done.call(null)
}


module.exports = {
  autocomplete: autocomplete,
  line:         line,
  keypress:     keypress
}