var commands = require('./commands')

// Available Option Modifiers
//  required: [true, false]
//  default: <value>
//  primary: [true, false] (only 1) can be inputted without specifying the name
//  match: callable/regex/NONE
//  bool: [true/false]
//  multiple: when multiple values can be specified
//  group: name (when one of multiple options has to be specified only)
//

module.exports = {
  welcomeMsg: 'Welcome to WireFilter CLI',
  possibleMsg: 'Possible Completions:',
  prompt: '<WIREFILTER-SWITCH>',


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
      options: [
        {
          name: 'host',
          help: 'host ip address or domain',
          primary: true,
          required: true,
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
