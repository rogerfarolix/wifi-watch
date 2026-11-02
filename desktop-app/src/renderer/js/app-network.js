/**
 * Wifi-Watch — Renderer : Speedtest, analyseur Wi-Fi, audit, scanner de ports, DNS Guard et DHCP
 * (module issu du découpage d'app.js ; scripts classiques, portée globale partagée)
 */

// ─── Speedtest Intégré & Benchmark SLA ──────────────────────────────────────
function initSpeedTestEvents() {
    const btn = document.getElementById('btn-run-speedtest');
    btn?.addEventListener('click', async () => {
        if (appState.isSpeedTesting) return;
        appState.isSpeedTesting = true;

        btn.disabled = true;
        document.getElementById('btn-run-speedtest-text').innerText = 'Test en cours...';
        const dial = document.getElementById('speedtest-dial');
        if (dial) dial.classList.add('running');

        try {
            const results = await window.api.runSpeedTest();

            document.getElementById('st-main-val').innerText = results.downloadMbps.toFixed(1);
            document.getElementById('st-main-unit').innerText = 'Mbps (Download)';
            document.getElementById('st-phase-label').innerText = 'Test Réussi !';

            document.getElementById('st-kpi-down').innerHTML = `${results.downloadMbps} <span style="font-size:12px;color:var(--text-muted);">Mbps</span>`;
            document.getElementById('st-kpi-up').innerHTML = `${results.uploadMbps} <span style="font-size:12px;color:var(--text-muted);">Mbps</span>`;
            document.getElementById('st-kpi-ping').innerHTML = `${results.pingMs} <span style="font-size:12px;color:var(--text-muted);">ms</span>`;
            document.getElementById('st-kpi-jitter').innerHTML = `${results.jitterMs} <span style="font-size:12px;color:var(--text-muted);">ms</span>`;
        } catch (err) {
            window.showToast('Erreur lors du Speedtest : ' + err, 'danger');
        } finally {
            appState.isSpeedTesting = false;
            btn.disabled = false;
            document.getElementById('btn-run-speedtest-text').innerText = 'Relancer le Test';
            if (dial) dial.classList.remove('running');
        }
    });

    const btnBench = document.getElementById('btn-run-benchmark');
    btnBench?.addEventListener('click', async () => {
        btnBench.disabled = true;
        const btnTxt = document.getElementById('btn-benchmark-text');
        if (btnTxt) btnTxt.innerText = 'Évaluation SLA en cours...';

        try {
            const target = appState.environment?.gatewayIp || '1.1.1.1';
            const bench = await window.api.runBenchmark(target);

            const gradeBadge = document.getElementById('sla-grade-badge');
            if (gradeBadge) {
                gradeBadge.innerText = bench.grade;
                const colors = {
                    'A+': 'var(--accent-green)',
                    'A': 'var(--accent-green)',
                    'B': 'var(--accent-cyan)',
                    'C': 'var(--accent-amber)',
                    'F': 'var(--accent-red)'
                };
                gradeBadge.style.color = colors[bench.grade] || 'var(--accent-green)';
            }

            const gradeLabel = document.getElementById('sla-grade-label');
            if (gradeLabel) gradeLabel.innerText = bench.rating;

            const dnsEl = document.getElementById('sla-dns-latency');
            if (dnsEl) dnsEl.innerText = `${bench.dnsLatencyMs} ms`;

            const httpEl = document.getElementById('sla-http-latency');
            if (httpEl) httpEl.innerText = `${bench.httpLatencyMs} ms`;

            const lossEl = document.getElementById('sla-packet-loss');
            if (lossEl) lossEl.innerText = `${bench.ping.packetLoss}%`;

            const jitterEl = document.getElementById('sla-jitter-val');
            if (jitterEl) jitterEl.innerText = `${bench.ping.jitterMs} ms`;

            const descEl = document.getElementById('sla-benchmark-desc');
            if (descEl) {
                descEl.innerText = `Audit SLA validé (${new Date(bench.timestamp).toLocaleTimeString()}) — Cible testée : ${target} (Min: ${bench.ping.minMs}ms, Moy: ${bench.ping.avgMs}ms, Max: ${bench.ping.maxMs}ms)`;
            }
        } catch (err) {
            console.error('Erreur benchmark:', err);
        } finally {
            btnBench.disabled = false;
            if (btnTxt) btnTxt.innerText = 'Relancer Benchmark SLA';
        }
    });
}

