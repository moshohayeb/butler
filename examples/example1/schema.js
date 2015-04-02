var dummy = function (context) { ; };

module.exports = {
  possibleMsgs: 'Possible Completions:',
  prompt:       '<COMPANY-SWITCH>',
  motd:         function () {
    console.log('Last login: Wed Mar 19 12:33:05 2014 from 10.10.12.20'.green);
  },

  commands: [

    {
      name:     'clear',
      help:     'clear cached data in the machine',
      commands: [
        {
          name: 'arp',
          help: 'clear address-resolution information',
          run:  dummy
        },
        {
          name: 'terminal',
          help: 'clear the terminal screen',
          run:  dummy
        }
      ]
    },

    {
      name:     'show',
      help:     'show system information',
      commands: [
        {
          name: 'ip'
        }
        ,
        {
          name: 'mac-address-table',
          help: 'show MAC address table',
          run:  dummy
        },
        {
          name: 'configuration',
          help: 'show system configuration',
          run:  dummy
        },
        {
          name: 'clock',
          help: 'show system clock',
          run:  dummy
        },
        {
          name:    'interface',
          help:    'show information about available interfaces',
          run:     dummy,
          options: [
            {
              name:     'name',
              help:     'enter interface name',
              match:    function () { return [1, 2, 3, 4, 5]},
              required: true,
              primary:  true
            },
            {
              name: 'brief',
              help: 'show minimum information',
              bool: true,
            },

          ]
        },
        {
          name: 'terminal',
          help: 'show current terminal parameters',
          run:  dummy
        },
        {
          name: 'uptime',
          help: 'show system uptime',
          run:  dummy
        },
        {
          name: 'version',
          help: 'show cli version',
          run:  dummy
        },
      ]
    },


    {
      name: 'exit',
      help: 'exit from cli session',
      run:  dummy
    },

    {
      name: 'reboot',
      help: 'reboot machine',
      run:  dummy
    },

    {
      name:    'ping',
      help:    'send ICMP echo messages',
      meta:    ['pipeable'],
      run:     dummy,
      options: [
        {
          name:     'host',
          help:     'IP address or hostname of a remote system',
          primary:  true,
          required: true,
          //match:    /^\d+/
        },
        {
          name:    'ttl',
          help:    'time to live',
          default: 10
        }
      ]
    },

    {
      name: 'flush',
      help: 'flush the system',
      run: function(context) {
        console.log(context);
      },
      options: [
        {
          name: 'time',
          help: 'when to flush'
        },
        {
          name: 'interval',
          help: 'interval to flush',
          default: 'REGEX'
        },
        {
          name: 'remote-host',
          help: 'where to push flushed data',
          primary: true,
          //match: [{name: 'OPT1', help: 'HELP FOR OPT1'}, {name: 'OPT2', help: 'HELP FOR OPT2'}],
          //match: ['OPT1', 'OPT2'],
          //match: function() { return ['FROMFUNCOPT1', 'FROMFUNCOPT2'] },
          //match: function() { return [{name: 'FROMFUNCOPT1', help: 'just helping'}, {name: 'FROMFUNCOPT2', help:'oopsie'}] },
          //match: null,
          match: /^\d+$/,
          matchName: '<NUMBER>',
          required: true
        }
      ]
    }

  ]
}
