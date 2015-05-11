var clift = require('../../lib/clift')
var child_process = require('child_process')


var schema = {
  prompt: '> ',
  colors: true,
  commands: [
    {
      name: 'hello',
      help: 'hello 2'
    },
    {
      name: 'ping',
      help: 'ping remote host',
      run: function (stream, context) {
        var ping = child_process.spawn('ping', ['8.8.8.8'])
        ping.stdout.pipe(stream)
        process.on('exit', function () {
          console.log('EXIT')
        })
      }
    }
  ]
}


var CLI = new clift(schema)
CLI.start()

