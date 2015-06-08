var run = require('./support').run

module.exports = [
  require('./show'),
  require('./add'),
  require('./deploy'),
  {
    name: 'exit', help: 'terminate cli session',
    run: function() { process.exit(0) }
  }
]