// ─── Analyseur Wi-Fi & Canaux ───────────────────────────────────────────────
function initChannelAnalyzerEvents() {
    document.getElementById('btn-refresh-channels')?.addEventListener('click', () => {
        refreshChannelsView();
    });
}

async function refreshChannelsView() {
    try {
        const data = await window.api.scanChannels();
        const { accessPoints, channelStats, evilTwinDetected } = data;

        // Bannière recommandation
        document.getElementById('chan-best-title').innerText = `Canal 2.4 GHz Optimal Recommandé : Canal ${channelStats.recommendedChannel24}`;
        document.getElementById('chan-best-desc').innerText = `Basé sur l'analyse de ${channelStats.totalNearbyAps} point(s) d'accès visible(s) dans votre environnement.`;

        // Alerte Evil Twin
        const evilCard = document.getElementById('evil-twin-alert-card');
        const evilDesc = document.getElementById('evil-twin-desc');
        if (evilTwinDetected) {
            evilCard.style.display = 'block';
            evilDesc.innerText = `Attention : Un faux réseau «${evilTwinDetected.ssid}» utilise la MAC pirate ${evilTwinDetected.rogueBssid} sur le canal ${evilTwinDetected.channel}.`;
        } else {
            evilCard.style.display = 'none';
        }

        // Barres de congestion des canaux 2.4 GHz
        const barContainer = document.getElementById('channels-bar-container');
        if (barContainer) {
            const ch24 = channelStats.channels24 || {};
            const maxVal = Math.max(1, ...Object.values(ch24));

            barContainer.innerHTML = Object.entries(ch24).map(([ch, count]) => {
                const pct = Math.min(100, Math.round((count / maxVal) * 100));
                const isOptimal = (parseInt(ch, 10) === channelStats.recommendedChannel24);
                return `
                    <div class="channel-bar-item">
                        <span class="channel-num">Canal ${ch} ${isOptimal ? '★' : ''}</span>
                        <div class="channel-track">
                            <div class="channel-fill ${pct > 70 ? 'high' : ''}" style="width: ${count === 0 ? 0 : Math.max(4, pct)}%;"></div>
                        </div>
                        <span style="font-size: 11px; width: 60px; color: ${isOptimal ? 'var(--accent-green)' : 'var(--text-muted)'}; font-weight: ${isOptimal ? 'bold' : 'normal'};">
                            ${count} AP(s)
                        </span>
                    </div>
                `;
            }).join('');
        }

        // Table des réseaux voisins
        const tbody = document.getElementById('neighbor-networks-tbody');
        if (tbody) {
            if (accessPoints.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 20px;">Aucun réseau Wi-Fi voisin détecté.</td></tr>`;
            } else {
                tbody.innerHTML = accessPoints.map(ap => `
                    <tr style="${ap.isCurrent ? 'background: rgba(0, 240, 255, 0.05); font-weight: bold;' : ''}">
                        <td>${escapeHtml(ap.ssid)} ${ap.isCurrent ? '<span class="badge badge-online">Votre Box</span>' : ''}</td>
                        <td style="font-family: monospace;">${ap.bssid}</td>
                        <td>${ap.signal}%</td>
                        <td>${ap.channel}</td>
                        <td>${ap.band}</td>
                        <td>${escapeHtml(ap.security)}</td>
                    </tr>
                `).join('');
            }
        }
    } catch (err) {
        console.error('Erreur scan canaux:', err);
    }
}

