var butler = require('../../lib/butler'),
  schema = require('./schema'),
  cli = butler(schema)

cli.start()
