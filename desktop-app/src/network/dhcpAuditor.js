const { exec } = require('child_process');

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
            exec('ipconfig /all', { windowsHide: true }, (err, stdout) => {
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

                const lines = stdout.split('\r\n');
                for (const line of lines) {
                    // Match DHCP Server
                    const dhcpMatch = line.match(/DHCP.*?Server[^\d]*(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/i) ||
                                      line.match(/Serveur DHCP[^\d]*(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/i);
                    if (dhcpMatch) {
                        dhcpServers.add(dhcpMatch[1]);
                    }

                    // Match Default Gateway
                    const gwMatch = line.match(/Default Gateway[^\d]*(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/i) ||
                                    line.match(/Passerelle par d.faut[^\d]*(\d{1,3}\.\d{1,3}\.\d{1,3})/i);
                    if (gwMatch && gwMatch[1] !== '0.0.0.0') {
                        defaultGateways.add(gwMatch[1]);
                    }

                    // Match DNS Servers
                    const dnsMatch = line.match(/DNS Servers[^\d]*(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/i) ||
                                     line.match(/Serveurs DNS[^\d]*(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/i);
                    if (dnsMatch) {
                        dnsServers.add(dnsMatch[1]);
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
