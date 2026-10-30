const dgram = require('dgram');

/**
 * ZeroConf / mDNS & SSDP (UPnP) Asset Discovery Engine
 * Passively and actively discovers friendly device names, OS models, and services
 */
class ZeroConfDiscovery {
    /**
     * Perform an SSDP M-SEARCH multicast discovery (UPnP)
     * @param {number} timeoutMs 
     * @returns {Promise<Array<{ip: string, server: string, location: string, usn: string}>>}
     */
    static discoverSSDP(timeoutMs = 2500) {
        return new Promise((resolve) => {
            const results = new Map();
            let socket;

            try {
                socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
            } catch (e) {
                return resolve([]);
            }

            const message = Buffer.from(
                'M-SEARCH * HTTP/1.1\r\n' +
                'HOST: 239.255.255.250:1900\r\n' +
                'MAN: "ssdp:discover"\r\n' +
                'MX: 2\r\n' +
                'ST: ssdp:all\r\n' +
                '\r\n'
            );

            socket.on('message', (msg, rinfo) => {
                const text = msg.toString('utf8');
                const headers = {};
                
                text.split('\r\n').forEach(line => {
                    const colonIndex = line.indexOf(':');
                    if (colonIndex > 0) {
                        const key = line.slice(0, colonIndex).trim().toUpperCase();
                        const val = line.slice(colonIndex + 1).trim();
                        headers[key] = val;
                    }
                });

                if (headers['SERVER'] || headers['LOCATION'] || headers['USN']) {
                    const existing = results.get(rinfo.address) || {};
                    results.set(rinfo.address, {
                        ip: rinfo.address,
                        server: headers['SERVER'] || existing.server || '',
                        location: headers['LOCATION'] || existing.location || '',
                        usn: headers['USN'] || existing.usn || '',
                        model: extractModelFromSSDP(headers['SERVER'] || headers['USN'] || '')
                    });
                }
            });

            socket.on('error', () => {
                try { socket.close(); } catch (_) {}
            });

            socket.bind(0, () => {
                try {
                    socket.send(message, 0, message.length, 1900, '239.255.255.250');
                } catch (err) {
                    // Ignore send errors
                }
            });

            setTimeout(() => {
                try { socket.close(); } catch (_) {}
                resolve(Array.from(results.values()));
            }, timeoutMs);
        });
    }

    /**
     * Run combined ZeroConf discovery and match with known IP table
     * @param {number} timeoutMs 
     * @returns {Promise<Map<string, {name: string, model: string, type: string}>>}
     */
    static async discoverDevices(timeoutMs = 2500) {
        const discovered = new Map();

        try {
            const ssdpDevices = await this.discoverSSDP(timeoutMs);
            for (const dev of ssdpDevices) {
                let friendlyName = dev.model || dev.server || 'Appareil UPnP';
                let inferredType = 'iot';

                const sLower = (dev.server + ' ' + dev.usn).toLowerCase();
                if (sLower.includes('synology') || sLower.includes('nas') || sLower.includes('qnap')) {
                    inferredType = 'server';
                } else if (sLower.includes('tv') || sLower.includes('samsung') || sLower.includes('lg') || sLower.includes('roku') || sLower.includes('chromecast')) {
                    inferredType = 'iot';
                } else if (sLower.includes('printer') || sLower.includes('laserjet') || sLower.includes('epson') || sLower.includes('canon')) {
                    inferredType = 'printer';
                } else if (sLower.includes('router') || sLower.includes('gateway') || sLower.includes('fritz') || sLower.includes('livebox')) {
                    inferredType = 'network';
                }

                discovered.set(dev.ip, {
                    name: friendlyName,
                    model: dev.model,
                    server: dev.server,
                    type: inferredType
                });
            }
        } catch (err) {
            console.error('[ZeroConf] Erreur scan:', err.message);
        }

        return discovered;
    }
}

/**
 * Extract clean device model name from SSDP Server or USN header
 */
function extractModelFromSSDP(rawString) {
    if (!rawString) return '';
    
    // Check known signatures
    const cleaned = rawString.replace(/^[\s/]+|[\s/]+$/g, '');
    
    if (/Windows/i.test(cleaned)) return 'Station Windows';
    if (/Linux/i.test(cleaned)) return 'Système Linux';
    if (/Synology/i.test(cleaned)) return 'NAS Synology DiskStation';
    if (/QNAP/i.test(cleaned)) return 'NAS QNAP Turbo';
    if (/Google/i.test(cleaned) || /Chromecast/i.test(cleaned)) return 'Google Chromecast / Nest';
    if (/Sonos/i.test(cleaned)) return 'Enceinte Sonos';
    if (/Apple/i.test(cleaned)) return 'Appareil Apple';
    if (/Samsung/i.test(cleaned)) return 'Smart TV Samsung';
    if (/LG/i.test(cleaned)) return 'Smart TV LG webOS';
    if (/Canon/i.test(cleaned) || /Epson/i.test(cleaned) || /HP/i.test(cleaned)) return 'Imprimante Réseau';
    if (/FRITZ!Box/i.test(cleaned)) return 'Routeur AVM FRITZ!Box';

    const parts = cleaned.split(/[\s,]+/);
    return parts.slice(0, 3).join(' ');
}

module.exports = ZeroConfDiscovery;
