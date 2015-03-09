module.exports = {
    commands: [
        {
            name:     'show',
            help:     'show system information',
            commands: [
                {
                    name:    'interface',
                    help:    'show information about available interfaces',
                    options: [
                        {
                            name:  'name',
                            help:  'interface name',
                            match: function () {
                                return ['1/1', '1/2', '1/3'];
                            }
                        },
                        {
                            name:  'location',
                            help:  'interface location',
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
                    meta: ['pipeable']
                },
                {
                    name:    'ntp',
                    help:    'show information about ntp',
                    options: [
                        {
                            name: 'global',
                            help: 'whether to look in the global scope',
                            bool: true,
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
                            group: 'google'
                        },
                        {
                            name: 'game',
                            help: 'favorite game',
                            bool: true,
                            group: 'mansion'
                        },
                        {
                            name: 'rest_time',
                            help: 'break time when?',
                            match: function() {
                                return ['12AM', '6PM', '10PM']
                            },
                            group: 'mansion'
                        }


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
    ],

    possibleMsg: 'Possible completions:',
    welcomeMsg:  'Welcome to WireFilter CLI',
    prompt:      '<< '
};

