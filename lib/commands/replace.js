'use strict';

const publish = require('./publish');
const remove  = require('./remove');

module.exports = replace;
module.exports.NAME = 'replace';


function replace(build, options) {
  return remove(build, options)
    .then(() => publish(build, options));
}