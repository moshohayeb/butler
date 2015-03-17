GWhat is the difference between a command (or hence subcommands) and options.
what seperates the two?

options
    - required
    - group (one of many is enough) you can provide many (has another option for strict which is only 1 should be provided)
        e.g. : set colors (SHOW OPTS for colors) red blue green
                -- if strict opt is set then only one has to be provided
    - named? as in
        e.g : show interface site (OPTS FOR OPT site) floor (OPTS for OPT floor)
    - multiple
    - match -- callable to see if an option is valid for a given command
    - hidden -- dont show in ac
    - bool -- the presence of the option name in the command line makes the option True.
    - default -- show in help if not given
    - callback, a function to call when exctuing this 'COMMAND'. providing all the previous
    - OPTION ac via list, or external callable


the ability to dig deeper in the tree (as an option 'traversable')
    CLI) config
    CLI:config) now ac will prepend config for ac
    -- maybe add instances


- validation of args


- Other Option types
- Sanity Checker
    * No option with spaces


pipe cmds options


DI ( send cmd and opts to pipe ) -- ( send cmd to opts ) X
Key Value Option X
Multiple X
Group X



Arguments matching and validation (match: XxXx --- has to be good .. think thoroghly)
Error reporting
Replace colors with chalk
Rewrite Readline


--------------


Modify readline.js to fit our needs (READ AND UNDERSTAND THE CODE)



make sure store is sane
executing the callable with the provided data--------------XXXXX
matching + regex, arrays object (take keys as keys and value as help if string) as well as functions 
make wf switch cli tree (as example2.js)
