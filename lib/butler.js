"use strict";
var readline = require('readline')
  , util     = require('util')
  , keypress = require('keypress')
  , _        = require('lodash')
  , colors   = require('colors')
  , Line     = require('./line')
  , utility  = require('./utility');


var ignoredChars = ['~', '<', '>'];
var queryChars   = ['?'];

function registerCallbacks() {
  keypress(process.stdin);

  // called on each pressed char
  process.stdin.on('keypress', function (ch, key) {
    this._reformatLine(ch, key);
  }.bind(this));

  // on any exception print stack trace
  process.on('uncaughtException', function (e) {
    console.log(e.stack.red);
    this.prompt();
  }.bind(this));
}

// The main method for auto completion.
// called to list of available completions
function completer(cline, commands) {
  var line = Line(_.trimLeft(cline), commands);
  if (!line.parse()) return [];
  return line.getCompleteList();
}


// The main method for execution
function processor(cline) {
  if (_.isEmpty(cline)) return;
  cline += ' '; // terminate the line (no partial)
  var line = Line(_.trimLeft(cline), this._commands);
  var parse   = line.parse();
  var valid   = line.validate();
  if (!parse || !valid) {
    var emsg = '%%' + line._errorMsg + '\r\n';
    var eloc = line._errorLocation;
    if (eloc >= 0) {
      var spacesCount = eloc + this._arrow.length;
      var spaces      = _.repeat(' ', spacesCount);
      this.output.write(util.format('%s^\r\n', spaces).red);
    }
    this.output.write(emsg.red);
    return;
  }

  console.log('Processing The Command');
}

function _tabComplete() {
  var completeOn = this.line.slice(0, this.cursor);
  var lastWord   = _.last(_.words(this.line, /[^ ]+/g));
  var common;
  var maxNameLen;

  lastWord = lastWord ? lastWord : ''

  var complete  = this.completer(completeOn, this._commands);
  var predicate = function (element) {
    return element.help[0] === '!';
  }

  if (!complete) {
    return;
  }

  this.output.write('\r\n');
  this.output.write(this._possibleMsg.grey);

  var multiple = _.filter(complete, predicate);
  var vlist    = _.reject(complete, predicate);

  // calculate max length to determine column size
  maxNameLen   = _.max(_.pluck(complete, 'name'), function (s) {
    return s.length
  }).length;

  if (complete.length === 1
    && complete[0]['name'][0] !== '<') {  // dont auto complete on meta keys
    var appended = complete[0]['name'];


    if (_.last(this.line) !== ' ')
      appended   = complete[0]['name'].slice(lastWord.length);

    this._insertString(appended + ' ');
  } else {
    this.output.write('\r\n');
    for (var i = 0; i < vlist.length; i++) {
      var c, help, spaces, line;
      c      = vlist[i]['name'];
      help   = vlist[i]['help'] || '';
      spaces = maxNameLen - c.length;
      line   = util.format('%s %s %s\r\n', c.cyan, _.repeat(' ', spaces), help.white);
      this.output.write(line);
    }

    if (multiple.length > 0) {
      this.output.write('\r\n');
      this.output.write('Available extra selections:');
      this.output.write('\r\n');
      multiple = _.sortBy(multiple, function (selection) {
        return _.contains(selection, 'selected');
      })
      for (var i = 0; i < multiple.length; i++) {
        var c, help, spaces, line, color;
        c      = multiple[i]['name'];
        help   = multiple[i]['help'] || '';
        help   = _.trimLeft(help, '!');
        spaces = maxNameLen + 5 - c.length;
        color  = multiple.help ? 'green' : 'blue'
        line   = util.format('%s %s %s\r\n', c[color], _.repeat(' ', spaces), help.yellow);
        this.output.write(line);
      }

    }

    // append common prefix of ALL available autocomplete
    var prefix = _.filter(_.pluck(complete, 'name'), function (name) {
      return _.startsWith(name, lastWord)
    });
    common     = utility.commonPrefix(prefix);
    if (common.length > lastWord.length)
      this._insertString(common.slice(lastWord.length));


  }

  this._refreshLine();
}

function _reformatLine(key, ch) {
  /* Replace multiple spaces with a single */
  this.line = this.line.replace(/\s{1,}/g, ' ');

  var isQueryChar   = _.contains(queryChars, key);
  var isIgnoredChar = _.contains(ignoredChars, key);

  if (isQueryChar) {
    this.line = this.line.slice(0, -1);
    this._tabComplete();
  }

  if (isIgnoredChar)
    this._deleteLeft();

  // space workaround on deletion
  if (ch && ch.name === 'backspace'
    && this.line.slice(-1) === ' '
    && this._oldKey === ' ') {
    this._deleteLeft();
  }

  this._refreshLine();
  this._oldKey      = key;
}


module.exports = exports = function (opts) {
  var rl = readline.createInterface(process.stdin, process.stdout, completer);

  rl._tabComplete  = _tabComplete;
  rl._reformatLine = _reformatLine;
  rl.on('line', processor);

  rl._possibleMsg = opts['possibleMsg'] || 'Possible Completions:';
  rl._welcomeMsg  = opts['welcomeMsg'] || 'Welcome to CLI';
  rl._commands    = opts['commands'] || [];
  rl._oldKey      = null;
  rl._arrow       = opts['prompt'] || '## ';

  rl.setPrompt(rl._arrow.grey, rl._arrow.length);

  registerCallbacks.call(rl);

  rl.start = function () {
    this.output.write(this._welcomeMsg.green + '\n');
    this.prompt();
  };

  return rl;
};
