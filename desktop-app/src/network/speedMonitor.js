/**
 * Wifi-Watch — Real-time Speed & Latency Monitor
 * Mesure en temps réel le débit réseau local (Download / Upload en Mbps)
 * et la latence (Ping vers la Box et vers Internet).
 */

const { runStatic } = require('./shell');
const { measurePing } = require('./scanner');

const execCommand = (cmd, timeout = 3000) => runStatic(cmd, timeout);

class SpeedMonitor {
    constructor() {
        this.lastBytesIn = null;
        this.lastBytesOut = null;
        this.lastTimestamp = null;
    }

    /**
     * Lit les compteurs d'octets de l'interface Windows via netstat -e
     */
    async readInterfaceBytes() {
        const output = await execCommand('netstat -e');
        const lines = output.split(/\r?\n/);

        for (const line of lines) {
            if (/octets|bytes/i.test(line)) {
                const nums = line.match(/\d+/g);
                if (nums && nums.length >= 2) {
                    return {
                        bytesIn: parseInt(nums[0], 10),
                        bytesOut: parseInt(nums[1], 10)
                    };
                }
            }
        }

        return null;
    }

    /**
     * Calcule le débit actuel (Mbps) et la latence
     */
    async getSample(gatewayIp = '192.168.1.254', internetTarget = '1.1.1.1') {
        const now = Date.now();
        const currentBytes = await this.readInterfaceBytes();

        let rxMbps = 0;
        let txMbps = 0;

        if (currentBytes && this.lastBytesIn !== null && this.lastTimestamp !== null) {
            const timeDiffSec = (now - this.lastTimestamp) / 1000;
            if (timeDiffSec > 0.4) {
                const deltaIn = Math.max(0, currentBytes.bytesIn - this.lastBytesIn);
                const deltaOut = Math.max(0, currentBytes.bytesOut - this.lastBytesOut);

                // Conversion octets -> Mbits/s : (bytes * 8) / (1_000_000 * seconds)
                rxMbps = Number(((deltaIn * 8) / (1_000_000 * timeDiffSec)).toFixed(2));
                txMbps = Number(((deltaOut * 8) / (1_000_000 * timeDiffSec)).toFixed(2));
            }
        }

        if (currentBytes) {
            this.lastBytesIn = currentBytes.bytesIn;
            this.lastBytesOut = currentBytes.bytesOut;
            this.lastTimestamp = now;
        }

        // Mesure des pings
        const [pingGatewayMs, pingInternetMs] = await Promise.all([
            measurePing(gatewayIp, 500),
            measurePing(internetTarget, 700)
        ]);

        return {
            timestamp: new Date().toISOString(),
            rxMbps,
            txMbps,
            pingGatewayMs: pingGatewayMs || 0,
            pingInternetMs: pingInternetMs || 0
        };
    }
}

module.exports = SpeedMonitor;
