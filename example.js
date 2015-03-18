module.exports = {
    commands: [
        {
            name:     'show',
            help:     'show system information',
            commands: [
                {
                    run: function(data) {
                        console.log('Running with data: ', data);
                    },
                    name:    'interface',
                    help:    'show information about available interfaces',
                    options: [
                        {
                            name:  'name',
                            required: true,
                            help:  'interface name',
                            match: function () {
                                return ['1/1', '1/2', '1/3'];
                            }
                        },
                        {
                            name:  'location',
                            help:  'interface location',
                            default: 'chassis_1',
                            match: function () {
                                return ['chassis_1', 'chassis_2', 'crap_2'];
                            }
                        },
                        {
                            name: 'sample',
                            help: 'show sample data instead of whole set',
                            bool: true
                        },
                        {
                            name: 'zipcode',
                            help: 'what is the postal code',
                            default: '12413',
                            match: /^\d+$/

                        },
                        {
                            name: 'address',
                            help: 'address of the customer',
                        },
                        {
                            name:  'route',
                            help:  'show interface route table',
                            match: function () {
                                return ['on', 'off'];
                            },
                            hidden: true
                        },
                        {
                            name: 'brief',
                            help: 'show brief information',
                            bool: true
                        },
                        {
                            name:     'color',
                            help:     'set list of colors',
                            multiple: true,
                            match:    function () {
                                return ['qwr', 'red', 'blue', 'green', 'cyan', 'magenta']
                            }
                        }
                    ],
                    meta:    ['pipeable']
                },
                {
                    name: 'hashblock',
                    help: 'show hashblock configuration',
                },
                {
                    name:    'ntp',
                    run: function(ctx) {
                        console.log('text');},
                    help:    'show information about ntp',
                    options: [
                        {
                            name: 'global',
                            help: 'whether to look in the global scope',
                            bool: true,
                        },
                        {
                            name:     'color',
                            help:     'set list of colors',
                            required: true,
                            multiple: true,
                            group: 'google',
                            match:    function () {
                                return ['qwr', 'red', 'blue', 'green', 'cyan', 'magenta']
                            }
                        },
                        {
                            name:  'type',
                            help:  'the type of the machine',
                            match: function () { return ['router', 'switch', 'bridge'] },
                            group: 'google'
                        },
                        {
                            name:  'model',
                            help:  'the model of the machine',
                            match: function () { return ['Cisco', 'Juniper', 'Hwuwai'] },
                            group: 'google',
                            required: true
                        },
                        {
                            name: 'game',
                            help: 'favorite game',
                            bool: true,
                            group: 'mansion',
                            required: true
                        },
                        {
                            name: 'rest_time',
                            help: 'break time when?',
                            match: function() {
                                return ['12AM', '6PM', '10PM']
                            },
                            group: 'mansion'
                        },
                        {
                            name:  'name',
                            required: true,
                            help:  'interface name',
                            match: function () {
                                return ['1/1', '1/2', '1/3'];
                            }
                        },


                    ]
                }
            ]
        },
        {
            name:     'clear',
            help:     'clear cached data in machine',
            commands: [
                {
                    name:    'arp',
                    help:    'clear address-resolution information',
                    options: [
                        {
                            name:  'ip',
                            help:  'the ip to clear',
                            required: true,
                            match: function () {
                                return ['all'];
                            }
                        }
                    ]
                },
                {
                    name: 'terminal',
                    help: 'clear the terminal screen',
                },
                {
                    name: 'terqwr',
                    help: 'clear the terminal screen',
                },],
        },
        {
            name: 'cleafigure',
            help: 'enter configuration mode',
        },
        {
            name: 'reboot',
            help: 'reboot machine',
        },
        {
            name: 'exit',
            help: 'exit from cli session',
            run: function() {
                process.exit(0);
            }
        },
    ],

    possibleMsgr: 'Possible completions:',
    welcomeMsg:  'Welcome to WireFilter CLI',
    prompt:      'vThunder(NOLICENSE)>'
};

