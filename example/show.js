var run = require('./support').run

module.exports = {
  name: 'show',
  help: 'show system information',
  commands: [
    {
      name: 'heath',
      help: 'show system health status',
      run: run,
      options: [
        {
          name: 'verbose',
          help: 'verbose output',
          bool: true
        },
        {
          name: 'components',
          help: 'list of components to run check on',
          match: ['hd', 'fan', 'cpu', 'memory', 'power'],
          multiple: true
        },
        {
          name: 'count',
          help: 'run each test count times',
          default: 3
        }
      ]
    },
    {
      name: 'arp',
      help: 'show address resolution table',
      run: run
    },
    {
      name: 'configuration',
      help: 'show system configuration',
      run: run
    }

  ]

}