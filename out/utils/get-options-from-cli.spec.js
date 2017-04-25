'use strict';
/* eslint-disable padded-blocks */

var _require = require('chai'),
    expect = _require.expect;

var getOptionsFromCli = require('./get-options-from-cli');

describe('CLI', function () {

  it('should use publish as default command', function () {
    var options = cmd('');
    expect(options).to.deep.equal({
      command: 'publish',
      builds: [],
      fields: {},
      transport: {}
    });
  });

  it('should remove builds', function () {
    var options = cmd('remove -t github win32-x64-prod-v0.0.2');
    expect(options).to.deep.equal({
      command: 'remove',
      builds: ['win32-x64-prod-v0.0.2'],
      fields: {},
      transport: { module: 'github' }
    });
  });

  it('should list builds', function () {
    var options = cmd('list -t github');
    expect(options).to.deep.equal({
      command: 'list',
      builds: [],
      fields: {},
      transport: { module: 'github' }
    });
  });

  it('should replace a single build', function () {
    var options = cmd('replace win32-x64');
    expect(options).to.deep.equal({
      command: 'replace',
      builds: ['win32-x64'],
      fields: {},
      transport: {}
    });
  });

  it('should publish without arguments', function () {
    var options = cmd('publish');
    expect(options).to.deep.equal({
      command: 'publish',
      builds: [],
      fields: {},
      transport: {}
    });
  });

  it('should publish a single build', function () {
    var options = cmd('publish win32-x64');
    expect(options).to.deep.equal({
      command: 'publish',
      builds: ['win32-x64'],
      fields: {},
      transport: {}
    });
  });

  it('should publish multiple builds', function () {
    var options = cmd('publish win32-x64 win32-ia32');
    expect(options).to.deep.equal({
      command: 'publish',
      builds: ['win32-x64', 'win32-ia32'],
      fields: {},
      transport: {}
    });
  });

  it('should publish multiple builds with the config', function () {
    var options = cmd('publish publisher.json win32-x64 win32-ia32');
    expect(options).to.deep.equal({
      command: 'publish',
      builds: ['win32-x64', 'win32-ia32'],
      fields: {},
      config: 'publisher.json',
      transport: {}
    });
  });

  it('should publish multiple builds with the config and options', function () {
    var options = cmd('publish -p ./dist/win --transport=github publisher.json win32-x64');
    expect(options).to.deep.equal({
      command: 'publish',
      builds: ['win32-x64'],
      fields: {},
      config: 'publisher.json',
      path: './dist/win',
      transport: { module: 'github' }
    });
  });

  it('should publish with additional updates.json fields', function () {
    var options = cmd('publish --field-readme=FirstRelease');
    expect(options).to.deep.equal({
      command: 'publish',
      builds: [],
      fields: { readme: 'FirstRelease' },
      transport: {}
    });
  });

  it('should publish with mixed options order', function () {
    var options = cmd('publish publisher.json -t github win32-x64-prod');
    expect(options).to.deep.equal({
      command: 'publish',
      builds: ['win32-x64-prod'],
      config: 'publisher.json',
      fields: {},
      transport: { module: 'github' }
    });
  });

  it('should publish with transport params', function () {
    var options = cmd('publish publisher.json -t github --transport-token=123');
    expect(options).to.deep.equal({
      command: 'publish',
      builds: [],
      config: 'publisher.json',
      fields: {},
      transport: { module: 'github', token: 123 }
    });
  });
});

function cmd(args) {
  return getOptionsFromCli(args.split(' '));
}