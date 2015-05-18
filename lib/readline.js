// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict'
var kHistorySize = 30

var util          = require('util')
var EventEmitter  = require('events').EventEmitter

var keypress      = require('keypress')

function Interface() {
  if (!(this instanceof Interface)) { return new Interface() }

  var self = this

  this.input = this.stdin = process.stdin
  this.output = this.stdout = process.stdout

  this._sawReturn   = false
  this.line         = ''
  this.cursor       = 0
  this.history      = []
  this.historyIndex = -1
  this.terminal     = !!this.stdout.isTTY

  // Interface is an EventEmitter
  EventEmitter.call(this)

  this.setPrompt('> ')
  this._setRawMode(true)

  function onKeypress(s, key) { ttyWrite.call(self, s, key) }

  function onResize() { self._refreshLine() }

  if (!this.terminal) { throw new Error('CLI only support TTY terminal') }

  // make stdin emit keypress events
  keypress(this.stdin)

  // input usually refers to stdin
  this.stdin.on('keypress', onKeypress)
  this.stdout.on('resize', onResize)

  this.once('close', function () {
    this.stdin.removeListener('keypress', onKeypress)
    this.stdout.removeListener('resize', onResize)
  }.bind(this))
}
util.inherits(Interface, EventEmitter)
exports.Interface = Interface

Interface.prototype.__defineGetter__('columns', function () {
  var columns = Infinity
  if (this.stdout && this.stdout.columns) {
    columns = this.stdout.columns
  }
  return columns
})

Interface.prototype.setPrompt = function (prompt) {
  this._prompt = prompt
}

Interface.prototype.getPrompt = function () {
  return this._prompt
}

Interface.prototype.close = function () {
  this._setRawMode(false)
  this.emit('close')
}

Interface.prototype.prompt = function () {
  this._refreshLine()
}

Interface.prototype._setRawMode = function (mode) {
  if (util.isFunction(this.input.setRawMode)) {
    return this.input.setRawMode(mode)
  }
}

Interface.prototype.write = function (s) {
  if (!util.isString(s)) { return false }

  this.output.write(s)
  return true
}

Interface.prototype._addHistory = function () {
  if (this.line.length === 0) return ''

  if (this.history.length === 0 || this.history[0] !== this.line) {
    this.history.unshift(this.line)

    // Only store so many
    if (this.history.length > kHistorySize) this.history.pop()
  }

  this.historyIndex = -1
  return this.history[0]
}

Interface.prototype._refreshLine = function () {
  // line length
  var line     = this._prompt.white.bold + this.line
  var dispPos  = this._getDisplayPos(line)
  var lineCols = dispPos.cols
  var lineRows = dispPos.rows

  // cursor position
  var cursorPos = this._getCursorPos()

  // first move to the bottom of the current line, based on cursor pos
  var prevRows = this.prevRows || 0
  if (prevRows > 0) {
    exports.moveCursor(this.stdout, 0, -prevRows)
  }

  // Cursor to left edge.
  exports.cursorTo(this.stdout, 0)
  // erase data
  exports.clearScreenDown(this.stdout)

  // Write the prompt and the current buffer content.
  this.write(line)

  // Force terminal to allocate a new line
  if (lineCols === 0) { this.write(' ') }

  // Move cursor to original position.
  exports.cursorTo(this.stdout, cursorPos.cols)

  var diff = lineRows - cursorPos.rows
  if (diff > 0) {
    exports.moveCursor(this.stdout, 0, -diff)
  }

  this.prevRows = cursorPos.rows
}

