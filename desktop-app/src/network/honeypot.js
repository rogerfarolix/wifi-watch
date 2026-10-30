const net = require('net');
const EventEmitter = require('events');

/**
 * Canary TCP Honeypot & Anti-Ransomware Lateral Movement Trap
 */
class Honeypot extends EventEmitter {
    constructor() {
        super();
        this.server = null;
        this.isRunning = false;
        this.port = 4455; // Default decoy port (often targeted by SMB/recon scripts)
        this.autoBlock = false;
        this.probes = []; // In-memory history of recent probes
        this.maxHistory = 100;
    }

    /**
     * Start the honeypot listener
     * @param {number} port 
     * @param {boolean} autoBlock 
     * @returns {Promise<boolean>}
     */
    start(port = 4455, autoBlock = false) {
        return new Promise((resolve, reject) => {
            if (this.isRunning) {
                if (this.port === port && this.autoBlock === autoBlock) {
                    return resolve(true);
                }
                this.stop();
            }

            this.port = Number(port) || 4455;
            this.autoBlock = !!autoBlock;

            this.server = net.createServer((socket) => {
                const remoteIp = socket.remoteAddress ? socket.remoteAddress.replace(/^.*:/, '') : 'Inconnu';
                const remotePort = socket.remotePort;
                const timestamp = new Date().toISOString();

                // Prevent self-trigger from localhost
                if (remoteIp === '127.0.0.1' || remoteIp === 'localhost' || remoteIp === '::1') {
                    socket.destroy();
                    return;
                }

                const probeEvent = {
                    id: Date.now() + '-' + Math.random().toString(36).substr(2, 5),
                    attackerIp: remoteIp,
                    remotePort: remotePort,
                    targetPort: this.port,
                    timestamp: timestamp,
                    severity: 'CRITICAL',
                    autoBlocked: this.autoBlock,
                    message: `Sonde suspecte / Mouvement latéral intercepté sur le port canari ${this.port}`
                };

                this.probes.unshift(probeEvent);
                if (this.probes.length > this.maxHistory) {
                    this.probes.pop();
                }

                // Emit event for main process to handle alerts, webhooks, voice, firewall
                this.emit('canary-trigger', probeEvent);

                // Send fake banner or immediately close to trap
                try {
                    socket.write('SSH-2.0-OpenSSH_8.4p1 Debian-5+deb11u1\r\n');
                } catch (_) {}

                setTimeout(() => {
                    try { socket.destroy(); } catch (_) {}
                }, 300);
            });

            this.server.on('error', (err) => {
                this.isRunning = false;
                console.error('[Honeypot] Erreur serveur:', err.message);
                reject(err);
            });

            this.server.listen(this.port, '0.0.0.0', () => {
                this.isRunning = true;
                console.log(`[Honeypot] Canari réseau actif et à l'écoute sur le port ${this.port}`);
                resolve(true);
            });
        });
    }

    /**
     * Stop the honeypot listener
     */
    stop() {
        if (this.server) {
            try {
                this.server.close();
            } catch (_) {}
            this.server = null;
        }
        this.isRunning = false;
        console.log('[Honeypot] Canari réseau désactivé');
    }

    /**
     * Get honeypot status and probe history
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            port: this.port,
            autoBlock: this.autoBlock,
            totalProbes: this.probes.length,
            recentProbes: this.probes.slice(0, 20)
        };
    }
}

// Singleton instance
const honeypotInstance = new Honeypot();
module.exports = honeypotInstance;
