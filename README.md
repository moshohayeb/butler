# Clift
Clift is a library to easily and rapidly create command line apps that support subcommands, autocompletion, options, pipes...etc. It build on top of the node's readline library with some modification.


# Installation
```
npm install clift --save
```

# Example
```
git clone https://github.com/moshohayeb/clift
cd clift/example/
npm install
node cli.js
```

# Usage
```
var Clift    = require('clift')
var config   = require('./config')
var commands = require('./commands')

var cli = Clift(commands, config)
cli.start()
```

# Documentation
The library exposes a single constructor. It accept two arguments, commands and config.

## Commands
The first argument to Clift constructor is an array of commands. Each command object is represented as follows:
```
{
    name: 'CommandName',
    help: 'CommandHelp',
    modifiers: { minOptsRequired: 0, pipe: true }
    run: function(stream, data) { 
        // function to invoke when all is good,
        // i.e. required options are present...etc
        
        // stream is a writable stream that must be ended
        // after exection is finished
        
        // data is an object with options parsed
    },

    // List of options, see below
    options: [],

    // OR list of subcommands
    commands: []
}
```

A command object can either specifiy a list of options or a list of subcommands. Each subcommand is an instance of command.

 - name [string] [required]: Name of the command.
 - help [string] [optional]: Help message. It shows on the right side of each command
 - modifiers [object] [optional]: Leaf command object can have its behaviour modified. Available modifiers are:
   - minOptsRequired [integer]: Minimum number of options that needs to be present to execute the command. Default: 0
   - pipe [boolean]: whether or not the output can be piped to an output modifier (e.g. grep). Default: false
 - run [function] [required]: Leaf command object needs to specify a run function which will be invoked when this command is executed. The function is executed with this bound to the clift instance and two parameters
   - stream: A writeable stream. All your output has to be written to this stream. You MUST end the stream, or the application will never reprompt.
   - context: An object with all the option values parsed.
 - options|commands [array] [optional]: A command can have its behaviour extended through subcommands OR options (not both). If it has subcommands then the key 'commands' should contain an array of command objects. Alternatively you can specify a list of options to extend the command's behavior (see below)

## Config
The second argument to the clift constructor is an optional configuration object.
 - appendDefault [boolean]: Whether or not to append the default value at the help message. default: false
 - appendGroup [boolean]: Whether or not to append group name at the end of help message. default: false
 - colors [boolean]: Whether or not to enable colored output. default: true,
 - prompt [string]: Prompt. Default: 'CLI> '
 - possibleMsg [string]: A message to display on each autocompletion list. default: 'Possible Completions:'
 - motd: - function(write): A function to invoke before any commands are entered. Write is a function that you should use instead of console.log to write to the standard output.default: null

## Options
Options can be used to extend the behaviour of a command through extra parameters. Option objects has the following properties
 - name [string] [required]: Name of the option
 - help [string] [optional]: Description of the option
 - match [null|object|array|regex|callable] [optional]: Use the eventual result of the invocation (if callable) or the immediate value as the accpeted value range. Matches have the form {name: xxx, help: xxx}. If 'match' is an:
    * Array of objects with name, help as their keys -> Use as is.
    * Array of strings -> Convert to an array of objects [ {name: array[0], help: ''}, {name: array[1], help: ''} ].
    * Object -> Convert to an array of objects [ {name: key1, help: valueOfKey1], {name: key2, help: valueOfKey2} ]
    * Regex -> Use the regex to validate the input
    * A function that accepts zero arguments arguments -> Use the function recursivley executed until a valid return value is found (see other possible values)
    * A function that accepts one or more argumennts -> The function will be passed the value to determine if it is in an acceptable range.
    * None -> All values are accepted.
 - required [boolean] [optional]: Whether this option is required to have a value.
 - default [string] [optional]: Default value for this option if it was omitted.
 - hidden [boolean] [optional]: Hide the option but it will accept the value in parsing.
 - multiple [boolean] [optinal]: Accept multiple values for this option.
 - primary [boolean] [optional]: If an option is set to primary:true then you dont need to write the name of the option to insert its value. Note that only one option per command can be set to primary
 - flexable [boolean] [optinal]: Accepts any value but still show the autocompletion results of 'match' key.
 - bool [boolean] [optional]: Indicate that this option is a boolean option. A boolean option does not need a value. The key presence is enough.
 - group: [string] [optional]: Indicate that this option is part of a group, when one of the group members has its value set then all other options belonging to the same group disappear from the autocompletion list.
 - matchName [string] [optional]: By default the autocomplete from value will be <value>, if you want to override it. Make sure it is between brackets <>.
 - matchHelp [string] [optional]: Same with matchName, override the default match help (which is 'insert a value').

##### Notes
 * A bool|group/multiple option can't be primary

# Known Issues
  - piping is slightly broken in MacOS.

# License
MIT
