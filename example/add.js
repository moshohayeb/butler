var run = require('./support').run

module.exports = {
  name: 'add',
  help: 'add new components',
  commands: [
    {
      name: 'server',
      help: 'add a new server',
      run: run,
      options: [
        {
          name: 'ip',
          help: 'ip address of the server',
          required: true,
        },
        {
          name: 'username',
          help: 'username to use to access machine',
          required: true
        }
      ]
    },

    {
      name: 'strategy',
      help: 'add a deployment strategy',
      required: true,
    }

  ]
}