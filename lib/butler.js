"use strict";
var util     = require('util')
  , keypress = require('keypress')
  , _        = require('lodash')
  , colors   = require('colors')
  , Line     = require('./line')
  , utility  = require('./utility')
  , readline = require('./readline');

var IGNORED_CHARS = ['~', '<', '>', '±'];
var QUERY_CHARS   = ['?'];

function registerCallbacks() {
  keypress(process.stdin);

  // called on each pressed char
  process.stdin.on('keypress', function (ch, key) {
    this._reformatLine(ch, key);
  }.bind(this));

  // on any exception print stack trace
  // TODO: better handling on uncaught exceptions on production
  process.on('uncaughtException', function (e) {
    console.log(e.stack.red);
    this.prompt();
  }.bind(this));

}

// The main method for auto completion.
// called to list of available completions
function completer(cline, commands) {
  var line = Line(_.trimLeft(cline), commands);
  // there may be errors but we dont care
  line.parse();
  return line.completes();
}


// The main method for execution
function processor(cline) {
  if (_.isEmpty(cline)) return;
  cline += ' '; // terminate the line (no partial)
  var line  = Line(_.trimLeft(cline), this._commands);
  var parse = line.parse();
  if (!parse) {
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
  return line.run();
}

function _tabComplete(show) {
  var completeOn = this.line.slice(0, this.cursor);
  var lastWord   = _.last(_.words(this.line, /[^ ]+/g));
  var common, max;
  var primary, name, help, spaces, line, color, i;

  var done = function () {
    if (!show)
      this.output.write('\r\n');
    this._refreshLine();
  }.bind(this);

  lastWord = lastWord ? lastWord : ''

  var complete = this.completer(completeOn, this._commands);
  if (!complete)
    return;

  var copy  = _.cloneDeep(complete);
  var mlist = function (element) { return element.help[0] === '!' }; //hax
  var plist = function (element) { return element.help[0] === '_' }; //hax
  var vlist;


  if (show && this._possibleMsg) {
    this.output.write('\r\n');
    this.output.write(this._possibleMsg.grey);
  }

  plist = _.remove(copy, plist); // primary instances

  mlist = _.remove(copy, mlist); // multiples
  mlist = _.sortBy(mlist, function (selection) { return _.contains(selection, 'selected') })

  vlist = copy; // the rest

  // calculate max length to determine column size
  max   = _.max(_.pluck(complete, 'name'), function (s) {
    return s.length
  }).length;

  if (complete.length === 1 && complete[0]['completeOn'] !== false) {
    var appended = complete[0]['name'];
    if (_.last(this.line) !== ' ')
      appended   = complete[0]['name'].slice(lastWord.length);
    this._insertString(appended + ' ');
    return done();
  }

  if (!show) return done();
  this.output.write('\r\n');

  primary = _.remove(vlist, {primary: true});
  primary = _.first(primary);
  if (primary) {
    name   = primary.name;
    help   = primary.help;
    spaces = max - name.length;
    line   = util.format('   %s %s %s\r\n', name.blue, _.repeat(' ', spaces), help.white);
    this.output.write(line);
  }

  for (i = 0; i < plist.length; i++) {
    name   = plist[i].name;
    help   = plist[i].help;
    help   = _.trimLeft(help, '_');
    spaces = max - name.length;
    line   = util.format('    %s %s %s\r\n', name.blue, _.repeat(' ', spaces), help.white);
    this.output.write(line);
  }

  for (i = 0; i < vlist.length; i++) {
    name   = vlist[i].name;
    help   = vlist[i].help;
    spaces = max - name.length;
    line   = util.format('   %s %s %s\r\n', name.cyan, _.repeat(' ', spaces), help.white);
    this.output.write(line);
  }

  if (mlist.length > 0) {
    this.output.write('\r\n');
    this.output.write('   Remaining selections for option>'.bold);
    this.output.write('\r\n');
  }

  for (i = 0; i < mlist.length; i++) {
    name   = mlist[i]['name'];
    help   = mlist[i]['help'] || '';
    help   = _.trimLeft(help, '!');
    spaces = max + 5 - c.length;
    color  = mlist.help ? 'green' : 'blue'
    line   = util.format('   %s %s %s\r\n', c[color], _.repeat(' ', spaces), help.yellow);
    this.output.write(line);
  }


  // append common prefix of ALL available autocomplete
  var prefix = _.filter(_.pluck(complete, 'name'), function (name) {
    return _.startsWith(name, lastWord)
  });

  common = utility.commonPrefix(prefix);
  if (common.length > lastWord.length)
    this._insertString(common.slice(lastWord.length));

  done();
}


function _reformatLine(key, ch) {
  /* Replace mlist spaces with a single */
  this.line = this.line.replace(/\s{1,}/g, ' ');

  var query    = _.contains(QUERY_CHARS, key);
  var ignore   = _.contains(IGNORED_CHARS, key);

  if (ignore)
    this._deleteLeft();

  if (query) {
    this.line = this.line.slice(0, -1);
    this._tabComplete(true);
  }

  // space workaround on deletion
  if (ch && ch.name === 'backspace' && this.line.slice(-1) === ' ' && this._oldKey === ' ')
    this._deleteLeft();

  this._refreshLine();
  this._oldKey = key;
}


module.exports = exports = function (opts) {
  var rl      = readline.createInterface(process.stdin, process.stdout, completer);
  var printer = _.flow(
    rl.output.write.bind(rl.output),
    function () {
      this.write('\r\n')
    }.bind(rl.output)
  );

  rl._tabComplete  = _tabComplete;
  rl._reformatLine = _reformatLine;
  rl.on('line', processor);

  rl._possibleMsg = opts['possibleMsg'] || null;
  rl._commands    = opts['commands'] || [];
  rl._oldKey      = null;
  rl._arrow       = opts['prompt'] || '## ';
  rl._motd        = _.isFunction(opts['motd']) ? opts['motd'] : function () {
  };

  rl.setPrompt(rl._arrow.grey, rl._arrow.length);
  registerCallbacks.call(rl);

  rl.start = function () {
    this._motd(printer);
    this.output.write('\r\n');
    this.output.write('[type ? for help]\r\n');
    this.output.write('\r\n');
    this.prompt();
  };

  return rl;
};
