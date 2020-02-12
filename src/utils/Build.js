'use strict';

class Build {
  constructor(data) {
    /**
     * @type {string}
     */
    this.platform = data.platform;

    /**
     * @type {string}
     */
    this.arch = data.arch;

    /**
     * @type {string}
     */
    this.version = data.version;

    /**
     * @type {string}
     */
    this.channel = data.channel;

    /**
     * @type {{ install: string, update: string, metaFile: string }}
     */
    this.assets = data.assets || {
      install: null,
      update: null,
      metaFile: null,
    };
  }

  get id() {
    return [this.platform, this.arch, this.channel]
      .filter(Boolean)
      .join('-');
  }

  get idWithVersion() {
    return [this.platform, this.arch, this.channel, this.version]
      .filter(Boolean)
      .join('-');
  }

  get type() {
    return `${this.platform}-${this.arch}`;
  }

  hasCompleteSpecification() {
    if (!this.platform || !this.arch || !this.channel || !this.version) {
      return false;
    }

    const isValid = this.platform.match(/\w+/)
      && this.arch.match(/\w+/)
      && this.channel.match(/\w+/)
      && this.version.match(/\d+\.\d+\.\d+/);

    return isValid;
  }

  toString() {
    return this.idWithVersion;
  }

  /**
   * @param {string | Partial<Build>} build
   * @param {Partial<Build>} defaults
   * @return {Build}
   */
  static normalize(build, defaults = {}) {
    if (typeof build === 'string') {
      const [platform, arch, channel, ...version] = build.split('-');
      build = { platform, arch, channel, version: version.join('-') };
    }

    ['platform', 'arch', 'channel', 'version'].forEach((field) => {
      if (!build[field] && defaults[field]) {
        build[field] = defaults[field];
      }
    });

    if (build.version && build.version.indexOf('v') === 0) {
      build.version = build.version.substring(1);
    }

    return new Build(build);
  }

  /**
   * @param {Array<string | Partial<Build>>} builds
   * @param {Partial<Build>} defaults
   * @return {Build[]}
   */
  static normalizeMany(builds, defaults = {}) {
    return builds.map(build => Build.normalize(build, defaults));
  }
}

module.exports = Build;