// ─── Score de Sécurité & Rapport d'Audit ─────────────────────────────────────
function initAuditEvents() {
    document.getElementById('btn-export-audit-report')?.addEventListener('click', async () => {
        try {
            const html = await window.api.generateAuditReport();
            const blob = new Blob([html], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `audit-securite-wifi-watch-${new Date().toISOString().slice(0, 10)}.html`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            window.showToast('Erreur lors de la génération du rapport : ' + err, 'danger');
        }
    });
}

async function refreshAuditView() {
    try {
        const audit = await window.api.getSecurityScore();

        // Cadran Score
        const dial = document.getElementById('audit-score-dial');
        const num = document.getElementById('audit-score-num');
        const gradeTxt = document.getElementById('audit-grade-txt');

        if (num) num.innerText = audit.score;
        if (gradeTxt) gradeTxt.innerText = `GRADE ${audit.grade}`;
        if (dial) {
            dial.style.borderColor = audit.gradeColor;
            dial.style.color = audit.gradeColor;
        }

        // Déductions
        const dedList = document.getElementById('audit-deductions-list');
        if (dedList) {
            if (audit.deductions.length === 0) {
                dedList.innerHTML = `<li style="padding: 12px; background: rgba(16, 185, 129, 0.08); border-radius: 8px; color: var(--accent-green); font-size: 13px;">Aucun point faible majeur détecté. Configuration saine !</li>`;
            } else {
                dedList.innerHTML = audit.deductions.map(d => `
                    <li style="padding: 10px 14px; background: rgba(239, 68, 68, 0.08); border-radius: 8px; border-left: 3px solid var(--accent-red); font-size: 13px; display: flex; justify-content: space-between;">
                        <span>${escapeHtml(d.rule)}</span>
                        <span style="color: var(--accent-red); font-weight: bold;">-${d.penalty} pts</span>
                    </li>
                `).join('');
            }
        }

        // Recommandations
        const recList = document.getElementById('audit-recommendations-list');
        if (recList) {
            recList.innerHTML = audit.recommendations.map(r => `
                <li style="padding: 10px 14px; background: rgba(0, 240, 255, 0.05); border-radius: 8px; border-left: 3px solid var(--accent-cyan); font-size: 13px;">
                    ${escapeHtml(r)}
                </li>
            `).join('');
        }

        // Tableau de Conformité NIS2 & ISO 27001
        const compTbody = document.getElementById('audit-compliance-tbody');
        if (compTbody && audit.complianceChecks) {
            compTbody.innerHTML = audit.complianceChecks.map(c => `
                <tr>
                    <td style="font-family: monospace; font-size: 12px; color: var(--text-muted);">${escapeHtml(c.standard)}</td>
                    <td><strong>${escapeHtml(c.title)}</strong></td>
                    <td>
                        ${c.status === 'CONFORME' 
                            ? '<span class="badge badge-online">Conforme</span>' 
                            : c.status === 'ATTENTION' 
                                ? '<span class="badge" style="background: rgba(245, 158, 11, 0.2); color: var(--accent-amber);">Attention</span>' 
                                : '<span class="badge badge-blocked">Non Conforme</span>'}
                    </td>
                    <td style="font-size: 12px; color: var(--text-secondary);">${escapeHtml(c.detail)}</td>
                </tr>
            `).join('');
        }
    } catch (err) {
        console.error('Erreur audit score:', err);
    }
}

// ─── Outils : Scanner de Ports ──────────────────────────────────────────────
function initTools() {
    const deviceSelect = document.getElementById('tools-device-select');
    deviceSelect?.addEventListener('change', (e) => {
        if (e.target.value) {
            document.getElementById('tools-target-ip').value = e.target.value;
        }
    });

    const btnScan = document.getElementById('btn-launch-port-scan');
    btnScan?.addEventListener('click', async () => {
        const ip = document.getElementById('tools-target-ip').value.trim();
        if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(ip) || ip.split('.').some(o => Number(o) > 255)) {
            window.showToast('Veuillez saisir ou choisir une adresse IPv4 valide (ex. 192.168.1.254).', 'warning');
            return;
        }

        btnScan.disabled = true;
        btnScan.innerHTML = `<i data-lucide="loader-2" class="spin"></i> Scan en cours...`;
        if (window.lucide) window.lucide.createIcons();

        try {
            const ports = await window.api.scanPorts(ip);

            const resultsCard = document.getElementById('tools-port-results-card');
            const resultsTbody = document.getElementById('tools-port-results-tbody');
            const badge = document.getElementById('tools-port-count-badge');

            resultsCard.style.display = 'block';
            badge.innerText = `${ports.length} port(s) ouvert(s)`;

            if (ports.length === 0) {
                resultsTbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--accent-green); padding: 20px;">Aucun port vulnérable courant ouvert détecté sur ${escapeHtml(ip)}.</td></tr>`;
            } else {
                resultsTbody.innerHTML = ports.map(p => `
                    <tr>
                        <td><span class="detail-val" style="font-weight: bold; font-size: 13px;">${p.port}</span></td>
                        <td><span style="font-weight: 600;">${escapeHtml(p.service)}</span></td>
                        <td>
                            <span class="badge ${p.risk === 'CRITICAL' || p.risk === 'HIGH' ? 'badge-blocked' : (p.risk === 'MEDIUM' ? 'badge-unknown' : 'badge-trusted')}">
                                ${escapeHtml(p.risk)}
                            </span>
                        </td>
                        <td style="color: var(--text-secondary);">${escapeHtml(p.description)}</td>
                        <td><span class="badge badge-online">Ouvert</span></td>
                    </tr>
                `).join('');
            }
        } catch (err) {
            window.showToast('Erreur lors du scan de ports : ' + err, 'danger');
        } finally {
            btnScan.disabled = false;
            btnScan.innerHTML = `<i data-lucide="shield-alert"></i> <span>Lancer l'Audit</span>`;
            if (window.lucide) window.lucide.createIcons();
        }
    });
}

