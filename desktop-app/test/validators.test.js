const test = require('node:test');
const assert = require('node:assert');
const V = require('../src/network/validators');

test('isValidIpv4 accepte les IP valides et rejette les injections', () => {
    assert.ok(V.isValidIpv4('192.168.1.1'));
    assert.ok(!V.isValidIpv4('1.1.1.1 & calc'));
    assert.ok(!V.isValidIpv4('256.1.1.1'));
    assert.ok(!V.isValidIpv4('01.1.1.1'));
    assert.ok(!V.isValidIpv4(null));
});

test('isValidHost refuse les métacaractères shell', () => {
    assert.ok(V.isValidHost('example.com'));
    assert.ok(!V.isValidHost('a.com && whoami'));
    assert.ok(!V.isValidHost('a.com|calc'));
    assert.ok(!V.isValidHost('a.com;ls'));
    assert.ok(!V.isValidHost(''));
});

test('isValidMac', () => {
    assert.ok(V.isValidMac('aa:bb:cc:dd:ee:ff'));
    assert.ok(V.isValidMac('AA-BB-CC-DD-EE-FF'));
    assert.ok(!V.isValidMac('aa:bb:cc'));
});

test('isSafeWebhookUrl exige https et refuse loopback / link-local', () => {
    assert.ok(V.isSafeWebhookUrl('https://hooks.slack.com/services/x'));
    assert.ok(!V.isSafeWebhookUrl('http://hooks.slack.com/x'));
    assert.ok(!V.isSafeWebhookUrl('https://127.0.0.1/x'));
    assert.ok(!V.isSafeWebhookUrl('https://169.254.169.254/latest'));
    assert.ok(!V.isSafeWebhookUrl('https://user:pw@example.com/'));
});

test('isValidWsUrl et isValidPort', () => {
    assert.ok(V.isValidWsUrl('ws://192.168.1.150:8765'));
    assert.ok(!V.isValidWsUrl('http://192.168.1.150'));
    assert.ok(V.isValidPort(443));
    assert.ok(!V.isValidPort(70000));
    assert.ok(!V.isValidPort('80'));
});

test('sanitizeExportFilename bloque les chemins', () => {
    assert.strictEqual(V.sanitizeExportFilename('..' + String.fromCharCode(92) + '..' + String.fromCharCode(92) + 'evil.csv'), '.._.._evil.csv');
    assert.strictEqual(V.sanitizeExportFilename('../x.csv'), '.._x.csv');
    assert.strictEqual(V.sanitizeExportFilename('rapport'), 'rapport.txt');
});
