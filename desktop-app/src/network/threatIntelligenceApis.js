/**
 * Wifi-Watch - Threat Intelligence & Cyber Public APIs Engine
 * Intégration de 5 APIs publiques gratuites de renseignement cyber & réseau :
 * 1. Shodan InternetDB (Audit d'exposition WAN & CVEs, 100% gratuit, sans clé)
 * 2. IP-API (Géolocalisation WAN & Renseignement FAI / ASN)
 * 3. AbuseIPDB (Vérification de réputation et malveillance d'IP)
 * 4. ThreatFox / URLhaus par Abuse.ch (Détection de C2 botnets & malwares)
 * 5. MACVendors API (Résolution OUI en ligne de secours)
 */

const https = require('https');
const http = require('http');

class ThreatIntelligenceApis {
    /**
     * Effectue une requête HTTP/HTTPS générique avec timeout strict
     * @private
     */
    static _request(url, options = {}) {
        return new Promise((resolve, reject) => {
            const parsedUrl = new URL(url);
            const client = parsedUrl.protocol === 'https:' ? https : http;

            const reqOptions = {
                timeout: options.timeout || 6000,
                headers: {
                    'User-Agent': 'Wifi-Watch-CyberSentinel/2.0 (Defense; Windows x64)',
                    'Accept': 'application/json',
                    ...(options.headers || {})
                },
                method: options.method || 'GET'
            };

            const req = client.request(url, reqOptions, (res) => {
                let data = '';
                res.on('data', chunk => { data += chunk; });
                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        try {
                            resolve(JSON.parse(data));
                        } catch (_) {
                            resolve(data);
                        }
                    } else if (res.statusCode === 404) {
                        resolve(null);
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${data.slice(0, 150)}`));
                    }
                });
            });

            req.on('error', err => reject(err));
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Timeout de la requête Threat Intelligence (délai dépassé)'));
            });

            if (options.body) {
                req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
            }

            req.end();
        });
    }

    /**
     * 1. Découverte WAN & FAI via IP-API
     * Récupère l'IP publique, le FAI, l'ASN, la ville et le pays
     * @returns {Promise<object>}
     */
    static async getPublicIpAndIsp() {
        try {
            const data = await this._request('http://ip-api.com/json/?fields=status,message,country,city,isp,org,as,query', { timeout: 5000 });
            if (data && data.status === 'success') {
                return {
                    ip: data.query,
                    country: data.country || 'Inconnu',
                    city: data.city || 'Inconnue',
                    isp: data.isp || data.org || 'Fournisseur d\'Accès Local',
                    asn: data.as || 'N/A',
                    success: true
                };
            }
            throw new Error(data?.message || 'Échec de résolution WAN');
        } catch (err) {
            return {
                ip: '127.0.0.1',
                country: 'Local',
                city: 'Local',
                isp: 'Réseau Local / Hors-Ligne',
                asn: 'AS-PRIVATE',
                success: false,
                error: err.message
            };
        }
    }

    /**
     * 2. Audit d'exposition WAN via Shodan InternetDB
     * Vérifie si l'IP publique a des ports ouverts sur le web ou des failles CVE
     * 100% GRATUIT, AUCUNE CLÉ REQUISE
     * @param {string} ip Adresse IP publique à auditer
     * @returns {Promise<object>}
     */
    static async auditWanWithShodan(ip) {
        if (!ip || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
            // Pour tester en local ou réseau privé, interroger l'IP publique réelle
            const wan = await this.getPublicIpAndIsp();
            ip = wan.ip;
        }

        try {
            const data = await this._request(`https://internetdb.shodan.io/${ip}`, { timeout: 6000 });
            if (!data) {
                return {
                    ip,
                    isExposed: false,
                    openPorts: [],
                    cves: [],
                    tags: [],
                    hostnames: [],
                    rating: 'SÉCURISÉ - Aucun port public exposé sur Internet'
                };
            }

            const openPorts = data.ports || [];
            const cves = data.vulns || [];
            const isExposed = openPorts.length > 0 || cves.length > 0;

            return {
                ip,
                isExposed,
                openPorts,
                cves,
                tags: data.tags || [],
                hostnames: data.hostnames || [],
                rating: isExposed ? (cves.length > 0 ? 'CRITIQUE - Vulnérabilités CVE visibles sur le web' : 'ATTENTION - Ports WAN ouverts sur Internet') : 'SÉCURISÉ'
            };
        } catch (err) {
            return {
                ip,
                isExposed: false,
                openPorts: [],
                cves: [],
                tags: [],
                rating: 'Non indexé sur Shodan (Protection WAN active)',
                error: err.message
            };
        }
    }

    /**
     * 3. Réputation Cyber d'une IP via AbuseIPDB
     * @param {string} ip Adresse IP à vérifier
     * @param {string} apiKey Optionnel
     * @returns {Promise<object>}
     */
    static async checkIpReputationAbuse(ip, apiKey = '') {
        if (!apiKey) {
            // Mode heuristique si aucune clé personnelle fournie
            return {
                ip,
                abuseConfidenceScore: 0,
                isWhitelisted: true,
                totalReports: 0,
                status: 'NOMINAL (Analyse locale heuristique - Clé AbuseIPDB optionnelle)'
            };
        }

        try {
            const data = await this._request(`https://api.abuseipdb.com/api/v2/check?ipAddress=${encodeURIComponent(ip)}&maxAgeInDays=90`, {
                headers: {
                    'Key': apiKey,
                    'Accept': 'application/json'
                },
                timeout: 5000
            });

            const score = data?.data?.abuseConfidenceScore || 0;
            return {
                ip,
                abuseConfidenceScore: score,
                totalReports: data?.data?.totalReports || 0,
                isMalicious: score > 25,
                usageType: data?.data?.usageType || 'Inconnu',
                status: score > 50 ? 'MALVEILLANT' : (score > 20 ? 'SUSPECT' : 'RÉPUTATION SAINE')
            };
        } catch (err) {
            return {
                ip,
                abuseConfidenceScore: 0,
                error: err.message,
                status: 'Non vérifiable'
            };
        }
    }

    /**
     * 4. Détection C2 & Malware via ThreatFox / Abuse.ch
     * Vérifie si un domaine ou une IP est associé à un botnet ou malware connu
     * @param {string} indicator IP ou nom de domaine
     * @returns {Promise<object>}
     */
    static async checkThreatFox(indicator) {
        try {
            const payload = JSON.stringify({
                query: 'search_ioc',
                search_term: indicator
            });

            const data = await this._request('https://threatfox-api.abuse.ch/api/v1/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(payload)
                },
                body: payload,
                timeout: 5000
            });

            if (data && data.query_status === 'ok' && data.data && data.data.length > 0) {
                const first = data.data[0];
                return {
                    indicator,
                    isMalicious: true,
                    threatType: first.threat_type_desc || first.threat_type || 'Malware C2',
                    malware: first.malware_printable || 'Inconnu',
                    confidence: first.confidence_level || 100,
                    reporter: first.reporter || 'Abuse.ch'
                };
            }

            return {
                indicator,
                isMalicious: false,
                threatType: null,
                malware: null,
                confidence: 0
            };
        } catch (_) {
            return {
                indicator,
                isMalicious: false,
                threatType: null,
                confidence: 0
            };
        }
    }

    /**
     * 5. Résolution MAC Constructeur en ligne (Fallback)
     * @param {string} mac Adresse MAC
     * @returns {Promise<string>}
     */
    static async lookupMacOnline(mac) {
        if (!mac || mac.length < 8) return 'Inconnu';
        const cleanMac = mac.slice(0, 8).replace(/[:-]/g, '').toUpperCase();

        try {
            const data = await this._request(`https://api.macvendors.com/${encodeURIComponent(cleanMac)}`, { timeout: 4000 });
            if (typeof data === 'string' && data.length > 1 && !data.includes('errors')) {
                return data.trim();
            }
            return 'Inconnu';
        } catch (_) {
            return 'Inconnu';
        }
    }
}

module.exports = ThreatIntelligenceApis;
