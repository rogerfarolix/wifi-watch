/**
 * Wifi-Watch — Network Scanner Engine
 * Balayage rapide du sous-réseau, extraction ARP Windows,
 * résolution NetBIOS, mDNS et identification des équipements.
 */

const { exec } = require('child_process');
const net = require('net');
const dgram = require('dgram');
const dns = require('dns').promises;
const { lookupVendor, guessDeviceType } = require('./ouiDatabase');

function execCommand(cmd, timeout = 10000) {
    return new Promise((resolve) => {
        exec(cmd, { timeout, windowsHide: true }, (err, stdout) => {
            resolve(err ? '' : stdout.toString());
        });
    });
}

/**
 * Envoie un paquet NetBIOS Name Query (UDP 137) pour obtenir le nom d'hôte Windows/Samba
 */
function queryNetBiosName(ip, timeoutMs = 600) {
    return new Promise((resolve) => {
        const socket = dgram.createSocket('udp4');
        let timer = null;

        const cleanup = () => {
            if (timer) clearTimeout(timer);
            try { socket.close(); } catch (_) {}
        };

        timer = setTimeout(() => {
            cleanup();
            resolve(null);
        }, timeoutMs);

        // Trame NetBIOS Node Status Request (RFC 1002)
        const packet = Buffer.from([
            0x82, 0x28, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x20, 0x43, 0x4b, 0x41,
            0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41,
            0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41,
            0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41, 0x41,
            0x41, 0x41, 0x41, 0x41, 0x41, 0x00, 0x00, 0x21,
            0x00, 0x01
        ]);

        socket.on('message', (msg) => {
            cleanup();
            try {
                // Les noms NetBIOS débutent après l'offset 57
                if (msg.length > 57) {
                    const numNames = msg[56];
                    let offset = 57;
                    for (let i = 0; i < numNames; i++) {
                        const nameBuffer = msg.slice(offset, offset + 15);
                        const name = nameBuffer.toString('ascii').trim();
                        const type = msg[offset + 15];
                        offset += 18;
                        // Type 0x00 ou 0x20 = nom de poste de travail / machine
                        if (name && (type === 0x00 || type === 0x20)) {
                            return resolve(name);
                        }
                    }
                }
            } catch (_) {}
            resolve(null);
        });

        socket.on('error', () => {
            cleanup();
            resolve(null);
        });

        try {
            socket.send(packet, 0, packet.length, 137, ip);
        } catch (_) {
            cleanup();
            resolve(null);
        }
    });
}

/**
 * Sonde rapide d'un port TCP pour inciter l'appareil à répondre (et donc alimenter la table ARP)
 */
function probeTcp(ip, port = 80, timeoutMs = 250) {
    return new Promise((resolve) => {
        const sock = new net.Socket();
        let done = false;

        const finish = (open) => {
            if (done) return;
            done = true;
            sock.destroy();
            resolve(open);
        };

        sock.setTimeout(timeoutMs);
        sock.once('connect', () => finish(true));
        sock.once('timeout', () => finish(false));
        sock.once('error', () => finish(false));

        try {
            sock.connect(port, ip);
        } catch (_) {
            finish(false);
        }
    });
}

/**
 * Mesure de latence ping vers une IP (en ms)
 */
async function measurePing(ip, timeoutMs = 800) {
    const start = Date.now();
    return new Promise((resolve) => {
        exec(`ping -n 1 -w ${timeoutMs} ${ip}`, { timeout: timeoutMs + 200, windowsHide: true }, (err, stdout) => {
            if (err || !stdout.includes('TTL=')) {
                return resolve(null);
            }
            const match = stdout.match(/temps[=<]\s*(\d+)ms|time[=<]\s*(\d+)ms/i);
            if (match) {
                const ms = parseInt(match[1] || match[2], 10);
                resolve(ms);
            } else {
                resolve(Date.now() - start);
            }
        });
    });
}

/**
 * Résolution de nom d'hôte combinée (NetBIOS + DNS inverse)
 */
async function resolveHostname(ip) {
    // 1. Essai NetBIOS (idéal pour Windows, TV connectées, NAS)
    try {
        const netBiosName = await queryNetBiosName(ip, 500);
        if (netBiosName) return netBiosName;
    } catch (_) {}

    // 2. Essai DNS inverse
    try {
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 400));
        const dnsPromise = dns.reverse(ip);
        const hostnames = await Promise.race([dnsPromise, timeoutPromise]);
        if (hostnames && hostnames.length > 0) {
            return hostnames[0].replace(/\.home|\.lan|\.local/gi, '');
        }
    } catch (_) {}

    return '';
}

/**
 * Extrait les préfixes IP à partir d'une chaîne ou liste de sous-réseaux/CIDR
 * Ex: '192.168.1.0/24, 10.0.0.0/24' -> ['192.168.1.', '10.0.0.']
 */
function parseSubnetPrefixes(input) {
    if (!input) return [];
    const list = Array.isArray(input) ? input : String(input).split(/[,;\s]+/);
    const prefixes = [];
    for (const item of list) {
        const clean = item.trim();
        if (!clean) continue;
        const match = clean.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3})\.?(\d{1,3})?(\/\d{1,2})?$/);
        if (match) {
            prefixes.push(match[1] + '.');
        }
    }
    return [...new Set(prefixes)];
}

/**
 * Récupère le cache ARP du système Windows
 */
