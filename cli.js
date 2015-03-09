var maid = require('./lib/maid')
  , schema = require('./example')
  , cli = maid(schema);

cli.start();
