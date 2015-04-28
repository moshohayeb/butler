var _ = require('lodash')

var compare = function (source, subject) {
  if (source.length != subject.length) return false
  return _.isEqual(_.sortBy(source), _.sortBy(subject))
}

module.exports.compare = compare
