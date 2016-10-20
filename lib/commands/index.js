'use strict';

const publish = require('./publish');
const update  = require('./update');
const remove  = require('./remove');
const list    = require('./list');

module.exports = {
  publish,
  update,
  remove,
  list,
  NAMES: [publish.NAME, update.NAME, remove.NAME, list.NAME]
};