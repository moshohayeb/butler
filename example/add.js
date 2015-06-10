var run = require('./support').run

module.exports = {
  name:     'add',
  help:     'add new components',
  commands: [
    {
      name:    'server',
      help:    'add a new server',
      run:     run,
      options: [
        {
          name:     'ip',
          help:     'ip address of the server',
          required: true,
        },
        {
          name:     'username',
          help:     'username to use to access machine',
          required: true
        },
        {
          name:  'color',
          help:  'server color?!',
          match: ['red', 'green', 'blue', 'magenta', 'cyan'],
          group: 'feature'
        },
        {
          name:  'shape',
          help:  'server shape?!',
          match: ['circle', 'sphere', 'triangle', 'square', 'box'],
          group: 'feature'
        }
      ]
    },

    {
      name:     'strategy',
      help:     'add a deployment strategy',
      required: true,
    }

  ]
}