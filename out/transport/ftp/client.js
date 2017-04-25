'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Ftp = require('ftp');

var Client = function () {
  function Client(options) {
    _classCallCheck(this, Client);

    this.options = options;
  }

  _createClass(Client, [{
    key: 'connect',
    value: function connect() {
      var _this = this;

      this.ftp = new Ftp();
      return new Promise(function (resolve, reject) {
        var ready = false;
        _this.ftp.on('ready', function () {
          ready = true;
          resolve();
        });
        _this.ftp.on('error', function (error) {
          if (!ready) reject(error);
        });
        _this.ftp.connect(_this.options);
      });
    }
  }, {
    key: 'cwd',
    value: function cwd(path) {
      var _this2 = this;

      return new Promise(function (resolve, reject) {
        _this2.ftp.cwd(path, function (error) {
          error ? reject(error) : resolve();
        });
      });
    }
  }, {
    key: 'cwdUpdatesRoot',
    value: function cwdUpdatesRoot() {
      return this.cwd(this.options.remotePath);
    }
  }, {
    key: 'mkDirNoError',
    value: function mkDirNoError(name) {
      var _this3 = this;

      return new Promise(function (resolve) {
        _this3.ftp.mkdir(name, resolve);
      });
    }
  }, {
    key: 'putFile',
    value: function putFile(source, remotePath) {
      var _this4 = this;

      return new Promise(function (resolve, reject) {
        _this4.ftp.put(source, remotePath, function (error) {
          error ? reject(error) : resolve();
        });
      });
    }
  }, {
    key: 'list',
    value: function list() {
      var _this5 = this;

      return new Promise(function (resolve, reject) {
        _this5.ftp.list(_this5.options.remotePath, function (error, list) {
          error ? reject(error) : resolve(list);
        });
      });
    }
  }, {
    key: 'rmDir',
    value: function rmDir(remotePath) {
      var _this6 = this;

      return new Promise(function (resolve, reject) {
        _this6.ftp.rmdir(remotePath, true, function (error) {
          error ? reject(error) : resolve();
        });
      });
    }
  }, {
    key: 'close',
    value: function close() {
      this.ftp.end();
    }
  }]);

  return Client;
}();

module.exports = Client;