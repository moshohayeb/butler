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
      run:  run
    },

    {
      name: 'statistics',
      help: 'show application statistics',
      run:  run
    },

    {
      name: 'health',
      help: 'show servers health status',
      run:  run
    }


  ]


}