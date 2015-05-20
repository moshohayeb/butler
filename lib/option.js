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
//   group: string (optional) - multiple options can belong to the same group (1 is enough)
//   matchName: string (optional) - a string to be shown instead of <value> on auto completion
//   matchHelp: string (optional) - a string to be shown instead of "insert a value" on auto completion
//
// NOTES:
//  1. A bool|group|multiple option can't be primary
'use strict'
var util = require('util')

var _    = require('lodash')
var fig  = require('figures')
var slug = require('slug')

var utility = require('./utility')
var Base    = require('./base')

var PIPE_CHR = require('./pipe').PIPE_CHR
var STATE    = { ON_NONE: 1, ON_SINGLE_KEY: 2, ON_MULTI_KEY: 3, ON_VALUE: 4, ON_COMPLEX_OPT: 5 }
var ROOT     = '__root__'

function checkValue(option, val) {
  var key      = option.name
  var value    = val || this.context.store[option.name]
  var possible = option.completion

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
        return false
      }
    }, this)

    return rv
  }

  function checkObject() {
    var rv = true

    if (_.has(possible, 'regexp')) {
      rv = possible.regexp.test(value)
      if (!rv) {
        this._errorMsg   = util.format('value `%s` for option `%s` is not in accepted range', value, key)
        this._errorToken = value
        rv               = false
      }
    } else if (_.has(possible, 'validate')) {
      rv = possible.validate(value)
      if (!rv) {
        this._errorMsg   = util.format('value `%s` for option `%s` is unacceptable ', value, key)
        this._errorToken = value
        rv               = false
      }
    }
    return rv
  }

  if (!val && !_.contains(this.seenOptions, key)) return true // ignore unseen opts
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
  var store       = this.store
  var primary     = { ROOT: false }
  var opts

  options = _.compact(options)

  var reduce = function reduce(option, scope) {
    var clean = {}
    if (!_.isString(option.name)) return null // an clean without a name is useless
    clean.name = slug(option.name)
    clean.help = _.isString(option.help) ? option.help : ''

    if (option.complex) {
      store[clean.name] = {}
      clean.complex     = true
      clean.options     = _.map(option.options, _.partial(reduce, _, clean.name))
      return clean
    }

    clean.group      = _.isString(option.group) ? option.group : null
    clean.default    = option.default || null
    clean.multiple   = option.multiple === true
    clean.required   = option.required === true
    clean.hidden     = option.hidden === true
    clean.flexable   = option.flexable === true
    clean.bool       = option.bool === true || option.boolean === true
    clean.completion = utility.resolveMatches(option.match, option.matchName, option.matchHelp)

    // Only 1 primary is allowed and it is not allowed to
    // be a boolean clean since it doesn't make sense
    // same with multiple and group cleans
    clean.primary = primary[scope] ?
      false : ((!option.bool && !option.multiple && !option.group && option.primary) || false)

    if (clean.default && appendHelp) {
      clean.help += util.format(' (default: %s)', option.default)
    }

    if (clean.group && appendGroup) {
      clean.help = util.format('%s (group: %s)', option.help, option.group)
    }

    if (clean.primary) { primary[scope] = true }

    // prefill options with defaults
    store[scope][clean.name] = option.default
    if (clean.bool) { store[scope][clean.name] = false }

    return clean
  }

  store[ROOT] = {}
  opts        = _.map(options, _.partial(reduce, _, ROOT))
  return _.compact(opts)
}

