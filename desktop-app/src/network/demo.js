/**
 * Wifi-Watch - Mode démo
 * Réseau fictif (documentation) pour essayer l'application ou réaliser des captures
 * sans exposer un vrai réseau. Lancé avec `--demo` ; les données sont stockées dans un
 * dossier séparé et aucune commande réseau n'est exécutée pour le scan.
 */

const DEMO_SSID = 'OFFICE-WIFI';
const GATEWAY_IP = '192.168.1.1';
const LOCAL_IP = '192.168.1.20';

const env = {
    interfaceName: 'Wi-Fi',
    localIp: LOCAL_IP,
    localMac: 'A0:B1:C2:00:00:20',
    netmask: '255.255.255.0',
    gatewayIp: GATEWAY_IP,
    subnet: { prefix: '192.168.1', subnetCIDR: '192.168.1.0/24', baseIp: '192.168.1.', startHost: 1, endHost: 254 },
    wifi: {
        isWifi: true, name: 'Wi-Fi', ssid: DEMO_SSID, bssid: 'A0:B1:C2:10:00:01', signal: 86, rssi: -57,
        channel: 36, radioType: '802.11ax', rxRateMbps: 866, txRateMbps: 866, security: 'WPA3-Personal / CCMP'
    }
};

// [ip, mac, nom d'hôte, nom affiché, constructeur, type, de confiance, latence]
const DEVICES = [
    [GATEWAY_IP, 'A0:B1:C2:10:00:01', 'router', `Box Internet (${DEMO_SSID})`, 'Router vendor', 'router', true, 2],
    [LOCAL_IP, 'A0:B1:C2:00:00:20', 'DEMO-PC', 'Ce PC (Poste Actuel)', 'Workstation vendor', 'laptop', true, 1],
    ['192.168.1.21', 'A0:B1:C2:21:00:21', 'Laptop-Alice', 'Portable Alice', 'Dell', 'laptop', true, 6],
    ['192.168.1.22', 'A0:B1:C2:22:00:22', 'iPhone-de-Bob', 'iPhone Bob', 'Apple', 'phone', true, 18],
    ['192.168.1.23', 'A0:B1:C2:23:00:23', 'Galaxy-S24', 'Samsung Claire', 'Samsung', 'phone', true, 22],
    ['192.168.1.24', 'A0:B1:C2:24:00:24', 'iPad-Direction', 'iPad Direction', 'Apple', 'tablet', true, 15],
    ['192.168.1.30', 'A0:B1:C2:30:00:30', 'PRINTER-HP-2F', 'Imprimante 2e étage', 'HP', 'printer', true, 9],
    ['192.168.1.31', 'A0:B1:C2:31:00:31', 'SALLE-REUNION-TV', 'TV salle de réunion', 'LG Electronics', 'tv', true, 14],
    ['192.168.1.40', 'A0:B1:C2:40:00:40', 'ipcam-entree', 'Caméra entrée', 'Hikvision', 'iot', false, 11],
    ['192.168.1.41', 'A0:B1:C2:41:00:41', 'ipcam-parking', 'Caméra parking', 'Dahua', 'iot', false, 13],
    ['192.168.1.50', 'A0:B1:C2:50:00:50', 'NAS-DS220', 'Serveur NAS', 'Synology', 'desktop', true, 3],
    ['192.168.1.51', 'A0:B1:C2:51:00:51', 'thermostat', 'Thermostat', 'Espressif', 'iot', false, 31],
    ['192.168.1.77', 'A0:B1:C2:77:00:77', '', '', 'Inconnu', 'phone', false, 41],
    ['192.168.1.88', 'A0:B1:C2:88:00:88', '', '', 'Inconnu', 'iot', false, 52]
];

function getEnvironment() {
    return JSON.parse(JSON.stringify(env));
}

