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

      expect(builds.length).toBe(3);
      expect(builds[0].platform).toBe('darwin');
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

      expect(builds.length).toBe(1);
      expect(builds[0].platform).toBe('linux');
    });
  });
});
