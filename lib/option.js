;
(function () {
  "use strict";

  var util = require('util');
  var _    = require('lodash');

  var Base = require('./base');

  var STATE = {ON_NONE: 1, ON_SINGLE_KEY: 2, ON_MULTI_KEY: 3, ON_VALUE: 4};

  function checkValue(option) {
    var key      = option.name;
    var value    = this.store[option.name];
    var possible = option.completions;

    // no need to worry about data being required
    // since it will be handled seperately

    // ignore unseen opts
    if (!_.contains(this.seenOptions, key)) return true;

    // ignore boolean flags
    if (option.boolean || option.bool) return true;

    if (!value) {
      this._errorMsg = util.format('value for option `%s` not supplied ', key);
      return false;
    }

    if (!_.isArray(value)) { value = [value]; }

    var rv = true;
    _.each(value, function (v) {
      if (!_.contains(possible, v)) {
        this._errorMsg = util.format('value `%s` for option `%s` not valid', v, key);
        rv = false;
        return false;
      }
    }, this);

    return rv;
  }

  function checkRequired(option) {
    var key            = option.name;
    var value          = this.store[option.name];
    var isRequired     = false;
    var group          = false;

    if (option.group) {
      var groupOptions = _.filter(this.options, {group: option.group});
      group            = true;
      isRequired       = _.any(groupOptions, {required: true});
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
      if (this.store[gopt.name]) count++;
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
      var option           = {};
      if (!_.has(opt, 'name')) return null;
      option.name          = opt.name;
      option.help          = opt.help;
      option.default       = opt.default || '';
      option.multiple      = opt.multiple === true;
      option.required      = opt.required === true;
      option.hidden        = opt.hidden === true;
      option.group         = opt.group;
      option.bool          = opt.bool === true;
      if (!option.bool)
        option.completions = opt.match(); // TODO: implement better matching logic
      return option;
    });

    return _.compact(opts);
  }

  function cleanup(options) {
    var options = options || this.options;
    var copy    = _.cloneDeep(options);
    var self    = this;

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
    var pipeIdx;
    var choiceCompletion = [];
    var store            = {}; // store parsed data
    var self             = this;

    this._errorMsg   = ''
    this._errorToken = '';

    function processMultipleOptions() {
      var available = currentOption.completions || [];
      var element;

      while (self.tokens.length !== 0) {
        element       = self.tokens.shift();
        var predicate = function (e) {
          return e === element;
        }

        if (_.find(available, predicate) === undefined) {
          self.tokens.unshift(element); //put the currentKey back
          break;
        }

        store[currentKey].push(element);
        choiceCompletion.push({name: element, help: '!<< selected'});
      }

      available = _.difference(available, store);
      _.each(available, function (element) {
        choiceCompletion.push({name: element, help: '!'});
      });

      choiceCompletion = _.unique(choiceCompletion, false, 'name');
    }

    pipeIdx = _.indexOf(this.tokens, '|');
    pipeIdx = pipeIdx >= 0 ? pipeIdx : this.tokens.length;

    this.currentState = STATE.ON_SINGLE_KEY;
    this.options      = normalize(this.options);

    this.remaining     = _.slice(this.tokens, pipeIdx, this.tokens.length); // we only operate on opts
    this.tokens        = _.slice(this.tokens, 0, pipeIdx);

    // no tokens, just return all available opts
    if (this.tokens.length === 0) {
      this.completions = cleanup.call(this);
      return true;
    }

    // processing options one by one
    while (this.tokens.length !== 0) {
      currentKey        = this.tokens.shift();
      var predicate     = function (element) {
        return element['name'] === currentKey && !_.contains(this.seenOptions, currentKey);
      }.bind(this);
      var currentOption = _.find(this.options, predicate);

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
        this.currentState = STATE.ON_SINGLE_KEY;
        store[currentKey] = true;
        continue;
      }

      // last token is a key, return its completions
      // TODO: if regex or something else convert to readable form
      if (this.tokens.length === 0) {
        this.currentState = STATE.ON_VALUE;
        this.completions  = cleanup.call(this, currentOption.completions);
        break;
      }

      // multiplicity
      if (currentOption.multiple) {
        store[currentKey] = [];
        this.currentState = STATE.ON_MULTI_KEY;
        processMultipleOptions(); // will augment store
        store[currentKey] = _.unique(store[currentKey]);
      } else {
        // single option
        this.currentState = STATE.ON_SINGLE_KEY;
        store[currentKey] = this.tokens.shift();
      }
    }


    // === post process === //
    // put false for unregistered boolean options
    _.each(
      _.filter(this.options, function (opt) {
        return (opt.bool || opt.boolean) && !store[opt.name];
      }),
      function (opt) {
        store[opt.name] = false;
      }
    );

    // plug defaults
    _.each(this.options, function (opt) {
      if (_.has(store, opt.name)) return; // option already inserted
      store[opt.name] = opt.default;      // whatever if undefined
    });

    if (this.currentState !== STATE.ON_MULTI_KEY)
      choiceCompletion = [];

    this.completions = this.currentState == STATE.ON_VALUE ? this.completions : cleanup.call(this).concat(choiceCompletion);
    this.store       = store;
    return true;
  }

  function getCompleteList() {
    var shouldPrint = (this.completions.length || _.keys(this.store).length > 0) &&
      _.include([STATE.ON_MULTI_KEY, STATE.ON_SINGLE_KEY], this.currentState);

    if (shouldPrint) {
      this.completions.push({name: '<cr>', help: 'execute command'})
      if (this.pipeCommand)
        this.completions.push({name: '|', help: 'pipe output to an external command'})
    }

    return this.completions;
  }

  function getRemainingTokens() {
    return _.clone(this.remaining);
  }

  function validate() {
    // check that options are sane

    var required = _.every(this.options, checkRequired, this);
    if (!required) return false;

    var mulitple = _.every(this.options, checkValue, this);
    if (!mulitple) return false;

    return true;
  }

  function Option(options, piped, tokens) {
    if (!(this instanceof Option)) {
      return new Option(options, tokens, piped);
    }

    this.tokens       = _.clone(tokens);
    this.pipeCommand  = piped;
    this.options      = options;
    this.currentState = STATE.ON_NONE;
    this.seenOptions  = [];
    this.seenGroups   = [];
    this.remaining    = [];
    this.completions  = [];
    this.store        = {};

    this.parse              = parse;
    this.getCompleteList    = getCompleteList;
    this.getRemainingTokens = getRemainingTokens;
    this.validate           = validate;
  }

  Option.prototype = new Base();
  module.exports   = Option;
}.call(this));