Interface.prototype._insertString = function (c) {
  // BUG: Problem when adding tabs with following content.
  //     Perhaps the bug is in _refreshLine(). Not sure.
  //     A hack would be to insert spaces instead of literal '\t'.
  if (this.cursor < this.line.length) {
    var beg   = this.line.slice(0, this.cursor)
    var end   = this.line.slice(this.cursor, this.line.length)
    this.line = beg + c + end
    this.cursor += c.length
    this._refreshLine()
  } else {
    this.line += c
    this.cursor += c.length

    if (this._getCursorPos().cols === 0) {
      this._refreshLine()
    } else {
      this.write(c)
    }

    // a hack to get the line refreshed if it's needed
    this._moveCursor(0)
  }
}

Interface.prototype._wordLeft = function () {
  if (this.cursor > 0) {
    var leading = this.line.slice(0, this.cursor)
    var match   = leading.match(/([^\w\s]+|\w+|)\s*$/)
    this._moveCursor(-match[0].length)
  }
}

Interface.prototype._wordRight = function () {
  if (this.cursor < this.line.length) {
    var trailing = this.line.slice(this.cursor)
    var match    = trailing.match(/^(\s+|\W+|\w+)\s*/)
    this._moveCursor(match[0].length)
  }
}

Interface.prototype._deleteLeft = function () {
  if (this.cursor > 0 && this.line.length > 0) {
    this.line = this.line.slice(0, this.cursor - 1) +
      this.line.slice(this.cursor, this.line.length)
    this.cursor--
    this._refreshLine()
  }
}

Interface.prototype._deleteRight = function () {
  this.line = this.line.slice(0, this.cursor) +
    this.line.slice(this.cursor + 1, this.line.length)
  this._refreshLine()
}

Interface.prototype._deleteWordLeft = function () {
  if (this.cursor > 0) {
    var leading = this.line.slice(0, this.cursor)
    var match   = leading.match(/([^\w\s]+|\w+|)\s*$/)
    leading     = leading.slice(0, leading.length - match[0].length)
    this.line   = leading + this.line.slice(this.cursor, this.line.length)
    this.cursor = leading.length
    this._refreshLine()
  }
}

Interface.prototype._deleteWordRight = function () {
  if (this.cursor < this.line.length) {
    var trailing = this.line.slice(this.cursor)
    var match    = trailing.match(/^(\s+|\W+|\w+)\s*/)
    this.line    = this.line.slice(0, this.cursor) +
      trailing.slice(match[0].length)
    this._refreshLine()
  }
}

Interface.prototype._deleteLineLeft = function () {
  this.line   = this.line.slice(this.cursor)
  this.cursor = 0
  this._refreshLine()
}

Interface.prototype._deleteLineRight = function () {
  this.line = this.line.slice(0, this.cursor)
  this._refreshLine()
}

Interface.prototype._clearLine = function () {
  this._moveCursor(+Infinity)
  this.write('\r\n')
  this.line     = ''
  this.cursor   = 0
  this.prevRows = 0
}

Interface.prototype._line = function () {
  var line = this._addHistory()
  this._clearLine()
  this.emit('line', line)
}

Interface.prototype._historyNext = function () {
  if (this.historyIndex > 0) {
    this.historyIndex--
    this.line   = this.history[this.historyIndex]
    this.cursor = this.line.length // set cursor to end of line.
    this._refreshLine()
  } else if (this.historyIndex === 0) {
    this.historyIndex = -1
    this.cursor       = 0
    this.line         = ''
    this._refreshLine()
  }
}

Interface.prototype._historyPrev = function () {
  if (this.historyIndex + 1 < this.history.length) {
    this.historyIndex++
    this.line   = this.history[this.historyIndex]
    this.cursor = this.line.length // set cursor to end of line.

    this._refreshLine()
  }
}

// Returns the last character's display position of the given string
Interface.prototype._getDisplayPos = function (str) {
  var offset = 0
  var col    = this.columns
  var row    = 0
  var code

  str = stripVTControlCharacters(str)
  for (var i = 0, len = str.length; i < len; i++) {
    code = codePointAt(str, i)
    if (code >= 0x10000) { // surrogates
      i++
    }
    if (code === 0x0a) { // new line \n
      offset = 0
      row += 1
      continue
    }
    if (isFullWidthCodePoint(code)) {
      if ((offset + 1) % col === 0) {
        offset++
      }
      offset += 2
    } else {
      offset++
    }
  }
  var cols = offset % col
  var rows = row + (offset - cols) / col
  return { cols: cols, rows: rows }
}

