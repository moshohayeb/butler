/*
 * validating schema should be its own function, not to clutter logic
 if ( _.every(['options', 'commands'], function(key) { return _.has(currentObject, key); }) )
 {
 throw new Exception
 }


 if ( currentObject['runnable'] )
 { aux.push({name: '<cr>', help: 'Execute this command'}); }

 if ( currentObject['pipeable'] )
 { aux.push({name: '|', help: 'Run the output if this command through a pipe'}); }
 */
