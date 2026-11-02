const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

// i18n.js et i18n-en.js sont des scripts de navigateur : on simule `window`
global.window = {};
require('../src/renderer/js/i18n-en.js');
const i18n = require('../src/renderer/js/i18n.js');
const Database = require('../src/data/database');

test('i18n : traduit un texte statique, un texte dynamique et un motif', () => {
    assert.strictEqual(i18n.enOf('Scanner le Réseau'), 'Scan Network');
    assert.strictEqual(i18n.enOf('Scan terminé avec succès !'), 'Scan completed successfully!');
    assert.strictEqual(i18n.enOf('Canal : 36'), 'Channel: 36');
    assert.strictEqual(i18n.enOf('Équipement 192.168.1.5 débloqué.'), 'Device 192.168.1.5 unblocked.');
    assert.strictEqual(i18n.enOf('texte jamais vu'), null);
});

test('i18n : tr() ne traduit qu\'en anglais', () => {
    assert.strictEqual(i18n.tr('Lu'), 'Lu');
});

test('database : les secrets sont chiffrés sur disque et déchiffrés au chargement', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ww-db-'));
    const cipher = {
        encrypt: (s) => Buffer.from(s, 'utf8').reverse().toString('base64'),
        decrypt: (b) => Buffer.from(b, 'base64').reverse().toString('utf8')
    };
    const db = new Database(dir, cipher);
    db.updateSettings({ abuseIpdbKey: 'SECRET-KEY', webhookUrl: 'https://hooks.example.com/abc' });

    const onDisk = fs.readFileSync(path.join(dir, 'wifi_watch.db.json'), 'utf8');
    assert.ok(!onDisk.includes('SECRET-KEY'));
    assert.ok(!onDisk.includes('hooks.example.com'));
    assert.ok(onDisk.includes('enc:v1:'));

    const reloaded = new Database(dir, cipher);
    assert.strictEqual(reloaded.getSettings().abuseIpdbKey, 'SECRET-KEY');
    assert.strictEqual(reloaded.getSettings().webhookUrl, 'https://hooks.example.com/abc');
    fs.rmSync(dir, { recursive: true, force: true });
});

test('database : sans chiffrement disponible, un secret chiffré illisible est vidé (pas de fuite)', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ww-db-'));
    const cipher = { encrypt: (s) => Buffer.from(s).toString('base64'), decrypt: (b) => Buffer.from(b, 'base64').toString() };
    new Database(dir, cipher).updateSettings({ abuseIpdbKey: 'K' });
    assert.strictEqual(new Database(dir, null).getSettings().abuseIpdbKey, '');
    fs.rmSync(dir, { recursive: true, force: true });
});

test('database : catégorie par défaut selon le type d\'appareil', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ww-db-'));
    const db = new Database(dir, null);
    db.upsertDevice({ mac: 'AA:BB:CC:DD:EE:01', ip: '192.168.1.10', deviceType: 'phone', isOnline: true });
    db.upsertDevice({ mac: 'AA:BB:CC:DD:EE:02', ip: '192.168.1.11', deviceType: 'router', isOnline: true });
    assert.strictEqual(db.getDevice('AA:BB:CC:DD:EE:01').category, 'mobile');
    assert.strictEqual(db.getDevice('AA:BB:CC:DD:EE:02').category, 'network');
    fs.rmSync(dir, { recursive: true, force: true });
});
