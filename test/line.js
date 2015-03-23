var util = require('util');
var _ = require('lodash');
var chai = require('chai');
var expect = chai.expect;


require('./helpers');
var linejs = require('../lib/line.js')
var commands = require('./schema.js')['commands'];

var Line = _.partialRight(linejs, commands);

var KEYS = ['name', 'help', 'completeOn', 'primary'];

var topLevelCommands = [
  'purge', 'show', 'exit',
  'reboot', 'ping', 'ssh',
  'backup', 'health-stat', 'traceroute'
]

describe('@autocompletion', function () {
  var rv;

  var examine = function (line, pluck) {
    var line = Line(line);
    var cl;
    // failures are permitted, only care about the result
    line.parse();
    cl = line.complete();
    if (pluck)
      return _.pluck(cl, 'name');
    return cl;
  }

  function compareKeys(v) {
    if (_.isArray(v))
      return _.all(v, function (fv) { compareKeys(fv) })

    if (!_.isObject(v))
      throw new Error('Return value of auto completion is not an object');

    if (!_.keys(v).compare(KEYS))
      throw new Error(util.format(
        'Return value of auto completion is does not hold a valid entry %s', _.keys(v)));
  }

  beforeEach(function () {
  })

  afterEach(function () { compareKeys(rv) })




  describe('@basic', function () {
    describe('@lineparsing', function () {
      var lines = [
        '',
        'show hardware ',
        'show interface',
        'some \tgarbage \bthat does\'t exist\r',
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
          rv = Line(line);
          rv.parse();
          rv = rv.complete();
          expect(rv).to.be.an('array');
        }) // it
      }) // each
    }) // lineparsing
  }) // basic









  describe('@emptyline', function () {
    before(function () {
      rv = examine('')
    })

    it('should return the correct number of results', function () {
      expect(rv).to.have.length(topLevelCommands.length)
    })

    it('should have the proper keys in each result', function () {
      _.each(rv, function (v) {
        expect(v).to.have.all.keys('name', 'help', 'primary', 'completeOn');
      })
    })

    it('should return the correct results', function () {
      expect(_.pluck(rv, 'name')).to.have.members(topLevelCommands);
    })
  })

  describe('@invalidpath', function () {
    it('should return an array of zero length', function () {
      expect(examine('invalid path ')).to.be.an('array').and.be.empty;
      expect(examine('zigzag ')).to.be.an('array').and.be.empty;
      expect(examine('show zigzag ')).to.be.an('array').and.be.empty;
      expect(examine('ping zigzag power')).to.be.an('array').and.be.empty;
    })
  })

  describe('@commands', function () {
    it('should return the correct top level commands', function () {
      expect(examine('', true)).to.have.members(topLevelCommands)
    })

    it('should return correct deep traversal', function () {
      expect(examine('show ', true)).to.have.members(
        ['mac-address-table', 'hardware', 'clock', 'ip', 'terminal', 'log', 'version'])
      expect(examine('purge ', true)).to.have.members(['mac-address-table', 'log'])
      expect(examine('show hardware', true)).to.have.members(['hardware'])
      expect(examine('show hardware ', true)).to.have.members(['hard-drive', 'network-card', 'cpu'])
      expect(examine('show hardware hard-drive', true)).to.have.members(['hard-drive'])
      expect(examine('show hardware hard-drive ', true)).to.have.members(['fan', 'controller', 'errors', 'pager'])
    })

    it('should display <cr> on executable commands', function () {
      expect(examine('show version ', true)).to.include('<cr>');
    })

    it('should not display <cr> on incomplete commands', function () {
      expect(examine('show', true)).to.not.include('<cr>');
    })
  })

  describe('@pipes', function () {
    describe('@pipeable', function () {
      it('should display pipe on pipeable commands', function () {
        expect(examine('ping', true)).to.not.include('|');
        expect(examine('ping ', true)).to.include('|');
        expect(examine('show hardware hard-drive fan ', true)).to.include('|');
        expect(examine('show hardware hard-drive fan', true)).to.not.include('|');
      })
    })

    describe('@notpipeable', function () {
      it('should not display pipe on pipeable commands', function () {
        expect(examine('reboot ', true)).to.not.include('|');
        expect(examine('reboot', true)).to.not.include('|');
        expect(examine('purge log', true)).to.not.include('|');
        expect(examine('show hardware hard-drive errors ', true)).to.not.include('|');
        expect(examine('show hardware hard-drive errors', true)).to.not.include('|');
      })
    })
  })

  describe('@partial', function () {
    it('should return only commands that start with partial', function () {
      expect(examine('s', true)).to.have.members(['ssh', 'show'])
      expect(examine('show', true)).to.have.members(['show'])
      expect(examine('ssh', true)).to.have.members(['ssh'])
    })
  })
})
