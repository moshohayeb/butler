'use strict'

var util    = require('util'),
    _       = require('lodash'),
    through = require('through2'),
    cp      = require('child_process')

var Line      = require('./line'),
    utility   = require('./utility'),
    Interface = require('./readline').Interface

var IGNORED_CHARS = ['~', '<', '>', '±']
var QUERY_CHARS   = ['?']

function Butler(opts) {
  if (!(this instanceof Butler)) { return new Butler(opts) }

  var self   = this
  var config = {}
  var colors


  Interface.call(this)

  this._tabComplete = _tabComplete
  this.on('line', processor.bind(this))

  config.appendGroup   = !!opts.appendGroup
  config.appendDefault = !!opts.appendDefault
  colors               = !!opts.colors

  opts              = opts || {}
  this._possibleMsg = opts.possibleMsg || null
  this._prompt      = opts.prompt || '## '
  this._motd        = _.isFunction(opts.motd) ? opts.motd : function () {}
  this._commands    = opts.commands || []
  this._config      = config

  colors = colors ? '' : '--no-color'
  process.argv.push(colors)
  require('colors')

  this.output = through(function (chunk, encoding, continueCB) {
    if (self.context && self.context.pipe === 'more') {
      chunk = _.repeat(chunk + '\n', 100)
      cp.execSync('more', { input: chunk, stdio: [null, process.stdout, 'inherit'], encoding: 'utf8' })
      self.context.pipe = null
      self._reformatLine()
    } else {
      this.push(chunk)
    }

    continueCB()
  })
  this.output.pipe(this.stdout)

  //flush interval 3 remote-host 10.10.50.3 cron 33
  // called on each pressed char
  process.stdin.on('keypress', function (ch, key) {
    self._reformatLine(ch, key)
  })

  // on any exception print stack trace
  // TODO: better handling on uncaught exceptions
  process.on('uncaughtException', function (e) {
    console.log(e.stack.red)
    self.prompt()
  })
}
util.inherits(Butler, Interface)

// The main method for auto completion.
// called on (TAB/QUERY_CHAR)
function completer(cline) {
  // there may be errors but we dont care
  // cause it will just return empty result
  var currentLine = cline || this.line
  var commands    = this._commands
  var config      = this._config
  var line

  currentLine = _.trimLeft(currentLine)
  line        = Line(currentLine, commands, config)
  line.parse()
  return line.complete()
}

// The main method for execution
// called on (ENTER)
function processor(cline) {
  var self        = this
  var currentLine = cline || this.line
  var commands    = this._commands
  var config      = this._config
  var line

  function errors() {
    var emsg = '% ' + line._errorMsg + '\r\n'
    var eloc = line._errorLocation
    if (eloc >= 0) {
      var spacesCount = eloc + self._prompt.length
      var spaces      = _.repeat(' ', spacesCount)
      self.print(util.format('%s^\r\n', spaces).red)
    }
    self.print(emsg.red)
  }

  this.context = null
  if (!currentLine) return
  currentLine = _.trimLeft(currentLine)
  currentLine += ' ' // terminate the line (no partial)
  line         = Line(currentLine, commands, config)
  if (!line.parse()) { return errors() }

  this.context = line.context
  return line.run(this)
}

function _tabComplete(show) {
  this.line    = this.line.slice(0, this.cursor)
  var self     = this
  var lastWord = _.last(_.words(this.line, /[^ ]+/g))
  var common, max
  var primary, name, help, spaces, line, color, i
  var complete

  var done = function () {
    if (!show) { self.print('\r\n') }

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

  var varList
  var copy         = _.cloneDeep(complete)
  var multipleList = function (element) { return element.help[0] === '!' }
  var primaryList  = function (element) { return element.help[0] === '_' }

  if (show && this._possibleMsg) {
    this.print('\r\n')
    this.print(this._possibleMsg.grey)
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

  this.print('\r\n')

  primary = _.remove(varList, { primary: true }) // there should be only one
  primary = _.first(primary)
  if (primary) {
    name   = primary.name
    help   = primary.help
    spaces = max - name.length
    line   = util.format('   %s %s %s\r\n', name.blue, _.repeat(' ', spaces), help.white)
    this.print(line)
  }

  for (i = 0; i < primaryList.length; i++) {
    name   = primaryList[i].name
    help   = primaryList[i].help
    help   = _.trimLeft(help, '_')
    spaces = max - name.length - 1
    line   = util.format('    %s %s %s\r\n', name.blue, _.repeat(' ', spaces), help.white)
    if (name[0] === '<') continue
    this.print(line)
  }

  for (i = 0; i < varList.length; i++) {
    name   = varList[i].name
    help   = varList[i].help
    spaces = max - name.length
    line   = util.format('   %s %s %s\r\n', name.cyan, _.repeat(' ', spaces), help.white)
    this.print(line)
  }

  for (i = 0; i < multipleList.length; i++) {
    if (i === 0) {
      this.print('\r\n')
      this.print('   Remaining selections for option>'.bold)
      this.print('\r\n')
    }
    name   = multipleList[i].name
    help   = multipleList[i].help || ''
    help   = _.trimLeft(help, '!')
    spaces = max + 5 - name.length
    color  = multipleList.help ? 'green' : 'blue'
    line   = util.format('   %s %s %s\r\n', name[color], _.repeat(' ', spaces), help.yellow)
    this.print(line)
  }

  return done()
}

Butler.prototype._reformatLine = function (key, ch) {
  /* Replace multipleList spaces with a single */
  this.line = this.line.replace(/\s{1,}/g, ' ')

  var query  = _.contains(QUERY_CHARS, key)
  var ignore = _.contains(IGNORED_CHARS, key)

  if (ignore) { this._deleteLeft() }

  if (query) {
    this.line = this.line.slice(0, -1)
    this._tabComplete(true)
    this._deleteLeft()
  }

  this._refreshLine()
}

Butler.prototype.print = function (chunk) {
  this.output.write(chunk)
}

Butler.prototype.start = function () {
  this._motd()
  this.print('\r\n')
  this.print('[type ? for help]\r\n')
  this.print('\r\n')
  this.prompt()
}

module.exports = Butler
