'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var fs = require('fs');
var path = require('path');
var Ftp = require('./client');

var AbstractTransport = require('./../abstract');

var FtpTransport = function (_AbstractTransport) {
  _inherits(FtpTransport, _AbstractTransport);

  function FtpTransport() {
    _classCallCheck(this, FtpTransport);

    return _possibleConstructorReturn(this, (FtpTransport.__proto__ || Object.getPrototypeOf(FtpTransport)).apply(this, arguments));
  }

  _createClass(FtpTransport, [{
    key: 'normalizeOptions',

    /**
     * @param {Object} options
     * @param {string} options.remoteUrl
     * @param {string} options.remotePath
     * @param {string} options.host
     * @param {string} options.user
     * @param {string} options.password
     */
    value: function normalizeOptions(options) {
      _get(FtpTransport.prototype.__proto__ || Object.getPrototypeOf(FtpTransport.prototype), 'normalizeOptions', this).call(this, options);

      var REQUIRED = ['remoteUrl', 'remotePath', 'host', 'user', 'password'];
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
    }
  }, {
    key: 'init',
    value: function init() {
      this.ftp = new Ftp(this.options);
      this.q = this.ftp.connect();
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

      var buildId = this.getBuildId(build);
      var fileStream = this.makeProgressStream(filePath);

      return this.q.then(function () {
        return _this2.ftp.cwdUpdatesRoot();
      }).then(function () {
        return _this2.ftp.mkDirNoError(buildId);
      }).then(function () {
        return _this2.ftp.cwd(buildId);
      }).then(function () {
        return _this2.ftp.putFile(fileStream, path.basename(filePath));
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

      var buffer = Buffer.from(JSON.stringify(data, null, '  '), 'utf8');
      return this.q.then(function () {
        return _this3.ftp.cwdUpdatesRoot();
      }).then(function () {
        return _this3.ftp.putFile(buffer, 'updates.json');
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
      var _this4 = this;

      return this.q.then(function () {
        return _this4.ftp.cwdUpdatesRoot();
      }).then(function () {
        return _this4.ftp.list();
      }).then(function (list) {
        return list.map(function (item) {
          return item.name;
        }).filter(function (name) {
          return name.match(/^\w+-\w+-\w+-[\w.]+$/);
        });
      });
    }

    /**
     * @return {Promise}
     */

  }, {
    key: 'removeBuild',
    value: function removeBuild(build) {
      var _this5 = this;

      var buildId = this.getBuildId(build);
      return this.ftp.cwdUpdatesRoot().then(function () {
        return _this5.ftp.rmDir(buildId);
      });
    }
  }, {
    key: 'close',
    value: function close() {
      this.ftp.close();
      return _get(FtpTransport.prototype.__proto__ || Object.getPrototypeOf(FtpTransport.prototype), 'close', this).call(this);
    }
  }]);

  return FtpTransport;
}(AbstractTransport);

module.exports = FtpTransport;