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
        var completeOn = _.isBoolean(entry.completeOn) ?
          entry.completeOn : true;
        if (_.isObject(entry)) return { name: entry.name, help: entry.help, completeOn: completeOn };
        else                   return { name: entry, help: '', completeOn: completeOn }
      });
    }

    if (_.isObject(clist)) {
      /* is it an Object */
      var result = [];
      var keys   = _.keys(clist);
      var help   = '';
      _.each(keys, function (key) {
        help = _.isString(clist[key]) ? clist[key] : '';
        result.push({ name: key, help: help, completeOn: false });
      });
      return result;
    }

    /* else return empty list */
    return [];
  }

  // take a variable and decide how to resolve it
  // to a list of valid options
  function resolveMatches(entry) {

    if (!entry) {
      // will accept any value
      return { '<value>': 'insert a value' };
    }

    if (_.isFunction(entry)) {
      var rv = entry();
      return _.isArray(rv) ? rv : [];
    }

    if (_.isRegExp(entry)) {
      return {
        name:       '<value>',
        help:       util.format('(Hint: %s)', entry.toString()),
        regexp:     entry,
        completeOn: false
      }
    }

    // add other types here
  }

  utility.commonPrefix   = commonPrefix;
  utility.transform      = transform;
  utility.resolveMatches = resolveMatches;
  module.exports         = utility;
})();

