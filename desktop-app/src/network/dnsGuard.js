/**
 * Wifi-Watch - Enterprise DNS Guard & SLA Monitor
 * Détecte les attaques DNS Poisoning / Hijacking, mesure la latence de résolution (SLA)
 * et valide l'intégrité des serveurs de noms.
 */

const dns = require('dns');
const { Resolver } = require('dns').promises;

class DnsGuard {
    /**
     * Canaris de validation d'intégrité DNS
     */
    static CANARIES = [
        { domain: 'cloudflare.com', expectedAny: ['104.16.', '104.17.'] },
        { domain: 'google.com', expectedAny: ['142.250.', '172.217.', '216.58.', '142.251.'] },
        { domain: 'one.one.one.one', expectedExact: ['1.1.1.1', '1.0.0.1'] }
    ];

    /**
     * Effectue un audit complet de l'infrastructure DNS
     * @param {string[]} customServers - Liste optionnelle de serveurs DNS personnalisés
     * @returns {Promise<Object>}
     */
    static async auditDns(customServers = null) {
        const startTime = Date.now();
        const results = {
            timestamp: new Date().toISOString(),
            status: 'HEALTHY', // HEALTHY, WARNING, CRITICAL
            systemServers: dns.getServers(),
            testedServers: [],
            latencyMs: 0,
            hijackDetected: false,
            warnings: [],
            recommendations: []
        };

        const serversToTest = customServers && customServers.length > 0 
            ? customServers 
            : [...new Set([...results.systemServers, '1.1.1.1', '8.8.8.8'])];

        for (const server of serversToTest) {
            const serverReport = await this.testServer(server);
            results.testedServers.push(serverReport);
            if (serverReport.hijackDetected) {
                results.hijackDetected = true;
                results.status = 'CRITICAL';
                results.warnings.push(`Détournement DNS suspecté sur le serveur ${server} ! Les adresses résolues ne correspondent pas aux serveurs officiels.`);
            }
        }

        // Calcul de la latence moyenne
        const latencies = results.testedServers.map(s => s.avgLatencyMs).filter(l => l > 0);
        results.latencyMs = latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;

        if (results.latencyMs > 250) {
            if (results.status !== 'CRITICAL') results.status = 'WARNING';
            results.warnings.push(`Latence DNS élevée (${results.latencyMs}ms). Risque de ralentissement applicatif.`);
            results.recommendations.push('Envisagez l\'activation d\'un résolveur local en cache ou Cloudflare Gateway (1.1.1.1).');
        }

        if (results.systemServers.some(ip => ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.'))) {
            results.recommendations.push('Le DNS système utilise la passerelle locale (Box/Routeur). Pour un réseau d\'entreprise, préférez un serveur DNS d\'entreprise dédié ou sécurisé (DNS-over-HTTPS).');
        }

        results.durationMs = Date.now() - startTime;
        return results;
    }

    /**
     * Teste un serveur DNS spécifique
     */
    static async testServer(serverIp) {
        const resolver = new Resolver();
        try {
            resolver.setServers([serverIp]);
        } catch (_) {
            return { server: serverIp, reachable: false, avgLatencyMs: -1, hijackDetected: false };
        }

        let totalLat = 0;
        let successfulTests = 0;
        let hijackFound = false;
        const details = [];

        for (const canary of this.CANARIES) {
            const t0 = Date.now();
            try {
                // Timeout de 2.5s par requête
                const lookupPromise = resolver.resolve4(canary.domain);
                const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2500));
                
                const addresses = await Promise.race([lookupPromise, timeoutPromise]);
                const elapsed = Date.now() - t0;
                totalLat += elapsed;
                successfulTests++;

                let matched = false;
                if (canary.expectedExact) {
                    matched = addresses.some(ip => canary.expectedExact.includes(ip));
                } else if (canary.expectedAny) {
                    matched = addresses.some(ip => canary.expectedAny.some(prefix => ip.startsWith(prefix)));
                }

                // Détection de redirection vers des IP privées (technique de portail captif ou piratage DNS)
                const isPrivateIp = addresses.some(ip => 
                    ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('127.') || ip.startsWith('0.0.0.0')
                );

                if (!matched && isPrivateIp) {
                    hijackFound = true;
                }

                details.push({ domain: canary.domain, addresses, latencyMs: elapsed, verified: matched });
            } catch (err) {
                details.push({ domain: canary.domain, error: err.message, verified: false });
            }
        }

        return {
            server: serverIp,
            reachable: successfulTests > 0,
            avgLatencyMs: successfulTests > 0 ? Math.round(totalLat / successfulTests) : -1,
            hijackDetected: hijackFound,
            details
        };
    }
}

module.exports = DnsGuard;
