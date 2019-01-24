'use strict';

/* eslint-disable no-await-in-loop */

module.exports = clean;
module.exports.NAME = 'clean';
module.exports.filterExceptions = filterExceptions;
module.exports.extractKeysFromUpdatesJson = extractKeysFromUpdatesJson;

/**
 * Return promise
 * @param {object} options
 * @return {Promise}
 */
async function clean(options) {
  /** @type {AbstractTransport} */
  const transport = options.transport.instance;
  const updatesJson = await transport.fetchUpdatesJson();

  if (updatesJson.isEmpty) {
    console.warn('Can\'t clean because updates.json is not available.');
    return [];
  }

  const list = filterExceptions(await transport.fetchBuildsList(), [
    ...extractKeysFromUpdatesJson(updatesJson),
    ...(options.except && options.except.forEach ? options.except : []),
  ]);

  for (const build of list) {
    await transport.beforeRemove(build);
    await transport.removeBuild(build);
    await transport.afterRemove(build);
  }

  return list;
}

function filterExceptions(list, exceptions) {
  return list.filter((build) => {
    return !exceptions.some(ex => build.includes(ex));
  });
}

function extractKeysFromUpdatesJson(updatesJson) {
  return Object.values(updatesJson).reduce((keys, section) => {
    if (!section) return keys;

    Object.values(section).forEach((str) => {
      if (!str.match) return;

      const matches = str.match(/(\w+-v\d+\.\d+\.\d+)/);
      if (matches && matches[1]) {
        keys.push(matches[1]);
      }
    });

    return keys;
  }, []);
}
