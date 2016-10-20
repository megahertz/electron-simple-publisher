'use strict';

const http           = require('httpreq');
const PublishRelease = require('publish-release');

const AbstractTransport = require('./abstract');

class GithubApi {
  constructor(repository, token, verbose) {
    this.token = token;
    this.verbose = verbose;
    const repo = repository.replace('https://github.com/', '');
    this.owner = repo.split('/')[0];
    this.repo = repo.split('/')[1];
  }

  request(route, data) {
    const options = this.normalizeOptions(route, data);
    if (this.verbose) {
      console.log(Object.assign({ data }, options));
    }
    return new Promise(function(resolve, reject) {
      http.doRequest(options, (err, res) => {
        if (err) {
          reject(err);
        } else {
          resolve(JSON.parse(res.body));
        }
      });
    });
  }

  normalizeOptions(route, data) {
    const urlParams = Object.assign({}, {
      owner: this.owner,
      repo: this.repo
    });
    const options = {
      host: 'api.github.com',
      headers: {
        'User-Agent': 'electron deploy',
        'authorization': 'token ' + this.token
      }
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

    return options;
  }
}

class GithubTransport extends AbstractTransport {
  constructor(options) {
    super(options);

    let repo = options.repository;
    if (!repo) {
      try {
        repo = options.packageJson.repository.url;
      } catch (e) {
        throw new Error('You should set a repository options to publish to github');
      }
    }

    repo = repo.replace('https://github.com/', '');
    this.owner = repo.split('/')[0];
    this.repo = repo.split('/')[1];

    if (!options.token) {
      throw new Error('You should set a token options to publish to github');
    }

    this.githubApi = new GithubApi(repo, options.token, options.verbose);
  }

  /**
   * Prepare before uploading
   * @param {object} build
   * @return {Promise}
   */
  beforeUpload(build) {
    const name = this.getBuildId(build);
    const options = {
      owner:        this.owner,
      repo:         this.repo,
      tag:          this.getBuildId(build),
      name:         name,
      notes:        name,
      reuseRelease: false
    };
    return new Promise(function(resolve, reject) {
      return new PublishRelease(options, function (err, release) {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
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
      tag:          this.getBuildId(build),
      name:         name,
      notes:        name,
      assets:       [ filePath ],
      reuseRelease: true
    };

    return new Promise(function(resolve, reject) {
      return new PublishRelease(options, function (err, release) {
        if (err) {
          reject(err);
        } else {
          resolve(release);
        }
      });
    });
  }

  api(route, data) {
    return this.githubApi.request(route, data);
  }
}

module.exports = GithubTransport;