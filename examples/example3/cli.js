var clift         = require('../../lib/clift')
var child_process = require('child_process')


var schema = {
  prompt:   '> ',
  colors:   true,
  commands: [
    {
      name: 'exit',
      help: 'hello 2',
      run: function () {
        process.exit(0)
      }

    },
    {
      name: 'ping',
      help: 'ping remote host',
      meta: ['pipeable'],
      run: function (stream, context) {
        var ping = child_process.spawn('ping', ['8.8.8.8'])
        ping.stdout.pipe(stream)
        this.on('CTRL-C', function () { ping.kill() })
      },
      run2:  function (stream, context) {
        var i
        var output = ''
        for (i = 0; i < 10; i++)
          output += 'WoW... ' + String(i) + '\n'
        stream.end(output + '\n', 'utf8')
      }
    }
  ]
}


var CLI = new clift(schema)
CLI.start()

