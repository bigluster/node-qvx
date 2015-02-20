/*eslint no-underscore-dangle: 0 */
var debug = require('debug')('qvx:inbound');
var xml2js = require('xml2js');
var parser = new xml2js.Parser({explicitArray: false});
var util = require('util');
var Transform = require('stream').Transform;
var Schema = require('./schema');
var Cursor = require('./extendedcursor');

var STATE = {
  Header: 0,
  Data: 1,
  Done: 3,
  Err: -1
};

var VALID_FORMATS = ['array', 'object'];

var Inbound = module.exports = function (opt) {
  if (!(this instanceof Inbound)) {
    return new Inbound(opt);
  }

  opt = opt || {};
  opt.recordFormat = opt.recordFormat || 'array';

  this.options = opt;

  if (VALID_FORMATS.indexOf(opt.recordFormat) === -1) {
    throw new Error('Invalid recordFormat');
  }

  Transform.call(this, {objectMode: true});
  this.state = STATE.Header;
  this.xmlPart = '';
  this.reader = null;
  debug('instanciated Inbound');
};

util.inherits(Inbound, Transform);

Inbound.prototype._transform = function (chunk, enc, done) {
  var self = this;
  debug('transform, state=%s', this.state);
  if (this.state === STATE.Data) {
    debug('data chunk');
    this.readrecords(chunk);
    done();
  }
  var split = 0;
  for(var i = 0; i < chunk.length; i++) {
    if (this.state === STATE.Header && chunk[i] === 0) {
      debug('got end of xml');
      this.state = STATE.Data;
      this.xmlPart += chunk.toString('utf-8', 0, i);
      split = i;
      parser.parseString(this.xmlPart, readXml);
      break;
    }
  }

  function readXml(err, obj) {
    if (err) {
      throw err;
    }
    self.header = obj;
    self.schema = Schema.fromQvx(obj);
    self.schema.recordFormat = self.options.recordFormat;
    self.emit('schema', self.schema);

    if(self.state === STATE.Data) {
      debug('rest of chunk is data');
      self.readrecords(chunk.slice(i + 1, chunk.length));
    }
    done();
  }
};


Inbound.prototype.readrecords = function (buf) {
  debug('readrecords');
  if (!(this.schema instanceof Schema)) {
    return new Error('Missing or bad schema');
  }
  if (!this.reader) {
    var reader = this.schema.bindReadCursor(new Cursor(buf), this.objectFormat);
    this.reader = reader;
  }
  else {
    throw new Error('TODO: Multi chunked data');
  }

  while (!reader.eof()) {
    var line = reader.readRecord();
    buf = undefined;
    this.push(line, 'object');
    this.emit('line', line);
  }
  debug('reader eof');
};


// Inbound.prototype._flush = function (done) {
//   debug('flushing');
//   this.push('');
//   done();
// };