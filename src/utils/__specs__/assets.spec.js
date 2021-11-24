'use strict';

const { describe, expect, it } = require('humile');
const path = require('path');
const { getTestConfig } = require('../config');
const { AssetsInfo } = require('../assets');

const distPath = path.join(__dirname, 'assets.fixtures');

describe('AssetsInfo', () => {
  describe('getBuilds', () => {
    it('should find all builds', () => {
      const cfg = getTestConfig({
        builds: ['all'],
        distPath,
        appName: 'test',
        version: '0.0.1',
      });
      const info = new AssetsInfo(cfg);

      const builds = info.getBuilds();

      expect(builds.map(b => b.toString())).toEqual([
        'darwin-arm64-prod-0.0.1',
        'darwin-x64-prod-0.0.1',
        'linux-x64-prod-0.0.1',
        'win32-x64-prod-0.0.1',
      ]);
    });

    it('should find specified build', () => {
      const cfg = getTestConfig({
        builds: ['linux'],
        distPath,
        appName: 'test',
        version: '0.0.1',
      });
      const info = new AssetsInfo(cfg);

      const builds = info.getBuilds();

      expect(builds.map(b => b.toString())).toEqual([
        'linux-x64-prod-0.0.1',
      ]);
    });
  });
});
