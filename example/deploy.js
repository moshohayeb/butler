var run = require('./support').run

module.exports = {
  name: 'deploy',
  help: 'deployment commands',
  run: run,


  options: [
    {
      name: 'sha1',
      help: 'application sha1 to provision',
      required: true,
      match: function () {
        // fetch versions
        return [ 'f195375', '8892698', 'ceb47e6', '525b714', '8c254d4', '73f9b87' ]
      }
    },
    {
      name: 'server',
      help: 'server to deploy to',
      match: [ '52server1', '56server2', '42server3', '42server4' ],
      multiple: true,
      group: 'server',
      required: true
    },
    {
      name: 'all',
      help: 'deplay to all servers',
      bool: true,
      group: 'server'
    },
    {
      name: 'strategy',
      help: 'choose deployment strategy',
      match: function () {
        // get list of available strategies
        return [
          { name: 'ssh', help: 'deploy using ssh' },
          { name: 'git', help: 'deploy using git' },
          { name: 'ansible', help: 'deploy using ansible' },
          { name: 'manual', help: 'interactive deployment' }
        ]
      },
    }
  ]

}
