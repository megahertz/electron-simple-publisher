'use strict';

var publish = require('./publish');
var remove = require('./remove');

module.exports = replace;
module.exports.NAME = 'replace';

function replace(build, options) {
  return remove(build, options).then(function () {
    return publish(build, options);
  });
}