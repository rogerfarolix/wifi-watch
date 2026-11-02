const { execFile } = require('child_process');
const { isValidHost } = require('./validators');
const dns = require('dns').promises;
const https = require('https');

/**
 * Enterprise Network Performance & SLA Latency Benchmark Engine
 */
class SpeedBenchmark {
    /**
     * Run full latency, jitter, and throughput benchmark
     * @param {string} targetHost Default gateway or standard DNS
     * @returns {Promise<object>}
     */
    static async runBenchmark(targetHost = '1.1.1.1') {
        const pingStats = await this.measurePingAndJitter(targetHost);
        const dnsLatency = await this.measureDnsLatency();
        const httpLatency = await this.measureHttpLatency();

        // Calculate SLA grade
        let grade = 'A+';
        let rating = 'Excellente qualité réseau';

        if (pingStats.packetLoss >= 50) {
            grade = 'F';
            rating = 'Critique - Hôte injoignable ou forte perte de paquets';
        } else if (pingStats.packetLoss > 0 || pingStats.avgMs > 100 || pingStats.jitterMs > 30 || dnsLatency > 150) {
            grade = 'C';
            rating = 'Dégradé - Forte latence ou gigue';
        } else if (pingStats.avgMs > 50 || pingStats.jitterMs > 15 || dnsLatency > 70) {
            grade = 'B';
            rating = 'Correct - Légère instabilité';
        } else if (pingStats.avgMs > 25 || pingStats.jitterMs > 8) {
            grade = 'A';
            rating = 'Très bonne connectivité';
        }

        return {
            grade,
            rating,
            ping: pingStats,
            dnsLatencyMs: dnsLatency,
            httpLatencyMs: httpLatency,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Measure Ping & Jitter to target host (4 packets)
     */
    static measurePingAndJitter(host) {
        return new Promise((resolve) => {
            if (!isValidHost(host)) {
                return resolve({ minMs: 0, avgMs: 0, maxMs: 0, jitterMs: 0, packetLoss: 100 });
            }
            execFile('ping', ['-n', '4', '-w', '1000', host], { windowsHide: true }, (err, stdout) => {
                if (err || !stdout) {
                    return resolve({ minMs: 0, avgMs: 0, maxMs: 0, jitterMs: 0, packetLoss: 100 });
                }

                const times = [];
                const lines = stdout.split('\r\n');

                for (const line of lines) {
                    // Indépendant de la langue : « temps=2 ms », « time<1ms », « Zeit=3ms »
                    const match = /TTL=/i.test(line) ? line.match(/[=<]\s*(\d+)\s*ms/i) : null;
                    if (match) {
                        times.push(parseInt(match[1], 10));
                    }
                }

                if (times.length === 0) {
                    return resolve({ minMs: 0, avgMs: 0, maxMs: 0, jitterMs: 0, packetLoss: 100 });
                }

                const min = Math.min(...times);
                const max = Math.max(...times);
                const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);

                // Jitter = average difference between consecutive pings
                let jitter = 0;
                if (times.length > 1) {
                    let diffSum = 0;
                    for (let i = 1; i < times.length; i++) {
                        diffSum += Math.abs(times[i] - times[i - 1]);
                    }
                    jitter = Math.round(diffSum / (times.length - 1));
                }

                // Packet loss
                const lossMatch = stdout.match(/(\d+)\s*%/);
                const packetLoss = lossMatch ? parseInt(lossMatch[1], 10) : 0;

                resolve({
                    minMs: min,
                    avgMs: avg,
                    maxMs: max,
                    jitterMs: jitter,
                    packetLoss: packetLoss
                });
            });
        });
    }

    /**
     * Measure average DNS query duration
     */
    static async measureDnsLatency() {
        const canaries = ['cloudflare.com', 'google.com', 'microsoft.com'];
        const start = Date.now();
        try {
            await Promise.all(canaries.map(domain => dns.resolve4(domain)));
            const elapsed = Date.now() - start;
            return Math.round(elapsed / canaries.length);
        } catch (_) {
            return 999;
        }
    }

    /**
     * Measure HTTPS handshake & response latency
     */
    static measureHttpLatency() {
        return new Promise((resolve) => {
            const start = Date.now();
            const req = https.get('https://cloudflare.com/cdn-cgi/trace', { timeout: 3000 }, (res) => {
                res.on('data', () => {});
                res.on('end', () => {
                    resolve(Date.now() - start);
                });
            });

            req.on('error', () => resolve(999));
            req.on('timeout', () => {
                req.destroy();
                resolve(999);
            });
        });
    }
}

module.exports = SpeedBenchmark;
