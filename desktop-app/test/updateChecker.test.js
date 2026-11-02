const test = require('node:test');
const assert = require('node:assert');
const { compareVersions, RELEASES_URL } = require('../src/network/updateChecker');

test('compareVersions : ordre numérique, préfixe v et suffixe ignorés', () => {
    assert.strictEqual(compareVersions('2.0.3', '2.0.2'), 1);
    assert.strictEqual(compareVersions('2.0.2', '2.0.2'), 0);
    assert.strictEqual(compareVersions('2.0.9', '2.0.10'), -1);
    assert.strictEqual(compareVersions('v2.1.0', '2.0.99'), 1);
    assert.strictEqual(compareVersions('2.1', '2.1.0'), 0);
    assert.strictEqual(compareVersions('3.0.0-beta', '2.9.9'), 1);
});

test('la page de release ouverte est fixe et pointe vers le dépôt officiel', () => {
    assert.strictEqual(RELEASES_URL, 'https://github.com/rogerfarolix/wifi-watch/releases/latest');
});
