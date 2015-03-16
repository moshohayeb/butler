var Line = require('../lib/line.js')

var commands = require('./commands.js');

var assert = require('assert');


describe('Line', function () {
  describe('#instances', function () {


    it('list instances on demand', function () {
      var line     = Line('show interface name ', commands);
      var expected = [{name: '1/1', help: ''}, {name: '1/2', help: ''}, {name: '1/3', help: ''}]
      var got;
      line.parse();
      got = line.completes();
      assert.deepEqual(expected, got);
    })


  })
})
