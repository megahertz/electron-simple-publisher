'use strict';

const clean   = require('./CleanCommand');
const list    = require('./ListCommand');
const publish = require('./PublishCommand');
const remove  = require('./RemoveCommand');
const replace = require('./ReplaceCommand');

module.exports = {
  clean,
  list,
  publish,
  remove,
  replace,
};
