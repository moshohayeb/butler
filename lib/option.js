// A command object may have an options array of options
// options are:
//   name: string (required) - name of the option
//   help: string (optional) - help of the option
//   match: none/object/array/regex/callable
//      callback return array of rvs or {name: 'xxx', help: 'xxx'}, or another callable or if takes an argument
//      then it will be passed the value and the return (true/false) will be used to determine whether the value
//      is valid or not)
//   default: string (optional) - default value if non inserted
//   required: boolean (optional)
//   hidden: boolean (optional) - show/hide command
//   primary: boolean (optional) - is primary? ONLY 1 primary in 1 command
//            Primary means you can insert the value without specifiying the option name
//   multiple: boolean (optional) - can accept multiple values for the same option
//   bool: boolean (optional) - the existance of the name is enough to signal its value
//   flexable: boolean (optional) will accept any value is the options value
//   group: string (optional) - multiple options can belong to the same group (1 is enough)
//   matchName: string (optional) - a string to be shown instead of <value> on auto completion
//   matchHelp: string (optional) - a string to be shown instead of "insert a value" on auto completion
//
// NOTES:
//  1. A bool|group|multiple option can't be primary
'use strict'
var util = require('util')

var _    = require('lodash')
var slug = require('slug')

var utility = require('./utility')
var Base    = require('./base')

var PIPE_CHR = require('./pipe').PIPE_CHR
var STATE    = { ON_NONE: 1, ON_SINGLE_KEY: 2, ON_MULTI_KEY: 3, ON_VALUE: 4 }

function checkValue(option, val) {
  var key      = option.name
  var value    = val || this.context.store[option.name]
  var possible = option.completions

  // no need to worry about data being required
  // since it will be handled seperately

  function checkArray() {
    var rv = true

    if (!_.isArray(value)) { value = [value] }

    possible = _.map(possible, 'name')
    _.each(value, function (v) {
      if (!_.contains(possible, v)) {
        this._errorMsg = util.format('value `%s` for option `%s` not valid', v, key)
        rv             = false
        return false // stop
      }
    }, this)

    return rv
  }

  function checkObject() {
    var rv = true

    if (_.has(possible, 'validate')) {
      rv = possible.validate(value)
      if (!rv) {
        this._errorMsg   = util.format('value `%s` for option `%s` is unacceptable ', value, key)
        this._errorToken = value
        rv               = false
      }
    }
    return rv
  }

  if (!val && !_.contains(this.seenOption, key)) return true // ignore unseen opts
  if (option.bool) return true // ignore boolean flags

  if (!value) {
    this._errorMsg   = util.format('value for option `%s` not supplied ', key)
    this._errorToken = null
    return false
  }

  if (option.flexable) return true

  if (_.isArray(possible)) { return checkArray.call(this) }
  else if (_.isObject(possible)) { return checkObject.call(this) }

  // else
  return false
}

function checkRequired(option) {
  var key        = option.name
  var value      = this.context.store[option.name]
  var isRequired = false
  var group      = false
  var options    = this.context.options

  if (option.group) {
    var groupOptions = _.filter(options, { group: option.group })
    group            = true
    isRequired       = _.any(groupOptions, { required: true })
  } else {
    isRequired = option.required
  }

  if (!isRequired) return true

  if (!group) {
    // single option
    if (!value) {
      this._errorMsg = util.format('required option `%s` not supplied', key)
      return false
    }
    return true
  }

  // group: make sure EXACTLY one key holds a value
  var count = 0
  _.each(groupOptions, function (gopt) {
    if (this.context.store[gopt.name]) count++
  }, this)

  switch (count) {
    case 0:
      this._errorMsg = util.format('required group option `%s` not supplied', option.group)
      return false
    case 1:
      return true
    default:
      this._errorMsg = util.format('required group option `%s` expects only one value', option.group)
      return false
  }
}

// build a normalized opts that invokes matches
// in case of functions
function normalize(options) {
  var appendHelp  = this.context.config.appendDefault
  var appendGroup = this.context.config.appendGroup
  var store       = this.context.store
  var primary     = false
  var opts

  options = _.compact(options)
  opts    = _.map(options, function (opt) {
    var option = {}
    if (!_.isString(opt.name)) return null // an option without a name is useless
    option.name        = slug(opt.name)
    option.help        = _.isString(opt.help) ? opt.help : ''
    option.group       = _.isString(opt.group) ? opt.group : null
    option.default     = opt.default || null
    option.multiple    = opt.multiple === true
    option.required    = opt.required === true
    option.hidden      = opt.hidden === true
    option.flexable    = opt.flexable === true
    option.bool        = opt.bool === true || opt.boolean === true
    option.completions = utility.resolveMatches(opt.match, opt.matchName, opt.matchHelp)

    // Only 1 primary is allowed and it is not allowed to
    // be a boolean option since it doesn't make sense
    // same with multiple
    option.primary = primary ?
      false : ((!option.bool && !option.multiple && !option.group && opt.primary) || false)

    if (option.default && appendHelp) {
      option.help += util.format(' (default: %s)', option.default)
    }

    if (option.group && appendGroup) {
      option.help = util.format('%s (group: %s)', option.help, option.group)
    }

    if (option.primary) { primary = true }

    // prefill options
    store[option.name] = option.default
    if (option.bool) { store[option.name] = false }

    return option
  })

  return _.compact(opts)
}

