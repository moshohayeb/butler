var dummy = function (context) { ; };

module.exports = {
  possibleMsgs: 'Possible Completions:',
  prompt:       '<WIREFILTER-SWITCH>',
  motd:         function (show) {
    show('Last login: Wed Mar 19 12:33:05 2014 from 10.10.12.20'.green);
  },

  commands: [

    {
      name:     'purge',
      help:     'purge cached data in the machine',
      commands: [
        {
          name: 'mac-address-table',
          help: 'flush mac-address-resolution information',
          run:  dummy
        },
        {
          name: 'log',
          help: 'remove access log files',
          run:  dummy
        }
      ]
    },

    {
      name:     'show',
      help:     'show system information',
      commands: [
        {
          name: 'mac-address-table',
          help: 'show mac address table',
          run:  dummy
        },
        {
          name: 'hardware',
          help: 'show system hardware information',
          run:  dummy
        },
        {
          name: 'clock',
          help: 'show system clock',
          run:  dummy
        },
        {
          name:    'ip',
          help:    'show ipv4 information',
          run:     dummy,
          options: [
            {
              name:     'interfaces',
              help:     'interface name',
              match:    function () { return [
                'ethernet', 'loopback', 'management', 'trunk', 've'
              ]},
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
          name: 'log',
          help: 'show system log',
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
          //match:    /^\d+$/
        },
        {
          name:    'ttl',
          help:    'time to live',
          default: 10
        }
      ]
    },

    {
      name: 'ssh',
      help: 'open an ssh connection',
      run : dummy
    },

  ]
}
