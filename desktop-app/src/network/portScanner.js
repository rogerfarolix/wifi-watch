const net = require('net');

/**
 * Common enterprise & security-sensitive TCP ports with threat intelligence metadata
 */
const COMMON_PORTS = [
    { port: 21, service: 'FTP', risk: 'HIGH', desc: 'Fichiers non chiffrés / Risque d\'écoute' },
    { port: 22, service: 'SSH', risk: 'INFO', desc: 'Administration distante sécurisée' },
    { port: 23, service: 'Telnet', risk: 'CRITICAL', desc: 'Protocole en clair vulnérable / À bannir' },
    { port: 25, service: 'SMTP', risk: 'MEDIUM', desc: 'Relais de messagerie / Risque d\'Open Relay' },
    { port: 53, service: 'DNS', risk: 'INFO', desc: 'Serveur de noms / Résolution DNS' },
    { port: 80, service: 'HTTP', risk: 'LOW', desc: 'Interface Web non chiffrée' },
    { port: 110, service: 'POP3', risk: 'MEDIUM', desc: 'Messagerie non chiffrée' },
    { port: 135, service: 'RPC Endpoint', risk: 'HIGH', desc: 'Microsoft EPM / Cible d\'exploitation' },
    { port: 139, service: 'NetBIOS', risk: 'HIGH', desc: 'Partage Windows hérité / Fuite d\'infos' },
    { port: 443, service: 'HTTPS', risk: 'INFO', desc: 'Interface Web chiffrée' },
    { port: 445, service: 'SMB', risk: 'HIGH', desc: 'Partage de fichiers / Vecteur Ransomware (EternalBlue)' },
    { port: 554, service: 'RTSP', risk: 'HIGH', desc: 'Flux vidéo caméra IP / Risque d\'accès direct' },
    { port: 1433, service: 'MSSQL', risk: 'HIGH', desc: 'Base de données Microsoft SQL' },
    { port: 1883, service: 'MQTT', risk: 'MEDIUM', desc: 'Protocole IoT / Fréquemment non authentifié' },
    { port: 3306, service: 'MySQL', risk: 'MEDIUM', desc: 'Base de données MySQL / MariaDB' },
    { port: 3389, service: 'RDP', risk: 'HIGH', desc: 'Bureau à distance Windows / Cible brute force' },
    { port: 5000, service: 'UPnP / Synology', risk: 'MEDIUM', desc: 'Interface NAS ou passerelle UPnP' },
    { port: 5432, service: 'PostgreSQL', risk: 'MEDIUM', desc: 'Base de données PostgreSQL' },
    { port: 5900, service: 'VNC', risk: 'HIGH', desc: 'Prise de contrôle distante VNC' },
    { port: 8080, service: 'HTTP-Proxy', risk: 'LOW', desc: 'Serveur Web alternatif ou proxy' },
    { port: 8443, service: 'HTTPS-Alt', risk: 'INFO', desc: 'Serveur Web sécurisé alternatif' },
    { port: 8888, service: 'HTTP-Dev', risk: 'MEDIUM', desc: 'Serveur applicatif ou interface IoT' },
    { port: 9100, service: 'Raw JetDirect', risk: 'LOW', desc: 'Port d\'impression directe' }
];

class PortScanner {
    /**
     * Test connection to a single TCP port
     * @param {string} host 
     * @param {number} port 
     * @param {number} timeoutMs 
     * @returns {Promise<boolean>}
     */
    static checkPort(host, port, timeoutMs = 800) {
        return new Promise((resolve) => {
            const socket = new net.Socket();
            let isConnected = false;

            socket.setTimeout(timeoutMs);

            socket.on('connect', () => {
                isConnected = true;
                socket.destroy();
                resolve(true);
            });

            socket.on('timeout', () => {
                socket.destroy();
                resolve(false);
            });

            socket.on('error', () => {
                socket.destroy();
                resolve(false);
            });

            try {
                socket.connect(port, host);
            } catch (err) {
                resolve(false);
            }
        });
    }

    /**
     * Scan target host across a list of ports
     * @param {string} host 
     * @param {Array<number>} customPortList 
     * @param {number} timeoutMs 
     * @returns {Promise<Array<object>>}
     */
    static async scanHost(host, customPortList = null, timeoutMs = 800) {
        if (!host || typeof host !== 'string') {
            throw new Error('Host IP invalide pour le scan de ports');
        }

        const portsToScan = customPortList && customPortList.length > 0 
            ? customPortList.map(p => {
                const known = COMMON_PORTS.find(cp => cp.port === p);
                return known || { port: p, service: 'Inconnu', risk: 'INFO', desc: `Port TCP ${p}` };
            })
            : COMMON_PORTS;

        const results = [];
        const concurrency = 6;
        
        for (let i = 0; i < portsToScan.length; i += concurrency) {
            const chunk = portsToScan.slice(i, i + concurrency);
            const promises = chunk.map(async (item) => {
                const isOpen = await this.checkPort(host, item.port, timeoutMs);
                if (isOpen) {
                    return {
                        port: item.port,
                        service: item.service,
                        risk: item.risk,
                        description: item.desc,
                        state: 'open'
                    };
                }
                return null;
            });

            const chunkResults = await Promise.all(promises);
            for (const res of chunkResults) {
                if (res) results.push(res);
            }
        }

        // Sort by risk priority: CRITICAL > HIGH > MEDIUM > LOW > INFO
        const riskOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4 };
        results.sort((a, b) => (riskOrder[a.risk] ?? 5) - (riskOrder[b.risk] ?? 5));

        return results;
    }

    /**
     * Get list of default audited ports with metadata
     */
    static getCommonPorts() {
        return [...COMMON_PORTS];
    }
}

function scanDevicePorts(host, customPorts) {
    return PortScanner.scanHost(host, customPorts);
}

module.exports = {
    PortScanner,
    scanDevicePorts
};

