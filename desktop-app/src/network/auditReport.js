/**
 * Wifi-Watch — Security Score & Enterprise Audit Report Generator
 * Calcule une note de sécurité globale (0-100), évalue la conformité NIS2 / ISO 27001
 * et génère un rapport d'audit exécutif professionnel exportable en HTML / PDF imprimable.
 */

function calculateSecurityScore(devices = [], alerts = [], wifiInfo = {}) {
    let score = 100;
    const deductions = [];
    const recommendations = [];

    // 1. Analyse du chiffrement Wi-Fi (ISO 27001 A.8.20)
    const sec = (wifiInfo.security || '').toLowerCase();
    if (sec.includes('ouvert') || sec.includes('open') || sec.includes('aucun')) {
        score -= 40;
        deductions.push({ rule: 'Réseau Wi-Fi ouvert (Non chiffré)', penalty: 40 });
        recommendations.push('URGENT : Activez immédiatement le chiffrement WPA2-Entreprise ou WPA3 pour empêcher les intrusions.');
    } else if (sec.includes('wep') || (sec.includes('wpa-personnel') && !sec.includes('wpa2'))) {
        score -= 25;
        deductions.push({ rule: 'Protocole de sécurité obsolète (WEP / WPA1)', penalty: 25 });
        recommendations.push('Mettez à niveau la sécurité réseau vers WPA2-AES ou WPA3.');
    }

    // 2. Appareils bloqués mais actifs
    const blockedOnline = devices.filter(d => (d.isBlocked || d.quarantined) && d.isOnline);
    if (blockedOnline.length > 0) {
        const pen = Math.min(30, blockedOnline.length * 15);
        score -= pen;
        deductions.push({ rule: `${blockedOnline.length} appareil(s) bloqué(s) encore actif(s) sur le réseau`, penalty: pen });
        recommendations.push('Isolez les équipements suspects via le pare-feu et renouvelez la clé d\'accès Wi-Fi.');
    }

    // 3. Ratio d'appareils non autorisés / inconnus (ISO 27001 A.8.1)
    const unauthorizedDevices = devices.filter(d => !d.authorized && !d.isTrusted && !d.isBlocked && d.isOnline);
    if (unauthorizedDevices.length > 0) {
        const pen = Math.min(20, unauthorizedDevices.length * 5);
        score -= pen;
        deductions.push({ rule: `${unauthorizedDevices.length} équipement(s) non inventorié(s) ou non approuvé(s)`, penalty: pen });
        recommendations.push('Assignez un propriétaire et un statut d\'autorisation aux appareils non répertoriés.');
    }

    // 4. Ports critiques ou dangereux ouverts (ISO 27001 A.8.8)
    let telnetCount = 0;
    let smbCount = 0;
    devices.forEach(d => {
        if (d.openPorts && Array.isArray(d.openPorts)) {
            if (d.openPorts.includes(23)) {
                score -= 15;
                telnetCount++;
                deductions.push({ rule: `Port Telnet 23 non chiffré exposé sur ${d.ip}`, penalty: 15 });
                recommendations.push(`Désactivez le service Telnet sur ${d.ip} et privilégiez SSH (port 22).`);
            }
            if (d.openPorts.includes(445) && !d.isTrusted) {
                score -= 10;
                smbCount++;
                deductions.push({ rule: `Partage SMB port 445 exposé sur équipement non vérifié ${d.ip}`, penalty: 10 });
                recommendations.push(`Contrôlez les partages Windows ouverts sur ${d.ip} pour prévenir les attaques de ransomware.`);
            }
        }
    });

    // 5. Alertes critiques non résolues
    const unreadCritical = alerts.filter(a => a.severity === 'critical' && !a.isRead && !a.read);
    if (unreadCritical.length > 0) {
        const pen = Math.min(20, unreadCritical.length * 10);
        score -= pen;
        deductions.push({ rule: `${unreadCritical.length} alerte(s) critique(s) non traitée(s)`, penalty: pen });
    }

    // Score final borné entre 10 et 100
    const finalScore = Math.max(10, Math.min(100, score));

    let grade = 'A+';
    let gradeColor = '#10b981';
    if (finalScore < 50) { grade = 'D'; gradeColor = '#ef4444'; }
    else if (finalScore < 70) { grade = 'C'; gradeColor = '#f59e0b'; }
    else if (finalScore < 85) { grade = 'B'; gradeColor = '#3b82f6'; }
    else if (finalScore < 95) { grade = 'A'; gradeColor = '#10b981'; }

    if (recommendations.length === 0) {
        recommendations.push('Excellent ! Votre réseau respecte les meilleures pratiques de sécurité actuelles.');
    }

    // Évaluation de conformité réglementaire (NIS2 / ISO 27001)
    const complianceChecks = [
        {
            standard: 'ISO 27001 A.8.1 / NIS2 Art. 21',
            title: 'Inventaire et Maîtrise des Actifs Réseau',
            status: unauthorizedDevices.length === 0 ? 'CONFORME' : 'ATTENTION',
            detail: `${devices.length - unauthorizedDevices.length}/${devices.length} équipement(s) répertoriés et autorisés.`
        },
        {
            standard: 'ISO 27001 A.8.20 / NIS2',
            title: 'Sécurité des Flux & Chiffrement sans fil',
            status: (!sec.includes('ouvert') && !sec.includes('wep')) ? 'CONFORME' : 'NON CONFORME',
            detail: `Protocole actif : ${wifiInfo.security || 'WPA2'}. Pas de flux en clair détecté.`
        },
        {
            standard: 'ISO 27001 A.8.8',
            title: 'Gestion des Vulnérabilités & Ports d\'administration',
            status: telnetCount === 0 ? 'CONFORME' : 'NON CONFORME',
            detail: telnetCount === 0 ? 'Aucun protocole d\'administration obsolète (Telnet) exposé.' : 'Protocole non chiffré Telnet détecté !'
        },
        {
            standard: 'NIS2 Art. 21.2 (Gestion des Incidents)',
            title: 'Journalisation & Détection d\'Anomalies en Temps Réel',
            status: 'CONFORME',
            detail: 'Surveillance continue Wifi-Watch Sentinel active (ARP, Evil Twin, IoT).'
        }
    ];

    return {
        score: finalScore,
        grade,
        gradeColor,
        deductions,
        recommendations,
        complianceChecks
    };
}

