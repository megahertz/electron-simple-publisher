'use strict';

const fs = require('fs');
const GithubApi = require('./GithubApi');
const AbstractTransport = require('../AbstractTransport');

/**
 * @property {string} options.repository
 * @property {string} options.token
 * @property {string} options.metaFilePath - path to update.json
 *   from the repository root
 */
class GithubTransport extends AbstractTransport {
  normalizeOptions(options) {
    super.normalizeOptions(options);

    if (!options.token) {
      throw new Error(
        'You should set a transport.token options to publish to github'
      );
    }

    if (!options.repository) {
      throw new Error(
        'You should set a transport.repository option to publish to github'
      );
    }

    if (!options.metaFilePath) {
      options.metaFilePath = `updates/${options.metaFileName}`;
    }

    if (options.metaFilePath.startsWith('/')) {
      options.metaFilePath = options.metaFilePath.substring(1);
    }

    this.initApiClient();
  }

  initApiClient() {
    const options = this.options;
    let repo = options.repository;

    repo = repo
      .replace(/^git\+/, '')
      .replace('https://github.com/', '')
      .replace(/\.git$/, '');

    this.githubApi = new GithubApi(
      repo,
      options.token,
      this.config.debugMode
    );
  }

  /**
   * Upload file to a hosting and get its url
   * @param {string} filePath
   * @param {Build} build
   * @return {Promise<string>} File url
   */
  async uploadFile(filePath, build) {
    const size = fs.statSync(filePath).size;

    let onProgress;
    if (this.config.progress) {
      onProgress = (transferred) => {
        this.setProgress(filePath, transferred, size);
      };
    }

    return this.githubApi
      .releaseFile(filePath, build.idWithVersion, onProgress);
  }

  /**
   * Push MetaFile
   * @param {object} data MetaFile content
   * @param {Build} build
   * @return {Promise<string>} Url to MetaFile
   */
  async pushMetaFile(data, build) {
    const commitPath = this.replaceBuildTemplates(
      this.options.metaFilePath,
      build
    );
    const jsonString = JSON.stringify(data, null, '  ');
    const base64Data = Buffer.from(jsonString).toString('base64');

    const content = await this.api('GET /repos/:owner/:repo/contents/:path', {
      _path: commitPath,
    });

    const commit = await this.api('PUT /repos/:owner/:repo/contents/:path', {
      _path: commitPath,
      path:    commitPath,
      message: 'Publish a new release',
      content: base64Data,
      ...(content.sha ? { sha: content.sha } : {}),
    });

    if (!commit) {
      throw new Error('Could not commit MetaFile');
    }

    return this.getMetaFileUrl(build);
  }

  /**
   * @return {Promise<string[]>}
   */
  async fetchBuildsList() {
    const res = await this.api('GET /repos/:owner/:repo/releases');
    return res.length ? res.map(r => r.tag_name) : [];
  }

  /**
   * @param {string} tag
   * @return {Promise}
   */
  async removeResource(tag) {
    const rel = await this.api('GET /repos/:owner/:repo/releases/tags/:tag', {
      _tag: tag,
    });
    if (rel.id) {
      await this.api('DELETE /repos/:owner/:repo/releases/:id', {
        _id: rel.id,
      });
    }

    const tagResp = await this.api('DELETE /repos/:owner/:repo/git/refs/:ref', {
      _ref: `tags/${tag}`,
    });
    if (tagResp.code !== 204) {
      throw new Error(`Tag ${tag} isn't removed: ${tagResp.message}`);
    }
  }

  /**
   * Make github API request
   * @param route
   * @param data
   * @return {Promise<Object>}
   * @private
   */
  async api(route, data = {}) {
    return this.githubApi.request(route, data);
  }
}

module.exports = GithubTransport;
