var butler = require('../../lib/butler')
  , schema = require('../../test/schema')
  , cli    = butler(schema);

cli.start();
