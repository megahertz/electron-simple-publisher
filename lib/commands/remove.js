'use strict';

module.exports = remove;
module.exports.NAME = 'remove';


/**
 * Return promise
 * @param {object} build Current build
 * @param {object} options
 * @return {Promise}
 */
function remove(build, options) {
  const transport = options.transport.instance;
  return transport.beforeRemove(build)
    .then(() => {
      return transport.removeBuild(build);
    })
    .then(() => {
      return transport.updateUpdatesJson(build, false);
    })
    .then(() => {
      return transport.afterRemove(build);
    });
}