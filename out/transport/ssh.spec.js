'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _require = require('chai'),
    expect = _require.expect;

var SshTransport = require('./ssh');

var NoExceptionSshTransport = function (_SshTransport) {
  _inherits(NoExceptionSshTransport, _SshTransport);

  function NoExceptionSshTransport() {
    _classCallCheck(this, NoExceptionSshTransport);

    return _possibleConstructorReturn(this, (NoExceptionSshTransport.__proto__ || Object.getPrototypeOf(NoExceptionSshTransport)).apply(this, arguments));
  }

  _createClass(NoExceptionSshTransport, [{
    key: 'normalizeOptions',
    value: function normalizeOptions(options) {
      try {
        _get(NoExceptionSshTransport.prototype.__proto__ || Object.getPrototypeOf(NoExceptionSshTransport.prototype), 'normalizeOptions', this).call(this, options);
      } catch (e) {
        this.error = e;
        console.error(e);
      }
    }
  }]);

  return NoExceptionSshTransport;
}(SshTransport);

describe('SshTransport', function () {
  it('should not use a private key if password is specified', function () {
    var options = getTransportOptions({ password: 'pass' });

    expect(options.usePrivateKey).to.be.false;
    expect(options.privateKeyPath).to.be.undefined;
  });

  it('should use a private key if password is not specified', function () {
    var options = getTransportOptions();

    expect(options.usePrivateKey).to.be.true;
    expect(options.privateKeyPath).not.to.be.undefined;
  });
});

function getTransportOptions(config) {
  var options = Object.assign({
    remoteUrl: 'http://example.com',
    remotePath: '/'
  }, config);

  var ssh = new NoExceptionSshTransport({
    transport: options,
    updatesJsonUrl: 'http://example.com'
  });

  return ssh.options;
}