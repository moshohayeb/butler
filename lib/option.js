// A command object may have an options array of options
// options are:
//   name: string (required) - name of the option
//   help: string (optional) - help of the option
//   match: object/array/regex/callable(return array of rvs or {name: 'xxx', help: 'xxx'}, or another callable)
//   default: string (optional) - default value if non inserted
//   required: boolean (optional)
//   hidden: boolean (optional) - show/hide command
//   primary: boolean (optional) - is primary? ONLY 1 primary in 1 command
//            Primary means you can insert the value without specifiying the option name
//   multiple: boolean (optional) - can accept multiple values for the same option
//   bool: boolean (optional) - the existance of the name is enough to signal its value
//   group: string (optional) - multiple options can belong to the same group (1 is enough)
//
// NOTES:
//  1. A bool option can't be primary
'use strict';

var _    = require('lodash');
var util = require('util');

var utility = require('./utility');
var Base    = require('./base');

var STATE = { ON_NONE: 1, ON_SINGLE_KEY: 2, ON_MULTI_KEY: 3, ON_VALUE: 4 };

function checkValue(option, val) {
  var key      = option.name;
  var value    = val || this.context.store[option.name];
  var possible = option.completions;

  // no need to worry about data being required
  // since it will be handled seperately

  if (_.isArray(possible) && possible.length === 1) {
    possible = possible[0];
  }

  function checkArray() {
    var rv = true;

    if (!_.isArray(value))
      value = [value];

    possible = _.map(possible, 'name');
    _.each(
      value,
      function (v) {
        if (!_.contains(possible, v)) {
          this._errorMsg = util.format('value `%s` for option `%s` not valid', v, key);
          rv             = false;
          return false;
        }
      },
      this);

    return rv;
  }

  function checkObject() {
    var rv = true;

    if (_.has(possible, 'regexp')) {
      rv = possible.regexp.test(value);
      if (!rv) {
        this._errorMsg   = util.format('value `%s` for option `%s` is not in accepted range', value, key);
        this._errorToken = value;
        rv               = false;
      }
    }
    return rv;
  }

  if (!val && !_.contains(this.seenOptions, key)) return true; // ignore unseen opts
  if (option.bool) return true; // ignore boolean flags
  if (!value) {
    this._errorMsg   = util.format('value for option `%s` not supplied ', key);
    this._errorToken = null;
    return false;
  }

  if (_.isArray(possible))
    return checkArray.call(this);
  else if (_.isObject(possible)) {
    return checkObject.call(this);
  }
  // else
  return false;
}

function checkRequired(option) {
  var key        = option.name;
  var value      = this.context.store[option.name];
  var isRequired = false;
  var group      = false;
  var options    = this.context.options;

  if (option.group) {
    var groupOptions = _.filter(options, { group: option.group });
    group            = true;
    isRequired       = _.any(groupOptions, { required: true });
  } else {
    isRequired = option.required;
  }

  if (!isRequired) return true;

  if (!group) {
    // single option
    if (!value) {
      this._errorMsg = util.format('required option `%s` not supplied', key);
      return false;
    }
    return true;
  }


  // group: make sure EXACTLY one key holds a value
  var count = 0;
  _.each(groupOptions, function (gopt) {
    if (this.context.store[gopt.name]) count++;
  }, this);

  switch (count) {
    case 0:
      this._errorMsg = util.format('required group option `%s` not supplied', option.group);
      return false;
    case 1:
      return true;
    default:
      this._errorMsg = util.format('required group option `%s` expects only one value', option.group);
      return false;
  }
}

// build a normalized opts that invokes matches
// in case of functions
function normalize(options) {
  var appendHelp  = this.context.config.appendHelpDefault;
  var appendGroup = this.context.config.appendHelpGroup;
  var store       = this.context.store;
  var primary     = false;
  var opts;

  options = _.compact(options);
  opts    = _.map(options, function (opt) {
    var option = {};
    if (!_.isString(opt.name)) return null; // an option without a name is useless
    option.name        = opt.name;
    option.help        = _.isString(opt.help) ? opt.help : '';
    option.group       = _.isString(opt.group) ? opt.group : null;
    option.default     = opt.default || null;
    option.multiple    = opt.multiple === true;
    option.required    = opt.required === true;
    option.hidden      = opt.hidden === true;
    option.bool        = opt.bool === true || opt.boolean === true;
    option.completions = utility.resolveMatches(opt.match, opt.matchName || null);

    // Only 1 primary is allowed and it is not allowed to
    // be a boolean option since it doesn't make sense
    option.primary = primary ? false : ((!option.bool && opt.primary) || false);

    if (option.default && appendHelp)
      option.help += util.format(' (default: %s)', option.default);

    if (option.group && appendGroup)
      option.help = util.format('%s (group: %s)', option.help, option.group);

    if (option.primary)
      primary = true;

    // prefill boolean options with false
    if (option.bool)
      store[option.name] = false;

    store[option.name] = option.default;
    return option;
  });

  return _.compact(opts);
}

