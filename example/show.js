var fs = require('fs')
var run = require('./support').run

module.exports = {
  name:     'show',
  help:     'show deployment information',
  commands: [
    {
      name:    'server',
      help:    'show current servers status',
      run:     run,
      options: [
        {
          name: 'verbose',
          help: 'display verbose output',
          bool: true
        },
        {
          name:    'server',
          help:    'server name (leave empty for all servers)',
          primary: true,
          match:   function () { return ['mx1', 'mx2', 'ec1', 'ec2'] },
        },
      ]
    },

    {
      name: 'configuration',
      help: 'show deployment configuration',
      modifiers: { pipe: true },
      run: function (stream, data) {
        // fetch and process data

        // end will be called automatically
        fs.createReadStream('./snmpd.conf').pipe(stream)
      }
    },

    {
      name: 'statistics',
      help: 'show application statistics',
      run:  run
    },

    {
      name: 'health',
      help: 'show servers health',
      run:  run
    }


  ]


}