/**
 * Wifi-Watch - Network Shield & Device Quarantine (Isolation Réseau)
 * Permet d'isoler immédiatement un équipement intrus ou malveillant
 * en coupant tout trafic réseau avec le poste hôte via le pare-feu Windows
 * et en invalidant les connexions actives.
 */

const { runFile } = require('./shell');

/** Appelle netsh sans shell : les arguments (IP validée) ne peuvent pas être interprétés. */
async function netsh(...args) {
    const r = await runFile('netsh', ['advfirewall', 'firewall', ...args], 10000);
    return { success: r.ok, output: r.stdout, error: r.stderr || (r.ok ? '' : 'netsh a échoué') };
}

/**
 * Valide une adresse IP IPv4
 */
function isValidIpv4(ip) {
    if (!ip || typeof ip !== 'string') return false;
    const parts = ip.split('.');
    if (parts.length !== 4) return false;
    return parts.every(p => {
        const n = parseInt(p, 10);
        return !isNaN(n) && n >= 0 && n <= 255 && p === String(n);
    });
}

/**
 * Isole un équipement en créant des règles de blocage strictes sur le pare-feu Windows
 */
async function isolateDevice(ip) {
    if (!isValidIpv4(ip)) {
        return { success: false, error: 'Adresse IP invalide' };
    }

    const ruleInName = `WifiWatch_Block_${ip}_IN`;
    const ruleOutName = `WifiWatch_Block_${ip}_OUT`;

    // Supprime les anciennes règles si existantes pour éviter les doublons
    await netsh('delete', 'rule', `name=${ruleInName}`);
    await netsh('delete', 'rule', `name=${ruleOutName}`);

    // Règle entrante : bloque tout paquet provenant de l'IP cible
    const inRes = await netsh('add', 'rule', `name=${ruleInName}`, 'dir=in', 'action=block', `remoteip=${ip}`, 'description=Bloqué automatiquement par Wifi-Watch Sentinel');

    // Règle sortante : interdit au poste hôte d'envoyer quoi que ce soit à l'IP cible
    const outRes = await netsh('add', 'rule', `name=${ruleOutName}`, 'dir=out', 'action=block', `remoteip=${ip}`, 'description=Bloqué automatiquement par Wifi-Watch Sentinel');

    // Vider l'entrée ARP pour couper immédiatement les connexions en cache
    await runFile('arp', ['-d', ip], 5000);

    return {
        success: inRes.success || outRes.success,
        ip,
        status: 'QUARANTINED',
        isolatedAt: new Date().toISOString(),
        details: 'Trafic bidirectionnel bloqué via Windows Filtering Platform'
    };
}

/**
 * Lève la quarantaine d'un équipement
 */
async function unisolateDevice(ip) {
    if (!isValidIpv4(ip)) {
        return { success: false, error: 'Adresse IP invalide' };
    }

    const ruleInName = `WifiWatch_Block_${ip}_IN`;
    const ruleOutName = `WifiWatch_Block_${ip}_OUT`;

    await netsh('delete', 'rule', `name=${ruleInName}`);
    await netsh('delete', 'rule', `name=${ruleOutName}`);

    return {
        success: true,
        ip,
        status: 'UNBLOCKED',
        unblockedAt: new Date().toISOString()
    };
}

/**
 * Vérifie si une règle de quarantaine est actuellement active pour cette IP
 */
async function checkQuarantineStatus(ip) {
    if (!isValidIpv4(ip)) return false;
    const ruleInName = `WifiWatch_Block_${ip}_IN`;
    // netsh renvoie un code de sortie non nul quand aucune règle ne correspond (indépendant de la langue)
    const res = await netsh('show', 'rule', `name=${ruleInName}`);
    return res.success;
}

module.exports = {
    isolateDevice,
    unisolateDevice,
    checkQuarantineStatus
};
