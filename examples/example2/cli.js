var clift  = require('../../lib/clift'),
    schema = require('./schema'),
    cli    = clift(schema)

cli.start()
