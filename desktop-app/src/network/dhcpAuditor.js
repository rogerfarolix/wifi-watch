const { runStatic } = require('./shell');

/**
 * Rogue DHCP Server & Gateway Spoofing Auditor
 */
class DhcpAuditor {
    /**
     * Run audit on local network DHCP configuration and gateways
     * @returns {Promise<object>}
     */
    static audit() {
        return new Promise((resolve) => {
            runStatic('ipconfig /all').then((stdout) => { const err = !stdout;
                if (err || !stdout) {
                    return resolve({
                        status: 'UNKNOWN',
                        dhcpServers: [],
                        gateways: [],
                        isRogueDetected: false,
                        details: 'Impossible de lire la configuration IP'
                    });
                }

                const dhcpServers = new Set();
                const defaultGateways = new Set();
                const dnsServers = new Set();

                const IPV4 = /\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b/;
                const lines = stdout.split(/\r?\n/);
                // Les passerelles et serveurs DNS peuvent occuper des lignes de continuation sans libellé
                let section = null;
                for (const line of lines) {
                    const ip = (line.match(IPV4) || [])[1];

                    if (/DHCP/i.test(line) && ip && !/class/i.test(line)) {
                        dhcpServers.add(ip);
                        section = null;
                    } else if (/gateway|passerelle/i.test(line)) {
                        section = 'gw';
                        if (ip && ip !== '0.0.0.0') defaultGateways.add(ip);
                    } else if (/\bDNS\b/i.test(line) && line.includes(':')) {
                        section = 'dns';
                        if (ip) dnsServers.add(ip);
                    } else if (section && /^\s{10,}\S/.test(line) && !line.includes(' : ')) {
                        if (ip && ip !== '0.0.0.0') (section === 'gw' ? defaultGateways : dnsServers).add(ip);
                    } else {
                        section = null;
                    }
                }

                const dhcpList = Array.from(dhcpServers);
                const gwList = Array.from(defaultGateways);
                const dnsList = Array.from(dnsServers);

                // Check for potential rogue DHCP or multiple conflicting gateways
                const hasMultipleDhcp = dhcpList.length > 1;
                const hasMultipleGw = gwList.length > 1;
                const isRogueDetected = hasMultipleDhcp || (dhcpList.length > 0 && gwList.length > 0 && !dhcpList.includes(gwList[0]) && !dhcpList.some(ip => ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')));

                let status = 'SECURE';
                let message = 'Configuration DHCP et passerelle saines';

                if (hasMultipleDhcp) {
                    status = 'CRITICAL';
                    message = `Multiples serveurs DHCP détectés (${dhcpList.join(', ')}). Risque de Rogue DHCP / Attaque MITM.`;
                } else if (hasMultipleGw) {
                    status = 'WARNING';
                    message = `Multiples passerelles par défaut actives (${gwList.join(', ')}). Vérifiez le routage.`;
                }

                resolve({
                    status,
                    message,
                    dhcpServers: dhcpList,
                    gateways: gwList,
                    dnsServers: dnsList,
                    isRogueDetected,
                    timestamp: new Date().toISOString()
                });
            });
        });
    }
}

module.exports = DhcpAuditor;
