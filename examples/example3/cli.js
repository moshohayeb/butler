var clift = require('../../lib/clift')
var es    = require('event-stream')
var spawn = require('child_process').spawn

var schema = {
  prompt:   '> ',
  colors:   true,
  commands: [
    {
      name: 'exit',
      help: 'hello 2',
      run:  function () {
        process.exit(0)
      }

    },
    {
      name: 'ping',
      help: 'ping remote host',
      meta: ['pipeable'],
      run2: function (stream, context) {
        //var proc = spawn('node', ['./print.js'])
        var proc       = spawn('ping', ['-i', '1.1', '8.8.8.8'])
        var procStream = es.merge(proc.stdout, proc.stderr)
        procStream.pipe(stream)
        this.on('SIGINT', function () { proc.kill('SIGINT') })
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