function cleanUpOptions(options, scope) {
  var copy       = _.cloneDeep(options)
  var seenOption = this.seenOption[scope]
  var seenGroup  = this.seenGroup[scope]

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
  return true
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
  var options
  var processMultipleOption
  var processComplexOption
  var multipleCompletion
  var store
  var primaryOption
  var rv

  // initialization
  multipleCompletion = []
  primaryOption      = {}
  this.seenScope     = []
  this.seenOption    = {}
  this.seenGroup     = {}
  this.store         = {}
  this.completion    = []
  this.optionCount   = 0
  this.currentState  = STATE.ON_SINGLE_KEY
  this._errorMsg     = ''
  this._errorToken   = null

  store   = this.store
  tokens  = this.context.tokens
  options = normalize.call(this, this.context.options)

  processMultipleOption = function () {
    var available = currentOption.completion
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
      multipleCompletion.push({ name: element, help: '!' + fig.arrowLeft + ' selected' })
    }

    available = _.difference(available, store)
    _.each(available, function (element) {
      multipleCompletion.push({ name: element, help: '!' })
    })

    multipleCompletion = _.unique(multipleCompletion, false, 'name')
  }

  processComplexOption = function (complexOpts, scope) {
    var PO = primaryOption[scope] = _.find(complexOpts, { primary: true })
    var isRoot     = scope === ROOT
    var local      = store[scope]
    var seenOption = this.seenOption[scope] = []
    var seenGroup = this.seenGroup[scope] = []

    this.scope = scope
    // no tokens, just return all available opts
    if (!tokens.length) {
      this.completion = cleanUpOptions.call(this, complexOpts, scope)
      return true
    }

    // processing tokens one by one
    while (tokens.length && _.head(tokens) !== PIPE_CHR) {
      this.scope         = scope
      this.optionCount += 1
      this.context.state = this.STATES.ON_OPTION

      var finder = function (element) {
        if (PO && currentToken === PO.name) return false
        return element.name === currentToken && !_.contains(seenOption, currentToken)
      }

      currentToken  = tokens.shift()
      currentOption = _.find(complexOpts, finder)

      if (!currentOption) {
        //if (PO && checkValue.call(this, primaryOption, currentToken)) {
        if (PO) {
          local[PO.name] = currentToken
          seenOption.push(PO.name)
          continue
        }

        if (isRoot) {
          this._errorMsg   = util.format('unknown token: %s', currentToken)
          this._errorToken = currentToken
          return false
        }

        // NOT root parsing, return back the token
        tokens.unshift(currentToken)
        return true
      }

      if (currentOption.complex) {
        this.seenScope.push(currentOption.name)
        rv = processComplexOption.call(this, currentOption.options, currentOption.name)
        if (!rv) return false
        if (!tokens.length) return true
        continue
      }

      seenOption.push(currentToken)
      if (currentOption.group) {
        seenGroup.push(currentOption.group)
      }

      // boolean values
      if (currentOption.bool) {
        this.currentState   = STATE.ON_SINGLE_KEY
        local[currentToken] = true
        continue
      }

      // last token is a key, return its completions
      if (tokens.length === 0) {
        this.currentState = STATE.ON_VALUE
        this.completion   = cleanUpOptions.call(this, currentOption.completion, scope)
        return true
      }

      // multi opts
      if (currentOption.multiple) {
        local[currentToken] = []
        this.currentState   = STATE.ON_MULTI_KEY
        processMultipleOption() // will augment store and remaining tokens
        local[currentToken] = _.unique(local[currentToken])
      } else {
        // single option
        this.currentState   = STATE.ON_SINGLE_KEY
        local[currentToken] = tokens.shift()
      }
    }

    if (this.currentState !== STATE.ON_MULTI_KEY) { multipleCompletion = [] }
    this.completion = this.currentState === STATE.ON_VALUE ?
      this.completion : cleanUpOptions.call(this, complexOpts, scope).concat(multipleCompletion)

    return true
  }

  rv = processComplexOption.call(this, options, ROOT)
  if (!rv) return false

  // inject processed data back into the context
  this.primaryOption   = primaryOption
  this.context.store   = this.store
  this.context.options = options
  return true
}

function complete() {
  var root
  var scope       = this.scope
  var store       = this.store[scope]
  var primary     = this.primaryOption[scope]
  var completion  = this.completion
  var piped       = this.context.modifiers.pipe
  var shouldPrint =
        (completion.length || _.keys(store).length > 0) &&
        _.include([STATE.ON_MULTI_KEY, STATE.ON_SINGLE_KEY], this.currentState)
  var primaryList = primary ? primary.completion : null

  if (shouldPrint) {
    completion.push(this.CR)
    completion.push(piped ? this.PIPE : null)

    primaryList = utility.transform(primaryList)
    if (primary && !_.contains(this.seenOption[scope], primary.name)) {
      _.each(primaryList, function (p) { p.help = '_' + p.help })
      completion = completion.concat(primaryList)
    }
  }


  if (scope !== ROOT) {
    root = _.reject(cleanUpOptions.call(this, this.context.options, ROOT), function (c) {
      return c.complex && _.contains(this.seenScope, c.name)
    }, this)
    completion = completion.concat(root)
  }

  return completion
}

function Option(context) {
  if (!(this instanceof Option)) { return new Option(context) }

  this.primaryOption = {}
  this.context       = context

  this.scope    = ROOT
  this.validate = validate
  this.parse    = parse
  this.complete = complete
}

Option.prototype = Base
module.exports   = Option