function cleanUpOptions(options) {
  var copy = _.cloneDeep(options);

  // remove already seen options
  _.remove(copy, function (c) {
    return _.contains(this.seenOptions, c.name);
  }, this);

  // remove options that was already satisfied by a member (group)
  _.remove(copy, function (c) {
    return _.contains(this.seenGroups, c.group);
  }, this);

  // remove hidden options
  _.remove(copy, function (c) {
    return c.hidden === true;
  });

  // bracket the primary option
  var primary = _.find(copy, { primary: true });
  if (primary) {
    primary.name = util.format('<%s>', primary.name);
  }

  return copy;
}

function validate() {
  // check that options are sane
  var options = this.context.options || [];

  var required = _.every(options, checkRequired, this);
  if (!required) return false;

  var value = _.every(options, checkValue, this);
  if (!value) return false;

  return true;
}

function parse() {
  var currentKey;
  var currentOption;
  var tokens;
  var primaryOption;
  var options;

  var choiceCompletion = [];
  var store            = {}; // parsed data

  this.currentState = STATE.ON_NONE;
  this.seenOptions  = [];
  this.seenGroups   = [];
  this.completions  = [];

  this._errorMsg   = '';
  this._errorToken = null;

  this.context.store = store;
  this.currentState  = STATE.ON_SINGLE_KEY;

  function processMultipleOptions() {
    var available = currentOption.completions;
    var element;

    available = available ? _.map(available, 'name') : [];

    while (tokens.length !== 0) {
      element       = tokens.shift();
      var predicate = function (e) { return e === element; }

      if (!_.find(available, predicate)) {
        tokens.unshift(element); //put currentKey back
        break;
      }

      store[currentKey].push(element);
      choiceCompletion.push({ name: element, help: '!<< selected' });
    }

    available = _.difference(available, store);
    _.each(available, function (element) {
      choiceCompletion.push({ name: element, help: '!' });
    });

    choiceCompletion = _.unique(choiceCompletion, false, 'name');
  }

  tokens  = this.context.tokens;
  options = this.context.options;
  options = normalize.call(this, options);

  primaryOption = _.find(options, { primary: true });

  this.context.options = options;
  this.primaryOption   = primaryOption;

  // no tokens, just return all available opts
  if (tokens.length === 0) {
    this.completions = cleanUpOptions.call(this, options);
    return true;
  }

  // processing options one by one
  while (tokens.length !== 0 && tokens[0] !== '|') {
    this.context.state = this.STATES.ON_OPTION;

    var finder = function (element) {
      var primary = !!primaryOption;
      if (primary && currentKey === primaryOption.name) return false;
      return element.name === currentKey && !_.contains(this.seenOptions, currentKey);
    }.bind(this);

    currentKey    = tokens.shift();
    currentOption = _.find(options, finder);

    if (!currentOption) {
      if (!!primaryOption && checkValue.call(this, primaryOption, currentKey)) {
        store[primaryOption.name] = currentKey;
        this.seenOptions.push(primaryOption.name);
        continue;
      }
      this._errorMsg   = util.format('unknown option: %s', currentKey);
      this._errorToken = currentKey;
      return false;
    }

    this.seenOptions.push(currentKey);
    if (currentOption.group) {
      this.seenGroups.push(currentOption.group);
    }

    // boolean values
    if (currentOption.bool) {
      this.currentState = STATE.ON_SINGLE_KEY;
      store[currentKey] = true;
      continue;
    }

    // last token is a key, return its completions
    if (tokens.length === 0) {
      this.currentState = STATE.ON_VALUE;
      this.completions  = cleanUpOptions.call(this, currentOption.completions);
      break;
    }

    // multi opts
    if (currentOption.multiple) {
      store[currentKey] = [];
      this.currentState = STATE.ON_MULTI_KEY;
      processMultipleOptions(); // will augment store and remaining tokens
      store[currentKey] = _.unique(store[currentKey]);
    } else {
      // single option
      this.currentState = STATE.ON_SINGLE_KEY;
      store[currentKey] = tokens.shift();
    }
  }

  if (this.currentState !== STATE.ON_MULTI_KEY)
    choiceCompletion = [];

  this.completions =
    this.currentState == STATE.ON_VALUE ?
      this.completions :
      cleanUpOptions.call(this, options).concat(choiceCompletion);

  return true;
}

function complete() {
  var primaryList  = this.primaryOption ? this.primaryOption.completions : null;
  var completeList = this.completions;
  var pipeCommand  = this.context.pipeable || false;
  var shouldPrint  =
        (completeList.length || _.keys(this.context.store).length > 0) &&
        _.include([STATE.ON_MULTI_KEY, STATE.ON_SINGLE_KEY], this.currentState);

  if (shouldPrint) {
    completeList.push(this.CR);
    completeList.push(pipeCommand ? this.PIPE : null);

    primaryList = utility.transform(primaryList);
    if (this.primaryOption && !_.contains(this.seenOptions, this.primaryOption.name)) {
      _.each(primaryList, function (p) { p.help = '_' + p.help });
      completeList = completeList.concat(primaryList);
    }
  }
  return completeList;
}


function Option(context) {
  if (!(this instanceof Option)) {
    return new Option(context);
  }

  this.primaryOption = null;
  this.context       = context;

  this.validate = validate;
  this.parse    = parse;
  this.complete = complete;
}

Option.prototype = Base;
module.exports   = Option;