// ─── DNS Guard & SLA Events ─────────────────────────────────────────────────
function initDnsGuardEvents() {
    const btnAudit = document.getElementById('btn-run-dns-audit');
    btnAudit?.addEventListener('click', async () => {
        btnAudit.disabled = true;
        btnAudit.innerHTML = `<i data-lucide="loader-2" class="spin"></i> Audit en cours...`;
        if (window.lucide) window.lucide.createIcons();

        try {
            const report = await window.api.auditDns();

            const latEl = document.getElementById('dns-kpi-latency');
            const latSubEl = document.getElementById('dns-kpi-latency-sub');
            const integEl = document.getElementById('dns-kpi-integrity');
            const integIcon = document.getElementById('dns-kpi-integrity-icon');
            const countEl = document.getElementById('dns-kpi-servers-count');

            if (latEl) latEl.innerHTML = `${report.latencyMs || '--'} <span style="font-size: 14px; font-weight: normal; color: var(--text-muted);">ms</span>`;
            if (latSubEl) latSubEl.innerText = report.latencyMs < 100 ? 'Excellent SLA (< 100ms)' : (report.latencyMs < 250 ? 'SLA Conforme' : 'SLA Dégradé (> 250ms)');

            if (integEl) {
                if (report.hijackDetected) {
                    integEl.innerText = 'Détournement !';
                    integEl.style.color = 'var(--accent-red)';
                    if (integIcon) integIcon.className = 'kpi-icon red';
                } else {
                    integEl.innerText = 'Intègre (Vérifié)';
                    integEl.style.color = 'var(--accent-green)';
                    if (integIcon) integIcon.className = 'kpi-icon green';
                }
            }
            if (countEl) countEl.innerText = (report.testedServers || []).length;

            const tbody = document.getElementById('dns-servers-tbody');
            if (tbody) {
                tbody.innerHTML = (report.testedServers || []).map(s => {
                    const isSystem = (report.systemServers || []).includes(s.server);
                    const isCloudflare = s.server === '1.1.1.1';
                    const isGoogle = s.server === '8.8.8.8';
                    const provider = isSystem ? 'Passerelle / DNS Système' : (isCloudflare ? 'Cloudflare CDN Edge' : (isGoogle ? 'Google Public DNS' : 'Serveur Personnalisé'));

                    return `
                        <tr>
                            <td><strong style="font-family: monospace;">${s.server}</strong></td>
                            <td><span style="font-size: 12px; color: var(--text-secondary);">${provider}</span></td>
                            <td>${s.reachable ? '<span class="badge badge-online">Disponible</span>' : '<span class="badge badge-blocked">Injoignable</span>'}</td>
                            <td><span style="font-family: monospace; font-weight: 600; color: ${s.avgLatencyMs < 80 ? 'var(--accent-green)' : (s.avgLatencyMs < 200 ? 'var(--accent-cyan)' : 'var(--accent-amber)')};">${s.avgLatencyMs > 0 ? s.avgLatencyMs + ' ms' : '--'}</span></td>
                            <td>${s.hijackDetected ? '<span class="badge badge-blocked">Hijack Détecté</span>' : '<span class="badge badge-online">Vérifié (Conforme)</span>'}</td>
                        </tr>
                    `;
                }).join('');
            }

            const recoCard = document.getElementById('dns-recommendations-card');
            const recoList = document.getElementById('dns-recommendations-list');
            if (recoCard && recoList) {
                const items = [...(report.warnings || []), ...(report.recommendations || [])];
                if (items.length > 0) {
                    recoCard.style.display = 'block';
                    recoList.innerHTML = items.map(w => `<li>• ${escapeHtml(w)}</li>`).join('');
                } else {
                    recoCard.style.display = 'none';
                }
            }
        } catch (err) {
            window.showToast('Erreur audit DNS : ' + err, 'danger');
        } finally {
            btnAudit.disabled = false;
            btnAudit.innerHTML = `<i data-lucide="shield-check"></i> <span data-i18n="dns.btn_audit">Tester l'Infrastructure DNS</span>`;
            if (window.lucide) window.lucide.createIcons();
        }
    });
}

