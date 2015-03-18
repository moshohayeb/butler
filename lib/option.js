;
(function () {
  "use strict";

  var util = require('util');
  var _    = require('lodash');

  var utility = require('./utility');
  var Base    = require('./base');

  var STATE = { ON_NONE: 1, ON_SINGLE_KEY: 2, ON_MULTI_KEY: 3, ON_VALUE: 4 };

  function checkValue(option) {
    var key      = option.name;
    var value    = this.context.store[ option.name ];
    var possible = option.completions;

    // no need to worry about data being required
    // since it will be handled seperately

    function checkArray() {
      var rv = true;

      if (!_.isArray(value))
        value = [ value ];

      _.each(value, function (v) {
        if (!_.contains(possible, v)) {
          this._errorMsg = util.format('value `%s` for option `%s` not valid', v, key);
          rv             = false;
          return false;
        }
      }, this);

      return rv;
    }

    function checkObject() {
      var rv = true;

      if (_.has(possible, 'regexp')) {
        rv = possible.regexp.test(value)
        if (!rv) {
          this._errorMsg = util.format('value `%s` for option `%s` is not in accepted range', value, key);
          this._errorToken = value;
        }
      }

      return rv;
    }

    if (!_.contains(this.seenOptions, key)) return true; // ignore unseen opts
    if (option.boolean || option.bool) return true; // ignore boolean flags
    if (!value) {
      this._errorMsg = util.format('value for option `%s` not supplied ', key);
      this._errorToken = null;
      return false;
    }

    if (_.isArray(possible))
      return checkArray.call(this);
    else if (_.isObject(possible))
      return checkObject.call(this);
    // else
    return false;
  }

  function checkRequired(option) {
    var key            = option.name;
    var value          = this.context.store[ option.name ];
    var isRequired     = false;
    var group          = false;
    var options        = this.context.options;

    if (option.group) {
      var groupOptions = _.filter(options, { group: option.group });
      group            = true;
      isRequired       = _.any(groupOptions, { required: true });
    } else {
      isRequired = option.required;
    }

    if (!isRequired) return true;

    if (!group) {
      // single
      if (!value) {
        this._errorMsg = util.format('required option `%s` not supplied', key);
        return false;
      }
      return true;
    }


    // group: make sure EXACTLY one key holds a value
    var count          = 0;
    _.each(groupOptions, function (gopt) {
      if (this.context.store[ gopt.name ]) count++;
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
    var opts;
    opts = _.map(options, function (opt) {
      var option         = {};
      if (!_.has(opt, 'name')) return null;
      option.name        = opt.name;
      option.help        = opt.help;
      option.default     = opt.default || null;
      option.multiple    = opt.multiple === true;
      option.required    = opt.required === true;
      option.hidden      = opt.hidden === true;
      option.group       = opt.group;
      option.bool        = opt.bool === true;
      option.completions = utility.resolveMatches(opt.match);

      // append default to help string if it exists
      if (option.default)
        option.help += util.format(' (default: %s)', option.default);

      return option;
    });

    return _.compact(opts);
  }

  function cleanup(options) {
    var copy = _.cloneDeep(options);
    var self = this;

    // remove already parsed options
    _.remove(copy, function (c) {
      return _.contains(self.seenOptions, c.name);
    });

    // remove options that was already satisfied by a member (group)
    _.remove(copy, function (c) {
      return _.contains(self.seenGroups, c.group);
    })

    // remove hidden options
    _.remove(copy, function (c) {
      return c.hidden === true;
    });

    // Augment help of each group with its name
    _.each(copy, function (option) {
      if (!option.group) return;
      option.help = util.format('%s (group: %s)', option.help, option.group.blue);
    });

    return copy;
  }

  function parse() {
    var currentKey;
    var currentOption;
    var tokens;
    var choiceCompletion = [];

    var options;
    var store = {}; // store parsed data

    this.currentState = STATE.ON_NONE;
    this.seenOptions  = [];
    this.seenGroups   = [];
    this.completions  = [];

    this._errorMsg   = ''
    this._errorToken = null;

    function processMultipleOptions() {
      var available = currentOption.completions || [];
      var element;

      while (tokens.length !== 0) {
        element       = tokens.shift();
        var predicate = function (e) {
          return e === element;
        }

        if (_.find(available, predicate) === undefined) {
          tokens.unshift(element); //put the currentKey back
          break;
        }

        store[ currentKey ].push(element);
        choiceCompletion.push({ name: element, help: '!<< selected' });
      }

      available = _.difference(available, store);
      _.each(available, function (element) {
        choiceCompletion.push({ name: element, help: '!' });
      });

      choiceCompletion = _.unique(choiceCompletion, false, 'name');
    }

    tokens  = this.context[ 'tokens' ] || [];
    options = this.context[ 'options' ] || [];

    this.currentState = STATE.ON_SINGLE_KEY;
    options           = normalize(options);

    this.context.store   = store;
    this.context.options = options;

    // no tokens, just return all available opts
    if (tokens.length === 0) {
      this.completions = cleanup.call(this, options);
      return true;
    }

    // processing options one by one
    while (tokens.length !== 0 && tokens[ 0 ] !== '|') {
      currentKey        = tokens.shift();
      var predicate     = function (element) {
        return element[ 'name' ] === currentKey && !_.contains(this.seenOptions, currentKey);
      }.bind(this);
      var currentOption = _.find(options, predicate);

      if (!currentOption) {
        this._errorMsg   = util.format('unknown option: %s', currentKey);
        this._errorToken = currentKey;
        return false;
      }

      this.seenOptions.push(currentKey);
      if (currentOption.group) {
        this.seenGroups.push(currentOption.group);
      }

      // boolean values
      if (currentOption.bool || currentOption.boolean) {
        this.currentState   = STATE.ON_SINGLE_KEY;
        store[ currentKey ] = true;
        continue;
      }

      // last token is a key, return its completions
      if (tokens.length === 0) {
        this.currentState = STATE.ON_VALUE;
        this.completions  = cleanup.call(this, currentOption.completions);
        break;
      }

      // multiplicity
      if (currentOption.multiple) {
        store[ currentKey ] = [];
        this.currentState   = STATE.ON_MULTI_KEY;
        processMultipleOptions(); // will augment store
        store[ currentKey ] = _.unique(store[ currentKey ]);
      } else {
        // single option
        this.currentState   = STATE.ON_SINGLE_KEY;
        store[ currentKey ] = tokens.shift();
      }
    }


    // === post process === //
    // put false for unregistered boolean options
    var boolOpts         = _.filter(options, function (opt) {
      return (opt.bool || opt.boolean) && !store[ opt.name ];
    });
    _.each(boolOpts, function (opt) {
      store[ opt.name ] = false;
    });

    // plug defaults
    _.each(options, function (opt) {
      if (_.has(store, opt.name)) return; // option already inserted
      store[ opt.name ] = opt.default;      // whatever if undefined
    });

    if (this.currentState !== STATE.ON_MULTI_KEY)
      choiceCompletion   = [];

    this.completions = this.currentState == STATE.ON_VALUE ? this.completions : cleanup.call(this, options).concat(choiceCompletion);

    return true;
  }

  function completes() {
    var completeList = this.completions;
    var pipeCommand  = this.context.pipeable || false;
    var shouldPrint  = (completeList.length || _.keys(this.context.store).length > 0) &&
      _.include([ STATE.ON_MULTI_KEY, STATE.ON_SINGLE_KEY ], this.currentState);

    if (!_.isArray(completeList)) {
      completeList = [ completeList ];
    }

    if (shouldPrint) {
      completeList.push({ name: '<cr>', help: 'execute command', completeOn: false })
      if (pipeCommand)
        completeList.push({ name: '|', help: 'pipe output to an external command' })
    }

    return completeList;
  }

  function validate() {
    // check that options are sane
    var options = this.context.options || [];

    var required = _.every(options, checkRequired, this);
    if (!required) return false;

    var mulitple = _.every(options, checkValue, this);
    if (!mulitple) return false;

    return true;
  }

  function Option(context) {
    if (!(this instanceof Option)) {
      return new Option(context);
    }

    this.context = context;

    this.parse     = parse;
    this.validate  = validate;
    this.completes = completes;
  }

  Option.prototype = new Base();
  module.exports   = Option;
}.call(this));
