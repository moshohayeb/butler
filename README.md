# Clift
Clift is a library to easily and rapidly create command line apps that support subcommands, autocompletion, options, pipes...etc. It build on top of the node's readline library with some modification.


# Installation
````
npm install clift --save
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

 - name (required)
Name of the command.

#### help (optional)
Command help. It shows on the right side of each command

#### modifiers (optional)
Leaf command object can have its behaviour modified. Available modifiers are:
 - minOptsRequired: Minimum number of options that needs to be present to execute the command. Default: 0
 - pipeable: whether or not the output can be piped to an output modifier (e.g. grep). Default: false

#### run (required)
Leaf command object needs to specify run function which will be invoked when this command is executed. The function is executed with this bound to the clift instance and two parameters
 - stream: A writeable stream. All your output has to be written to this stream. You MUST end the stream, or the application will never reprompt.
 - context: An object with all the option values parsed.

#### options/commands (optional)
A command can have its behaviour extended through subcommands OR options (not both). If it has subcommands then the key 'commands' should contain an array of command objects. Alternatively you can specify a list of options to extend the command's behavior (see below)


## Config
The second argument to the clift constructor is an optional configuration object.
 - appendDefault - boolean: Whether or not to append the default value at the help message. Default: false
 - appendGroup - boolean : Whether or not to append group name at the end of help message. Default: false
 - colors - boolean: Whether or not to enable colored output. Default: true,
 - prompt - string: Prompt. Default: 'CLI> '
 - possibleMsg - string: A message to display on each autocompletion list. Default: 'Possible Completions:'
 - motd: - function(write): A function to invoke before any commands are entered. Default: null

## Options
Options can be used to extend the behaviour of a command through extra parameters. Option objects has the following properties
 - name - string (required): name of the option
 - help - string (optional): description of the option
 - match - null/object/array/regex/callable (optional): use the eventual result of the invocation (if callable) or the immediate value as the accpeted value range. Matches have the form {name: xxx, help: xxx}.
    * If an array of strings, then it will be converted to an array of objects where the name is the array index value and the help is the empty string,
    * if an array of objects with name, value pair then it will be used as such
    * if an object then the keys will be converted to names and their values will be the help
    * if regex then the regex will be used to validate the input
    * if function that takes 0 arguments, then that function is recursivley executed until a valid return value is encountered.
    * if if a function that takes 1 or more arguments, then the input value will be passed to to this callable to determine whether the value is accepted.
    * if none then all values are accepted.
 - required - boolean (optional): indicate whether this option is required to have a value
 - default - value (optional): a default value for this option if it was omitted.
 - hidden - boolean (optional): hide the option but it will accept the value in parsing
 - multiple - boolean (optinal): accept multiple values for this option
 - primary - boolean (optional): if an option is set to primary:true then you dont need to write the name of the option to insert its value. Note that only one option per command can be set to primary
 - flexable - boolean (optinal): in addition to the match (autocomplete) results, it will accept any value
 - bool - boolean (optional): indicate that this option is a bool option, that is, it is only required for the name to be present to have the value set to true.
 - group: string (optional): indicate that this option is part of a group, when one of the group has its value set all other disappear from the autocomplete list.
 - matchName - string (optional): by default the autocomplete from value will be <value>, if you want to override it. Make sure it is between brackets <>
 - matchHelp - string (optional): same with matchName, override the default (which is 'insert a value').

##### Notes
 * A bool|group/multiple option can't be primary


# License
MIT
