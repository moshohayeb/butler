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
      run2: function (stream, context) {
        var ping = child_process.spawn('ping', ['192.168.100.1'])
        ping.stdout.pipe(stream)
        this.on('CTRL-C', function () { ping.kill() })
      },
      run:  function (stream, context) {
        var i
        var output = ''
        for (i = 0; i < 100; i++)
          stream.write('WoW... ' + String(i) + '\n')
        stream.end(output + '\n', 'utf8')
      }
    }
  ]
}


var CLI = new clift(schema)
CLI.start()

