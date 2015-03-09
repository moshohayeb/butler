"use strict";
var readline   = require('readline')
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

// The main method. It is called to return a
// list of available completions
function completer(cline, commands) {
    var line = Line(_.trimLeft(cline), commands);
    line.parse();
    return line.getCompList();
}

function _tabComplete() {
    var completeOn          = this.line.slice(0, this.cursor);
    var lastWord            = _.last(_.words(this.line, /[^ ]+/g));
    var common;
    var maxNameLen;

    this.output.write('\r\n');
    this.output.write(this._possibleMsg.grey);

    if (!lastWord) lastWord = '';

    var completions = this.completer(completeOn, this._commands);
    var predicate   = function (element) {
        return element.help[0] === '!';
    }
    var multiple    = _.filter(completions, predicate);
    var alist       = _.reject(completions, predicate);

    if (!completions) return;

    // calculate max length to determine column size
    maxNameLen      = _.max(_.pluck(completions, 'name'), function (s) {
        return s.length
    }).length;

    if (completions.length === 1
        && completions[0]['name'][0] !== '<') {  // dont auto complete on meta keys
        var appended = completions[0]['name'];


        if (_.last(this.line) !== ' ')
            appended = completions[0]['name'].slice(lastWord.length);

        this._insertString(appended + ' ');
    } else {
        this.output.write('\r\n');
        for (var i = 0; i < alist.length; i++) {
            var c, help, spaces, line;
            c      = alist[i]['name'];
            help   = alist[i]['help'] || '';
            spaces = maxNameLen + 5 - c.length;
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

        // append common prefix of ALL available autocompletions
        var prefix = _.filter(_.pluck(completions, 'name'), function (name) {
            return _.startsWith(name, lastWord)
        });
        common     = utility.commonPrefix(prefix);
        if (common.length > lastWord.length)
            this._insertString(common.slice(lastWord.length));


    }

    this._refreshLine();
}

function _reformatLine(key, ch) {
    var isQueryChar;
    var isIgnoredChar;

    this.line     = this.line.replace(/\s{1,}/g, ' ');

    /* Replace multiple spaces with a single */
    isQueryChar   = _.contains(queryChars, key);
    isIgnoredChar = _.contains(ignoredChars, key);

    if (isQueryChar) {
        this.line = this.line.slice(0, -1);
        this._tabComplete();
    }

    if (isIgnoredChar) {
        this._deleteLeft();
    }

    if (ch && ch.name === 'backspace'
        && this.line.slice(-1) === ' '
        && this._oldKey === ' ') {
        // space workaround on deletion
        this._deleteLeft();
    }

    this._refreshLine();
    this._oldKey  = key;
}


module.exports = exports = function (opts) {
    var rl          = readline.createInterface(process.stdin, process.stdout, completer);
    var arrow       = opts['prompt'] || '## ';
    var arrowLength = arrow.length;

    rl._tabComplete  = _tabComplete;
    rl._reformatLine = _reformatLine;

    rl._possibleMsg = opts['possibleMsg'] || 'Possible Completions:';
    rl._welcomeMsg  = opts['welcomeMsg'] || 'Welcome to CLI';
    rl._commands    = opts['commands'] || [];
    rl._oldKey      = null;

    rl.setPrompt(arrow.grey, arrowLength);

    registerCallbacks.call(rl);

    rl.start = function () {
        this.output.write(this._welcomeMsg.green + '\n');
        this.prompt();
    };

    return rl;
};
