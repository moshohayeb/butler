'use strict'

function Base() {
}

Base.prototype.STATES = { ON_NONE: 1, ON_COMMAND: 1, ON_OPTION: 2, ON_PIPE: 3 }
Base.prototype.CR = { name: '<CR>', help: 'execute command', completeOn: false }
Base.prototype.PIPE = { name: '|', help: 'output modifiers', completeOn: true }
Base.prototype.VALUE = { name: '<value>', help: 'insert option value', completeOn: false }

Base.prototype.complete = function () { return [] }
Base.prototype.parse = function () { return true }
Base.prototype.validate = function () { return true }

module.exports = Base
