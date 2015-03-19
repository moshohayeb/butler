var commands = require('./commands')

// Available Option Modifiers
//  required: [true, false]
//  default: <value>
//  primary: [true, false] (only 1) can be inputted without specifying the name
//  match: callable/regex/NONE
//  bool: [true/false]
//  hidden: [true/false]
//  multiple: when multiple values can be specified
//  group: name (when one of multiple options has to be specified only)
//


// possibleMsg
// prompt
// motd (callable)

module.exports = {
  possibleMsgs: 'Possible Completions:',
  prompt: '<WIREFILTER-SWITCH>',
  motd: function(printer) {
    printer('Last login: Wed Mar 19 12:33:05 2014 from 10.10.12.20'.green);
  },


  commands: [
    {
      name: 'clear',
      help: 'clear cached data in the machine',
      commands: [
        {
          name: 'arp',
          help: 'clear address-resolution information'
        },
        {
          name: 'terminal',
          help: 'clear the terminal screen'
        }
      ]
    },

    {
      name: 'exit',
      help: 'exit from cli session',
      run: commands.exit
    },

    {
      name: 'ping',
      help: 'send ICMP echo messages',
      meta: ['pipeable'],
      options: [
        {
          name: 'host',
          help: 'host ip address or domain',
          primary: true,
          required: true,
          //match: function() {return [1,2,3]}
          match: /^\d+$/
        },
        {
          name: 'ttl',
          help: 'time to live'
        }
      ],
      run: commands.ping
    },







  ]

}
