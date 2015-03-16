(function () {
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
  function transform(list) {
    if (_.isArray(list))
      return _.map(list, function (o) {
        if (_.isObject(o)) return {name: o.name, help: o.help, completeOn: o.completeOn};
        else               return {name: o, help: '', completeOn: true}
      });
    else if (_.isObject(list) && _.has(list, 'name')) return [{name: list.name, help: '', completeOn: true}];
    else return [];
  }

  // take a variable and decide how to resolve it
  // to a list of valid options
  function resolveMatches(entry) {

    if (_.isFunction(entry)) {
      var rv = entry();
      return _.isArray(rv) ? rv : [];
    }

    if (_.isRegExp(entry)) {
      console.log(entry.toString());
      var x = [
        {
          name:       entry.toString(),
          match:      entry,
          help:       'only values matching the regex are accepted',
          completeOn: false
        }
      ];
      console.log(x)
      return x;
    }


  }

  utility.commonPrefix   = commonPrefix;
  utility.transform      = transform;
  utility.resolveMatches = resolveMatches;
  module.exports         = utility;
})();

