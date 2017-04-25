'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var fs = require('fs');
var path = require('path');
var GithubApi = require('./api');
var AbstractTransport = require('../abstract');

var GithubTransport = function (_AbstractTransport) {
  _inherits(GithubTransport, _AbstractTransport);

  function GithubTransport() {
    _classCallCheck(this, GithubTransport);

    return _possibleConstructorReturn(this, (GithubTransport.__proto__ || Object.getPrototypeOf(GithubTransport)).apply(this, arguments));
  }

  _createClass(GithubTransport, [{
    key: 'normalizeOptions',

    /**
     * @param {object} options
     * @param {string} options.repository
     * @param {string} options.token
     * @param {string} options.updatesJsonPath - path to update.json
     *   from the repository root
     */
    value: function normalizeOptions(options) {
      _get(GithubTransport.prototype.__proto__ || Object.getPrototypeOf(GithubTransport.prototype), 'normalizeOptions', this).call(this, options);

      if (!options.token) {
        throw new Error('You should set a transport.token options to publish to github');
      }

      this.initApiClient();
    }
  }, {
    key: 'initApiClient',
    value: function initApiClient() {
      var options = this.options;
      var repo = options.repository;
      if (!repo) {
        try {
          //noinspection JSUnresolvedVariable
          repo = this.commandOptions.packageJson.repository.url;
        } catch (e) {
          throw new Error('You should set a transport.repository option to publish to github');
        }
      }
      repo = repo.replace(/^git\+/, '').replace('https://github.com/', '').replace(/\.git$/, '');
      this.owner = repo.split('/')[0];
      this.repo = repo.split('/')[1];

      this.githubApi = new GithubApi(repo, options.token, this.commandOptions.debug);
    }

    /**
     * Upload file to a hosting and get its url
     * @param {string} filePath
     * @param {object} build
     * @return {Promise<string>} File url
     */

  }, {
    key: 'uploadFile',
    value: function uploadFile(filePath, build) {
      var _this2 = this;

      var name = this.getBuildId(build);
      var size = fs.statSync(filePath).size;
      return this.githubApi.releaseFile(filePath, name, function (transferred) {
        _this2.setProgress(filePath, transferred, size);
      });
    }

    /**
     * Push a updates.json
     * @return {Promise<string>} Url to updates.json
     */

  }, {
    key: 'pushUpdatesJson',
    value: function pushUpdatesJson(data) {
      var _this3 = this;

      var commitPath = this.options.updatesJsonPath || 'updates.json';
      if (commitPath.startsWith('/')) {
        commitPath = commitPath.substring(1);
      }

      //noinspection ES6ModulesDependencies,NodeModulesDependencies
      var jsonString = JSON.stringify(data, null, '  ');
      var base64Data = new Buffer(jsonString).toString('base64');

      return this.api('GET /repos/:owner/:repo/contents/:path ', {
        _path: commitPath
      }).then(function (res) {
        var params = {
          _path: commitPath,
          path: commitPath,
          message: 'Publish a new release',
          content: base64Data
        };
        if (res.sha) {
          params.sha = res.sha;
        }
        return _this3.api('PUT /repos/:owner/:repo/contents/:path', params);
      }).then(function (_ref) {
        var commit = _ref.commit;

        if (commit) {
          return _this3.getUpdatesJsonUrl();
        } else {
          throw new Error('Could not commit updates.json');
        }
      });
    }

    /**
     * @return {Promise<Array<string>>}
     */

  }, {
    key: 'fetchBuildsList',
    value: function fetchBuildsList() {
      return this.api('GET /repos/:owner/:repo/releases').then(function (res) {
        return res.length ? res.map(function (r) {
          return r.tag_name;
        }) : [];
      });
    }

    /**
     * @return {Promise}
     */

  }, {
    key: 'removeBuild',
    value: function removeBuild(build) {
      var _this4 = this;

      var tag = this.getBuildId(build);

      return this.api('GET /repos/:owner/:repo/releases/tags/:tag', { _tag: tag }).then(function (res) {
        if (!res.id) {
          return { code: 404 };
        }

        return _this4.api('DELETE /repos/:owner/:repo/releases/:id', {
          _id: res.id
        });
      }).then(function (res) {
        if (res.code !== 204) {
          console.warn('Release ' + tag + ' doesn\'t exist. Trying to delete a tag...');
        }
        return _this4.api('DELETE /repos/:owner/:repo/git/refs/:ref', {
          _ref: 'tags/' + tag
        });
      }).then(function (res) {
        if (res.code !== 204) {
          throw new Error('Tag ' + tag + ' isn\'t removed');
        }
      });
    }
  }, {
    key: 'api',
    value: function api(route) {
      var data = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      return this.githubApi.request(route, data);
    }
  }]);

  return GithubTransport;
}(AbstractTransport);

module.exports = GithubTransport;