var Clift = require('../lib/clift')
var schema = require('./schema')
var config = require('./config')

var cli = Clift(schema, config)
cli.start()