function cleanUpOptions(options) {
  var copy       = _.cloneDeep(options)
  var seenOption = this.seenOption
  var seenGroup  = this.seenGroup

  // remove already seen options
  _.remove(copy, function (c) { return _.contains(seenOption, c.name) })

  // remove options that was already satisfied by a member (group)
  _.remove(copy, function (c) { return _.contains(seenGroup, c.group) })

  // remove hidden options
  _.remove(copy, function (c) { return c.hidden === true })

  // bracketize? the primary option
  var primary = _.find(copy, { primary: true })
  if (primary) { primary.name = util.format('<%s>', primary.name) }

  return copy
}

function validate() {
  // query that options are sane
  var options = this.context.options || []
  var min     = this.context.modifiers.minOptsRequired

  var required = _.every(options, checkRequired, this)
  if (!required) return false

  var value = true
  _.each(options, function (option) {
    if (!checkValue.call(this, option, null)) { return (value = false) }
  }, this)
  if (!value) return false

  if (options.length > 0 && min > this.optionCount) {
    this._errorToken = null
    this._errorMsg   = util.format('insufficient options (min: %d)', min)
    return false
  }

  // other validations
  return true
}

function parse() {
  var currentToken
  var currentOption
  var tokens
  var primaryOption
  var options
  var multipleCompletion = []
  var store              = {} // parsed data

  this.currentState = STATE.ON_NONE
  this.seenOption   = []
  this.seenGroup    = []
  this.completions  = []
  this.optionCount  = 0

  this._errorMsg   = ''
  this._errorToken = null

  this.context.store = store
  this.currentState  = STATE.ON_SINGLE_KEY

  tokens        = this.context.tokens
  options       = normalize.call(this, this.context.options)
  primaryOption = _.find(options, { primary: true })

  // inject sanitazed data into the context
  this.context.options = options
  this.primaryOption   = primaryOption

  function processMultipleOptions() {
    var available = currentOption.completions
    var element

    available = available ? _.map(available, 'name') : []

    while (tokens.length !== 0) {
      element       = tokens.shift()
      var predicate = function (e) { return e === element }

      if (!_.find(available, predicate)) {
        tokens.unshift(element) // put currentKey back
        break
      }

      store[currentToken].push(element)
      multipleCompletion.push({ name: element, help: '!selected' })
    }

    available = _.difference(available, store)
    _.each(available, function (element) {
      multipleCompletion.push({ name: element, help: '!' })
    })

    multipleCompletion = _.unique(multipleCompletion, false, 'name')
  }

  // no tokens, just return all available opts
  if (tokens.length === 0) {
    this.completions = cleanUpOptions.call(this, options)
    return true
  }

  // processing tokens one by one
  while (tokens.length !== 0 && tokens[0] !== PIPE_CHR) {
    this.context.state = this.STATES.ON_OPTION

    var finder = function (element) {
      if (primaryOption && currentToken === primaryOption.name) return false
      return element.name === currentToken && !_.contains(this.seenOption, currentToken)
    }.bind(this)

    currentToken  = tokens.shift()
    currentOption = _.find(options, finder)

    if (!currentOption) {
      if (primaryOption && !store[primaryOption.name] && checkValue.call(this, primaryOption, currentToken)) {
        store[primaryOption.name] = currentToken
        this.seenOption.push(primaryOption.name)
        continue
      }
      this._errorMsg   = util.format('unknown token: %s', currentToken)
      this._errorToken = currentToken
      return false
    }

    if (!primaryOption || primaryOption.name !== currentToken) {
      this.optionCount += 1
    }

    this.seenOption.push(currentToken)
    if (currentOption.group) {
      this.seenGroup.push(currentOption.group)
    }

    // boolean values
    if (currentOption.bool) {
      this.currentState   = STATE.ON_SINGLE_KEY
      store[currentToken] = true
      continue
    }

    // last token is a key, return its completions
    if (tokens.length === 0) {
      this.currentState = STATE.ON_VALUE
      this.completions  = cleanUpOptions.call(this, currentOption.completions)
      break
    }

    // multi opts
    if (currentOption.multiple) {
      store[currentToken] = []
      this.currentState   = STATE.ON_MULTI_KEY
      processMultipleOptions() // will augment store and remaining tokens
      store[currentToken] = _.unique(store[currentToken])
    } else {
      // single option
      this.currentState   = STATE.ON_SINGLE_KEY
      store[currentToken] = tokens.shift()
    }
  }

  if (this.currentState !== STATE.ON_MULTI_KEY) { multipleCompletion = [] }

  this.completions =
    this.currentState === STATE.ON_VALUE ?
      this.completions :
      cleanUpOptions.call(this, options).concat(multipleCompletion)

  return true
}

function complete() {
  var primaryList  = this.primaryOption ? this.primaryOption.completions : null
  var completeList = this.completions
  var pipeCommand  = this.context.pipeable || false
  var shouldPrint  =
        (completeList.length || _.keys(this.context.store).length > 0) &&
        _.include([STATE.ON_MULTI_KEY, STATE.ON_SINGLE_KEY], this.currentState)

  if (shouldPrint) {
    completeList.push(this.CR)
    completeList.push(pipeCommand ? this.PIPE : null)

    primaryList = utility.transform(primaryList)
    if (this.primaryOption && !_.contains(this.seenOption, this.primaryOption.name)) {
      _.each(primaryList, function (p) { p.help = '_' + p.help })
      completeList = completeList.concat(primaryList)
    }
  }
  return completeList
}

function Option(context) {
  if (!(this instanceof Option)) { return new Option(context) }

  this.primaryOption = null
  this.context       = context

  this.validate = validate
  this.parse    = parse
  this.complete = complete
}

Option.prototype = Base
module.exports   = Option

