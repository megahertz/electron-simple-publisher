'use strict';

const path           = require('path');
const url            = require('url');
const http           = require('httpreq');
const PublishRelease = require('publish-release');

const AbstractTransport = require('./abstract');

class GithubApi {
  /**
   * @param {string} repository in format user-name/repo-name
   * @param {string} token github api token
   * @param {boolean} verbose Show debug information
   */
  constructor(repository, token, verbose = false) {
    this.token = token;
    this.verbose = verbose;
    const repo = repository.replace('https://github.com/', '');
    this.owner = repo.split('/')[0];
    this.repo = repo.split('/')[1];
  }

  request(route, data) {
    const options = this.normalizeOptions(route, data);
    return new Promise((resolve, reject) => {
      if (this.verbose) {
        console.info(Object.assign({}, { data }, options));
      }
      http.doRequest(options, (err, res) => {
        if (err) {
          return reject(err);
        }
        if (!res.body) {
          return resolve({ code: res.statusCode });
        }
        try {
          const response = JSON.parse(res.body);
          if (this.verbose) {
            console.info(response);
          }
          resolve(response);
        } catch (e) {
          if (this.verbose) {
            console.warn('Error parsing: ' + res.body);
          }
          reject(e);
        }
      });
    });
  }

  normalizeOptions(route, data = {}) {
    const urlParams = Object.assign({}, {
      owner: this.owner,
      repo: this.repo
    });
    const options = {
      host: 'api.github.com',
      headers: {
        'User-Agent': 'electron deploy',
        'authorization': 'token ' + this.token
      },
      protocol: 'https'
    };

    for (let field in data) {
      if (!data.hasOwnProperty(field)) continue;
      if (field.startsWith('_')) {
        urlParams[field.substring(1)] = data[field];
        delete data[field];
      }
    }

    if (Object.keys(data).length) {
      options.json = data;
    }

    const paths = route.split(' ');
    options.method = paths[0];
    options.path = paths[1];

    for (let field in urlParams) {
      if (!urlParams.hasOwnProperty(field)) continue;
      const value = urlParams[field];
      options.path = options.path.replace(':' + field, value);
    }

    options.pathname = options.path;
    options.url = url.format(options);

    return options;
  }
}

class GithubTransport extends AbstractTransport {
  /**
   * @param {object} options
   * @param {string} options.transport.repository
   * @param {string} options.transport.token
   * @param {string} options.transport.updatesJsonPath - path to update.json
   *   from the repository root
   */
  constructor(options) {
    super(options);

    if (!this.commandOptions.updatesJsonUrl) {
      throw new Error(
        'You should set either a package.json:updater.url option or ' +
        'transport.updatesJsonUrl option to publish to github'
      );
    }

    if (!this.options.token) {
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
    const options = {
      owner:        this.owner,
      repo:         this.repo,
      tag:          name,
      name:         name,
      notes:        name,
      assets:       [ filePath ],
      reuseRelease: true,
      token:        this.options.token
    };

    const fileName = path.basename(filePath)
      .replace(/\s/, '.');
    const fileUrl = `https://github.com/${this.owner}/${this.repo}/releases/` +
      `download/${name}/${fileName}`;

    return new Promise(function(resolve, reject) {
      return new PublishRelease(options, function (err) {
        if (err) {
          reject(err);
        } else {
          resolve(fileUrl);
        }
      });
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