// Returns current cursor's position and line
Interface.prototype._getCursorPos = function () {
  var columns         = this.columns
  var strBeforeCursor = this._prompt + this.line.substring(0, this.cursor)
  var dispPos         = this._getDisplayPos(stripVTControlCharacters(strBeforeCursor))
  var cols            = dispPos.cols
  var rows            = dispPos.rows
  // If the cursor is on a full-width character which steps over the line,
  // move the cursor to the beginning of the next line.
  if (cols + 1 === columns &&
    this.cursor < this.line.length &&
    isFullWidthCodePoint(codePointAt(this.line, this.cursor))) {
    rows++
    cols = 0
  }
  return { cols: cols, rows: rows }
}

// This function moves cursor dx places to the right
// (-dx for left) and refreshes the line if it is needed
Interface.prototype._moveCursor = function (dx) {
  var oldcursor = this.cursor
  var oldPos    = this._getCursorPos()
  this.cursor += dx

  // bounds query
  if (this.cursor < 0) this.cursor = 0
  else if (this.cursor > this.line.length) this.cursor = this.line.length

  var newPos = this._getCursorPos()

  // query if cursors are in the same line
  if (oldPos.rows === newPos.rows) {
    var diffCursor = this.cursor - oldcursor
    var diffWidth
    if (diffCursor < 0) {
      diffWidth = -getStringWidth(
        this.line.substring(this.cursor, oldcursor)
      )
    } else if (diffCursor > 0) {
      diffWidth = getStringWidth(
        this.line.substring(this.cursor, oldcursor)
      )
    }
    exports.moveCursor(this.stdout, diffWidth, 0)
    this.prevRows  = newPos.rows
  } else {
    this._refreshLine()
  }
}

// Regexes used for ansi escape code splitting
var metaKeyCodeReAnywhere     = /(?:\x1b)([a-zA-Z0-9])/
var functionKeyCodeReAnywhere = new RegExp('(?:\x1b+)(O|N|\\[|\\[\\[)(?:' + [
    '(\\d+)(?:;(\\d+))?([~^$])',
    '(?:M([@ #!a`])(.)(.))', // mouse
    '(?:1;)?(\\d+)?([a-zA-Z])'
  ].join('|') + ')')

/**
 * moves the cursor to the x and y coordinate on the given stream
 */
function cursorTo(stream, x, y) {
  if (util.isNullOrUndefined(stream)) { return }
  if (!util.isNumber(x) && !util.isNumber(y)) { return }

  if (!util.isNumber(x)) {
    throw new Error("Can't set cursor row without also setting it's column")
  }

  if (!util.isNumber(y)) {
    stream.write('\x1b[' + (x + 1) + 'G')
  } else {
    stream.write('\x1b[' + (y + 1) + ';' + (x + 1) + 'H')
  }
}
exports.cursorTo = cursorTo

/**
 * moves the cursor relative to its current location
 */
function moveCursor(stream, dx, dy) {
  if (util.isNullOrUndefined(stream)) { return }

  if (dx < 0) {
    stream.write('\x1b[' + (-dx) + 'D')
  } else if (dx > 0) {
    stream.write('\x1b[' + dx + 'C')
  }

  if (dy < 0) {
    stream.write('\x1b[' + (-dy) + 'A')
  } else if (dy > 0) {
    stream.write('\x1b[' + dy + 'B')
  }
}
exports.moveCursor = moveCursor

/**
 * clears the current line the cursor is on:
 *   -1 for left of the cursor
 *   +1 for right of the cursor
 *    0 for the entire line
 */
