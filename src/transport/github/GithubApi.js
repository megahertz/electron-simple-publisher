'use strict';

const https = require('https');
const url   = require('url');
const path  = require('path');
const fs    = require('fs');

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

  request(route, reqData, reqOptions = {}) {
    const options = this.normalizeOptions(route, reqData, reqOptions);
    const data = options.data;
    delete options.data;

    return new Promise((resolve, reject) => {
      if (this.verbose) {
        console.info(options.method, { ...options, data, stream: undefined });
      }

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          let json;
          if (body) {
            try {
              json = JSON.parse(body);
            } catch (e) {
              if (this.verbose) {
                console.warn('Error parsing: ' + body);
              }

              reject(e);
            }
          } else {
            json = { code: res.statusCode };
          }

          if (this.verbose) {
            console.info('RESPONSE', json);
          }

          return resolve(json);
        });
      });

      req.on('error', reject);

      if (options.stream) {
        options.stream.on('error', reject);
        options.stream.pipe(req);
        return;
      }

      if (Object.keys(data).length > 0) {
        req.write(JSON.stringify(data));
      }

      req.end();
    });
  }

  normalizeOptions(route, reqData = {}, reqOptions = {}) {
    const urlParams = {
      owner: this.owner,
      repo: this.repo,
    };
    const options = {
      host: 'api.github.com',
      headers: {
        'User-Agent': 'electron-simple-publisher',
        'authorization': 'token ' + this.token,
      },
      data: {},
      stream: undefined,
    };

    if (reqOptions.headers) {
      Object.assign(options.headers, reqOptions.headers);
    }

    if (typeof reqData.pipe === 'function') {
      options.stream = reqData;
    } else {
      for (const field in reqData) {
        if (!reqData.hasOwnProperty(field)) continue;

        if (field.startsWith('_')) {
          urlParams[field.substring(1)] = reqData[field];
        } else {
          options.data[field] = reqData[field];
        }
      }
    }

    const paths = route.split(' ');
    options.method = paths[0];
    options.path = paths[1];

    if (options.path.startsWith('https://')) {
      const urlObj = url.parse(options.path);
      options.host = urlObj.host;
      options.path = urlObj.path;
    } else {
      for (const field in urlParams) {
        if (!urlParams.hasOwnProperty(field)) continue;
        const value = urlParams[field];
        options.path = options.path.replace(':' + field, value);
      }
    }

    return options;
  }

  /**
   * Upload a file to Github Releases
   *
   * Some ideas are from https://github.com/remixz/publish-release
   * @param {string} filePath
   * @param {string} tag
   * @param {Function} onProgress
   * @return {Promise.<string>}
   */
  releaseFile(filePath, tag, onProgress = undefined) {
    const fileName = path.basename(filePath);
    let uploadUrl;

    return this.request('GET /repos/:owner/:repo/releases/tags/:tag', {
      _tag: tag,
    })
      .then((result) => {
        if (result && result.tag_name) {
          return result;
        }

        return this.request('POST /repos/:owner/:repo/releases', {
          tag_name: tag,
          name: tag,
        });
      })
      .then((result) => {
        if (!result.upload_url) {
          throw new Error(
            'Could not get upload_url from response: ' + JSON.stringify(result)
          );
        }

        const asset = result.assets.filter(a => a.label === fileName)[0];
        if (!asset) {
          return result;
        }

        return this.request('DELETE /repos/:owner/:repo/releases/assets/:id', {
          _id: asset.id,
        })
          .then((deleteResult) => {
            if (deleteResult.code === 204) {
              return result;
            }

            throw new Error(`Error while deleting existing ${fileName}`);
          });
      })
      .then((result) => {
        const name = encodeURIComponent(fileName);
        uploadUrl = result.upload_url.split('{')[0]
          + `?name=${name}&label=${name}`;
        const size = fs.statSync(filePath).size;

        const fileStream = fs.createReadStream(filePath);

        if (onProgress) {
          let uploaded = 0;
          fileStream.on('data', (buffer) => {
            uploaded += buffer.length;
            onProgress(uploaded);
          });
        }

        const options = {
          headers: {
            'Content-Length': size,
            'Content-Type': getContentTypeByFileName(filePath),
          },
        };

        return this.request('POST ' + uploadUrl, fileStream, options);
      })
      .then((result) => {
        if (!result.browser_download_url) {
          throw new Error(
            `Unable to upload file ${fileName} ` + JSON.stringify(result.errors)
          );
        }
        return result.browser_download_url;
      });
  }
}

module.exports = GithubApi;

function getContentTypeByFileName(fileName) {
  const name = path.basename(fileName).toLowerCase();
  const ext = path.extname(fileName).toLowerCase();

  switch (ext) {
    case '.json': return 'application/json';
    case '.dmg': return 'application/x-apple-diskimage';
    case '.zip': return 'application/zip';
    case '.exe': return 'application/x-msdownload';
    case '.nupkg': return 'application/zip';
    case '.appimage': return 'application/x-executable';
    case '.deb': return 'application/vnd.debian.binary-package';
    case '.rmp': return 'application/x-xz';
    case '': {
      return name === 'releases' ? 'text/plain' : 'application/octet-stream';
    }
    default: return 'application/octet-stream';
  }
}
