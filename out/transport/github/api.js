'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var https = require('https');
var url = require('url');
var path = require('path');
var fs = require('fs');

var GithubApi = function () {
  /**
   * @param {string} repository in format user-name/repo-name
   * @param {string} token github api token
   * @param {boolean} verbose Show debug information
   */
  function GithubApi(repository, token) {
    var verbose = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

    _classCallCheck(this, GithubApi);

    this.token = token;
    this.verbose = verbose;
    var repo = repository.replace('https://github.com/', '');
    this.owner = repo.split('/')[0];
    this.repo = repo.split('/')[1];
  }

  _createClass(GithubApi, [{
    key: 'request',
    value: function request(route, data) {
      var _this = this;

      var reqOptions = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

      var options = this.normalizeOptions(route, data, reqOptions);
      return new Promise(function (resolve, reject) {
        if (_this.verbose) {
          console.info(Object.assign({}, { data: data }, options));
        }
        var req = https.request(options, function (res) {
          var body = '';
          res.on('data', function (chunk) {
            return body += chunk;
          });
          res.on('end', function () {
            var json = void 0;
            if (body) {
              try {
                json = JSON.parse(body);
              } catch (e) {
                if (_this.verbose) {
                  console.warn('Error parsing: ' + body);
                }
                reject(e);
              }
            } else {
              json = { code: res.statusCode };
            }

            if (_this.verbose) {
              console.info(json);
            }
            return resolve(json);
          });
        });
        req.on('error', reject);

        if (data) {
          if (typeof data.pipe === 'function') {
            data.on('error', reject);
            data.pipe(req);
          } else {
            req.write(JSON.stringify(data));
            req.end();
          }
        }
      });
    }
  }, {
    key: 'normalizeOptions',
    value: function normalizeOptions(route) {
      var data = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      var reqOptions = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

      var urlParams = Object.assign({}, {
        owner: this.owner,
        repo: this.repo
      });
      var options = {
        host: 'api.github.com',
        headers: {
          'User-Agent': 'electron-simple-publisher',
          'authorization': 'token ' + this.token
        }
      };

      if (reqOptions.headers) {
        Object.assign(options.headers, reqOptions.headers);
      }

      if (typeof data.pipe !== 'function') {
        for (var field in data) {
          if (!data.hasOwnProperty(field)) continue;
          if (field.startsWith('_')) {
            urlParams[field.substring(1)] = data[field];
            delete data[field];
          }
        }
      }

      var paths = route.split(' ');
      options.method = paths[0];
      options.path = paths[1];

      if (options.path.startsWith('https://')) {
        var urlObj = url.parse(options.path);
        options.host = urlObj.host;
        options.path = urlObj.path;
      } else {
        for (var _field in urlParams) {
          if (!urlParams.hasOwnProperty(_field)) continue;
          var value = urlParams[_field];
          options.path = options.path.replace(':' + _field, value);
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

  }, {
    key: 'releaseFile',
    value: function releaseFile(filePath, tag, onProgress) {
      var _this2 = this;

      var fileName = path.basename(filePath);
      var uploadUrl = void 0;

      return this.request('GET /repos/:owner/:repo/releases/tags/:tag', { _tag: tag
      }).then(function (result) {
        if (result && result.tag_name) {
          return result;
        }
        return _this2.request('POST /repos/:owner/:repo/releases', {
          tag_name: tag,
          name: tag
        });
      }).then(function (result) {
        if (!result.upload_url) {
          throw new Error('Could not get upload_url from response: ' + JSON.stringify(result));
        }

        var asset = result.assets.filter(function (a) {
          return a.label === fileName;
        })[0];
        if (!asset) {
          return result;
        }

        return _this2.request('DELETE /repos/:owner/:repo/releases/assets/:id', {
          _id: asset.id
        }).then(function (deleteResult) {
          if (deleteResult.code === 204) {
            return result;
          } else {
            throw new Error('Error while deleting existing ' + fileName);
          }
        });
      }).then(function (result) {
        var name = encodeURIComponent(fileName);
        uploadUrl = result.upload_url.split('{')[0] + ('?name=' + name + '&label=' + name);
        var size = fs.statSync(filePath).size;

        var fileStream = fs.createReadStream(filePath);
        var uploaded = 0;
        fileStream.on('data', function (buffer) {
          uploaded += buffer.length;
          onProgress(uploaded);
        });

        var options = { headers: {
            'Content-Length': size,
            'Content-Type': getContentTypeByFileName(filePath)
          } };
        return _this2.request('POST ' + uploadUrl, fileStream, options);
      }).then(function (result) {
        if (!result.browser_download_url) {
          throw new Error('Unable to upload file ' + fileName + ' ' + JSON.stringify(result.errors));
        }
        return result.browser_download_url;
      });
    }
  }]);

  return GithubApi;
}();

module.exports = GithubApi;

function getContentTypeByFileName(fileName) {
  var name = path.basename(fileName).toLowerCase();
  var ext = path.extname(fileName).toLowerCase();

  switch (ext) {
    case '.json':
      return 'application/json';
    case '.dmg':
      return 'application/x-apple-diskimage';
    case '.zip':
      return 'application/zip';
    case '.exe':
      return 'application/x-msdownload';
    case '.nupkg':
      return 'application/zip';
    case '.appimage':
      return 'application/x-executable';
    case '.deb':
      return 'application/vnd.debian.binary-package';
    case '.rmp':
      return 'application/x-xz';
    case '':
      return name === 'releases' ? 'text/plain' : 'application/octet-stream';
    default:
      return 'application/octet-stream';
  }
}