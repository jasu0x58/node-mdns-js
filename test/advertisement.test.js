var dns = require('dns-js');
var DNSPacket = dns.DNSPacket;
var DNSRecord = dns.DNSRecord;

const Lab = require('lab');
const {describe,  it } = exports.lab = Lab.script();
const { expect } = require('code');

const Mdns = require('../lib');
const MockNetworking = require('./mock_networking');
var mockNetworking = new MockNetworking();
var mdns = new Mdns({networking: mockNetworking});

var pf = require('../lib/packetfactory');


function mockAdvertisement() {
  var context = {};
  context.options = {
    name: 'hello'
  };
  context.nameSuffix = '';
  context.port = 4242;
  context.serviceType = mdns.tcp('_http');
  return context;
}

describe('packetfactory', function () {

  it('buildQDPacket', () => {
    var context = mockAdvertisement();
    var packet = pf.buildQDPacket.apply(context, []);
    expect(context.alias).to.equal('hello._http._tcp.local');
    expect(packet).to.exist();

  });


  it('buildANPacket', () => {
    var context = mockAdvertisement();
    var packet = pf.buildQDPacket.apply(context, []);
    pf.buildANPacket.apply(context, [DNSRecord.TTL, mockNetworking]);
    expect(packet).to.exist();

  });


  it('createAdvertisement', () => {
    var service = mdns.createAdvertisement(mdns.tcp('_http'), 9876, {
      name:'hello',
      txt:{
        txtvers:'1'
      }
    });

    expect(service).to.include({port:9876});
    expect(service.serviceType).to.include({name: 'http', protocol: 'tcp'});
    expect(service).to.include('options');
    expect(service.options, 'options').to.include({name: 'hello'});

  });

  it('issue70_txt-with-dot', {timeout: 3000}, () => {
    var mn = new MockNetworking();
    var myMdns = new Mdns({networking: mn});
    var service = myMdns.createAdvertisement(mdns.tcp('_http'), 9876, {
      name:'api',
      txt:{
        api_proto: 'http',
        api_ver: 'v1.0',
        pri: 100
      }
    });
    expect(service.options, 'options').to.include({name: 'api'});
    expect(service.options.txt).to.include({api_ver: 'v1.0'});
    service.start();

    function testQd(packet, buffer) {
      expect(packet.header).to.include({rd: 1, aa: 0, qr: 0});
      expect(packet).to.include('question');
      expect(packet.question).to.have.length(1);
      expect(packet.question[0]).to.include({name: 'api._http._tcp.local', isQD: true, type: 255});
      var parsed = DNSPacket.parse(buffer);
      expect(parsed.question[0]).to.include({name: 'api._http._tcp.local', isQD: true, type: 255});
    }

    function testAN(packet, buffer) {
      var parsed = DNSPacket.parse(buffer);

      //header
      expect(packet.header).to.include({rd: 0, aa: 1, qr: 1});

      //questions
      expect(packet.question).to.have.length(0);
      //answers
      expect(packet.answer).to.have.length(4);
      expect(packet.answer[0]).to.include({name: 'api._http._tcp.local', class: 32769, type: 33});
      expect(parsed.answer[0]).to.include({name: 'api._http._tcp.local', class: 32769, type: 33});
      //authority
      expect(packet.authority).to.have.length(0);
    }

    return new Promise((resolve)=> {
      var received = [];
      mn.on('send', (data) => {
        received.push(data);
      });

      setTimeout(() => {
        expect(received.length).to.equal(5);
        testQd(received[0].packet,received[0].buffer );
        testQd(received[1].packet,received[1].buffer );
        testQd(received[2].packet,received[2].buffer );
        testAN(received[3].packet, received[3].buffer);

        // received.forEach((data)=> {
        //   console.log('test => %j', data.packet);
        // });
        resolve();
      }, 2000);
    });
  });
});
