(function () {
  var util    = require('util')
  var _       = require('lodash');
  var utility = {};

  function commonPrefix(strings) {
    if (!strings || strings.length === 0)
      return '';

    var sorted = _.sortBy(strings, function (s) {
      return s.length
    });

    var max     = _.last(sorted);
    var min     = _.first(sorted);
    var current = '';

    for (var i = 0, len = min.length; i < len; i++) {
      if (_.every(strings, function (s) {
          return s[i] === min[i];
        }))
        current += min[i];
      else
        break;
    }

    return current
  }

  // normalize a list of opts/cmds object to a unified name: xxx, help: xxx
  function transform(clist) {
    if (_.isArray(clist)) {
      /* is it an Array */
      return _.map(clist, function (entry) {
        var completeOn = _.isBoolean(entry.completeOn) ? entry.completeOn : true;
        var primary    = _.isBoolean(entry.primary) ? entry.primary : false;
        var name       = entry.name ? entry.name.toString() : (entry ? entry.toString() : '<>');
        var help       = entry.help ? entry.help.toString() : '';
        var rv         = {
          name:       name,
          help:       help,
          completeOn: completeOn,
          primary:    primary
        };
        return rv;
      });
    }

    /* else return empty list */
    return [];
  }

  // take a variable and decide how to resolve it
  // to a list of valid options
  function resolveMatches(entry) {

    if (!entry) {
      // will accept any value
      return [{name: '<value>', help: 'insert a value', completeOn: false}];
    }

    if (_.isFunction(entry)) {
      var rv;

      try { rv = entry() }
      catch (e) { rv = [] }

      return _.isArray(rv) ?
        _.map(rv, function (arg) {
          var name, help, completeOn;
          name       = _.isObject(arg) ? arg.name : (arg ? arg : '<>');
          help       = _.isObject(arg) ? arg.help : '';
          completeOn = arg.completeOn || name[0] !== '<';
          return {
            // only keys we are interested in
            name:       name,
            help:       help,
            completeOn: completeOn
          }
        }) : [];
    }

    if (_.isRegExp(entry)) {
      return [{
        name:       '<value>',
        help:       util.format('(Hint: %s)', entry.toString()),
        regexp:     entry,
        completeOn: false
      }]
    }

    // add other types here (array and object)
  }

  utility.commonPrefix   = commonPrefix;
  utility.transform      = transform;
  utility.resolveMatches = resolveMatches;
  module.exports         = utility;
})();

