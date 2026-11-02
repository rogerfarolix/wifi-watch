/**
 * Wifi-Watch - Vérification des mises à jour via l'API publique des releases GitHub.
 * Une seule requête HTTPS en lecture, sans téléchargement ni installation automatique.
 */

const https = require('https');

const REPO = 'rogerfarolix/wifi-watch';
const RELEASES_URL = `https://github.com/${REPO}/releases/latest`;

/** Compare deux versions "x.y.z" (préfixe v et suffixe -beta ignorés). Retourne -1, 0 ou 1. */
function compareVersions(a, b) {
    const parse = (v) => String(v || '').trim().replace(/^v/i, '').split('-')[0].split('.').map(n => parseInt(n, 10) || 0);
    const pa = parse(a), pb = parse(b);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const x = pa[i] || 0, y = pb[i] || 0;
        if (x !== y) return x > y ? 1 : -1;
    }
    return 0;
}

function fetchLatestRelease(timeout = 8000) {
    return new Promise((resolve, reject) => {
        const req = https.get({
            hostname: 'api.github.com',
            path: `/repos/${REPO}/releases/latest`,
            headers: { 'User-Agent': 'Wifi-Watch-Update-Checker', 'Accept': 'application/vnd.github+json' },
            timeout
        }, (res) => {
            let body = '';
            res.setEncoding('utf8');
            res.on('data', (c) => { body += c; if (body.length > 1e6) req.destroy(new Error('Réponse trop volumineuse')); });
            res.on('end', () => {
                if (res.statusCode !== 200) return reject(new Error(`GitHub a répondu ${res.statusCode}`));
                try { resolve(JSON.parse(body)); } catch (e) { reject(new Error('Réponse GitHub illisible')); }
            });
        });
        req.on('timeout', () => req.destroy(new Error('Délai dépassé')));
        req.on('error', reject);
    });
}

async function checkForUpdate(currentVersion) {
    const release = await fetchLatestRelease();
    const latest = String(release.tag_name || '').replace(/^v/i, '');
    if (!/^\d+\.\d+\.\d+/.test(latest)) throw new Error('Numéro de version distant invalide');
    return {
        current: currentVersion,
        latest,
        updateAvailable: compareVersions(latest, currentVersion) > 0,
        publishedAt: release.published_at || null
    };
}

module.exports = { checkForUpdate, compareVersions, RELEASES_URL };
