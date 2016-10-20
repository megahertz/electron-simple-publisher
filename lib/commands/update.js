'use strict';

const publish = require('./publish');
const remove = require('./remove');

module.exports = update;
module.exports.NAME = 'update';


function update(build, options) {
  return remove(build, options)
    .then(() => publish(build, options));
}