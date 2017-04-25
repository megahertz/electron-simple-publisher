'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var fs = require('fs');
var os = require('os');
var path = require('path');
var NodeSsh = require('node-ssh');

var AbstractTransport = require('./abstract');

var SshTransport = function (_AbstractTransport) {
  _inherits(SshTransport, _AbstractTransport);

  function SshTransport() {
    _classCallCheck(this, SshTransport);

    return _possibleConstructorReturn(this, (SshTransport.__proto__ || Object.getPrototypeOf(SshTransport)).apply(this, arguments));
  }

  _createClass(SshTransport, [{
    key: 'normalizeOptions',

    /**
     * @param {Object}  options
     * @param {string}  options.remotePath
     * @param {string}  options.remoteUrl
     * @param {string}  options.username
     * @param {string}  options.password
     * @param {boolean} options.usePrivateKey
     * @param {string}  options.privateKeyPath
     * @param {string}  options.privateKey
     * @param {string}  options.afterUploadCommand
     * @param {string}  options.afterRemoveCommand
     */
    value: function normalizeOptions(options) {
      _get(SshTransport.prototype.__proto__ || Object.getPrototypeOf(SshTransport.prototype), 'normalizeOptions', this).call(this, options);

      var REQUIRED = ['remoteUrl', 'remotePath'];
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = REQUIRED[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var field = _step.value;

          if (!options[field]) {
            throw new Error('The transport.' + field + ' option is not set');
          }
        }
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator.return) {
            _iterator.return();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }

      if (!options.username) {
        options.username = os.userInfo().username;
      }

      options.usePrivateKey = options.password === undefined;

      if (options.usePrivateKey) {
        if (!options.privateKeyPath && !options.privateKey) {
          options.privateKeyPath = path.join(os.homedir(), '.ssh', 'id_rsa');
        }

        if (options.privateKeyPath) {
          options.privateKey = fs.readFileSync(options.privateKeyPath, 'utf-8');
        }
      }
    }
  }, {
    key: 'init',
    value: function init() {
      /**
       * @type {{}}
       */
      this.ssh = new NodeSsh();
      this.q = this.ssh.connect(this.options);
      return this.q;
    }

    /**
     * Upload file to a hosting and get its url
     * @abstract
     * @param {string} filePath
     * @param {object} build
     * @return {Promise<string>} File url
     */

  }, {
    key: 'uploadFile',
    value: function uploadFile(filePath, build) {
      var _this2 = this;

      var remotePath = this.getRemoteFilePath(filePath, build);
      return this.q.then(function () {
        var remoteDir = path.dirname(remotePath);
        return _this2.ssh.mkdir(remoteDir, 'sftp');
      }).catch(function (err) {
        if (err.code !== 4) throw err;
      }).then(function () {
        return _this2.ssh.putFile(filePath, remotePath, null, {
          step: function step(transferred, _, total) {
            _this2.setProgress(filePath, transferred, total);
          }
        });
      }).then(function () {
        return _this2.getFileUrl(filePath, build);
      });
    }

    /**
     * Save updates.json to a hosting
     * @return {Promise<string>} Url to updates.json
     */

  }, {
    key: 'pushUpdatesJson',
    value: function pushUpdatesJson(data) {
      var _this3 = this;

      var remotePath = path.posix.join(this.options.remotePath, 'updates.json');
      var tmpPath = void 0;
      return this.q.then(function () {
        //noinspection ES6ModulesDependencies,NodeModulesDependencies
        return _this3.saveTemporaryFile(JSON.stringify(data, null, '  '));
      }).then(function (filePath) {
        tmpPath = filePath;
        // Whe should remove updates.json, otherwise only part of the file
        // will be rewritten
        return _this3.ssh.execCommand('rm -f updates.json', {
          cwd: _this3.options.remotePath
        });
      }).then(function () {
        return _this3.ssh.putFile(tmpPath, remotePath);
      }).then(function () {
        return _this3.getUpdatesJsonUrl();
      });
    }

    /**
     * @return {Promise<Array<string>>}
     */

  }, {
    key: 'fetchBuildsList',
    value: function fetchBuildsList() {
      return this.executeCommand('ls -F ', false).then(function (result) {
        var dirs = (result.stdout || '').split('\n');
        return dirs.filter(function (f) {
          return f.match(/\w+-\w+-\w+-[\w.]+\//);
        }).map(function (f) {
          return f.slice(0, -1);
        });
      });
    }

    /**
     * @return {Promise}
     */

  }, {
    key: 'removeBuild',
    value: function removeBuild(build) {
      var buildId = this.getBuildId(build);

      // We need to make an additional check before exec rm -rf
      if (!buildId.match(/\w+-\w+-\w+-v\d+\.\d+\.\d+/)) {
        return Promise.reject('Could not remove build ' + buildId);
      }
      if (this.options.remotePath.length < 2) {
        return Promise.reject('Wrong remote path ' + this.options.remotePath);
      }

      return this.executeCommand('rm -rf ' + buildId, false).then(function (result) {
        if (result.code === 0) return;

        return Promise.reject('Error while deleting a release ' + buildId + '\n' + (result.stdout + '\n' + result.stderr));
      });
    }
  }, {
    key: 'afterUpload',
    value: function afterUpload(build) {
      return this.executeCommand(this.options.afterUploadCommand);
    }
  }, {
    key: 'afterRemove',
    value: function afterRemove(build) {
      return this.executeCommand(this.options.afterRemoveCommand);
    }
  }, {
    key: 'close',
    value: function close() {
      this.ssh.dispose();
      return Promise.resolve();
    }
  }, {
    key: 'getRemoteFilePath',
    value: function getRemoteFilePath(localFilePath, build) {
      localFilePath = path.basename(localFilePath);
      return path.posix.join(this.options.remotePath, this.getBuildId(build), this.normalizeFileName(localFilePath));
    }
  }, {
    key: 'saveTemporaryFile',
    value: function saveTemporaryFile(content) {
      var filePath = path.join(os.tmpdir(), 'publisher-update-' + Number(new Date()) + '.json');
      return new Promise(function (resolve, reject) {
        fs.writeFile(filePath, content, function (err) {
          if (err) {
            reject(err);
          } else {
            resolve(filePath);
          }
        });
      });
    }
  }, {
    key: 'executeCommand',
    value: function executeCommand(command) {
      var _this4 = this;

      var log = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;

      if (!command) {
        return Promise.resolve();
      }

      return this.q.then(function () {
        return _this4.ssh.execCommand(command, { cwd: _this4.options.remotePath });
      }).then(function (result) {
        if (log) {
          console.log('Execute command: ' + command);
          console.log(result.stdout);
          console.log(result.stderr);
        }
        return result;
      });
    }
  }]);

  return SshTransport;
}(AbstractTransport);

module.exports = SshTransport;