var Lab = require('lab');
var lab = exports.lab = Lab.script();
var expect = require('code').expect;

var fs = require('fs');
var path = require('path');
var concat = require('concat-stream');
var JSONStream = require('JSONStream');

var qvx = require('../');


lab.experiment('Inbound', function () {
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
      expect(body).to.exist();
      expect(headerCount).to.equal(1);
      expect(lineCount).to.be.above(0);
      var objs = body.split('\n');
      expect(objs, 'same as lineCount').to.have.length(lineCount);
      expect(objs).to.have.length(120);

      var obj = JSON.parse(objs[0]);
      expect(obj).to.be.instanceof(Object);
      expect(obj).to.include(['AddressNumber', 'ItemNumber']);
      expect(Object.keys(obj)).to.have.length(19);
      fs.writeFileSync('test.inbound.hash.log', body);
      done();
    }));

    inbound.on('line', function (line) {
      expect(line).to.exist();
      lineCount++;
    });

    inbound.on('schema', function (schema) {
      expect(schema).to.exist();
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
      expect(body).to.exist();
      expect(lineCount).to.be.above(0);
      fs.writeFileSync('test.inbound.array.log', body);
      var objs = body.split('\n');
      expect(objs, 'same as lineCount').to.have.length(lineCount);
      expect(objs).to.have.length(120);
      var obj = JSON.parse(objs[0]);
      expect(obj).to.be.instanceof(Array);
      expect(obj).to.have.length(19);

      done();
    }));

    inbound.on('line', function (line) {
      expect(line).to.exist();
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
      expect(body).to.exist();
      var expected = fs.readFileSync(path.join(__dirname, 'fixtures', 'CurrencyExchangeRate.json'), {encoding: 'utf8'});
      expect(body).to.equal(expected);
      fs.writeFileSync('test.inbound.currency.log', body);
      done();
    }));

  });//--read as array
});