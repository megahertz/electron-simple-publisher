'use strict';

var publish = require('./publish');
var replace = require('./replace');
var remove = require('./remove');
var list = require('./list');

module.exports = {
  publish: publish,
  replace: replace,
  remove: remove,
  list: list,
  NAMES: [publish.NAME, replace.NAME, remove.NAME, list.NAME]
};