/**
 * Wifi-Watch — Validation des entrées (frontière IPC renderer → main)
 * Toute valeur issue du renderer ou du réseau doit passer par ici avant
 * d'atteindre une commande système, un socket ou le système de fichiers.
 */

const { URL } = require('url');

function isValidIpv4(ip) {
    if (typeof ip !== 'string') return false;
    const parts = ip.split('.');
    if (parts.length !== 4) return false;
    return parts.every(p => /^\d{1,3}$/.test(p) && Number(p) <= 255 && p === String(Number(p)));
}

/** Nom d'hôte DNS (RFC 1123) : lettres, chiffres, tirets et points uniquement. */
function isValidHostname(host) {
    if (typeof host !== 'string' || host.length === 0 || host.length > 253) return false;
    return host.split('.').every(l => /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/.test(l));
}

/** IPv4 ou nom d'hôte, jamais de caractères interprétables par un shell. */
function isValidHost(host) {
    return isValidIpv4(host) || isValidHostname(host);
}

function isValidMac(mac) {
    return typeof mac === 'string' && /^([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$/.test(mac);
}

function isValidPort(port) {
    return Number.isInteger(port) && port >= 1 && port <= 65535;
}

function isLoopbackOrLinkLocal(hostname) {
    if (hostname === 'localhost' || hostname.startsWith('[') || hostname.includes(':')) return true;
    if (!isValidIpv4(hostname)) return false;
    const [a, b] = hostname.split('.').map(Number);
    return a === 127 || a === 0 || (a === 169 && b === 254); // 169.254.x.x = métadonnées cloud
}

/** URL de webhook : https obligatoire, ni loopback ni link-local (anti-SSRF). */
function isSafeWebhookUrl(raw) {
    try {
        const u = new URL(raw);
        return u.protocol === 'https:' && !u.username && !u.password && !isLoopbackOrLinkLocal(u.hostname);
    } catch (_) {
        return false;
    }
}

/** URL de nœud RuView : ws:// ou wss:// avec un hôte valide. */
function isValidWsUrl(raw) {
    try {
        const u = new URL(raw);
        return (u.protocol === 'ws:' || u.protocol === 'wss:') && isValidHost(u.hostname);
    } catch (_) {
        return false;
    }
}

/** Nom de fichier d'export : pas de séparateur de chemin, extension autorisée. */
function sanitizeExportFilename(name) {
    const base = String(name || 'export.txt').replace(/[\\/:*?"<>|\x00-\x1f]/g, '_').slice(0, 120);
    return /\.(csv|json|txt)$/i.test(base) ? base : `${base}.txt`;
}

module.exports = {
    isValidIpv4,
    isValidHostname,
    isValidHost,
    isValidMac,
    isValidPort,
    isSafeWebhookUrl,
    isValidWsUrl,
    sanitizeExportFilename
};
