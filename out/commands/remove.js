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
  var transport = options.transport.instance;
  return transport.beforeRemove(build).then(function () {
    return transport.removeBuild(build);
  }).then(function () {
    return transport.updateUpdatesJson(build, false);
  }).then(function () {
    return transport.afterRemove(build);
  });
}