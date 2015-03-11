var butler = require('./lib/butler')
  , schema = require('./example')
  , cli    = butler(schema);

cli.start();
