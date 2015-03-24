var _      = require('lodash');
var util   = require('util');
var chai   = require('chai');
var expect = chai.expect;

var compare = require('./helpers').compare;
require('blanket')({
  pattern: function (filename) {
    return !/node_modules/.test(filename);
  }
})

var LineJS   = require('../lib/line.js')
var Commands = require('./schema.js')['commands'];

var topLevelCommands = [
  'purge', 'show', 'exit',
  'reboot', 'ping', 'ssh',
  'backup', 'health-stat', 'traceroute'
]

var Line = _.partialRight(LineJS, Commands);
var KEYS = ['name', 'help', 'completeOn', 'primary'];

describe('@autocompletion', function () {
  var name       = _.partialRight(_.pluck, 'name');
  var help       = _.partialRight(_.pluck, 'help');
  var completeOn = _.partialRight(_.pluck, 'completeOn');
  var primary    = _.partialRight(_.pluck, 'primary');
  var rv;

  function is(names, type) {
    var checker = 'is' + _.capitalize(type.toLowerCase());
    if (!_.all(names, _[checker]))
      throw new Error(util.format('recieved a non-%s name (%s)', type, names))
  }

  function hasLessThanOnePrimary(rv) {
    var primaries = primary(rv);
    if (_.countBy(primaries, function(b) {return b})['true'] > 1)
      throw new Error('more than one primary is not permitted');
  }

  function hasCorrectKeys(rv) {
    if (_.isArray(rv))
      return _.all(rv, function (v) { hasCorrectKeys(v) })

    if (!_.isObject(rv))
      throw new Error('auto completion entry is not an object');

    if (!compare(_.keys(rv), KEYS))
      throw new Error(util.format(
        'auto completion does not hold a valid entry (Got: %s)', _.keys(rv)));
  }

  function processLine(line) {
    var pline;
    pline = Line(line);
    pline.parse();
    return pline.complete();
  }

  beforeEach(function () {
    rv = null;
  })


  // called after each test case to make sure
  // that every returned object confirms to
  // what the API promises [ {OPT1} {OPT2} {OPT#} ]
  afterEach(function () {
    hasCorrectKeys(rv);
    hasLessThanOnePrimary(rv);
    is(name(rv), 'string');
    is(help(rv), 'string');

  })


  describe('@basic', function () {
    describe('@lineParsing', function () {
      var lines = [
        'some \tgarbage \bthat \ndoes\'t exist\r',
        '',
        'show hardware ',
        'show interface',
        '!!',
        '   ',
        '<>',
        '?',
        1241251,
        null,
        1.34,
        { exist: false },
        []
      ]

      _.each(lines, function (line) {
        it(util.format('should always return an array for value "%s"', line), function () {
          rv = processLine(line);
          expect(rv).to.be.an('array');
        }) // it
      }) // each

    }) // lineparsing
  }) // basic

  describe('@emptyLine', function () {

    it('should return the correct results', function () {
      rv = processLine('')
      expect(name(rv)).to.have.members(topLevelCommands);
    })

  }) // describe

  describe('@invalidPath', function () {

    var lines = [
      'invalid path',
      'zig zag  ',
      '           GGG          ',
      'show zigzag ',
      'ping zigzag power',
    ]

    _.each(lines, function (line) {
      it(util.format('should return an array of zero length on incorrect input: "%s"', line), function () {
        rv = processLine(line);
        expect(rv).to.be.an('array').and.be.empty;
      }) // it
    }) // each
  }) // describe

  describe('@commands', function () {
    var cases = [
      { line: 'show ', expected: ['mac-address-table', 'hardware', 'clock', 'ip', 'terminal', 'log', 'version'] },
      { line: 'purge ', expected: ['mac-address-table', 'log'] },
      { line: 'show hardware', expected: ['hardware'] },
      { line: 'show hardware ', expected: ['hard-drive', 'network-card', 'cpu'] },
      { line: 'show hardware hard-drive', expected: ['hard-drive'] },
      { line: 'show hardware hard-drive ', expected: ['fan', 'controller', 'errors', 'pager'] },
    ]

    _.each(cases, function (c) {
      it(util.format('should return correct result on deep traversal: "%s"', c.line), function () {
        rv = processLine(c.line);
        expect(name(rv)).to.have.members(c.expected)
      }) //it
    }) // each

    it('should display <cr> on executable commands', function () {
      rv = processLine('show version ')
      expect(name(rv)).to.include('<cr>');
    })

    it('should not display <cr> on incomplete commands', function () {
      rv = processLine('show ')
      expect(name(rv)).to.not.include('<cr>');

      rv = processLine('show')
      expect(name(rv)).to.not.include('<cr>');
    })

  }) // describe commands

  describe('@pipes', function () {
    var cases = [
      { line: 'ping', pipe: false },
      { line: 'ping ', pipe: true },
      { line: 'reboot ', pipe: false },
      { line: 'reboot', pipe: false },
      { line: 'purge log ', pipe: false },
      { line: 'show hardware hard-drive errors ', pipe: false },
      { line: 'show hardware hard-drive errors', pipe: false },
      { line: 'show hardware hard-drive fan ', pipe: true },
      { line: 'show hardware hward-drive fan', pipe: false }
    ]

    _.each(cases, function (c) {
      it(util.format('should display/hide pipe properly on command "%s"', c.line), function () {
        rv               = processLine(c.line);
        var commandNames = name(rv);
        if (c.pipe)
          expect(commandNames).to.include('|')
        else
          expect(commandNames).to.not.include('|')
      }) // it
    }) // each
  }) // describe pipes

  describe('@partial', function () {
    var cases = [
      { line: 's', expected: ['show', 'ssh'] },
      { line: 'show', expected: ['show'] },
      { line: 'ssh', expected: ['ssh'] }
    ];

    _.each(cases, function (c) {
      it(util.format('should return only results that start with partial: %s', c.line), function () {
        rv = processLine(c.line)
        expect(name(rv)).to.have.members(c.expected)
      }) //it
    }) // each
  }) // describe partial

  describe('@option', function() {
    describe('@hidegivenoptions', function() {
      var cases = [
        {line: 'ping ',
          expected: ['<host>', 'ttl', 'size', 'flood', 'timeout', 'source', '<cr>', '|', '<value>']},
        {line: 'ping t',
          expected: ['timeout', 'ttl']},
        {line: 'ping ttl',
          expected: ['ttl']},
        {line: 'ping ttl ',
          expected: ['<value>']},
        {line: 'ping ttl xxx',
          expected: []},
        {line: 'ping ttl xxx ',
          expected: ['<host>', 'size', 'flood', 'timeout', 'source', '<cr>', '|', '<value>']},
        {line: 'ping ttl xxx ',
          expected: ['<host>', 'size', 'flood', 'timeout', 'source', '<cr>', '|', '<value>']},
        {line: 'ping ttl xxx flood',
          expected: ['flood']},
        {line: 'ping ttl xxx flood ',
          expected: ['<host>', 'size', 'timeout', 'source', '<cr>', '|', '<value>']},
        {line: 'ping ttl xxx flood timeout yyy ',
          expected: ['<host>', 'size', 'source', '<cr>', '|', '<value>']},
        {line: 'ping ttl qwr flood timeout qwr source qwr size ttt 10.10.50.3',
          expected: []},
        {line: 'ping ttl qwr flood timeout qwr source qwr size ttt 10.10.50.3 ',
          expected: ['<cr>', '|']},
      ]

      _.each(cases, function (c) {
        it(util.format('should display the correct options for command "%s" ', c.line), function () {
          rv = processLine(c.line);
          expect(name(rv)).to.have.members(c.expected)
        }) // it
      }) // each
    }) // describe ('hidegivenoptions')

    describe('@optionModifiers', function () {
      it('should handle boolean option properly', function () {
        rv = processLine('ping flood ');
        expect(name(rv)).to.not.include('flood')
      })

      it('should handle hidden option properly', function () {
        rv = processLine('ping ');
        expect(name(rv)).to.not.include('hiddenOpt')
      })

      it('should handle hidden option properly', function () {
        rv = processLine('ping ');
        expect(name(rv)).to.not.include('hiddenOpt')
      })
    })
  }) // describe (option)
})
