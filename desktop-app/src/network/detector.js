/**
 * Wifi-Watch - Network Detector
 * Détecte l'interface réseau active, les paramètres Wi-Fi (SSID, Signal, BSSID),
 * la passerelle (box internet) et le sous-réseau local.
 */

const os = require('os');
const { runStatic } = require('./shell');

const execCommand = (cmd, timeout = 5000) => runStatic(cmd, timeout);

/**
 * Récupère les informations Wi-Fi détaillées via netsh
 */
async function getWifiInfo() {
    const raw = await execCommand('netsh wlan show interfaces');
    const info = {
        isWifi: false,
        name: 'Wi-Fi',
        ssid: '',
        bssid: '',
        signal: 0,
        rssi: null,
        channel: null,
        radioType: '',
        rxRateMbps: 0,
        txRateMbps: 0,
        security: ''
    };

    if (!raw || !raw.includes('SSID')) {
        return info;
    }

    info.isWifi = true;
    const lines = raw.split(/\r?\n/);

    for (const line of lines) {
        const parts = line.split(':');
        if (parts.length < 2) continue;

        const key = parts[0].trim().toLowerCase();
        const val = parts.slice(1).join(':').trim();

        if (key === 'ssid' && !info.ssid) info.ssid = val;
        else if (key.includes('point d\'accès') || key.includes('bssid')) info.bssid = val.toUpperCase().replace(/-/g, ':');
        else if (key === 'signal') info.signal = parseInt(val.replace('%', ''), 10) || 0;
        else if (key === 'rssi') info.rssi = parseInt(val, 10);
        else if (key === 'canal' || key === 'channel') info.channel = parseInt(val, 10);
        else if (key.includes('radio')) info.radioType = val;
        else if ((key.startsWith('authentification') || key.startsWith('authentication') || key.startsWith('chiffrement') || key.startsWith('cipher')) && !key.includes('akm')) {
            info.security = info.security ? `${info.security} / ${val}` : val;
        } else if (key.includes('réception') || key.includes('receive')) {
            info.rxRateMbps = parseFloat(val) || 0;
        } else if (key.includes('transmission') || key.includes('transmit')) {
            info.txRateMbps = parseFloat(val) || 0;
        }
    }

    return info;
}

/**
 * Récupère l'adresse IP de la passerelle par défaut (Gateway / Box)
 */
async function getDefaultGateway() {
    // Tentative 1 : via PowerShell Get-NetRoute
    const psCmd = 'powershell -NoProfile -Command "(Get-NetRoute -DestinationPrefix \'0.0.0.0/0\' | Select-Object -First 1).NextHop"';
    const hop = await execCommand(psCmd, 3000);
    const cleanHop = hop.trim();
    if (cleanHop && /^(\d{1,3}\.){3}\d{1,3}$/.test(cleanHop)) {
        return cleanHop;
    }

    // Tentative 2 : via route print
    const routeOutput = await execCommand('route print 0.0.0.0', 3000);
    const match = routeOutput.match(/0\.0\.0\.0\s+0\.0\.0\.0\s+([0-9.]+)\s+([0-9.]+)/);
    if (match && match[1]) {
        return match[1];
    }

    return '192.168.1.1'; // secours
}

/**
 * Analyse les interfaces pour trouver l'IPv4 active locale
 */
function getActiveInterfaceInfo() {
    const interfaces = os.networkInterfaces();
    let best = null;

    for (const [name, addrs] of Object.entries(interfaces)) {
        for (const addr of addrs) {
            // Ignorer IPv6, loopback et adresses APIPA (169.254.x.x)
            if (addr.family === 'IPv4' && !addr.internal && !addr.address.startsWith('169.254.')) {
                // Privilégier Wi-Fi ou Ethernet
                const isWifiOrEth = /wi-?fi|ethernet|wlan|lan/i.test(name);
                if (!best || (isWifiOrEth && !/wi-?fi|ethernet/i.test(best.interfaceName))) {
                    best = {
                        interfaceName: name,
                        ip: addr.address,
                        netmask: addr.netmask,
                        mac: addr.mac ? addr.mac.toUpperCase() : '00:00:00:00:00:00'
                    };
                }
            }
        }
    }

    return best;
}

/**
 * Calcule la plage du sous-réseau (/24)
 */
function calculateSubnet(ip, netmask) {
    const parts = ip.split('.').map(Number);
    const prefix = `${parts[0]}.${parts[1]}.${parts[2]}`;
    return {
        prefix,
        subnetCIDR: `${prefix}.0/24`,
        baseIp: `${prefix}.`,
        startHost: 1,
        endHost: 254
    };
}

/**
 * Récupère le bilan complet du réseau actif
 */
async function getNetworkEnvironment() {
    const iface = getActiveInterfaceInfo() || {
        interfaceName: 'Wi-Fi',
        ip: '192.168.1.66',
        netmask: '255.255.255.0',
        mac: '00:00:00:00:00:00'
    };

    const [wifiInfo, gatewayIp] = await Promise.all([
        getWifiInfo(),
        getDefaultGateway()
    ]);

    const subnet = calculateSubnet(iface.ip, iface.netmask);

    return {
        interfaceName: iface.interfaceName,
        localIp: iface.ip,
        localMac: iface.mac,
        netmask: iface.netmask,
        gatewayIp,
        subnet,
        wifi: wifiInfo
    };
}

module.exports = {
    getNetworkEnvironment,
    getWifiInfo,
    getDefaultGateway
};
