;
(function () {
  "use strict";

  var _    = require('lodash');
  var util = require('util');

  var STATES = {ON_NONE: 1, ON_SINGLE_KEY: 2, ON_MULTI_KEY: 3, ON_VALUE: 4};

  // internal state variables
  var cmdParser;

  var currentState = STATES.ON_NONE;
  var options;
  var tokens;
  var remaining;
  var seenOptions;
  var seenGroups;

  var completions;
  var data;

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
      option.bool          = opt.bool === true;
      option.multiple      = opt.multiple === true;
      option.hidden        = opt.hidden === true;
      option.group         = opt.group;
      if (!option.bool)
        option.completions = opt.match(); // TODO: implement better matching logic
      return option;
    });

    return _.compact(opts);
  }

  function cleanup(options) {
    var copy = _.cloneDeep(options);

    // remove already parsed options
    _.remove(copy, function (c) {
      return _.contains(seenOptions, c.name);
    });

    // remove options that was already satisfied by a member (group)
    _.remove(copy, function (c) {
      return _.contains(seenGroups, c.group);
    })

    // remove hidden options
    _.remove(copy, function (c) {
      return c.hidden === true;
    });

    // Augment help of each group with its name
    _.each(copy, function (option) {
      if (!option.group) return;
      option.help = util.format('%s (group: %s)', option.help, option.group.red);
    });

    return copy;
  }

  function parse() {
    var pipeIdx;
    var choiceCompletions = [];

    function processMultipleOptions(option, tokens, store) {
      var available = option.completions || [];
      var element;

      while (tokens.length !== 0) {
        element       = tokens.shift();
        var predicate = function (e) {
          return e === element;
        }

        if (_.find(available, predicate) === undefined) {
          tokens.unshift(element); //put the key back
          break;
        }

        store.push(element);
        choiceCompletions.push({name: element, help: '!<< selected'});
      }

      available = _.difference(available, store);
      _.each(available, function (element) {
        choiceCompletions.push({name: element, help: '!'});
      });

      choiceCompletions = _.unique(choiceCompletions, false, 'name');
    }

    currentState = STATES.ON_SINGLE_KEY;
    options      = normalize(options);

    pipeIdx = _.indexOf(tokens, '|');
    pipeIdx = pipeIdx >= 0 ? pipeIdx : tokens.length;

    remaining           = _.slice(tokens, pipeIdx, tokens.length); // we only operate on opts
    tokens              = _.slice(tokens, 0, pipeIdx);

    // no opts, just return all available opts
    if (tokens.length === 0) {
      completions = cleanup(options);
      return true;
    }

    while (tokens.length !== 0) {
      var key       = tokens.shift();
      var value     = null;
      var predicate = function (element) {
        return element['name'] === key && !_.contains(seenOptions, key);
      }
      var option    = _.find(options, predicate);

      if (!option) return false; // TODO: better error handling

      seenOptions.push(key);
      if (option.group) {
        seenGroups.push(option.group);
      }

      // boolean values
      if (option.bool || option.boolean) {
        currentState = STATES.ON_SINGLE_KEY;
        data[key]    = true;
        continue;
      }

      // key value opts --> get value
      if (tokens.length === 0) {
        currentState = STATES.ON_VALUE;
        completions  = cleanup(option.completions);
        break;
      }


      // multiplicity
      if (option.multiple) {
        data[key]    = [];
        currentState = STATES.ON_MULTI_KEY;
        processMultipleOptions(option, tokens, data[key]);
        data[key]    = _.unique(data[key]);
      } else {
        // single option
        currentState = STATES.ON_SINGLE_KEY;
        data[key]    = tokens.shift();
      }

    }


    // === post process === //
    // put false for unregistered boolean options
    _.each(
      _.filter(options, function (opt) { return opt.bool === true && !data[opt.name] }),
      function (opt) { data[opt.name] = false; }
    );

    _.each(options, function(opt) {
      if (_.has(data, opt.name)) return; // option already inserted
      data[opt.name] = opt.default;
    });


    if (currentState !== STATES.ON_MULTI_KEY)
      choiceCompletions = [];

    completions = currentState == STATES.ON_VALUE ? completions : cleanup(options).concat(choiceCompletions);
    return true;
  }

  function getCompleteList() {
    var shouldPrint = (completions.length || _.keys(data).length > 0) &&
      _.include([STATES.ON_MULTI_KEY, STATES.ON_SINGLE_KEY], currentState);

    if (shouldPrint) {
      completions.push({name: '<cr>', help: 'execute command'})
      if (cmdParser.isPipeable())
        completions.push({name: '|', help: 'pipe output to an external command'})
    }

    return completions;
  }

  function getRemainingTokens() {
    return _.clone(remaining);
  }

  function init(tks, commandp) {
    // initialize internal state
    tokens       = _.clone(tks);
    cmdParser    = commandp;
    options      = cmdParser.getCommandOpts();
    currentState = STATES.ON_NONE;
    seenOptions  = [];
    seenGroups   = [];
    remaining    = [];
    completions  = [];
    data         = {};

    var lib                = {};
    lib.parse              = parse;
    lib.getCompleteList    = getCompleteList;
    lib.getRemainingTokens = getRemainingTokens;
    return lib;
  }

  module.exports = init;
}.call(this));
