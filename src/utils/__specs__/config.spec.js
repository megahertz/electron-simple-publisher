'use strict';

const { describe, expect, it } = require('humile');
const options = require('package-options');
const { Config, getOptions } = require('../config');

describe('config', () => {
  it('should use publish as default command', () => {
    const config = cmd('');

    expect(config.command).toBe('publish');
  });

  it('should remove builds', () => {
    const config = cmd('remove -t github win32-x64-prod-v0.0.2');

    expect(config.command).toBe('remove');
    expect(config.builds).toEqual(['win32-x64-prod-v0.0.2']);
    expect(config.transport).toEqual({ module: 'github' });
  });

  it('should list builds', () => {
    const config = cmd('list -t github');

    expect(config.command).toBe('list');
    expect(config.builds).toEqual([]);
    expect(config.transport).toEqual({ module: 'github' });
  });

  it('should replace a single build', () => {
    const config = cmd('replace win32-x64');

    expect(config.command).toBe('replace');
    expect(config.builds).toEqual(['win32-x64']);
  });

  it('should publish without arguments', () => {
    const config = cmd('publish');

    expect(config.command).toBe('publish');
  });

  it('should publish a single build', () => {
    const config = cmd('publish win32-x64');

    expect(config.command).toBe('publish');
    expect(config.builds).toEqual(['win32-x64']);
  });

  it('should publish multiple builds', () => {
    const config = cmd('publish win32-x64 win32-ia32');

    expect(config.command).toBe('publish');
    expect(config.builds).toEqual(['win32-x64', 'win32-ia32']);
  });

  it('should publish multiple builds with the config', () => {
    const config = cmd('publish publisher.json win32-x64 win32-ia32');

    expect(config.command).toBe('publish');
    expect(config.builds).toEqual(['win32-x64', 'win32-ia32']);
  });

  it('should publish multiple builds with the config and options', () => {
    const config = cmd(
      'publish -p ./dist/win --transport=github publisher.json win32-x64'
    );

    expect(config.command).toBe('publish');
    expect(config.builds).toEqual(['win32-x64']);
    expect(config.distPath).toBe('./dist/win');
    expect(config.transport).toEqual({ module: 'github' });
  });

  it('should publish with additional updates.json fields', () => {
    const config = cmd('publish --fields.readme=FirstRelease');

    expect(config.command).toBe('publish');
    expect(config.fields).toEqual({ readme: 'FirstRelease' });
  });

  it('should publish with mixed options order', () => {
    const config = cmd('publish publisher.json -n -t github win32-x64-prod -d');

    expect(config.command).toBe('publish');
    expect(config.showProgress).toBe(false);
    expect(config.transport).toEqual({ module: 'github' });
    expect(config.builds).toEqual(['win32-x64-prod']);
    expect(config.debugMode).toBe(true);
  });

  it('should publish with transport params', () => {
    const config = cmd(
      'publish pub.json -t github --transport.token 123'
    );

    expect(config.command).toBe('publish');
    expect(config.transport).toEqual({ module: 'github', token: 123 });
  });

  it('should clean with except param', () => {
    const config = cmd('clean -e win32,linux-x64');

    expect(config.command).toBe('clean');
    expect(config.except).toEqual(['win32', 'linux-x64']);
  });
});

function cmd(args) {
  return new Config(getOptions(args, options.clone()));
}
