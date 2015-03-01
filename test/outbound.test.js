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

var qvx = require('../');

var Cursor = require('../lib/extended-cursor');
var xml2js = require('xml2js');
var parser = new xml2js.Parser({explicitArray: false});

describe('Outbound', function () {

  it('should construct', function (done) {
    var schema = new qvx.Schema();
    var outbound = new qvx.Outbound(schema);
    expect(outbound).to.be.instanceof(qvx.Outbound);
    done();
  });


  it('should transform', function (done) {
    var fields = {
      'AddressNumber': {type: Number},
      'ItemNumber': {type: Number, field: 'signed', bytes: 8, decimals: 0},
      'InvoiceDate': {type: Date},
      'PromisedDeliveryDate': {type: Date}, //'2010-11-19T23:00:00.000Z',
      'Date': {type: Date}, //'2010-11-19T23:00:00.000Z',
      'InvoiceNumber': {type: Number},
      'OrderNumber': {type: Number},
      'ItemDesc': {type: String},
      'SalesQty': {type: Number, bytes: 8, field: 'signed', decimals: 0},
      'OpenQty': {type: Number, bytes: 8, field: 'signed', decimals: 0},
      'OpenOrder': {type: Number, field: 'signed', bytes: 8, decimals: 0},
      'GrossSales': {type: Number, field: 'signed', bytes: 8, decimals: 0},
      'Sales': {type: Number, field: 'signed', bytes: 8, decimals: 0},
      'BackOrder': {type: Number, field: 'signed', bytes: 8, decimals: 0},
      'Cost': {type: Number, field: 'bcd', extent: 'fix', decimals: 4, bytes: 18},
      'Margin': {type: Number, field: 'bcd', extent: 'fix', decimals: 4, bytes: 18},
      'SalesKey': {type: String},
      'ofDaysLate': {type: Number, field: 'signed', decimals: 0},
      'ofDaystoShip': {type: Number, field: 'signed', decimals: 0}
    };

    var schema = new qvx.Schema(fields, {
      createdAt: '2012-03-06 19:22:15',
      creator: false,
      tableName: 'test'
    });

    var data = {
      'AddressNumber': 10022755,
      'ItemNumber': 10821,
      'InvoiceDate': null,
      'PromisedDeliveryDate': new Date(2010, 10, 20, 0, 0, 0),
      'Date': new Date(2010, 10, 20, 0, 0, 0),
      'InvoiceNumber': null,
      'OrderNumber': 214657,
      'ItemDesc': 'Ebony Lemons',
      'SalesQty': null,
      'OpenQty': null,
      'OpenOrder': null,
      'GrossSales': null,
      'Sales': null,
      'BackOrder': 100,
      'Cost': null,
      'Margin': null,
      'SalesKey': '11/01/2010_10022755_118',
      'ofDaysLate': null,
      'ofDaystoShip': null
    };

    var reader = es.readArray([data]);
    var outbound = new qvx.Outbound(schema);

    reader.pipe(outbound)
    .pipe(concat(function (body) {
      expect(body.length).to.be.above(1000);
      fs.writeFileSync(path.join(__dirname, 'tmp', 'test.qvx'), body);
      var actual = new Buffer(body);
      var expected = fs.readFileSync(path.join(__dirname, 'fixtures', 'test_expressor_single.qvx'));
      var size = 200;
      for (var i = 0; i < actual.length; i += size) {
        expect(actual.slice(i, i + size).toString('utf-8'), i).to.eql(expected.slice(i, i + size).toString('utf-8'));
      }
      done();
    }));

  });


  it('aaaahrrdd', function (done) {
    var fields = {
      'AddressNumber': {type: Number},
      'ItemNumber': {type: Number, field: 'signed', bytes: 8, decimals: 0},
      'InvoiceDate': {type: Date},
      'PromisedDeliveryDate': {type: Date}, //'2010-11-19T23:00:00.000Z',
      'Date': {type: Date}, //'2010-11-19T23:00:00.000Z',
      'InvoiceNumber': {type: Number},
      'OrderNumber': {type: Number},
      'ItemDesc': {type: String},
      'SalesQty': {type: Number, bytes: 8, decimals: 0},
      'OpenQty': {type: Number, bytes: 8, decimals: 0},
      'OpenOrder': {type: Number, field: 'signed', bytes: 8, decimals: 0},
      'GrossSales': {type: Number, field: 'signed', bytes: 8, decimals: 0},
      'Sales': {type: Number, field: 'signed', bytes: 8, decimals: 0},
      'BackOrder': {type: Number, field: 'signed', bytes: 8, decimals: 0},
      'Cost': {type: Number, field: 'bcd', extent: 'fix', decimals: 4, bytes: 18},
      'Margin': {type: Number, field: 'bcd', extent: 'fix', decimals: 4, bytes: 18},
      'SalesKey': {type: String},
      'ofDaysLate': {type: Number, decimals: 0},
      'ofDaystoShip': {type: Number, decimals: 0}
    };

    var schema = new qvx.Schema({}, {
      createdAt: '2012-03-06 19:22:15',
      creator: false,
      tableName: 'test',
      fields: fields
    });

    var outbound = new qvx.Outbound(schema, {recordFormat: 'object'});

    var file = fs.createWriteStream(path.join(__dirname, 'tmp', 'streamed.qvx'));

    fs.createReadStream(path.join(__dirname, 'fixtures', 'test_expressor_data_hash.json'))
    .pipe(es.split())
    .pipe(es.parse())
    .pipe(outbound)
    .pipe(file);

    file.on('close', done);

  });

  describe('fixtures', {skip: true}, function () {
    glob.sync(path.join(__dirname, 'fixtures/*.qvx')).forEach(testOutbound);
  });

});//--Writer


function testOutbound(qvxFile) {
  var basename = path.basename(qvxFile);
  return it(basename , function (done) {
    var schema;
    var dirname = path.dirname(qvxFile);

    var dataFile = qvxFile.replace('.qvx', '.qvx.json');
    var schemaFile = qvxFile.replace('.qvx', '.schema.json');


    if(!fs.existsSync(schemaFile)) {
      //create it
      var buf = fs.readFileSync(qvxFile);
      var cursor = new Cursor(buf);
      var xml = cursor.readZeroString();
      parser.parseString(xml, function (err, obj) {
        if (err) {
          done(err);
        }
        schema = qvx.Schema.fromQvx(obj);
        fs.writeFileSync(schemaFile, JSON.stringify(schema));
        done(new Error('rerun test'));
      });
      return;
    }

    var schema = new qvx.Schema(require(schemaFile));

    done();

    // var outbound = new qvx.Inbound({recordFormat: 'object'});
    // var fileIn = fs.createReadStream(qvxFile);
    // var stream = fileIn.pipe(inbound)
    // .pipe(es.map(function (data, cb) {
    //   //console.log(data);
    //   expect(data).to.be.an('object');
    //   cb(null, data);
    // }))
    // .pipe(es.stringify());

    // if (!fs.existsSync(dataFile)) {
    //   var fileOut = fs.createWriteStream(dataFile);
    //   stream = stream.pipe(fileOut);
    //   fileOut.on('close', done);
    // }
    // else {
    //   stream.pipe(concat(function (body) {
    //     expect(body).to.equal(fs.readFileSync(dataFile, 'utf-8'));
    //     done();
    //   }));
    // }


  });//..it Inbound
}//--testInbound