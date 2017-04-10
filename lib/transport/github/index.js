'use strict';

const fs                = require('fs');
const path              = require('path');
const GithubApi         = require('./api');
const AbstractTransport = require('../abstract');

class GithubTransport extends AbstractTransport {
  /**
   * @param {object} options
   * @param {string} options.repository
   * @param {string} options.token
   * @param {string} options.updatesJsonPath - path to update.json
   *   from the repository root
   */
  normalizeOptions(options) {
    super.normalizeOptions(options);

    if (!options.token) {
      throw new Error(
        'You should set a transport.token options to publish to github'
      );
    }

    this.initApiClient();
  }

  initApiClient() {
    const options = this.options;
    let repo = options.repository;
    if (!repo) {
      try {
        //noinspection JSUnresolvedVariable
        repo = this.commandOptions.packageJson.repository.url;
      } catch (e) {
        throw new Error(
          'You should set a transport.repository option to publish to github'
        );
      }
    }
    repo = repo
      .replace(/^git\+/, '')
      .replace('https://github.com/', '')
      .replace(/\.git$/, '');
    this.owner = repo.split('/')[0];
    this.repo = repo.split('/')[1];

    this.githubApi = new GithubApi(
      repo,
      options.token,
      this.commandOptions.debug
    );
  }

  /**
   * Upload file to a hosting and get its url
   * @param {string} filePath
   * @param {object} build
   * @return {Promise<string>} File url
   */
  uploadFile(filePath, build) {
    const name = this.getBuildId(build);
    const size = fs.statSync(filePath).size;
    return this.githubApi.releaseFile(filePath, name, (transferred) => {
      this.setProgress(filePath, transferred, size)
    });
  }

  /**
   * Push a updates.json
   * @return {Promise<string>} Url to updates.json
   */
  pushUpdatesJson(data) {
    let commitPath = this.options.updatesJsonPath || 'updates.json';
    if (commitPath.startsWith('/')) {
      commitPath = commitPath.substring(1);
    }

    //noinspection ES6ModulesDependencies,NodeModulesDependencies
    const jsonString = JSON.stringify(data, null, '  ');
    const base64Data = new Buffer(jsonString).toString('base64');

    return this.api('GET /repos/:owner/:repo/contents/:path ', {
        _path: commitPath
      })
      .then((res) => {
        const params = {
          _path:   commitPath,
          path:    commitPath,
          message: `Publish a new release`,
          content: base64Data
        };
        if (res.sha) {
          params.sha = res.sha;
        }
        return this.api('PUT /repos/:owner/:repo/contents/:path', params);
      })
      .then(({ commit }) => {
        if (commit) {
          return this.getUpdatesJsonUrl();
        } else {
          throw new Error('Could not commit updates.json');
        }
      });
  }

  /**
   * @return {Promise<Array<string>>}
   */
  fetchBuildsList() {
    return this.api('GET /repos/:owner/:repo/releases')
      .then(res => res.length ? res.map(r => r.tag_name) : []);
  }

  /**
   * @return {Promise}
   */
  removeBuild(build) {
    const tag = this.getBuildId(build);

    return this.api('GET /repos/:owner/:repo/releases/tags/:tag', { _tag: tag })

      .then((res) => {
        if (!res.id) {
          return { code: 404 };
        }

        return this.api('DELETE /repos/:owner/:repo/releases/:id', {
          _id: res.id
        });
      })

      .then((res) => {
        if (res.code !== 204) {
          console.warn(`Release ${tag} doesn't exist. Trying to delete a tag...`);
        }
        return this.api('DELETE /repos/:owner/:repo/git/refs/:ref', {
          _ref: `tags/${tag}`
        });
      })

      .then((res) => {
        if (res.code !== 204) {
          throw new Error(`Tag ${tag} isn't removed`);
        }
      });
  }

  api(route, data = {}) {
    return this.githubApi.request(route, data);
  }
}

module.exports = GithubTransport;