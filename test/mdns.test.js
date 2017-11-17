
const Lab = require('lab');
const { after, before, describe,  it } = exports.lab = Lab.script();
const { expect } = require('code');

const { DNSPacket } = require('dns-js');

const packets = require('./packets.json');

// var Code = require('code');   // assertion library
// var expect = Code.expect;
const Mdns = require('../lib');
const MockNetwork = require('./mock_networking');
const mockNet = new MockNetwork();
var mdns = new Mdns({networking: mockNet});

mockNet.on('send', () => {
  var p = DNSPacket.parse(new Buffer.from(packets.responses.services.linux_workstation, 'hex'));


  mockNet.receive([p]);
});


describe('mDNS', function () {
  var browser;
  before(function () {
    mdns.excludeInterface('0.0.0.0');
    expect(mdns,  'library does not exist!?').to.exist(mdns);

    return new Promise((resolve) => {
      browser = mdns.createBrowser();

      browser.on('ready', function onReady() {
        resolve();
      });
    });
  });

  after(function () {
    browser.stop();
  });


  // it('should .discover()', {skip: process.env.MDNS_NO_RESPONSE}, () => {
  it('should .discover()', () => {
    setTimeout(browser.discover.bind(browser), 500);

    return new Promise((resolve) => {
      browser.once('update', function onUpdate(data) {
        expect(data).to.include(['interfaceIndex', 'networkInterface',
          'addresses', 'query']);
        resolve();
      });
    });


  });

});
