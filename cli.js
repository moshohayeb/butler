var maiden = require('./lib/maiden')
  , schema = require('./example')
  , cli = maiden.Maiden(schema);

cli.start();
