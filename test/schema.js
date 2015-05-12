var dummy = function (context) {; }

module.exports = {
  possibleMsg: 'Possible Completions:',
  prompt: '<SPACE-X-CLI>',
  motd: function () {
    console.log('Last login: Wed Mar 19 12:33:05 2014 from 10.10.12.20'.green)
  },

  appendGroup: true,
  appendDefault: true,
  colors: true,

  commands: [

    // couple of errornous/incomplete commands
    {
      Unused: 'useless value to me',
      'space in key': 'should not affect the app',
      name: 'backup',
      help: 'backup system files',
      run: 'invalid'
    },

    {
      // this commmand should be ignored
      // because it has no name
      noname: 'this command has no name',
      help: 'so it should not be treated as such',
      'run': {} // invalid run context
    },

    {
      // command with name only
      // should be fine
      name: 'health-stat',
      // meta can be a single string or an array of strings
      meta: 'pipeable'
    },

    {
      name: 'traceroute',
      help: { 'help cant be an object': 1 },
      options: []
    },

    {
      name: 'purge',
      help: 'purge cached data in the machine',
      commands: [
        {
          name: 'mac-address-table',
          help: 'flush mac-address-resolution information',
          run: dummy
        },
        {
          name: 'log',
          help: 'remove access log files',
          run: dummy
        }
      ]
    },

    {
      name: 'show',
      help: 'show system information',
      commands: [
        {
          name: 'mac-address-table',
          help: 'show mac address table',
          run: dummy
        },
        {
          name: 'hardware',
          help: 'show system hardware information',
          commands: [
            {
              name: 'hard-drive',
              help: 'show info about the state of HD',
              commands: [
                {
                  name: 'fan',
                  help: 'show hard drive fan parameters',
                  meta: 'pipeable'
                },
                {
                  name: 'controller',
                  help: 'show hard drive controller parameters'
                },
                {
                  name: 'errors',
                  help: 'show hard drive errors'
                },
                {},
                {},
                { name: { anObject: ' measurements ' } },
                { name: null },
                { name: 'pager' },
              ],
              options: [
                {
                  name: 'OPT1',
                  help: 'gonna get ignored because commands are present'
                }
              ]
            },
            {
              name: 'network-card',
              help: 'show info of network card'
            },
            {
              name: 'cpu'
            },
            {
              ignore_me_please: 213,
              because_i_dont_have_a_name: 'LOL'
            }
          ]
        },
        {
          name: 'clock',
          help: 'show system clock',
          run: dummy
        },
        {
          name: 'ip',
          help: 'show ipv4 information',
          run: dummy,
          options: [
            {
              name: 'interfaces',
              help: 'interface name',
              match: function () {
                return [
                  'ethernet', 'loopback', 'management', 'trunk', 've'
                ]
              },
              primary: true
            },
            {
              name: 'brief',
              help: 'show minimum information',
              bool: true
            },

          ]
        },
        {
          name: 'terminal',
          help: 'show current terminal parameters',
          options: [
            {
              name: 'color',
              help: 'colors to use when displaying results',
              match: {
                red: 'rhe red color', blue: 1, green: 'green as a leaf',
                yellow: 'yellow as the sun', cyan: 'this is a help message',
                magenta: null, 'white': undefined, 'black': 'who uses black'
              },
              multiple: true
            },
            {
              name: 'width',
              help: 'the width of the terminal'
            }
          ],
          run: dummy
        },
        {
          name: 'log',
          help: 'show system log',
          options: [
            {
              name: 'verbose',
              help: 'show verbose log',
              bool: true,
              primary: true
            }
          ],
          meta: 'pipeable',
          run: dummy
        },
        {
          name: 'version',
          help: 'show cli version',
          run: dummy
        },
      ]
    },

    {
      name: 'exit',
      help: 'exit from cli session',
      run: dummy
    },

    {
      name: 'reboot',
      help: 'reboot machine',
      run: dummy
    },

    {
      name: 'ping',
      help: 'send ICMP echo messages',
      meta: ['pipeable'],
      run: function (context) {
        console.log(context)
        this.setPrompt('HEHE>>>')
      },
      options: [
        {
          name: 'hiddenOpt',
          help: "hidden, doesn't matter",
          hidden: true
        },
        {
          name: 'host',
          help: 'IP address or hostname of a remote system',
          primary: true,
          required: true
        // match:    /^\d+$/
        },
        {
          name: 'ttl',
          help: 'time to live',
          matchName: 'NUM<length1-5>',
          match: /^\d+$/,
          default: 10
        },
        {
          name: 'size',
          help: 'specify datagram size'
        },
        {
          name: 'flood',
          help: 'trigger flooding ping',
          bool: true
        },
        {
          name: 'timeout',
          help: 'specify timeout interval',
          match: function () {
            return [1, 10, 30, 60]
          }
        },
        {
          name: 'src-ip',
          help: 'specify source address',
          group: 'source',
          default: '10.10.60.24'
        },
        {
          name: 'interface',
          help: 'specify on which interface to send',
          group: 'source',
          match: [{ name: 'eth0', help: 'localhost interface 127.0.0.1' }, 'eth1', 'eth2', 'eth3', 34, null]
        },
        {
          name: 'fake',
          help: 'send ping to fake host',
          group: 'source',
          bool: true
        }
      ]
    },

    {
      name: 'ssh',
      help: 'open an ssh connection',
      run: dummy
    },
  ]
}