async function scan(onProgress) {
    const steps = [
        ['Balayage du sous-réseau 192.168.1.0/24...', 20],
        ['Lecture de la table ARP Windows...', 50],
        ['Identification des constructeurs et noms d\'hôtes...', 70]
    ];
    for (const [status, percent] of steps) {
        if (onProgress) onProgress({ status, percent });
        await new Promise(r => setTimeout(r, 400));
    }
    if (onProgress) onProgress({ status: 'Scan terminé avec succès !', percent: 100 });
    return DEVICES.map(([ip, mac, hostname, customName, vendor, deviceType, isTrusted, latencyMs]) => ({
        mac, ip, hostname, customName, vendor, deviceType, isTrusted, isOnline: true,
        latencyMs: latencyMs + Math.floor(Math.random() * 3)
    }));
}

/** Réseaux voisins : le réseau de l'entreprise, des voisins et un faux point d'accès (Evil Twin). */
function neighborNetworks() {
    const ap = (ssid, bssid, signal, channel, band, radioType, security) =>
        ({ ssid, bssid, signal, channel, band, radioType, security, isCurrent: bssid === env.wifi.bssid });
    const accessPoints = [
        ap(DEMO_SSID, 'A0:B1:C2:10:00:01', 86, 36, '5 GHz', '802.11ax', 'WPA3-Personal / CCMP'),
        ap(DEMO_SSID, 'A0:B1:C2:99:66:66', 74, 6, '2.4 GHz', '802.11n', 'Open / None'),
        ap('Voisin-Fibre', 'A0:B1:C2:A1:00:01', 61, 1, '2.4 GHz', '802.11n', 'WPA2-Personal / CCMP'),
        ap('Cafe-Wifi', 'A0:B1:C2:A2:00:02', 48, 1, '2.4 GHz', '802.11n', 'WPA2-Personal / CCMP'),
        ap('Residence-5G', 'A0:B1:C2:A3:00:03', 55, 11, '2.4 GHz', '802.11n', 'WPA2-Personal / CCMP'),
        ap('Boutique', 'A0:B1:C2:A4:00:04', 42, 11, '2.4 GHz', '802.11n', 'WPA2-Personal / CCMP'),
        ap('Atelier', 'A0:B1:C2:A5:00:05', 38, 44, '5 GHz', '802.11ac', 'WPA2-Personal / CCMP')
    ];
    const channels24 = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0, 11: 0, 12: 0, 13: 0 };
    const channels5G = {};
    for (const a of accessPoints) {
        if (a.channel <= 14) channels24[a.channel]++;
        else channels5G[a.channel] = (channels5G[a.channel] || 0) + 1;
    }
    return {
        accessPoints,
        channelStats: { channels24, channels5G, recommendedChannel24: 3, totalNearbyAps: accessPoints.length },
        evilTwinDetected: { ssid: DEMO_SSID, legitBssid: env.wifi.bssid, rogueBssid: 'A0:B1:C2:99:66:66', signal: 74, channel: 6 }
    };
}

let tick = 0;
function bandwidthSample() {
    tick++;
    const wave = (Math.sin(tick / 5) + 1) / 2;
    return {
        timestamp: new Date().toISOString(),
        rxMbps: Number((8 + wave * 70 + Math.random() * 12).toFixed(2)),
        txMbps: Number((2 + wave * 14 + Math.random() * 4).toFixed(2)),
        pingGatewayMs: 2 + Math.floor(Math.random() * 3),
        pingInternetMs: 14 + Math.floor(Math.random() * 6)
    };
}

