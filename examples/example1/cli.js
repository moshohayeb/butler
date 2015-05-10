var clift  = require('../../lib/clift')
var schema = require('./schema')
var cli    = new clift(schema)

cli.start()