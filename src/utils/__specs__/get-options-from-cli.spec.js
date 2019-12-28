'use strict';

/* eslint-disable padded-blocks */

const { describe, expect, it } = require('humile');
const getOptionsFromCli = require('../get-options-from-cli');


describe('CLI', () => {
  it('should use publish as default command', () => {
    const options = cmd('');
    expect(options).toEqual({
      command: 'publish',
      builds: [],
      fields: {},
      transport: {},
    });
  });

  it('should remove builds', () => {
    const options = cmd('remove -t github win32-x64-prod-v0.0.2');
    expect(options).toEqual({
      command: 'remove',
      builds: ['win32-x64-prod-v0.0.2'],
      fields: {},
      transport: { module: 'github' },
    });
  });

  it('should list builds', () => {
    const options = cmd('list -t github');
    expect(options).toEqual({
      command: 'list',
      builds: [],
      fields: {},
      transport: { module: 'github' },
    });
  });

  it('should replace a single build', () => {
    const options = cmd('replace win32-x64');
    expect(options).toEqual({
      command: 'replace',
      builds: ['win32-x64'],
      fields: {},
      transport: {},
    });
  });

  it('should publish without arguments', () => {
    const options = cmd('publish');
    expect(options).toEqual({
      command: 'publish',
      builds: [],
      fields: {},
      transport: {},
    });
  });

  it('should publish a single build', () => {
    const options = cmd('publish win32-x64');
    expect(options).toEqual({
      command: 'publish',
      builds: ['win32-x64'],
      fields: {},
      transport: {},
    });
  });

  it('should publish multiple builds', () => {
    const options = cmd('publish win32-x64 win32-ia32');
    expect(options).toEqual({
      command: 'publish',
      builds: ['win32-x64', 'win32-ia32'],
      fields: {},
      transport: {},
    });
  });

  it('should publish multiple builds with the config', () => {
    const options = cmd('publish publisher.json win32-x64 win32-ia32');
    expect(options).toEqual({
      command: 'publish',
      builds: ['win32-x64', 'win32-ia32'],
      fields: {},
      config: 'publisher.json',
      transport: {},
    });
  });

  it('should publish multiple builds with the config and options', () => {
    const options = cmd(
      'publish -p ./dist/win --transport=github publisher.json win32-x64'
    );
    expect(options).toEqual({
      command: 'publish',
      builds: ['win32-x64'],
      fields: {},
      config: 'publisher.json',
      path: './dist/win',
      transport: { module: 'github' },
    });
  });

  it('should publish with additional updates.json fields', () => {
    const options = cmd('publish --field-readme=FirstRelease');
    expect(options).toEqual({
      command: 'publish',
      builds: [],
      fields: { readme: 'FirstRelease' },
      transport: {},
    });
  });

  it('should publish with mixed options order', () => {
    const options = cmd(
      'publish publisher.json -n -t github win32-x64-prod -d'
    );

    expect(options).toEqual({
      command: 'publish',
      builds: ['win32-x64-prod'],
      debug: true,
      config: 'publisher.json',
      fields: { },
      transport: { module: 'github' },
      noprogress: true,
    });
  });

  it('should publish with transport params', () => {
    const options = cmd(
      'publish publisher.json -t github --transport-token=123'
    );

    expect(options).toEqual({
      command: 'publish',
      builds: [],
      config: 'publisher.json',
      fields: { },
      transport: { module: 'github', token: 123 },
    });
  });

  it('should clean with except param', () => {
    const options = cmd(
      'clean -e win32,linux-x64'
    );

    expect(options).toEqual({
      command: 'clean',
      builds: [],
      fields: { },
      except: ['win32', 'linux-x64'],
      transport: {},
    });
  });
});

function cmd(args) {
  return getOptionsFromCli(args.split(' '));
}