function clearLine(stream, dir) {
  if (util.isNullOrUndefined(stream)) { return }

  if (dir < 0) {
    // to the beginning
    stream.write('\x1b[1K')
  } else if (dir > 0) {
    // to the end
    stream.write('\x1b[0K')
  } else {
    // entire line
    stream.write('\x1b[2K')
  }
}
exports._clearLine = clearLine

/**
 * clears the screen from the current position of the cursor down
 */
function clearScreenDown(stream) {
  if (util.isNullOrUndefined(stream)) { return }

  stream.write('\x1b[0J')
}
exports.clearScreenDown = clearScreenDown

/**
 * Returns the number of columns required to display the given string.
 */
function getStringWidth(str) {
  var width = 0
  str       = stripVTControlCharacters(str)
  for (var i = 0, len = str.length; i < len; i++) {
    var code = codePointAt(str, i)
    if (code >= 0x10000) { // surrogates
      i++
    }
    if (isFullWidthCodePoint(code)) {
      width += 2
    } else {
      width++
    }
  }
  return width
}
exports.getStringWidth = getStringWidth

/**
 * Returns true if the character represented by a given
 * Unicode code point is full-width. Otherwise returns false.
 */
function isFullWidthCodePoint(code) {
  if (isNaN(code)) {
    return false
  }

  // Code points are derived from:
  // http://www.unicode.org/Public/UNIDATA/EastAsianWidth.txt
  if (code >= 0x1100 && (
    code <= 0x115f || // Hangul Jamo
    0x2329 === code || // LEFT-POINTING ANGLE BRACKET
    0x232a === code || // RIGHT-POINTING ANGLE BRACKET
      // CJK Radicals Supplement .. Enclosed CJK Letters and Months
    (0x2e80 <= code && code <= 0x3247 && code !== 0x303f) ||
      // Enclosed CJK Letters and Months .. CJK Unified Ideographs Extension A
    0x3250 <= code && code <= 0x4dbf ||
      // CJK Unified Ideographs .. Yi Radicals
    0x4e00 <= code && code <= 0xa4c6 ||
      // Hangul Jamo Extended-A
    0xa960 <= code && code <= 0xa97c ||
      // Hangul Syllables
    0xac00 <= code && code <= 0xd7a3 ||
      // CJK Compatibility Ideographs
    0xf900 <= code && code <= 0xfaff ||
      // Vertical Forms
    0xfe10 <= code && code <= 0xfe19 ||
      // CJK Compatibility Forms .. Small Form Variants
    0xfe30 <= code && code <= 0xfe6b ||
      // Halfwidth and Fullwidth Forms
    0xff01 <= code && code <= 0xff60 ||
    0xffe0 <= code && code <= 0xffe6 ||
      // Kana Supplement
    0x1b000 <= code && code <= 0x1b001 ||
      // Enclosed Ideographic Supplement
    0x1f200 <= code && code <= 0x1f251 ||
      // CJK Unified Ideographs Extension B .. Tertiary Ideographic Plane
    0x20000 <= code && code <= 0x3fffd)) {
    return true
  }
  return false
}
exports.isFullWidthCodePoint = isFullWidthCodePoint

/**
 * Returns the Unicode code point for the character at the
 * given index in the given string. Similar to String.charCodeAt(),
 * but this function handles surrogates (code point >= 0x10000).
 */
function codePointAt(str, index) {
  var code = str.charCodeAt(index)
  var low
  if (0xd800 <= code && code <= 0xdbff) { // High surrogate
    low = str.charCodeAt(index + 1)
    if (!isNaN(low)) {
      code = 0x10000 + (code - 0xd800) * 0x400 + (low - 0xdc00)
    }
  }
  return code
}
exports.codePointAt = codePointAt

/**
 * Tries to remove all VT control characters. Use to estimate displayed
 * string width. May be buggy due to not running a real state machine
 */