const PORTS_BY_IP = {
    '192.168.1.1': [[80, 'HTTP', 'LOW', 'Interface web de la box'], [443, 'HTTPS', 'INFO', 'Interface web chiffrée']],
    '192.168.1.30': [[80, 'HTTP', 'LOW', 'Interface web imprimante'], [9100, 'JetDirect', 'MEDIUM', 'Impression brute sans authentification']],
    '192.168.1.40': [[80, 'HTTP', 'MEDIUM', 'Interface caméra'], [554, 'RTSP', 'HIGH', 'Flux vidéo en direct non chiffré (RTSP)'], [8000, 'Hikvision', 'MEDIUM', 'Port de gestion Hikvision / DVR']],
    '192.168.1.41': [[554, 'RTSP', 'HIGH', 'Flux vidéo en direct non chiffré (RTSP)'], [37777, 'Dahua', 'MEDIUM', 'Port propriétaire Dahua Technology']],
    '192.168.1.50': [[22, 'SSH', 'LOW', 'Accès shell sécurisé'], [445, 'SMB', 'MEDIUM', 'Partage de fichiers Windows'], [5000, 'DSM', 'INFO', 'Interface Synology']],
    '192.168.1.88': [[23, 'Telnet', 'CRITICAL', 'Protocole non chiffré Telnet détecté !'], [80, 'HTTP', 'MEDIUM', 'Interface web']]
};

function scanPorts(ip) {
    return (PORTS_BY_IP[ip] || []).map(([port, service, risk, description]) => ({ port, service, risk, description, state: 'open' }));
}

function wanInfo() {
    return { ip: '203.0.113.7', country: 'France', city: 'Paris', isp: 'Example ISP', org: 'Example ISP' };
}

const SPY_PORT_INFO = {
    554: { port: 554, service: 'RTSP', protocol: 'Video Stream', desc: 'Flux vidéo en direct non chiffré (RTSP)', risk: 'high' },
    8000: { port: 8000, service: 'Hikvision / DVR', protocol: 'Camera Control', desc: 'Port de gestion Hikvision / DVR', risk: 'high' },
    37777: { port: 37777, service: 'Dahua', protocol: 'Camera Control', desc: 'Port propriétaire Dahua Technology', risk: 'high' }
};
const SPY_FINDINGS = {
    '192.168.1.40': { level: 'CRITICAL', reason: 'Flux vidéo direct (RTSP) ouvert sans authentification requise !', brand: 'Hikvision', ports: [554, 8000] },
    '192.168.1.41': { level: 'HIGH', reason: 'Équipement de diffusion audio/vidéo actif sur le réseau local', brand: 'Dahua', ports: [554, 37777] }
};

function spyReport(device) {
    const f = SPY_FINDINGS[device.ip];
    const base = { ip: device.ip, mac: device.mac, hostname: device.hostname || 'Appareil Inconnu', vendor: device.vendor || 'Inconnu', scannedAt: new Date().toISOString() };
    if (!f) {
        return { ...base, isSurveillanceDevice: false, threatLevel: 'SAFE', riskReason: 'Aucun flux vidéo ou micro détecté', detectedBrand: null, equipmentType: 'Équipement Standard', openSurveillancePorts: [], streamUrls: [], hasAudioCapability: false };
    }
    return {
        ...base, isSurveillanceDevice: true, threatLevel: f.level, riskReason: f.reason, detectedBrand: f.brand,
        equipmentType: 'Caméra IP', openSurveillancePorts: f.ports.map(p => SPY_PORT_INFO[p]),
        streamUrls: [`rtsp://${device.ip}:554/live/ch0`, `rtsp://${device.ip}:554/onvif1`], hasAudioCapability: true
    };
}

async function spyHunt(devices, onProgress) {
    const online = devices.filter(d => d.isOnline);
    const results = [];
    for (let i = 0; i < online.length; i++) {
        const dev = online[i];
        if (onProgress) onProgress({ current: i + 1, total: online.length, currentIp: dev.ip, currentName: dev.customName || dev.hostname || dev.ip });
        await new Promise(r => setTimeout(r, 250));
        const report = spyReport(dev);
        if (report.isSurveillanceDevice) results.push(report);
    }
    return { scannedCount: online.length, spyDevicesFound: results.length, devices: results, timestamp: new Date().toISOString() };
}

module.exports = { spyHunt, spyReport, getEnvironment, scan, neighborNetworks, bandwidthSample, scanPorts, wanInfo, DEMO_SSID };
