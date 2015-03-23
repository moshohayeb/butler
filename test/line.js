var chai = require('chai');
var expect = chai.expect;
var assert = chai.assert;

var _ = require('lodash');

var linejs = require('../lib/line.js')
var commands = require('./schema.js')['commands'];

var Line = _.partialRight(linejs, commands);

var topLevelCommands = [
  'purge', 'show', 'exit',
  'reboot', 'ping', 'ssh',
  'backup', 'health-stat', 'traceroute'
]

describe('@autocompletion', function () {
  var rv;
  var process = function (line, pluck) {
    var line = Line(line);
    var cl;
    // failures are permitted, only care about the result
    line.parse();
    cl = line.complete();
    if (pluck)
      return _.pluck(cl, 'name');
    return cl;
  }

  describe('@basic', function () {
    it('should always return an array', function () {
      expect(process('')).to.be.an('array');
      expect(process('show interface')).to.be.an('array');
      expect(process('some \tgarbage \bthat does\'t exist\n')).to.be.an('array');
      expect(process('!!')).to.be.an('array');
      expect(process('   ')).to.be.an('array');
      expect(process('<>')).to.be.an('array');
      expect(process('?')).to.be.an('array');
      expect(process(1241251)).to.be.an('array');
      expect(process(null)).to.be.an('array');
      expect(process(1.34)).to.be.an('array');
      expect(process({ exist: false })).to.be.an('array');
      expect(process([])).to.be.an('array');
    })
  })

  describe('@emptyline', function () {
    before(function () {
      rv = process('')
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
      expect(process('invalid path ')).to.be.an('array').and.be.empty;
      expect(process('zigzag ')).to.be.an('array').and.be.empty;
      expect(process('show zigzag ')).to.be.an('array').and.be.empty;
      expect(process('ping zigzag power')).to.be.an('array').and.be.empty;
    })
  })

  describe('@commands', function () {
    it('should return the correct top level commands', function () {
      expect(process('', true)).to.have.members(topLevelCommands)
    })

    it('should return correct deep traversal', function () {
      expect(process('show ', true)).to.have.members(
        ['mac-address-table', 'hardware', 'clock', 'ip', 'terminal', 'log', 'version'])
      expect(process('purge ', true)).to.have.members(['mac-address-table', 'log'])
      expect(process('show hardware', true)).to.have.members(['hardware'])
      expect(process('show hardware ', true)).to.have.members(['hard-drive', 'network-card', 'cpu'])
      expect(process('show hardware hard-drive', true)).to.have.members(['hard-drive'])
      expect(process('show hardware hard-drive ', true)).to.have.members(['fan', 'controller', 'errors', 'pager'])
    })

    it('should display <cr> on executable commands', function () {
      expect(process('show version ', true)).to.include('<cr>');
    })

    it('should not display <cr> on incomplete commands', function () {
      expect(process('show', true)).to.not.include('<cr>');
    })
  })

  describe('@pipes', function () {
    describe('@pipeable', function () {
      it('should display pipe on pipeable commands', function() {
        expect(process('ping', true)).to.not.include('|');
        expect(process('ping ', true)).to.include('|');
        expect(process('show hardware hard-drive fan ', true)).to.include('|');
        expect(process('show hardware hard-drive fan', true)).to.not.include('|');
      })
    })

    describe('@notpipeable', function () {
      it('should not display pipe on pipeable commands', function() {
        expect(process('reboot ', true)).to.not.include('|');
        expect(process('reboot', true)).to.not.include('|');
        expect(process('purge log', true)).to.not.include('|');
        expect(process('show hardware hard-drive errors ', true)).to.not.include('|');
        expect(process('show hardware hard-drive errors', true)).to.not.include('|');
      })
    })
  })

  describe('@partial', function () {
    it('should return only commands that start with partial', function () {
      expect(process('s', true)).to.have.members(['ssh', 'show'])
      expect(process('show', true)).to.have.members(['show'])
      expect(process('ssh', true)).to.have.members(['ssh'])
    })
  })
})
