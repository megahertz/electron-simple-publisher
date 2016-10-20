'use strict';

module.exports = list;
module.exports.NAME = 'list';

function list(options) {
  const transport = options.transport.instance;

  let result;
  return transport.fetchBuildsList()
    .then((list) => {
      result = list;
      return transport.close();
    })
    .then(() => result);
}