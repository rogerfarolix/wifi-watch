const { runStatic } = require('./shell');

/**
 * WiFi Spectrum & Channel Congestion Analyzer
 * Analyzes neighboring Access Points and recommends optimal channels
 */
class SpectrumAnalyzer {
    /**
     * Scan WiFi airwaves and return detailed AP and spectrum congestion data
     * @returns {Promise<object>}
     */
    static analyze() {
        return new Promise((resolve) => {
            runStatic('netsh wlan show networks mode=bssid').then((stdout) => { const err = !stdout;
                if (err || !stdout) {
                    return resolve(this.getFallbackData('Interface WiFi inactive ou non disponible'));
                }

                const networks = [];
                let currentNet = null;
                let currentBssid = null;

                const lines = stdout.split('\r\n');
                for (let line of lines) {
                    line = line.trim();

                    // Match SSID header
                    const ssidMatch = line.match(/^SSID\s+\d+\s+:\s+(.*)$/i);
                    if (ssidMatch) {
                        currentNet = {
                            ssid: ssidMatch[1] || '<SSID Masqué>',
                            bssids: []
                        };
                        networks.push(currentNet);
                        continue;
                    }

                    if (!currentNet) continue;

                    // Match Network type
                    const typeMatch = line.match(/^Network type\s+:\s+(.*)$/i) || line.match(/^Type de r.seau\s+:\s+(.*)$/i);
                    if (typeMatch) currentNet.type = typeMatch[1];

                    // Match Authentication
                    const authMatch = line.match(/^Authentication\s+:\s+(.*)$/i) || line.match(/^Authentification\s+:\s+(.*)$/i);
                    if (authMatch) currentNet.auth = authMatch[1];

                    // Match Encryption
                    const encMatch = line.match(/^Encryption\s+:\s+(.*)$/i) || line.match(/^Chiffrement\s+:\s+(.*)$/i);
                    if (encMatch) currentNet.encryption = encMatch[1];

                    // Match BSSID
                    const bssidMatch = line.match(/^BSSID\s+\d+\s+:\s+([0-9a-f:-]{17})/i);
                    if (bssidMatch) {
                        currentBssid = {
                            bssid: bssidMatch[1].toUpperCase(),
                            ssid: currentNet.ssid,
                            auth: currentNet.auth || 'Inconnu',
                            encryption: currentNet.encryption || 'Inconnu',
                            signal: 0,
                            radio: 'Inconnu',
                            channel: 0,
                            band: '2.4 GHz'
                        };
                        currentNet.bssids.push(currentBssid);
                        continue;
                    }

                    if (!currentBssid) continue;

                    // Match Signal
                    const sigMatch = line.match(/^Signal\s+:\s+(\d+)%/i);
                    if (sigMatch) currentBssid.signal = parseInt(sigMatch[1], 10);

                    // Match Radio Type
                    const radioMatch = line.match(/^Radio type\s+:\s+(.*)$/i) || line.match(/^Type de radio\s+:\s+(.*)$/i);
                    if (radioMatch) currentBssid.radio = radioMatch[1];

                    // Match Channel
                    const chMatch = line.match(/^Channel\s+:\s+(\d+)/i) || line.match(/^Canal\s+:\s+(\d+)/i);
                    if (chMatch) {
                        const ch = parseInt(chMatch[1], 10);
                        currentBssid.channel = ch;
                        currentBssid.band = ch > 14 ? '5 GHz' : '2.4 GHz';
                    }
                }

                // Flatten all BSSIDs
                const allAps = [];
                for (const net of networks) {
                    for (const b of net.bssids) {
                        allAps.push(b);
                    }
                }

                // Aggregate channels
                const channels24 = { 1: 0, 6: 0, 11: 0, other: 0 };
                const channels5 = {};

                for (const ap of allAps) {
                    if (ap.band === '2.4 GHz') {
                        if (ap.channel === 1) channels24[1]++;
                        else if (ap.channel === 6) channels24[6]++;
                        else if (ap.channel === 11) channels24[11]++;
                        else channels24.other++;
                    } else {
                        channels5[ap.channel] = (channels5[ap.channel] || 0) + 1;
                    }
                }

                // Channel recommendation for 2.4 GHz
                const minCount24 = Math.min(channels24[1], channels24[6], channels24[11]);
                let bestChannel24 = 1;
                if (channels24[6] === minCount24) bestChannel24 = 6;
                else if (channels24[11] === minCount24) bestChannel24 = 11;

                const recommendation = `Pour la bande 2.4 GHz, le canal ${bestChannel24} est le moins saturé (${minCount24} point(s) d'accès détecté(s)). Privilégiez si possible la bande 5 GHz (802.11ac/ax) pour éviter les interférences micro-ondes et Bluetooth.`;

                resolve({
                    totalNetworks: networks.length,
                    totalAccessPoints: allAps.length,
                    accessPoints: allAps.sort((a, b) => b.signal - a.signal),
                    channels24,
                    channels5,
                    bestChannel24,
                    recommendation,
                    timestamp: new Date().toISOString()
                });
            });
        });
    }

    static getFallbackData(msg) {
        return {
            totalNetworks: 0,
            totalAccessPoints: 0,
            accessPoints: [],
            channels24: { 1: 0, 6: 0, 11: 0, other: 0 },
            channels5: {},
            bestChannel24: 1,
            recommendation: msg,
            timestamp: new Date().toISOString()
        };
    }
}

module.exports = SpectrumAnalyzer;
