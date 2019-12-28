'use strict';

const { describe, expect, it } = require('humile');
const mod = require('../normalize-options');

describe('Options module', () => {
  it('should apply options from package.json', () => {
    const packageJson = {
      version: '1.0.1',
      name: 'test-name',
      updater: {
        url: 'http://example.com',
        channel: 'test',
        build: 'win32-ia32',
      },
    };
    expect(mod.applyPackageJson({}, packageJson)).toEqual({
      packageJson,
      version: '1.0.1',
      updatesJsonUrl: 'http://example.com',
      channel: 'test',
      platform: 'win32',
      arch: 'ia32',
    });
  });

  it('should apply platform defaults to options', () => {
    const process = {
      platform: 'linux',
      arch: 'ia32',
    };
    expect(mod.applyPlatformDefaults({}, process)).toEqual({
      platform: 'linux',
      arch: 'ia32',
    });
  });

  it('should transform a build name to build meta', () => {
    const opt = {
      platform: 'linux',
      arch: 'ia32',
      version: '1.2.3',
      channel: 'prod',
    };

    const betaOpt = { ...opt, version: '1.2.3-beta2' };

    expect(mod.normalizeBuild('win32', opt)).toEqual({
      platform: 'win32',
      arch: 'ia32',
      version: '1.2.3',
      channel: 'prod',
    });

    expect(mod.normalizeBuild('linux-x64', opt)).toEqual({
      platform: 'linux',
      arch: 'x64',
      version: '1.2.3',
      channel: 'prod',
    });


    expect(mod.normalizeBuild('linux-x64-beta', betaOpt)).toEqual({
      platform: 'linux',
      arch: 'x64',
      version: '1.2.3-beta2',
      channel: 'beta',
    });

    expect(mod.normalizeBuild('linux-x64-beta-v0.0.2', opt)).toEqual({
      platform: 'linux',
      arch: 'x64',
      version: '0.0.2',
      channel: 'beta',
    });

    expect(mod.normalizeBuild('linux-x64-beta-v0.0.2-beta2', opt)).toEqual({
      platform: 'linux',
      arch: 'x64',
      version: '0.0.2-beta2',
      channel: 'beta',
    });

    expect(mod.normalizeBuild('linux-ia32-dev-v1.0.0-1', opt)).toEqual({
      platform: 'linux',
      arch: 'ia32',
      version: '1.0.0-1',
      channel: 'dev',
    });
  });

  it('should validate remove builds', () => {
    const opt1 = {
      command: 'remove',
      builds: [
        {
          platform: 'win32',
          arch: 'x64',
          version: '0.0.2',
          channel: 'beta',
        },
        {
          platform: 'linux',
          arch: 'x64',
          version: '0.0.2',
          channel: 'beta',
        },
      ],
    };
    expect(mod.validateIfRemoveCommand.bind(null, opt1)).not.toThrow(Error);

    const opt2 = {
      command: 'remove',
      builds: [
        {
          platform: 'win32',
          arch: 'x64',
          version: '0.0',
          channel: 'beta',
        }, {
          platform: 'linux',
          arch: 'x64',
          version: '0.0.2',
          channel: 'beta',
        },
      ],
    };
    expect(mod.validateIfRemoveCommand.bind(null, opt2)).toThrow();
  });

  it('should apply options from applyConfigJson', () => {
    const packageJson = {
      transport: {
        module: 'github',
      },
      except: [
        'v0.5.0',
      ],
    };

    expect(mod.applyConfigJson({}, packageJson)).toEqual({
      transport: {
        module: 'github',
      },
      except: [
        'v0.5.0',
      ],
      fields: {},
    });
  });
});
