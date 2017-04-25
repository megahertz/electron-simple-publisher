'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var EventEmitter = require('events').EventEmitter;
var fs = require('fs');
var path = require('path');
var Transform = require('stream').Transform;
var http = require('httpreq');

var IGNORE_WARNING = 'You can ignore this warning if you run this command ' + 'for the first time.';

/**
 * @abstract
 */

var AbstractTransport = function (_EventEmitter) {
  _inherits(AbstractTransport, _EventEmitter);

  /**
   * @param {object} options
   * @param {object} options.transport
   * @param {string} options.transport.module
   * @param {string} options.updatesJsonUrl the content of the main package.json
   */
  function AbstractTransport(options) {
    _classCallCheck(this, AbstractTransport);

    /**
     * @type {{transport: Object, updatesJsonUrl: String}}
     */
    var _this = _possibleConstructorReturn(this, (AbstractTransport.__proto__ || Object.getPrototypeOf(AbstractTransport)).call(this));

    _this.commandOptions = options;
    _this.options = options.transport;

    _this.normalizeOptions(_this.options);
    return _this;
  }

  _createClass(AbstractTransport, [{
    key: 'normalizeOptions',
    value: function normalizeOptions(options) {
      if (options.remoteUrl && options.remoteUrl.endsWith('/')) {
        options.remoteUrl = options.remoteUrl.slice(0, -1);
      }

      if (!this.commandOptions.updatesJsonUrl && options.remoteUrl) {
        this.commandOptions.updatesJsonUrl = options.remoteUrl + '/updates.json';
      }

      if (!this.commandOptions.updatesJsonUrl) {
        throw new Error('You should set either a package.json:updater.url option or ' + 'updatesJsonUrl option');
      }
    }

    /**
     * Initialize a transport
     * @return {Promise}
     */

  }, {
    key: 'init',
    value: function init() {
      return Promise.resolve();
    }

    /**
     * Upload file to a hosting and return its url
     * @abstract
     * @param {string} filePath
     * @param {object} build
     * @return {Promise<string>} File url
     */

  }, {
    key: 'uploadFile',
    value: function uploadFile(filePath, build) {
      throw new Error('Not implemented');
    }

    /**
     * Save updates.json to a hosting
     * @abstract
     * @param {object} data updates.json content
     * @return {Promise<string>} Url to updates.json
     */

  }, {
    key: 'pushUpdatesJson',
    value: function pushUpdatesJson(data) {
      throw new Error('Not implemented');
    }

    /**
     * Remove the build from a hosting
     * @abstract
     * @param {object} build
     * @return {Promise}
     */

  }, {
    key: 'removeBuild',
    value: function removeBuild(build) {
      throw new Error('Not implemented');
    }

    /**
     * Return an array with all builds stored on a hosting
     * @abstract
     * @return {Promise<Array<string>>}
     */

  }, {
    key: 'fetchBuildsList',
    value: function fetchBuildsList() {
      throw new Error('Not implemented');
    }

    //noinspection JSMethodCanBeStatic
    /**
     * Do a custom work before uploading
     * @param {object} build
     * @return {Promise}
     */

  }, {
    key: 'beforeUpload',
    value: function beforeUpload(build) {
      return Promise.resolve(build);
    }

    /**
     * Do a custom work after uploading
     * @param {object} build
     * @return {Promise}
     */

  }, {
    key: 'afterUpload',
    value: function afterUpload(build) {
      return Promise.resolve();
    }

    //noinspection JSMethodCanBeStatic,JSUnusedLocalSymbols
    /**
     * Do a custom work before removing
     * @param {object} build
     * @return {Promise}
     */

  }, {
    key: 'beforeRemove',
    value: function beforeRemove(build) {
      return Promise.resolve();
    }

    /**
     * Do a custom work after removing
     * @param {object} build
     * @return {Promise}
     */

  }, {
    key: 'afterRemove',
    value: function afterRemove(build) {
      return Promise.resolve();
    }

    /**
     * Do a custom work for freeing resources here
     * @return {Promise}
     */

  }, {
    key: 'close',
    value: function close() {
      return Promise.resolve();
    }

    /**
     * Get updates.json content from hosting
     * By default, this method just fetch this file through http
     * @return {Promise<object>} data of updates.json
     */

  }, {
    key: 'fetchUpdatesJson',
    value: function fetchUpdatesJson() {
      var _this2 = this;

      return new Promise(function (resolve, reject) {
        http.get(_this2.getUpdatesJsonUrl(), function (err, res) {
          if (err) {
            return reject(err);
          }

          if (res.statusCode !== 200) {
            console.warn('Could not get updates.json. ' + IGNORE_WARNING + ' A hosting ' + ('response is:\n' + res.statusCode + ' ' + res.body));
            resolve({});
            return;
          }

          try {
            resolve(JSON.parse(res.body));
          } catch (e) {
            console.warn('Unable to parse updates.json', IGNORE_WARNING, e);
            resolve({});
          }
        });
      });
    }

    /**
     * Update one section of updates.json
     * @param {object} build
     * @param {object} data
     * @return {Promise.<string>} Updates json url
     */

  }, {
    key: 'updateUpdatesJson',
    value: function updateUpdatesJson(build, data) {
      var _this3 = this;

      return this.fetchUpdatesJson().then(function (json) {
        json = json || {};
        var buildId = _this3.getBuildId(build, false);
        if ((typeof data === 'undefined' ? 'undefined' : _typeof(data)) === 'object') {
          json[buildId] = data;
        } else {
          if (json[buildId] && build.version === json[buildId].version) {
            delete json[buildId];
          }
        }
        return json;
      }).then(function (json) {
        return _this3.pushUpdatesJson(json);
      });
    }

    /**
     * Return an url to updates.json
     * @return {string}
     */

  }, {
    key: 'getUpdatesJsonUrl',
    value: function getUpdatesJsonUrl() {
      var url = this.commandOptions.updatesJsonUrl;
      if (url.endsWith('/')) {
        url = url.slice(0, -1);
      }
      return url;
    }

    /**
     * Convert a build object to buildId string
     * @param {object} build
     * @param {boolean} includeVersion
     * @return {string}
     */

  }, {
    key: 'getBuildId',
    value: function getBuildId() {
      var build = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;
      var includeVersion = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : true;

      var _ref = build || this.commandOptions,
          platform = _ref.platform,
          arch = _ref.arch,
          channel = _ref.channel,
          version = _ref.version;

      if (includeVersion) {
        return platform + '-' + arch + '-' + channel + '-v' + version;
      } else {
        return platform + '-' + arch + '-' + channel;
      }
    }

    //noinspection JSMethodCanBeStatic

  }, {
    key: 'normalizeFileName',
    value: function normalizeFileName(fileName) {
      fileName = path.basename(fileName);
      return fileName.replace(/\s/g, '-');
    }
  }, {
    key: 'getFileUrl',
    value: function getFileUrl(localFilePath, build) {
      var url = this.options.remoteUrl;
      if (url.endsWith('/')) {
        url = url.slice(0, -1);
      }

      return [url, this.getBuildId(build), this.normalizeFileName(localFilePath)].join('/');
    }
  }, {
    key: 'setProgress',
    value: function setProgress(fileName, transferred, total) {
      fileName = path.basename(fileName);
      this.emit('progress', {
        transferred: transferred,
        total: total,
        name: fileName
      });
    }
  }, {
    key: 'makeProgressStream',
    value: function makeProgressStream(filePath) {
      var self = this;
      var totalSize = fs.statSync(filePath).size;
      var uploaded = 0;

      var transform = new Transform();
      transform._transform = function (chunk, enc, cb) {
        this.push(chunk);
        uploaded += chunk.length;
        self.setProgress(filePath, uploaded, totalSize);
        cb();
      };

      return fs.createReadStream(filePath).pipe(transform);
    }
  }]);

  return AbstractTransport;
}(EventEmitter);

module.exports = AbstractTransport;