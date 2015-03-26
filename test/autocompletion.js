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

var Line = _.partialRight(LineJS, Commands, { appendGroupHelp: true });
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
    if (_.countBy(primaries, function (b) {return b})['true'] > 1)
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
      }); // it
    }); // each
  }); // describe

  describe('@commands', function () {
    var cases = [
      { line: 'show ', expected: ['mac-address-table', 'hardware', 'clock', 'ip', 'terminal', 'log', 'version'] },
      { line: 'purge ', expected: ['mac-address-table', 'log'] },
      { line: 'show hardware', expected: ['hardware'] },
      { line: 'show hardware ', expected: ['hard-drive', 'network-card', 'cpu'] },
      { line: 'show hardware hard-drive', expected: ['hard-drive'] },
      { line: 'show hardware hard-drive ', expected: ['fan', 'controller', 'errors', 'pager'] },
    ];

    _.each(cases, function (c) {
      it(util.format('should return correct result on deep traversal: "%s"', c.line), function () {
        rv = processLine(c.line);
        expect(name(rv)).to.have.members(c.expected)
      }); //it
    }); // each

    it('should display <cr> on executable commands', function () {
      rv = processLine('show version ');
      expect(name(rv)).to.include('<cr>');
    })

    it('should not display <cr> on incomplete commands', function () {
      rv = processLine('show ');
      expect(name(rv)).to.not.include('<cr>');

      rv = processLine('show');
      expect(name(rv)).to.not.include('<cr>');
    });
  }); // describe commands

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
    ];

    _.each(cases, function (c) {
      it(util.format('should display/hide pipe properly on command "%s"', c.line), function () {
        rv               = processLine(c.line);
        var commandNames = name(rv);
        if (c.pipe)
          expect(commandNames).to.include('|')
        else
          expect(commandNames).to.not.include('|')
      }); // it
    }); // each
  }); // describe pipes

  describe('@partial', function () {
    var cases = [
      { line: 's', expected: ['show', 'ssh'] },
      { line: 'show', expected: ['show'] },
      { line: 'ssh', expected: ['ssh'] }
    ];

    _.each(cases, function (c) {
      it(util.format('should return only results that start with partial: %s', c.line), function () {
        rv = processLine(c.line);
        expect(name(rv)).to.have.members(c.expected);
      }); //it
    }); // each
  }); // describe partial

  describe('@options', function () {
    describe('@hidegivenoptions', function () {
      var cases = [
        {
          line:     'ping ',
          expected: ['<host>', 'ttl', 'size', 'flood', 'timeout', 'src-ip', 'interface', 'fake', '<cr>', '|', '<value>']
        },
        {
          line:     'ping t',
          expected: ['timeout', 'ttl']
        },
        {
          line:     'ping ttl',
          expected: ['ttl']
        },
        {
          line:     'ping ttl ',
          expected: ['NUM<length1-5>']
        },
        {
          line:     'ping ttl xxx',
          expected: []
        },
        {
          line:     'ping ttl xxx ',
          expected: ['<host>', 'size', 'flood', 'timeout', 'src-ip', 'interface', 'fake', '<cr>', '|', '<value>']
        },
        {
          line:     'ping ttl xxx ',
          expected: ['<host>', 'size', 'flood', 'timeout', 'src-ip', 'interface', 'fake', '<cr>', '|', '<value>']
        },
        {
          line:     'ping ttl xxx flood',
          expected: ['flood']
        },
        {
          line:     'ping ttl xxx flood ',
          expected: ['<host>', 'size', 'timeout', 'src-ip', 'interface', 'fake', '<cr>', '|', '<value>']
        },
        {
          line:     'ping ttl xxx flood timeout yyy ',
          expected: ['<host>', 'size', 'src-ip', 'interface', 'fake', '<cr>', '|', '<value>']
        },
        {
          line:     'ping ttl qwr flood timeout qwr src-ip qwr size ttt 10.10.50.3',
          expected: []
        },
        {
          line:     'ping ttl qwr flood timeout qwr fake size ttt 10.10.50.3 ',
          expected: ['<cr>', '|']
        },
        {
          line:     'ping ttl qwr flood timeout qwr interface eth3 size ttt 10.10.50.3 ',
          expected: ['<cr>', '|']
        }
      ];

      _.each(cases, function (c) {
        it(util.format('should hide the given options for command "%s" ', c.line), function () {
          rv = processLine(c.line);
          expect(name(rv)).to.have.members(c.expected)
        }); // it
      }); // each
    }); // describe ('hidegivenoptions')

    describe('@optionModifiers', function () {
      describe('@boolean', function () {
        it('should be enough to specify the name', function () {
          rv = processLine('ping flood ttl 33');
          expect(name(rv)).to.not.include('flood')
        }); // it
      }); // describe @boolean

      describe('@match', function () {
        it('should list the correct result when using OBJECT as match', function () {
          rv = processLine('show terminal color ');
          expect(name(rv)).to.have.members(['red', 'blue', 'green', 'black', 'white', 'magenta', 'yellow', 'cyan']);
        }); // it

        it('should list the correct result when using ARRAY as match', function () {
          rv = processLine('ping interface ');
          expect(name(rv)).to.have.members(['eth0', 'eth1', 'eth2', 'eth3', '34']);
        }); // it

        it('should list the correct result when using CALLABLE as match', function () {
          rv = processLine('ping timeout ');
          expect(name(rv)).to.have.members(['10', '1', '30', '60']);
        }); // it

        it('should list the correct result when using REGEX as match', function () {
          rv = processLine('ping ttl ');
          expect(name(rv)).to.have.members(['NUM<length1-5>']);
        });

        it('should display <value> if non specified', function () {
          rv = processLine('ping ttl 33 size ');
          expect(name(rv)).to.have.members(['<value>']);
        });
      }); // describe @boolean

      describe('@hidden', function () {
        it('should handle hidden option properly', function () {
          rv = processLine('ping ');
          expect(name(rv)).to.not.include('hiddenOpt');
        });
      });

      describe('@multiple', function () {
        it('should return only the choices when non is provided', function () {
          rv = processLine('show terminal color ')
          expect(name(rv)).to.have.members(
            ['red', 'blue', 'green', 'black', 'white', 'magenta', 'yellow', 'cyan']);
        });

        it('should return all the choices when at least one is provided', function () {
          rv = processLine('show terminal color green ');
          expect(name(rv)).to.have.members(
            ['red', 'blue', 'green', 'black', 'white', 'magenta', 'yellow', 'cyan', '<cr>', 'width']);
        })

        it('indicate chosen options', function () {
          rv        = processLine('show terminal color green blue ');
          var green = _.find(rv, { name: 'green' });
          var blue  = _.find(rv, { name: 'blue' });
          var black = _.find(rv, { name: 'black' });
          expect(green.help).to.have.a.string('selected');
          expect(blue.help).to.have.a.string('selected');
          expect(black.help).to.not.have.a.string('selected');
        });
      }); // describe (multiple)

      describe('@default', function () {
        it('should display default value in help when { appendHelpGroup: true }', function () {
          var l   = LineJS('ping ', Commands, { appendHelpDefault: true });
          l.parse();
          rv      = l.complete();
          var ttl = _.find(rv, { name: 'ttl' });
          expect(ttl.help).to.have.a.string('(default: 10)')
        });

        it('should not display default value in help when { appendHelpGroup: false }', function () {
          var l   = LineJS('ping ', Commands, { appendHelpDefault: false });
          l.parse();
          rv      = l.complete();
          var ttl = _.find(rv, { name: 'ttl' });
          expect(ttl.help).to.not.have.a.string('(default: 10)')
        });
      });

      describe('@group', function () {
        it('should display group in help message of commands in the same group if {appendHelpGroup: true}', function () {
          var l       = LineJS('ping ', Commands, { appendHelpGroup: true });
          l.parse();
          rv          = l.complete();
          var objects = _.filter(rv, function (v) {
            return _.contains(['src-ip', 'fake', 'interface'], v.name);
          });

          _.each(objects, function (o) {
            expect(o.help).to.have.a.string('(group: source)')
          });
        });

        it('should hide all of the same group if one is specified', function () {
          rv = processLine('ping src-ip 10.10.60.2 ');
          expect(name(rv)).to.not.include('src-ip');
          expect(name(rv)).to.not.include('fake');
          expect(name(rv)).to.not.include('interface');
        });

        it('should not show group help message if {appendHelpGroup: false}', function () {
          var l       = LineJS('ping ', Commands, { appendHelpGroup: false });
          l.parse();
          rv          = l.complete();
          var objects = _.filter(rv, function (v) {
            return _.contains(['src-ip', 'fake', 'interface'], v.name);
          });

          _.each(objects, function (o) {
            expect(o.help).to.not.have.a.string('(group: source)')
          });
        });
      });
    }); // describe (optionModifier)
  }); // describe (option)
});
