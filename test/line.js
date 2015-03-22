var chai = require('chai');
var expect = chai.expect;
var assert = chai.assert;

var _ = require('lodash');

var linejs = require('../lib/line.js')
var commands = require('./schema.js')['commands'];

Line = _.partialRight(linejs, commands);

describe('@autocompletion', function () {
  var rv;

  var process = function (line) {
    var line = Line(line);
    // failures are permitted, only care about the result
    line.parse();
    return line.complete();
  }

  describe('@basic', function () {
    it('should always return an array',
      function () {
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
      });
  });

  describe('@emptyline', function () {
    before(function () { rv = process(''); });

    it('should return the correct number of results',
      function () {
        expect(rv).to.have.length(6)
      }
    )

    it('should have the proper keys in each result',
      function () {
        _.each(rv,
          function (v) {
            expect(v).to.have.all.keys('name', 'help', 'primary', 'completeOn');
          }
        );
      })

    it('should return the correct results',
      function () {
        var rkeys = _.pluck(rv, 'name');
        var keys = ['purge', 'show', 'exit', 'reboot', 'ping', 'ssh'];
        expect(rkeys).to.have.members(keys);
      })
  });

  describe('@invalidpath', function () {
    it('should return an array of zero length',
      function () {
        expect(process('invalid path ')).to.be.an('array').and.be.empty;
        expect(process('zigzag ')).to.be.an('array').and.be.empty;
        expect(process('show zigzag ')).to.be.an('array').and.be.empty;
        expect(process('ping zigzag qwr')).to.be.an('array').and.be.empty;
      }
    )
  });

  describe('@commands', function () {
    it('should return the correct commands on traversal',
      function () {
        expect(_.pluck(process(''), 'name')).to.have.members(
          ['purge', 'reboot', 'ping', 'show', 'exit', 'ssh']);

        expect(_.pluck(process('show'), 'name')).to.have.members(
          ['show']);

        expect(_.pluck(process('show '), 'name')).to.have.members(
          ['mac-address-table', 'hardware', 'clock', 'ip', 'terminal', 'log', 'version']);

        expect(_.pluck(process('purge '), 'name')).to.have.members(
          ['mac-address-table', 'log']);
      }
    );
  })

})
