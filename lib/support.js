'use strict'

var _ = require('lodash')

var Base = new (require('./base'))

function commonPrefix(strings) {
  if (!strings || strings.length === 0) { return '' }

  var sorted = _.sortBy(strings, function (s) {
    return s.length
  })

  var min = _.first(sorted)
  var current = ''

  for (var i = 0, len = min.length; i < len; i++) {
    var rv = _.every(strings, function (s) {
      return s[i] === min[i]
    })

    if (rv) { current += min[i] }
    else { break }
  }
  return current
}

// normalize a list of opts/cmds object to a unified
// name: xxx, help: xxx, completeOn: true/false, primary: true/false
function transform(clist) {
  var name, help, completeOn, primary
  var rv

  if (!_.isArray(clist)) return []

  var result = _.map(clist, function (entry) {
    if (!entry) return null
    completeOn = _.isBoolean(entry.completeOn) ? entry.completeOn : true
    primary = _.isBoolean(entry.primary) ? entry.primary : false
    name = entry.name ? entry.name.toString() : (entry ? entry.toString() : '<>')
    help = entry.help ? entry.help.toString() : ''
    rv = {
      name:       name,
      help:       help,
      completeOn: completeOn,
      primary:    primary
    }
    return rv
  })

  return _.compact(result)
}

// take a variable and decide how to resolve it
// to a list of valid options
function resolveMatches(entry, matchName, matchHelp) {
  var name, help, completeOn
  var rv

  rv = _.clone(Base.VALUE, true)

  if (matchName) rv.name = matchName
  if (matchHelp) rv.help = matchHelp

  // will accept any value
  if (entry === undefined) {
    rv.validate = function (value) { return true }
    return rv
  }

  if (_.isRegExp(entry)) {
    rv.validate = function (value) { return entry.test(value)}
    return rv
  }

  if (_.isFunction(entry)) {
    // If the function accept an argument
    // then use that call the function with the
    // argument from the CLI
    if (entry.length >= 1) {
      rv.validate = entry
      return rv
    }

    // else use the function to retrieve the autocomplete
    // results
    try { rv = entry() } catch (e) { rv = [] }
    return resolveMatches(rv)
  }

  if (_.isArray(entry)) {
    rv = _.map(entry, function (e) {
      if (!e) return null
      name = e.name || (e && e.toString()) || '<>'
      help = e.help || ''
      completeOn = e.completeOn || name[0] !== '<'
      return { name: name, help: help, completeOn: completeOn }
    })
    return _.compact(rv)
  }

  if (_.isPlainObject(entry)) {
    rv = []
    _.each(_.keys(entry), function (key) {
      name = key.toString() || null
      help = entry[key]
      completeOn = name[0] !== '<'
      if (!name) return
      rv.push({ name: name, help: help, completeOn: completeOn })
    })
    return _.compact(rv)
  }
}

module.exports = {
  CR:             '\n\r',
  commonPrefix:   commonPrefix,
  transform:      transform,
  resolveMatches: resolveMatches,
}
