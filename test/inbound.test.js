/*eslint no-unused-expressions: 0 */
var Lab = require('lab');
var lab = exports.lab = Lab.script();
var expect = require('chai').expect;
var describe = lab.experiment;
var it = lab.test;

var fs = require('fs');
var path = require('path');
var glob = require('glob');
var es = require('event-stream');

var concat = require('concat-stream');
var JSONStream = require('JSONStream');

var qvx = require('../');


describe('Inbound', function () {
  lab.test('read as object', function (done) {

    var inbound = new qvx.Inbound({recordFormat: 'object'});
    var fileStream = fs.createReadStream(path.join(__dirname, 'fixtures', 'test_expressor.qvx'));
    var stringify = JSONStream.stringify(false);

    var lineCount = 0;
    var headerCount = 0;

    fileStream
    .pipe(inbound)
    .pipe(stringify)
    .pipe(concat(function (body) {
      expect(headerCount).to.equal(1);
      expect(lineCount).to.be.above(0);
      var objs = body.split('\n');
      expect(objs, 'same as lineCount').to.have.length(lineCount);
      expect(objs).to.have.length(120);

      var obj = JSON.parse(objs[0]);
      expect(obj).to.be.instanceof(Object);
      expect(obj).to.have.include.keys('AddressNumber', 'ItemNumber');
      expect(Object.keys(obj)).to.have.length(19);
      fs.writeFileSync(path.join(__dirname, 'tmp', 'inbound.hash.log'), body);
      done();
    }));

    inbound.on('line', function () {
      lineCount++;
    });

    inbound.on('schema', function (schema) {
      expect(schema).to.be.instanceof(qvx.Schema);
      headerCount++;
    });

  });//--read ad object


  lab.test('read as array', function (done) {

    var inbound = new qvx.Inbound({recordFormat: 'array'});
    var fileStream = fs.createReadStream(path.join(__dirname, 'fixtures', 'test_expressor.qvx'));
    var stringify = JSONStream.stringify(false);

    var lineCount = 0;

    fileStream
    .pipe(inbound)
    .pipe(stringify)
    .pipe(concat(function (body) {
      expect(body).to.exist;
      expect(lineCount).to.be.above(0);
      fs.writeFileSync(path.join(__dirname, 'tmp', 'inbound.array.log'), body);
      var objs = body.split('\n');
      expect(objs, 'same as lineCount').to.have.length(lineCount);
      expect(objs).to.have.length(120);
      var obj = JSON.parse(objs[0]);
      expect(obj).to.be.instanceof(Array);
      expect(obj).to.have.length(19);

      done();
    }));

    inbound.on('line', function (line) {
      expect(line).to.exist;
      lineCount++;
    });

  });//--read as array


  lab.test('read currency', function (done) {

    var inbound = new qvx.Inbound({recordFormat: 'object'});
    var fileStream = fs.createReadStream(path.join(__dirname, 'fixtures', 'CurrencyExchangeRate.qvx'));
    var stringify = JSONStream.stringify(false);


    fileStream.pipe(inbound)
    .pipe(stringify)
    .pipe(concat(function (body) {
      expect(body).to.exist;
      // var obj = JSON.parse(body);
      //console.log(body);
      var expected = fs.readFileSync(path.join(__dirname, 'fixtures', 'CurrencyExchangeRate.json'), {encoding: 'utf8'});
      expect(body).to.equal(expected);
      fs.writeFileSync(path.join(__dirname, 'tmp', 'inbound.currency.log'), body);
      done();
    }));
  });//--read as array

  describe('inbound fixtures', function () {
    glob.sync(path.join(__dirname, 'fixtures/*.qvx')).forEach(testInbound);
  });

  describe('private inbound', function () {
    glob.sync('./private/*.qvx').forEach(testInbound);
  });
});

function testInbound(qvxFile) {
  it('inbound ' + qvxFile, function (done) {
    var dirname = path.dirname(qvxFile);
    var basename = path.basename(qvxFile);
    var dataFile = path.join(dirname, basename + '.json');

    var inbound = new qvx.Inbound({recordFormat: 'object'});
    var fileIn = fs.createReadStream(qvxFile);
    var stream = fileIn.pipe(inbound)
    .pipe(es.map(function (data, cb) {
      //console.log(data);
      expect(data).to.be.an('object');
      cb(null, data);
    }))
    .pipe(es.stringify());

    if (!fs.existsSync(dataFile)) {
      var fileOut = fs.createWriteStream(dataFile);
      stream = stream.pipe(fileOut);
      fileOut.on('close', done);
    }
    else {
      stream.pipe(concat(function (body) {
        expect(body).to.equal(fs.readFileSync(dataFile, 'utf-8'));
        done();
      }));
    }


  });//..it Inbound
}//--testInbound