async function getArpTable(targetSubnetPrefixes) {
    const raw = await execCommand('arp -a');
    const lines = raw.split(/\r?\n/);
    const devices = [];

    const prefixes = Array.isArray(targetSubnetPrefixes) 
        ? targetSubnetPrefixes 
        : (targetSubnetPrefixes ? [targetSubnetPrefixes] : []);

    for (const line of lines) {
        const trimmed = line.trim();
        // Regex IP (v4) + MAC (format 00-11-22-33-44-55 ou 00:11:...)
        const match = trimmed.match(/^([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})\s+([0-9a-fA-F]{2}[:-][0-9a-fA-F]{2}[:-][0-9a-fA-F]{2}[:-][0-9a-fA-F]{2}[:-][0-9a-fA-F]{2}[:-][0-9a-fA-F]{2})/i);

        if (match) {
            const ip = match[1];
            const rawMac = match[2].toUpperCase().replace(/-/g, ':');

            // Ignorer les adresses broadcast et multicast
            if (
                rawMac === 'FF:FF:FF:FF:FF:FF' ||
                rawMac.startsWith('01:00:5E') ||
                ip.startsWith('224.') ||
                ip.startsWith('239.') ||
                ip.endsWith('.255')
            ) {
                continue;
            }

            // Filtrer sur le(s) sous-réseau(x) si précisé
            if (prefixes.length > 0 && !prefixes.some(p => ip.startsWith(p))) {
                continue;
            }

            devices.push({ ip, mac: rawMac });
        }
    }

    return devices;
}

/**
 * Balayage ultra-rapide du sous-réseau en parallèle (Trigger ARP)
 */
async function triggerArpSweep(baseIp, startHost = 1, endHost = 254) {
    const promises = [];
    for (let i = startHost; i <= endHost; i++) {
        const targetIp = `${baseIp}${i}`;
        promises.push(
            probeTcp(targetIp, 80, 150)
                .catch(() => false)
        );
    }
    await Promise.all(promises);
}

/**
 * Exécute un scan réseau complet et enrichi (supporte le multi-VLAN / multi-sous-réseaux)
 */
async function performScan(env, onProgress = null, customSubnets = null) {
    let basePrefixes = [];
    if (customSubnets) {
        basePrefixes = parseSubnetPrefixes(customSubnets);
    }
    if (basePrefixes.length === 0 && env.subnet && env.subnet.baseIp) {
        basePrefixes = [env.subnet.baseIp];
    }

    const localIp = env.localIp;
    const localMac = env.localMac;
    const gatewayIp = env.gatewayIp;

    if (onProgress) {
        const subnetsLabel = basePrefixes.map(p => p + '0/24').join(', ');
        onProgress({ status: `Balayage ARP (${subnetsLabel})...`, percent: 20 });
    }

    // 1. Déclenchement du balayage sur chaque sous-réseau
    for (let i = 0; i < basePrefixes.length; i++) {
        await triggerArpSweep(basePrefixes[i], 1, 254);
    }

    if (onProgress) onProgress({ status: 'Lecture de la table ARP Windows...', percent: 50 });

    // 2. Récupération des entrées ARP
    const rawDevices = await getArpTable(basePrefixes);

    // S'assurer que la passerelle et la machine locale sont incluses
    const devMap = new Map();

    for (const d of rawDevices) {
        devMap.set(d.mac, d.ip);
    }

    if (localMac && localMac !== '00:00:00:00:00:00') {
        devMap.set(localMac, localIp);
    }

    if (onProgress) onProgress({ status: 'Identification des constructeurs et noms d\'hôtes...', percent: 70 });

    const results = [];
    const entries = Array.from(devMap.entries());

    // 3. Résolution enrichie pour chaque équipement détecté
    const enrichmentPromises = entries.map(async ([mac, ip]) => {
        const isGateway = (ip === gatewayIp);
        const isThisDevice = (ip === localIp || mac === localMac);

        const [hostname, latencyMs] = await Promise.all([
            isThisDevice ? Promise.resolve(require('os').hostname()) : resolveHostname(ip),
            measurePing(ip, 600)
        ]);

        let vendor = lookupVendor(mac);
        if (isGateway && vendor === 'Inconnu' && env.wifi && env.wifi.ssid) {
            vendor = env.wifi.ssid.split('-')[0] || 'Passerelle Wi-Fi';
        }

        let deviceType = guessDeviceType(hostname, vendor);
        if (isGateway) deviceType = 'router';
        else if (isThisDevice) deviceType = 'laptop';

        let customName = '';
        if (isThisDevice) customName = 'Ce PC (Poste Actuel)';
        else if (isGateway) customName = `Box Internet (${env.wifi?.ssid || 'Routeur'})`;

        return {
            mac,
            ip,
            hostname: hostname || (isGateway ? 'Routeur' : ''),
            customName,
            vendor,
            deviceType,
            isTrusted: isGateway || isThisDevice, // de confiance par défaut pour la box et soi-même
            isOnline: true,
            latencyMs
        };
    });

    const enriched = await Promise.all(enrichmentPromises);

    if (onProgress) onProgress({ status: 'Scan terminé avec succès !', percent: 100 });

    return enriched;
}

module.exports = {
    performScan,
    measurePing,
    resolveHostname,
    probeTcp,
    parseSubnetPrefixes
};
