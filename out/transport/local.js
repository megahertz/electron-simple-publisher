'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var fs = require('fs');
var path = require('path');

var AbstractTransport = require('./abstract');

var LocalTransport = function (_AbstractTransport) {
  _inherits(LocalTransport, _AbstractTransport);

  function LocalTransport() {
    _classCallCheck(this, LocalTransport);

    return _possibleConstructorReturn(this, (LocalTransport.__proto__ || Object.getPrototypeOf(LocalTransport)).apply(this, arguments));
  }

  _createClass(LocalTransport, [{
    key: 'normalizeOptions',
    value: function normalizeOptions(options) {
      _get(LocalTransport.prototype.__proto__ || Object.getPrototypeOf(LocalTransport.prototype), 'normalizeOptions', this).call(this, options);
      if (!options.outPath) {
        options.outPath = 'dist/publish';
      }
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

      var outPath = this.getOutFilePath(filePath, build);
      return copyFile(filePath, outPath).then(function () {
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
      var outPath = path.join(this.options.outPath, 'updates.json');
      mkdirp(this.options.outPath);

      fs.writeFileSync(outPath, JSON.stringify(data, null, '  '));
      return Promise.resolve();
    }

    /**
     * @return {Promise<Array<string>>}
     */

  }, {
    key: 'fetchBuildsList',
    value: function fetchBuildsList() {
      var _this3 = this;

      var builds = void 0;
      try {
        builds = fs.readdirSync(this.options.outPath).filter(function (file) {
          var stat = fs.statSync(path.join(_this3.options.outPath, file));
          return stat.isDirectory();
        });
      } catch (e) {
        builds = [];
      }

      return Promise.resolve(builds);
    }

    /**
     * @return {Promise}
     */

  }, {
    key: 'removeBuild',
    value: function removeBuild(build) {
      var buildId = this.getBuildId(build);
      rmDir(path.join(this.options.outPath, buildId));
      return Promise.resolve();
    }
  }, {
    key: 'getOutFilePath',
    value: function getOutFilePath(localFilePath, build) {
      localFilePath = path.basename(localFilePath);
      return path.posix.join(this.options.outPath, this.getBuildId(build), this.normalizeFileName(localFilePath));
    }
  }]);

  return LocalTransport;
}(AbstractTransport);

module.exports = LocalTransport;

function mkdirp(dirPath) {
  dirPath.split('/').forEach(function (dir, index, splits) {
    var parent = splits.slice(0, index).join('/');
    var dirPath = path.resolve(parent, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath);
    }
  });
}

function copyFile(source, target) {
  mkdirp(path.dirname(target));
  return new Promise(function (resolve, reject) {
    var readStream = fs.createReadStream(source);
    readStream.on('error', rejectCleanup);
    var writeStream = fs.createWriteStream(target);
    writeStream.on('error', rejectCleanup);
    function rejectCleanup(err) {
      readStream.destroy();
      writeStream.end();
      reject(err);
    }
    writeStream.on('finish', resolve);
    readStream.pipe(writeStream);
  });
}

function rmDir(dirPath) {
  if (!fs.existsSync(dirPath)) return;
  fs.readdirSync(dirPath).map(function (f) {
    return path.join(dirPath, f);
  }).forEach(function (file) {
    fs.lstatSync(file).isDirectory() ? rmDir(file) : fs.unlinkSync(file);
  });
  fs.rmdirSync(dirPath);
}