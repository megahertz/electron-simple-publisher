'use strict';

const publish = require('./publish');
const replace = require('./replace');
const remove  = require('./remove');
const clean  = require('./clean');
const list    = require('./list');

module.exports = {
  publish,
  replace,
  remove,
  list,
  NAMES: [publish.NAME, replace.NAME, remove.NAME, list.NAME, clean.NAME],
};
