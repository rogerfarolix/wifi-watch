/**
 * Wifi-Watch — Enterprise Webhook Dispatcher
 * Envoi d'alertes en temps réel vers Slack, Discord, Microsoft Teams, Telegram ou Webhook HTTP générique.
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

class WebhookDispatcher {
    /**
     * Envoie une alerte vers l'endpoint configuré
     * @param {Object} config - Configuration webhook (url, type, enabled, minSeverity)
     * @param {Object} alert - Données de l'alerte
     * @returns {Promise<{success: boolean, message?: string}>}
     */
    static async dispatch(config, alert) {
        if (!config || !config.enabled || !config.url) {
            return { success: false, message: 'Webhook non configuré ou désactivé' };
        }

        // Vérification du seuil de sévérité
        const severityRank = { info: 1, warning: 2, critical: 3 };
        const minRank = severityRank[config.minSeverity || 'warning'] || 2;
        const alertRank = severityRank[alert.severity || 'info'] || 1;

        if (alertRank < minRank) {
            return { success: false, message: 'Sévérité inférieure au seuil configuré' };
        }

        const payload = this.formatPayload(config.type || 'generic', alert);
        return this.sendHttpRequest(config.url, payload);
    }

    /**
     * Teste la connexion du webhook avec un message de bienvenue
     */
    static async test(config) {
        if (!config || !config.url) {
            return { success: false, message: 'URL webhook manquante' };
        }

        const testAlert = {
            id: 'test-' + Date.now(),
            type: 'ENTERPRISE_WEBHOOK_TEST',
            title: '✅ Wifi-Watch Enterprise — Test de Notification Réussi',
            description: 'Ce message confirme que les alertes de sécurité réseau sont correctement acheminées vers ce canal.',
            severity: 'info',
            timestamp: new Date().toISOString(),
            metadata: {
                platform: 'Wifi-Watch Enterprise Sentinel v2.0',
                host: process.env.COMPUTERNAME || 'Hôte Windows',
                status: 'Opérationnel'
            }
        };

        const payload = this.formatPayload(config.type || 'generic', testAlert);
        return this.sendHttpRequest(config.url, payload);
    }

    /**
     * Formate le payload selon la plateforme cible
     */
    static formatPayload(type, alert) {
        const severityEmoji = alert.severity === 'critical' ? '🚨' : alert.severity === 'warning' ? '⚠️' : 'ℹ️';
        const colorHex = alert.severity === 'critical' ? 0xff0055 : alert.severity === 'warning' ? 0xffaa00 : 0x00d4ff;
        const colorStr = alert.severity === 'critical' ? '#ff0055' : alert.severity === 'warning' ? '#ffaa00' : '#00d4ff';

        switch (type.toLowerCase()) {
            case 'slack':
                return {
                    text: `${severityEmoji} *[Wifi-Watch Sentinel]* ${alert.title}`,
                    attachments: [
                        {
                            color: colorStr,
                            blocks: [
                                {
                                    type: 'section',
                                    text: {
                                        type: 'mrkdwn',
                                        text: `*${alert.title}*\n${alert.description}`
                                    }
                                },
                                {
                                    type: 'context',
                                    elements: [
                                        {
                                            type: 'mrkdwn',
                                            text: `*Sévérité:* ${alert.severity.toUpperCase()} | *Date:* ${new Date(alert.timestamp || Date.now()).toLocaleString('fr-FR')}`
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                };

            case 'discord':
                return {
                    username: 'Wifi-Watch Sentinel',
                    avatar_url: 'https://raw.githubusercontent.com/nealix/wifi-watch/main/desktop-app/src/renderer/assets/icon.png',
                    embeds: [
                        {
                            title: `${severityEmoji} ${alert.title}`,
                            description: alert.description,
                            color: colorHex,
                            timestamp: new Date(alert.timestamp || Date.now()).toISOString(),
                            fields: [
                                { name: 'Sévérité', value: alert.severity.toUpperCase(), inline: true },
                                { name: 'Type Anomaly', value: alert.type || 'GENERIC', inline: true }
                            ],
                            footer: {
                                text: 'Wifi-Watch // Cyber Sentinel Enterprise'
                            }
                        }
                    ]
                };

            case 'teams':
                return {
                    '@type': 'MessageCard',
                    '@context': 'http://schema.org/extensions',
                    themeColor: colorStr.replace('#', ''),
                    summary: alert.title,
                    title: `${severityEmoji} Wifi-Watch : ${alert.title}`,
                    sections: [
                        {
                            activityTitle: 'Alerte Cyber-Sécurité Réseau',
                            activitySubtitle: new Date(alert.timestamp || Date.now()).toLocaleString('fr-FR'),
                            text: alert.description,
                            facts: [
                                { name: 'Sévérité', value: alert.severity.toUpperCase() },
                                { name: 'Type', value: alert.type || 'Alerte Réseau' }
                            ]
                        }
                    ]
                };

            case 'generic':
            default:
                return {
                    source: 'Wifi-Watch Desktop Enterprise',
                    timestamp: new Date().toISOString(),
                    event: 'SECURITY_ALERT',
                    alert: {
                        id: alert.id,
                        title: alert.title,
                        description: alert.description,
                        severity: alert.severity,
                        type: alert.type,
                        timestamp: alert.timestamp,
                        metadata: alert.metadata || {}
                    }
                };
        }
    }

    /**
     * Envoie la requête HTTP/HTTPS POST
     */
    static sendHttpRequest(targetUrl, payloadObj) {
        return new Promise((resolve) => {
            try {
                const parsedUrl = new URL(targetUrl);
                const isHttps = parsedUrl.protocol === 'https:';
                const client = isHttps ? https : http;

                const payloadData = JSON.stringify(payloadObj);

                const options = {
                    hostname: parsedUrl.hostname,
                    port: parsedUrl.port || (isHttps ? 443 : 80),
                    path: parsedUrl.pathname + parsedUrl.search,
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(payloadData),
                        'User-Agent': 'Wifi-Watch-Enterprise-Sentinel/2.0'
                    },
                    timeout: 8000
                };

                const req = client.request(options, (res) => {
                    let body = '';
                    res.on('data', chunk => body += chunk);
                    res.on('end', () => {
                        if (res.statusCode >= 200 && res.statusCode < 300) {
                            resolve({ success: true, statusCode: res.statusCode });
                        } else {
                            resolve({
                                success: false,
                                statusCode: res.statusCode,
                                message: `Erreur HTTP ${res.statusCode}: ${body.slice(0, 100)}`
                            });
                        }
                    });
                });

                req.on('error', (err) => {
                    resolve({ success: false, message: err.message });
                });

                req.on('timeout', () => {
                    req.destroy();
                    resolve({ success: false, message: 'Délai d\'attente dépassé (timeout 8s)' });
                });

                req.write(payloadData);
                req.end();
            } catch (err) {
                resolve({ success: false, message: err.message });
            }
        });
    }
}

module.exports = WebhookDispatcher;
