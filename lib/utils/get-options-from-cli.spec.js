'use strict';
/* eslint-disable padded-blocks */

const { expect }        = require('chai');
const getOptionsFromCli = require('./get-options-from-cli');


describe('CLI', () => {

  it('should use publish as default command', () => {
    const options = cmd('');
    expect(options).to.deep.equal({
      command: 'publish',
      builds: [],
      fields: {},
      transport: {}
    });
  });

  it('should remove builds', () => {
    const options = cmd('remove -t github win32-x64-prod-v0.0.2');
    expect(options).to.deep.equal({
      command: 'remove',
      builds: ['win32-x64-prod-v0.0.2'],
      fields: {},
      transport: { name: 'github' }
    });
  });

  it('should list builds', () => {
    const options = cmd('list -t github');
    expect(options).to.deep.equal({
      command: 'list',
      builds: [],
      fields: {},
      transport: { name: 'github' }
    });
  });

  it('should update a single build', () => {
    const options = cmd('update win32-x64');
    expect(options).to.deep.equal({
      command: 'update',
      builds: ['win32-x64'],
      fields: {},
      transport: {}
    });
  });

  it('should publish without arguments', () => {
    const options = cmd('publish');
    expect(options).to.deep.equal({
      command: 'publish',
      builds: [],
      fields: {},
      transport: {}
    });
  });

  it('should publish a single build', () => {
    const options = cmd('publish win32-x64');
    expect(options).to.deep.equal({
      command: 'publish',
      builds: ['win32-x64'],
      fields: {},
      transport: {}
    });
  });

  it('should publish multiple builds', () => {
    const options = cmd('publish win32-x64 win32-ia32');
    expect(options).to.deep.equal({
      command: 'publish',
      builds: ['win32-x64', 'win32-ia32'],
      fields: {},
      transport: {}
    });
  });

  it('should publish multiple builds with the config', () => {
    const options = cmd('publish publisher.json win32-x64 win32-ia32');
    expect(options).to.deep.equal({
      command: 'publish',
      builds: ['win32-x64', 'win32-ia32'],
      fields: {},
      config: 'publisher.json',
      transport: {}
    });
  });

  it('should publish multiple builds with the config and options', () => {
    const options = cmd(
      'publish -p ./dist/win --transport=github publisher.json win32-x64'
    );
    expect(options).to.deep.equal({
      command: 'publish',
      builds: ['win32-x64'],
      fields: {},
      config: 'publisher.json',
      path: './dist/win',
      transport: {
        name: 'github'
      }
    });
  });

  it('should publish with additional updates.json fields', () => {
    const options = cmd('publish --field-readme=FirstRelease');
    expect(options).to.deep.equal({
      command: 'publish',
      builds: [],
      fields: { readme: 'FirstRelease' },
      transport: {}
    });
  });

  it('should publish with mixed options order', () => {
    const options = cmd('publish publisher.json -t github win32-x64-prod');
    expect(options).to.deep.equal({
      command: 'publish',
      builds: ['win32-x64-prod'],
      config: 'publisher.json',
      fields: { },
      transport: {
        name: 'github'
      }
    });
  });

  it('should publish with transport params', () => {
    const options = cmd('publish publisher.json -t github --transport-token=123');
    expect(options).to.deep.equal({
      command: 'publish',
      builds: [],
      config: 'publisher.json',
      fields: { },
      transport: {
        name: 'github',
        token: 123
      }
    });
  });

});

function cmd(args) {
  return getOptionsFromCli(args.split(' '));
}