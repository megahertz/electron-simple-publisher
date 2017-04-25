'use strict';
/* eslint-disable padded-blocks */

var _require = require('chai'),
    expect = _require.expect;

var mod = require('./normalize-options');

describe('Options module', function () {

  it('should apply options from package.json', function () {
    var packageJson = {
      version: '1.0.1',
      name: 'test-name',
      updater: {
        url: 'http://example.com',
        channel: 'test',
        build: 'win32-ia32'
      }
    };
    expect(mod.applyPackageJson({}, packageJson)).to.deep.equal({
      packageJson: packageJson,
      version: '1.0.1',
      updatesJsonUrl: 'http://example.com',
      channel: 'test',
      platform: 'win32',
      arch: 'ia32'
    });
  });

  it('should apply platform defaults to options', function () {
    var process = {
      platform: 'linux',
      arch: 'ia32'
    };
    expect(mod.applyPlatformDefaults({}, process)).to.deep.equal({
      platform: 'linux',
      arch: 'ia32'
    });
  });

  it('should transform a build name to build meta', function () {
    var opt = {
      platform: 'linux',
      arch: 'ia32',
      version: '1.2.3',
      channel: 'prod'
    };

    expect(mod.normalizeBuild('win32', opt)).to.deep.equal({
      platform: 'win32',
      arch: 'ia32',
      version: '1.2.3',
      channel: 'prod'
    });

    expect(mod.normalizeBuild('linux-x64', opt)).to.deep.equal({
      platform: 'linux',
      arch: 'x64',
      version: '1.2.3',
      channel: 'prod'
    });

    expect(mod.normalizeBuild('linux-x64-beta', opt)).to.deep.equal({
      platform: 'linux',
      arch: 'x64',
      version: '1.2.3',
      channel: 'beta'
    });

    expect(mod.normalizeBuild('linux-x64-beta-v0.0.2', opt)).to.deep.equal({
      platform: 'linux',
      arch: 'x64',
      version: '0.0.2',
      channel: 'beta'
    });
  });

  it('should validate remove builds', function () {
    var opt1 = {
      command: 'remove',
      builds: [{
        platform: 'win32',
        arch: 'x64',
        version: '0.0.2',
        channel: 'beta'
      }, {
        platform: 'linux',
        arch: 'x64',
        version: '0.0.2',
        channel: 'beta'
      }]
    };
    expect(mod.validateIfRemoveCommand.bind(null, opt1)).to.not.throw(Error);

    var opt2 = {
      command: 'remove',
      builds: [{
        platform: 'win32',
        arch: 'x64',
        version: '0.0',
        channel: 'beta'
      }, {
        platform: 'linux',
        arch: 'x64',
        version: '0.0.2',
        channel: 'beta'
      }]
    };
    expect(mod.validateIfRemoveCommand.bind(null, opt2)).to.throw(Error);
  });
});