function stripVTControlCharacters(str) {
  str = str.replace(new RegExp(functionKeyCodeReAnywhere.source, 'g'), '')
  return str.replace(new RegExp(metaKeyCodeReAnywhere.source, 'g'), '')
}
exports.stripVTControlCharacters = stripVTControlCharacters

// handle a write from the tty
function ttyWrite(s, key) {
  key = key || {}

  // ignore keys while processing
  if (this.processing) {
    if (key.ctrl && key.name === 'c') { this.emit('CTRL-C') }
    return
  }

  // Ignore escape key - Fixes #2876
  if (key.name === 'escape') { return }

  if (key.ctrl && key.shift) {
    /* Control and shift pressed */
    switch (key.name) {
      case 'backspace':
        this._deleteLineLeft()
        break

      case 'delete':
        this._deleteLineRight()
        break
    }
  } else if (key.ctrl) {
    /* Control key pressed */

    switch (key.name) {
      case 'c':
        process.exit(0)
        this.output.write('\r\n')
        break

      case 'h': // delete left
        this._deleteLeft()
        break

      case 'd':
        this.output.write('\r\n')
        break

      case 'u': // delete the whole line
        this.cursor = 0
        this.line   = ''
        this._refreshLine()
        break

      case 'k': // delete from current to end of line
        this._deleteLineRight()
        break

      case 'a': // go to the start of the line
        this._moveCursor(-Infinity)
        break

      case 'e': // go to the end of the line
        this._moveCursor(+Infinity)
        break

      case 'b': // back one character
        this._moveCursor(-1)
        break

      case 'f': // forward one character
        this._moveCursor(+1)
        break

      case 'l': // clear the whole screen
        exports.cursorTo(this.stdout, 0, 0)
        exports.clearScreenDown(this.stdout)
        this._refreshLine()
        break

      case 'n': // next history item
        this._historyNext()
        break

      case 'p': // previous history item
        this._historyPrev()
        break

      case 'z':
        this.output.write('\r\n')
        break

      case 'w': // delete backwards to a word boundary
      case 'backspace':
        this._deleteWordLeft()
        break

      case 'delete': // delete forward to a word boundary
        this._deleteWordRight()
        break

      case 'left':
        this._wordLeft()
        break

      case 'right':
        this._wordRight()
        break
    }
  } else if (key.meta) {
    /* Meta key pressed */

    switch (key.name) {
      case 'b': // backward word
        this._wordLeft()
        break

      case 'f': // forward word
        this._wordRight()
        break

      case 'd': // delete forward word
      case 'delete':
        this._deleteWordRight()
        break

      case 'backspace': // delete backwards to a word boundary
        this._deleteWordLeft()
        break
    }
  } else {
    /* No modifier keys used */

    // \r bookkeeping is only relevant if a \n comes right after.
    if (this._sawReturn && key.name !== 'enter') {
      this._sawReturn = false
    }

    switch (key.name) {
      case 'return':  // carriage return, i.e. \r
        this._sawReturn = true
        this._line()
        break

      case 'enter':
        if (this._sawReturn) { this._sawReturn = false }
        else { this._line() }
        break

      case 'backspace':
        this._deleteLeft()
        break

      case 'delete':
        this._deleteRight()
        break

      case 'tab':
        this.emit('autocomplete')
        break

      case 'left':
        this._moveCursor(-1)
        break

      case 'right':
        this._moveCursor(+1)
        break

      case 'home':
        this._moveCursor(-Infinity)
        break

      case 'end':
        this._moveCursor(+Infinity)
        break

      case 'up':
        this._historyPrev()
        break

      case 'down':
        this._historyNext()
        break

      default:
        if (util.isBuffer(s)) { s = s.toString('utf-8') }

        if (s) {
          var lines = s.split(/\r\n|\n|\r/)
          for (var i = 0, len = lines.length; i < len; i++) {
            if (i > 0) {
              this._line()
            }
            this._insertString(lines[i])
          }
        }
    }
  }
}
