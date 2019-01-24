'use strict';

const { expect } = require('chai');
const mod        = require('./normalize-options');

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
    expect(mod.applyPackageJson({}, packageJson)).to.deep.equal({
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
    expect(mod.applyPlatformDefaults({}, process)).to.deep.equal({
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

    expect(mod.normalizeBuild('win32', opt)).to.deep.equal({
      platform: 'win32',
      arch: 'ia32',
      version: '1.2.3',
      channel: 'prod',
    });

    expect(mod.normalizeBuild('linux-x64', opt)).to.deep.equal({
      platform: 'linux',
      arch: 'x64',
      version: '1.2.3',
      channel: 'prod',
    });


    expect(mod.normalizeBuild('linux-x64-beta', betaOpt)).to.deep.equal({
      platform: 'linux',
      arch: 'x64',
      version: '1.2.3-beta2',
      channel: 'beta',
    });

    expect(mod.normalizeBuild('linux-x64-beta-v0.0.2', opt)).to.deep.equal({
      platform: 'linux',
      arch: 'x64',
      version: '0.0.2',
      channel: 'beta',
    });

    expect(mod.normalizeBuild('linux-x64-beta-v0.0.2-beta2', opt)).deep.equal({
      platform: 'linux',
      arch: 'x64',
      version: '0.0.2-beta2',
      channel: 'beta',
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
    expect(mod.validateIfRemoveCommand.bind(null, opt1)).to.not.throw(Error);

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
    expect(mod.validateIfRemoveCommand.bind(null, opt2)).to.throw(Error);
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

    expect(mod.applyConfigJson({}, packageJson)).to.deep.equal({
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
