var run = require('./support').run
var store = require('./store')

var addServer = function (stream, context) {
  console.log(context)
  stream.end()
}


module.exports = {
  name:     'add',
  help:     'add new components',
  commands: [
    {
      name:    'server',
      help:    'add a new server',
      run:     addServer,
      options: [
        {
          name:      'hostname',
          help:      'ip address or hostname of the server',
          required:  true,
          match:     /^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9])$/,
          matchName: '<Hostname>',
          matchHelp: 'insert hostname'
        },
        {
          name:     'username',
          help:     'username to use to access machine',
          required: true
        },
        {
          name:     'tags',
          help:     'server tag list',
          multiple: true,
          match:    ['web', 'proxy', 'image', 'stage', 'development', 'database', 'cache']
        },
        {
          name:  'location',
          help:  'server location',
          match: {
            ny: 'New york',
            am: 'Amesterdam',
            sf: 'San Fransicso',
            sg: 'Singapore',
            ln: 'London',
            fr: 'Frankfurt'
          }
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
      required: true
    }

  ]
}