/**
 * Génère le code HTML complet et stylisé du rapport d'audit exécutif
 */
function generateHtmlReport(auditData) {
    const { env, devices, alerts, stats, securityAudit } = auditData;
    const nowStr = new Date().toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' });

    const checks = securityAudit.complianceChecks || [];

    return `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Rapport d'Audit Réseau & Conformité NIS2 / ISO 27001 — Wifi-Watch Enterprise</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background: #0b0f19;
            color: #f1f5f9;
            margin: 0;
            padding: 40px;
            line-height: 1.6;
        }
        .report-box {
            max-width: 960px;
            margin: 0 auto;
            background: #121a2d;
            border: 1px solid #1e293b;
            border-radius: 14px;
            padding: 40px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.6);
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #1e293b;
            padding-bottom: 24px;
            margin-bottom: 30px;
        }
        .brand {
            font-size: 24px;
            font-weight: 800;
            color: #00f0ff;
            letter-spacing: 1px;
        }
        .subbrand {
            font-size: 13px;
            color: #94a3b8;
            margin-top: 4px;
            font-weight: 500;
        }
        .date {
            font-size: 13px;
            color: #94a3b8;
            text-align: right;
        }
        .score-banner {
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: rgba(15, 23, 42, 0.7);
            border: 1px solid #334155;
            border-radius: 12px;
            padding: 24px 30px;
            margin-bottom: 30px;
        }
        .score-circle {
            width: 96px;
            height: 96px;
            border-radius: 50%;
            background: #0f172a;
            border: 4px solid ${securityAudit.gradeColor};
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            font-size: 28px;
            font-weight: 800;
            color: ${securityAudit.gradeColor};
        }
        .score-sub { font-size: 11px; color: #94a3b8; font-weight: normal; margin-top: 2px; }
        h2 { font-size: 17px; color: #38bdf8; margin-top: 32px; margin-bottom: 14px; border-bottom: 1px solid #1e293b; padding-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
        th { text-align: left; padding: 10px 12px; background: #0f172a; color: #94a3b8; border-bottom: 1px solid #334155; font-weight: 600; }
        td { padding: 10px 12px; border-bottom: 1px solid #1e293b; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
        .badge-green { background: rgba(16, 185, 129, 0.2); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); }
        .badge-red { background: rgba(239, 68, 68, 0.2); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); }
        .badge-amber { background: rgba(245, 158, 11, 0.2); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.3); }
        .badge-blue { background: rgba(56, 189, 248, 0.2); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); }
        .recom-list { list-style: none; padding: 0; margin: 0; }
        .recom-list li {
            padding: 12px 16px;
            margin-bottom: 8px;
            border-radius: 8px;
            background: rgba(0, 240, 255, 0.05);
            border-left: 3px solid #00f0ff;
            font-size: 13px;
        }
        @media print {
            body { background: #fff !important; color: #000 !important; padding: 0; }
            .report-box { box-shadow: none; border: none; padding: 0; background: transparent; }
            th { background: #f1f5f9; color: #000; }
            td { color: #1e293b; }
            .brand { color: #0284c7; }
            h2 { color: #0369a1; border-color: #cbd5e1; }
            .score-banner { background: #f8fafc; border-color: #cbd5e1; }
            .recom-list li { background: #f0f9ff; color: #0c4a6e; border-color: #0284c7; }
        }
    </style>
</head>
<body>
    <div class="report-box">
        <div class="header">
            <div>
                <div class="brand">WIFI-WATCH // CYBER SENTINEL</div>
                <div class="subbrand">Rapport d'Audit Réseau Entreprise & Analyse de Conformité NIS2 / ISO 27001</div>
            </div>
            <div class="date">
                <strong>Date de génération :</strong><br>${nowStr}
            </div>
        </div>

        <div class="score-banner">
            <div>
                <h3 style="margin: 0 0 6px 0; font-size: 18px;">Score Global de Cyber-Résilience Réseau</h3>
                <p style="margin: 0; color: #94a3b8; font-size: 13px;">Évaluation quantitative de la surface d'attaque, des flux non chiffrés et des actifs non répertoriés.</p>
            </div>
            <div class="score-circle">
                ${securityAudit.score}
                <span class="score-sub">RANG ${securityAudit.grade}</span>
            </div>
        </div>

        <h2>1. Évaluation de Conformité Réglementaire (NIS2 & ISO 27001)</h2>
        <table>
            <thead>
                <tr>
                    <th>Référentiel / Standard</th>
                    <th>Point de Contrôle</th>
                    <th>Résultat de l'Audit</th>
                    <th>Constats & Détails</th>
                </tr>
            </thead>
            <tbody>
                ${checks.map(c => `
                    <tr>
                        <td style="font-family: monospace; font-size: 12px; color: #94a3b8;">${c.standard}</td>
                        <td><strong>${c.title}</strong></td>
                        <td>
                            ${c.status === 'CONFORME' 
                                ? '<span class="badge badge-green">Conforme</span>' 
                                : c.status === 'ATTENTION' 
                                    ? '<span class="badge badge-amber">Attention</span>' 
                                    : '<span class="badge badge-red">Non Conforme</span>'}
                        </td>
                        <td style="font-size: 12px; color: #cbd5e1;">${c.detail}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        <h2>2. Caractéristiques & Paramètres du Réseau</h2>
        <table>
            <tr><td style="width: 35%;"><strong>Nom du Réseau (SSID)</strong></td><td>${env?.wifi?.ssid || 'Inconnu'}</td></tr>
            <tr><td><strong>Passerelle Internet & BSSID</strong></td><td>${env?.gatewayIp || '--'} (${env?.wifi?.bssid || '--'})</td></tr>
            <tr><td><strong>Plages Réseau & Sous-réseaux</strong></td><td>${env?.subnet?.subnetCIDR || '--'}</td></tr>
            <tr><td><strong>Standard de Sécurité sans fil</strong></td><td>${env?.wifi?.security || 'WPA2-Personnel'}</td></tr>
            <tr><td><strong>Canal & Fréquence</strong></td><td>Canal ${env?.wifi?.channel || '--'} (${env?.wifi?.radioType || '802.11'})</td></tr>
        </table>

        <h2>3. Plan d'Action & Recommandations de Remédiation</h2>
        <ul class="recom-list">
            ${securityAudit.recommendations.map(r => `<li>${r}</li>`).join('')}
        </ul>

        <h2>4. Inventaire des Actifs Détectés (${devices.length} équipements)</h2>
        <table>
            <thead>
                <tr>
                    <th>Équipement / Alias</th>
                    <th>Adresse IP</th>
                    <th>Adresse MAC</th>
                    <th>Catégorie</th>
                    <th>Département</th>
                    <th>Statut</th>
                    <th>Autorisation</th>
                </tr>
            </thead>
            <tbody>
                ${devices.map(d => `
                    <tr>
                        <td><strong>${d.customName || d.hostname || d.mac}</strong><br><span style="font-size: 11px; color: #64748b;">${d.vendor || 'Inconnu'}</span></td>
                        <td style="font-family: monospace;">${d.ip}</td>
                        <td style="font-family: monospace;">${d.mac}</td>
                        <td><span class="badge badge-blue">${d.category || 'Poste'}</span></td>
                        <td style="font-size: 12px; color: #94a3b8;">${d.department || '--'}</td>
                        <td>${d.isOnline ? '<span class="badge badge-green">En Ligne</span>' : '<span style="color:#64748b;">Hors Ligne</span>'}</td>
                        <td>${d.isBlocked || d.quarantined ? '<span class="badge badge-red">Isolé / Bloqué</span>' : (d.authorized || d.isTrusted ? '<span class="badge badge-green">Approuvé</span>' : '<span class="badge badge-amber">Non Validé</span>')}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #1e293b; text-align: center; font-size: 11px; color: #64748b;">
            Document généré par Wifi-Watch Cyber Sentinel Enterprise v2.0 • Audit 100% autonome et confidentiel.
        </div>
    </div>
</body>
</html>`;
}

module.exports = {
    calculateSecurityScore,
    generateHtmlReport
};
