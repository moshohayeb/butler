var Butler = require('../../lib/butler')
var schema = require('./schema')
var cli = new Butler(schema)

cli.start()