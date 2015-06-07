var run = require('./support').run


module.exports = [

  {
    name: 'exit',
    help: 'exit from cli session',
    run:  function () { process.exit(0) }
  },

  {
    name: 'reboot',
    help: 'reboot machine',
    run: function (stream) { stream.end('Rebooting...') }
  },

  require('./show'),
]