// ─── Audit Serveurs DHCP & Passerelles ───────────────────────────────────────
function initDhcpEvents() {
    const btn = document.getElementById('btn-run-dhcp-audit');
    btn?.addEventListener('click', async () => {
        btn.disabled = true;
        btn.innerHTML = `<i data-lucide="loader-2" class="spin"></i> Audit en cours...`;
        if (window.lucide) window.lucide.createIcons();

        try {
            const report = await window.api.auditDhcp();
            document.getElementById('dhcp-val-server').innerText = (report.dhcpServers || []).join(', ') || 'Auto (Passerelle)';
            document.getElementById('dhcp-val-gateway').innerText = (report.gateways || []).join(', ') || '--';

            const statusEl = document.getElementById('dhcp-val-status');
            const detailsEl = document.getElementById('dhcp-val-details');

            if (report.isRogueDetected || report.status === 'CRITICAL') {
                statusEl.innerText = 'DANGER ROGUE';
                statusEl.style.color = 'var(--accent-red)';
                detailsEl.innerText = report.message;
                detailsEl.style.color = 'var(--accent-red)';
            } else {
                statusEl.innerText = 'Sécurisé';
                statusEl.style.color = 'var(--accent-green)';
                detailsEl.innerText = report.message;
                detailsEl.style.color = 'var(--text-muted)';
            }
        } catch (err) {
            window.showToast('Erreur audit DHCP: ' + err, 'danger');
        } finally {
            btn.disabled = false;
            btn.innerHTML = `<i data-lucide="refresh-cw"></i> <span>Auditer DHCP</span>`;
            if (window.lucide) window.lucide.createIcons();
        }
    });
}


