/**
 * Wifi-Watch — Wi-Fi Channel Analyzer & Evil Twin Detector
 * Analyse l'encombrement des canaux 2.4GHz / 5GHz, détecte les box voisines,
 * recommande le canal optimal et alerte sur les faux points d'accès (Evil Twin).
 */

const { runStatic } = require('./shell');

const execCommand = (cmd, timeout = 7000) => runStatic(cmd, timeout);

/**
 * Scanne tous les points d'accès Wi-Fi visibles
 */
async function scanNeighborNetworks(currentSsid = '', currentBssid = '') {
    const raw = await execCommand('netsh wlan show networks mode=bssid');
    const networks = [];
    const lines = raw.split(/\r?\n/);

    let currentNet = null;
    let currentBss = null;

    for (const line of lines) {
        const trimmed = line.trim();

        // Détection d'un nouveau SSID
        const ssidMatch = trimmed.match(/^SSID\s+\d+\s*:\s*(.*)$/i);
        if (ssidMatch) {
            if (currentNet && currentBss) {
                currentNet.bssids.push(currentBss);
                networks.push(currentNet);
            } else if (currentNet) {
                networks.push(currentNet);
            }

            currentNet = {
                ssid: ssidMatch[1].trim() || '<Réseau Masqué>',
                auth: '',
                encryption: '',
                bssids: []
            };
            currentBss = null;
            continue;
        }

        if (!currentNet) continue;

        if (trimmed.toLowerCase().startsWith('authentification')) {
            currentNet.auth = trimmed.split(':')[1]?.trim() || '';
        } else if (trimmed.toLowerCase().startsWith('chiffrement')) {
            currentNet.encryption = trimmed.split(':')[1]?.trim() || '';
        }

        // Détection d'un BSSID (point d'accès physique)
        const bssidMatch = trimmed.match(/^BSSID\s+\d+\s*:\s*([0-9a-fA-F:-]+)/i);
        if (bssidMatch) {
            if (currentBss) {
                currentNet.bssids.push(currentBss);
            }
            currentBss = {
                bssid: bssidMatch[1].trim().toUpperCase().replace(/-/g, ':'),
                signal: 0,
                channel: 1,
                band: '2.4 GHz',
                radioType: ''
            };
            continue;
        }

        if (!currentBss) continue;

        const parts = trimmed.split(':');
        if (parts.length < 2) continue;
        const key = parts[0].trim().toLowerCase();
        const val = parts.slice(1).join(':').trim();

        if (key.includes('signal')) {
            currentBss.signal = parseInt(val.replace('%', ''), 10) || 0;
        } else if (key === 'canal' || key === 'channel') {
            currentBss.channel = parseInt(val, 10) || 1;
        } else if (key === 'bande' || key === 'band') {
            currentBss.band = val;
        } else if (key.includes('radio')) {
            currentBss.radioType = val;
        }
    }

    if (currentNet) {
        if (currentBss) currentNet.bssids.push(currentBss);
        networks.push(currentNet);
    }

    // Aplatir pour avoir la liste de tous les BSSIDs avec leur SSID
    const allAccessPoints = [];
    let evilTwinDetected = null;

    for (const net of networks) {
        for (const bss of net.bssids) {
            const ap = {
                ssid: net.ssid,
                bssid: bss.bssid,
                signal: bss.signal,
                channel: bss.channel,
                band: bss.band,
                radioType: bss.radioType,
                security: `${net.auth} / ${net.encryption}`,
                isCurrent: (bss.bssid.toUpperCase() === currentBssid.toUpperCase())
            };
            allAccessPoints.push(ap);

            // Détection Evil Twin : même nom de réseau mais adresse physique différente
            if (
                currentSsid &&
                net.ssid === currentSsid &&
                currentBssid &&
                bss.bssid.toUpperCase() !== currentBssid.toUpperCase()
            ) {
                evilTwinDetected = {
                    ssid: currentSsid,
                    legitBssid: currentBssid,
                    rogueBssid: bss.bssid,
                    signal: bss.signal,
                    channel: bss.channel
                };
            }
        }
    }

    // Analyse de l'encombrement des canaux
    const channelStats = analyzeChannelCongestion(allAccessPoints);

    return {
        accessPoints: allAccessPoints,
        channelStats,
        evilTwinDetected
    };
}

/**
 * Calcule l'encombrement des canaux et recommande le meilleur canal
 */
function analyzeChannelCongestion(accessPoints) {
    // Fréquences 2.4 GHz : canaux standard 1 à 13 (canaux non chevauchants majeurs : 1, 6, 11)
    const channels24 = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0, 11: 0, 12: 0, 13: 0 };
    const channels5G = {};

    for (const ap of accessPoints) {
        const ch = ap.channel;
        if (ch <= 14) {
            // Pondérer l'impact selon la puissance du signal
            const impact = Math.max(1, Math.round(ap.signal / 20));
            channels24[ch] = (channels24[ch] || 0) + impact;

            // Interférence sur les canaux voisins (chevauchement 2.4 GHz)
            if (ch > 1) channels24[ch - 1] = (channels24[ch - 1] || 0) + Math.round(impact * 0.5);
            if (ch < 13) channels24[ch + 1] = (channels24[ch + 1] || 0) + Math.round(impact * 0.5);
        } else {
            channels5G[ch] = (channels5G[ch] || 0) + 1;
        }
    }

    // Choisir le meilleur canal 2.4 GHz parmi 1, 6, 11
    const candidateChannels = [1, 6, 11];
    let best24 = 1;
    let minScore = Infinity;

    for (const c of candidateChannels) {
        const score = channels24[c] || 0;
        if (score < minScore) {
            minScore = score;
            best24 = c;
        }
    }

    return {
        channels24,
        channels5G,
        recommendedChannel24: best24,
        totalNearbyAps: accessPoints.length
    };
}

module.exports = {
    scanNeighborNetworks
};
