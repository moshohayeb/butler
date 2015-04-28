'use strict'

var util     = require('util'),
    _        = require('lodash'),
    Line     = require('./line'),
    utility  = require('./utility'),
    readline = require('./readline')

var IGNORED_CHARS = ['~', '<', '>', '±']
var QUERY_CHARS   = ['?']

function registerCallbacks() {
  // called on each pressed char
  process.stdin.on(
    'keypress',
    function (ch, key) { this._reformatLine(ch, key) }.bind(this)
  )

  // on any exception print stack trace
  // TODO: better handling on uncaught exceptions
  process.on(
    'uncaughtException',
    function (e) {
      console.log(e.stack.red)
      this.prompt()
    }.bind(this)
  )
}

function printErrors(line) {
  var emsg = '% ' + line._errorMsg + '\r\n'
  var eloc = line._errorLocation
  if (eloc >= 0) {
    var spacesCount = eloc + this._prompt.length
    var spaces      = _.repeat(' ', spacesCount)
    this.output.write(util.format('%s^\r\n', spaces).red)
  }
  this.output.write(emsg.red)
}

// The main method for auto completion.
// called on (TAB/QUERY_CHAR)
function completer() {
  // there may be errors but we dont care
  var cline    = this.line
  var commands = this._commands
  var config   = this._config
  var line     = Line(_.trimLeft(cline), commands, config)
  line.parse()
  return line.complete()
}

// The main method for execution
// called on (ENTER)
function processor(cline) {
  if (!cline) return
  cline += ' ' // terminate the line (no partial)
  var line  = Line(_.trimLeft(cline), this._commands)
  var parse = line.parse()
  if (!parse) {
    printErrors.call(this, line)
    return
  }
  return line.run(this)
}

function _tabComplete(show) {
  this.line    = this.line.slice(0, this.cursor)
  var lastWord = _.last(_.words(this.line, /[^ ]+/g))
  var common, max
  var primary, name, help, spaces, line, color, i
  var complete

  var done = function () {
    if (!show) { this.output.write('\r\n') }

    // append common prefix of ALL available autocomplete
    var prefix = _.filter(
      _.pluck(complete, 'name'),
      function (name) { return _.startsWith(name, lastWord) }
    )

    common = utility.commonPrefix(prefix)
    if (common.length > lastWord.length) { this._insertString(common.slice(lastWord.length)) }

    this._refreshLine()
  }.bind(this)

  lastWord = lastWord ? lastWord : ''

  complete = completer.call(this)
  if (!complete) { return }

  var varList
  var copy         = _.cloneDeep(complete)
  var multipleList = function (element) { return element.help[0] === '!' }
  var primaryList  = function (element) { return element.help[0] === '_' }

  if (show && this._possibleMsg) {
    this.output.write('\r\n')
    this.output.write(this._possibleMsg.grey)
  }

  primaryList  = _.remove(copy, primaryList)
  multipleList = _.remove(copy, multipleList)
  multipleList = _.sortBy(multipleList, function (selection) { return _.contains(selection, 'selected') })
  varList      = copy // the rest

  // calculate max length to determine column size
  max = _.max(
    _.pluck(complete, 'name'),
    function (name) { return name.length }
  ).length

  if (complete.length === 1 && complete[0].completeOn) {
    var insert = complete[0].name
    if (_.last(this.line) !== ' ') { insert = insert.slice(lastWord.length) }
    this._insertString(insert + ' ')
    return
  }

  if (!show) return done()

  this.output.write('\r\n')

  primary = _.remove(varList, { primary: true }) // there should be only one
  primary = _.first(primary)
  if (primary) {
    name   = primary.name
    help   = primary.help
    spaces = max - name.length
    line   = util.format('   %s %s %s\r\n', name.blue, _.repeat(' ', spaces), help.white)
    this.output.write(line)
  }

  for (i = 0; i < primaryList.length; i++) {
    name   = primaryList[i].name
    help   = primaryList[i].help
    help   = _.trimLeft(help, '_')
    spaces = max - name.length - 1
    line   = util.format('    %s %s %s\r\n', name.blue, _.repeat(' ', spaces), help.white)
    if (name[0] === '<') continue
    this.output.write(line)
  }

  for (i = 0; i < varList.length; i++) {
    name   = varList[i].name
    help   = varList[i].help
    spaces = max - name.length
    line   = util.format('   %s %s %s\r\n', name.cyan, _.repeat(' ', spaces), help.white)
    this.output.write(line)
  }

  for (i = 0; i < multipleList.length; i++) {
    if (i === 0) {
      this.output.write('\r\n')
      this.output.write('   Remaining selections for option>'.bold)
      this.output.write('\r\n')
    }
    name   = multipleList[i].name
    help   = multipleList[i].help || ''
    help   = _.trimLeft(help, '!')
    spaces = max + 5 - name.length
    color  = multipleList.help ? 'green' : 'blue'
    line   = util.format('   %s %s %s\r\n', name[color], _.repeat(' ', spaces), help.yellow)
    this.output.write(line)
  }

  return done()
}

function _reformatLine(key, ch) {
  /* Replace multipleList spaces with a single */
  this.line = this.line.replace(/\s{1,}/g, ' ')

  var query  = _.contains(QUERY_CHARS, key)
  var ignore = _.contains(IGNORED_CHARS, key)

  if (ignore) {
    this._deleteLeft()
  }

  if (query) {
    this.line = this.line.slice(0, -1)
    this._tabComplete(true)
    this._deleteLeft()
  }

  this._refreshLine()
}

module.exports = function (opts) {
  var colors
  var config
  var rl = readline.createInterface()

  rl._tabComplete  = _tabComplete
  rl._reformatLine = _reformatLine
  rl.on('line', processor)

  rl._possibleMsg = opts['possibleMsg'] || null
  rl._prompt      = opts['prompt'] || '## '
  rl._motd        = _.isFunction(opts['motd']) ? opts['motd'] : function () {}
  rl._commands    = opts['commands'] || []

  config = rl._config = {}
  config.appendGroup   = !!opts.appendGroup
  config.appendDefault = !!opts.appendDefault
  config.colors        = !!opts.colors

  colors = config.colors ? '' : '--no-color'
  process.argv.push(colors)
  require('colors')

  rl.setPrompt(rl._prompt)
  registerCallbacks.call(rl)

  rl.start = function () {
    this._motd()
    this.output.write('\r\n')
    this.output.write('[type ? for help]\r\n')
    this.output.write('\r\n')
    this.prompt()
  }

  return rl
}
