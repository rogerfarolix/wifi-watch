const test = require('node:test');
const assert = require('node:assert');
const demo = require('../src/network/demo');
const V = require('../src/network/validators');

test('démo : appareils bien formés, MAC et IP valides, uniques', async () => {
    const devices = await demo.scan();
    assert.ok(devices.length >= 10);
    for (const d of devices) {
        assert.ok(V.isValidMac(d.mac), d.mac);
        assert.ok(V.isValidIpv4(d.ip), d.ip);
    }
    assert.strictEqual(new Set(devices.map(d => d.mac)).size, devices.length);
    assert.strictEqual(new Set(devices.map(d => d.ip)).size, devices.length);
});

test('démo : la passerelle et le faux point d\'accès sont cohérents avec l\'environnement', () => {
    const env = demo.getEnvironment();
    const net = demo.neighborNetworks();
    assert.strictEqual(net.evilTwinDetected.ssid, env.wifi.ssid);
    assert.notStrictEqual(net.evilTwinDetected.rogueBssid, env.wifi.bssid);
    assert.ok(net.accessPoints.some(a => a.isCurrent));
});

test('démo : adresses réservées à la documentation (aucune vraie IP publique)', () => {
    assert.strictEqual(demo.wanInfo().ip, '203.0.113.7');
});
