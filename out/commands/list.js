'use strict';

module.exports = list;
module.exports.NAME = 'list';

function list(options) {
  var transport = options.transport.instance;

  var result = void 0;
  return transport.fetchBuildsList().then(function (list) {
    result = list;
    return transport.close();
  }).then(function () {
    return result;
  });
}