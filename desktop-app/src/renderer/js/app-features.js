/**
 * Wifi-Watch — Renderer : Honeypot, Voice Sentinel, Spy Hunter, présence, portail invité, RuView et Mur SOC
 * (module issu du découpage d'app.js ; scripts classiques, portée globale partagée)
 */

// ─── Canari Cyber & Piège Anti-Ransomware (Honeypot) ────────────────────────
async function refreshHoneypotView() {
    try {
        const status = await window.api.getHoneypotStatus();
        const kpiStatus = document.getElementById('hp-kpi-status');
        const kpiPort = document.getElementById('hp-kpi-port');
        const kpiProbes = document.getElementById('hp-kpi-probes');
        const kpiAuto = document.getElementById('hp-kpi-autoblock');
        const btnToggleText = document.getElementById('btn-honeypot-text');
        const inputPort = document.getElementById('hp-input-port');
        const checkAuto = document.getElementById('hp-check-autoblock');

        if (kpiStatus) {
            kpiStatus.innerText = status.isRunning ? 'Actif (Armé)' : 'Désactivé';
            kpiStatus.style.color = status.isRunning ? 'var(--accent-green)' : 'var(--text-muted)';
        }
        if (kpiPort) kpiPort.innerText = `Port leurre : ${status.port}`;
        if (kpiProbes) kpiProbes.innerText = status.totalProbes || 0;
        if (kpiAuto) {
            kpiAuto.innerText = status.autoBlock ? 'Actif (Armé)' : 'Inactif';
            kpiAuto.style.color = status.autoBlock ? 'var(--accent-green)' : 'var(--text-muted)';
        }
        if (btnToggleText) btnToggleText.innerText = status.isRunning ? 'Désactiver le Piège' : 'Activer le Piège Canari';
        if (inputPort && !inputPort.matches(':focus')) inputPort.value = status.port;
        if (checkAuto) checkAuto.checked = !!status.autoBlock;

        const tbody = document.getElementById('hp-probes-tbody');
        if (tbody && status.recentProbes && status.recentProbes.length > 0) {
            tbody.innerHTML = status.recentProbes.map(p => `
                <tr>
                    <td style="font-family: monospace;">${new Date(p.timestamp).toLocaleTimeString()}</td>
                    <td><strong style="color: var(--accent-red); font-family: monospace;">${p.attackerIp}</strong></td>
                    <td>Port TCP ${p.targetPort}</td>
                    <td><span class="badge badge-blocked">CRITIQUE</span></td>
                    <td>${p.autoBlocked ? '<span class="badge badge-blocked">Isolé via Pare-feu</span>' : '<span class="badge badge-unknown">Alerte Notifiée</span>'}</td>
                </tr>
            `).join('');
        }
    } catch (_) {}
}

function initHoneypotEvents() {
    document.getElementById('btn-toggle-honeypot')?.addEventListener('click', async () => {
        const cur = await window.api.getHoneypotStatus();
        const port = Number(document.getElementById('hp-input-port')?.value) || 4455;
        const autoBlock = document.getElementById('hp-check-autoblock')?.checked || false;
        await window.api.toggleHoneypot(!cur.isRunning, port, autoBlock);
        await refreshHoneypotView();
    });

    document.getElementById('btn-save-honeypot-cfg')?.addEventListener('click', async () => {
        const port = Number(document.getElementById('hp-input-port')?.value) || 4455;
        const autoBlock = document.getElementById('hp-check-autoblock')?.checked || false;
        await window.api.toggleHoneypot(true, port, autoBlock);
        await refreshHoneypotView();
        window.showToast(`Canari configuré sur le port ${port} (Auto-quarantaine ${autoBlock ? 'activée' : 'désactivée'}).`, 'info');
    });

    document.getElementById('btn-test-honeypot')?.addEventListener('click', async () => {
        window.showToast('Simulation de sonde déclenchée ! Le port canari va intercepter un paquet test.', 'warning', 'SIMULATION TRAP');
        window.api.scanDevicePortsDetailed('127.0.0.1', null, [4455]);
    });

    window.api.onCanaryProbe((probe) => {
        playAlertBeep('critical');
        if (appState.voiceSentinel) {
            appState.voiceSentinel.announceThreat(`Mouvement latéral suspect intercepté depuis ${probe.attackerIp}`);
        }
        refreshHoneypotView();
    });
}

// ─── Voice Sentinel (Assistant Vocal Cyber) ─────────────────────────────────
async function initVoiceSentinel() {
    if (typeof VoiceSentinel !== 'undefined') {
        appState.voiceSentinel = new VoiceSentinel();
        const settings = await window.api.getSettings();
        const enabled = (settings.voiceSentinelEnabled !== false);
        appState.voiceSentinel.setEnabled(enabled);
        updateVoiceToggleUI(enabled);
    }

    const toggleBtn = document.getElementById('btn-voice-toggle');
    toggleBtn?.addEventListener('click', async () => {
        if (!appState.voiceSentinel) return;
        const current = appState.voiceSentinel.isEnabled();
        const next = !current;
        appState.voiceSentinel.setEnabled(next);
        updateVoiceToggleUI(next);
        await window.api.updateSettings({ voiceSentinelEnabled: next });
        if (next) {
            appState.voiceSentinel.testVoice();
        }
    });
}

function updateVoiceToggleUI(enabled) {
    const text = document.getElementById('voice-status-text');
    const btn = document.getElementById('btn-voice-toggle');

    if (text) text.innerText = enabled ? 'Voix : ON' : 'Voix : OFF';
    if (btn) {
        btn.style.color = enabled ? 'var(--accent-cyan)' : 'var(--text-muted)';
        btn.style.borderColor = enabled ? 'rgba(0, 240, 255, 0.3)' : 'var(--border-color)';
        btn.style.background = enabled ? 'rgba(0, 240, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)';
    }
}

// ─── IoT Spy Hunter (Détecteur de Caméras & Micros) ─────────────────────────
function initSpyHunterEvents() {
    const btnStart = document.getElementById('btn-start-spy-hunt');
    btnStart?.addEventListener('click', async () => {
        const progressContainer = document.getElementById('spy-progress-container');
        const btnText = document.getElementById('btn-spy-text');

        btnStart.disabled = true;
        btnText.innerText = 'Chasse en cours...';
        if (progressContainer) progressContainer.style.display = 'block';

        if (appState.voiceSentinel) {
            appState.voiceSentinel.speak("Lancement de la traque des caméras et micros espions sur le réseau local.");
        }

        try {
            const report = await window.api.huntSpyDevices();
            appState.spyResults = report;
            renderSpyView();

            if (report.spyDevicesFound > 0) {
                if (appState.voiceSentinel) {
                    const first = report.devices[0];
                    appState.voiceSentinel.announceSpyDevice(first.detectedBrand || 'Caméra inconnue', first.ip);
                }
            } else {
                if (appState.voiceSentinel) {
                    appState.voiceSentinel.speak("Chasse terminée : aucun équipement de surveillance hostile détecté.");
                }
            }
        } catch (err) {
            window.showToast('Erreur durant la chasse aux espions : ' + err, 'danger');
        } finally {
            btnStart.disabled = false;
            btnText.innerText = 'Lancer la Chasse aux Espions';
            if (progressContainer) {
                setTimeout(() => { progressContainer.style.display = 'none'; }, 2000);
            }
            if (window.lucide) window.lucide.createIcons();
        }
    });
}

function renderSpyView() {
    const report = appState.spyResults;
    const scannedEl = document.getElementById('spy-stat-scanned');
    const foundEl = document.getElementById('spy-stat-found');
    const rtspEl = document.getElementById('spy-stat-rtsp');
    const threatEl = document.getElementById('spy-stat-threat');
    const threatDescEl = document.getElementById('spy-stat-threat-desc');
    const tbody = document.getElementById('spy-devices-table-body');
    const badge = document.getElementById('sidebar-spy-count');

    if (!report) {
        if (scannedEl) scannedEl.innerText = `${appState.devices.filter(d => d.isOnline).length}`;
        return;
    }

    if (scannedEl) scannedEl.innerText = `${report.scannedCount}`;
    if (foundEl) foundEl.innerText = `${report.spyDevicesFound}`;

    let rtspCount = 0;
    (report.devices || []).forEach(d => {
        if (d.openSurveillancePorts?.some(p => p.port === 554 || p.port === 8554)) rtspCount++;
    });
    if (rtspEl) rtspEl.innerText = `${rtspCount}`;

    if (badge) {
        badge.innerText = `${report.spyDevicesFound}`;
        badge.style.display = report.spyDevicesFound > 0 ? 'inline-block' : 'none';
    }

    if (report.spyDevicesFound > 0) {
        if (threatEl) {
            threatEl.innerText = 'SURVEILLANCE ACTIVE';
            threatEl.className = 'stat-value text-red';
        }
        if (threatDescEl) threatDescEl.innerText = `${report.spyDevicesFound} équipement(s) vidéo/audio actif(s)`;
    } else {
        if (threatEl) {
            threatEl.innerText = 'SÉCURISÉ';
            threatEl.className = 'stat-value text-green';
        }
        if (threatDescEl) threatDescEl.innerText = 'Aucune caméra hostile';
    }

    if (!tbody) return;

    if (!report.devices || report.devices.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; color: var(--accent-green); padding: 35px;">
                    <i data-lucide="shield-check" style="width: 32px; height: 32px; margin-bottom: 8px; display: inline-block;"></i>
                    <div style="font-weight: 600;">Périmètre Sain : Aucune caméra ou micro espion détecté sur le réseau local.</div>
                </td>
            </tr>
        `;
    } else {
        tbody.innerHTML = report.devices.map(d => {
            const portsStr = (d.openSurveillancePorts || []).map(p => `<span class="badge badge-unknown" style="font-family: monospace;">${p.port} (${escapeHtml(p.service)})</span>`).join(' ');
            const rtspUrlsHtml = (d.streamUrls || []).length > 0 
                ? `<div style="font-size: 11px; color: var(--accent-cyan); font-family: monospace; margin-top: 4px;">Flux : ${d.streamUrls[0]}</div>`
                : '';

            return `
                <tr>
                    <td>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div style="width: 36px; height: 36px; border-radius: 8px; background: rgba(255,51,102,0.15); border: 1px solid rgba(255,51,102,0.3); display: flex; align-items: center; justify-content: center; color: var(--accent-red);">
                                <i data-lucide="video" style="width: 18px; height: 18px;"></i>
                            </div>
                            <div>
                                <div style="font-weight: 600;">${escapeHtml(d.hostname)}</div>
                                <div style="font-size: 11px; color: var(--text-muted);">${escapeHtml(d.mac)}</div>
                            </div>
                        </div>
                    </td>
                    <td><span class="detail-val" style="font-weight: 600;">${escapeHtml(d.ip)}</span></td>
                    <td>
                        <div style="font-weight: 600;">${escapeHtml(d.detectedBrand || d.vendor)}</div>
                        <div style="font-size: 11px; color: var(--text-secondary);">${d.equipmentType}</div>
                    </td>
                    <td>
                        <div>${portsStr || '<span style="color: var(--text-muted);">Aucun port standard</span>'}</div>
                        ${rtspUrlsHtml}
                    </td>
                    <td>
                        <span class="badge ${d.threatLevel === 'CRITICAL' ? 'badge-blocked' : (d.threatLevel === 'HIGH' ? 'badge-blocked' : 'badge-unknown')}">
                            ${d.threatLevel}
                        </span>
                        <div style="font-size: 11px; color: var(--text-muted); margin-top: 3px;">${escapeHtml(d.riskReason)}</div>
                    </td>
                    <td>
                        <button class="btn btn-danger btn-sm" data-action="isolateRogueDevice" data-arg1="${escapeHtml(d.ip)}" data-arg2="${escapeHtml(d.mac)}" title="Couper tout accès réseau via le pare-feu">
                            <i data-lucide="shield-off"></i>
                            <span>Isoler</span>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    if (window.lucide) window.lucide.createIcons();
}

window.isolateRogueDevice = async function(ip, mac) {
    if (confirm(`Voulez-vous isoler immédiatement l'équipement ${ip} avec le pare-feu Windows ?`)) {
        await window.api.isolateDevice(ip, mac);
        if (appState.voiceSentinel) {
            appState.voiceSentinel.speak(`Équipement de surveillance ${ip} neutralisé.`);
        }
        window.showToast(`Équipement ${ip} isolé avec succès ! Tout échange de paquets est désormais bloqué.`, 'success');
        await refreshDevices();
        if (appState.currentView === 'spy') {
            document.getElementById('btn-start-spy-hunt')?.click();
        }
    }
};

// ─── Timeline & Présence (Contrôle Parental) ────────────────────────────────
function initTimelineEvents() {
    const filterSelect = document.getElementById('timeline-device-filter');
    const refreshBtn = document.getElementById('btn-refresh-timeline');
    const clearBtn = document.getElementById('btn-clear-sessions');

    filterSelect?.addEventListener('change', () => {
        renderTimelineView();
    });

    refreshBtn?.addEventListener('click', () => {
        renderTimelineView();
    });

    clearBtn?.addEventListener('click', async () => {
        const selectedMac = filterSelect.value || null;
        if (confirm('Voulez-vous effacer l\'historique des sessions de présence ?')) {
            await window.api.clearSessions(selectedMac);
            renderTimelineView();
        }
    });
}

async function renderTimelineView() {
    const filterSelect = document.getElementById('timeline-device-filter');
    const selectedMac = filterSelect ? filterSelect.value : null;

    // Remplir le filtre avec les appareils si besoin
    if (filterSelect && filterSelect.options.length <= 1) {
        appState.devices.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d.mac;
            opt.innerText = `${d.customName || d.hostname || d.ip} (${d.vendor})`;
            filterSelect.appendChild(opt);
        });
    }

    try {
        const [sessions, stats] = await Promise.all([
            window.api.getDeviceSessions(selectedMac, 100),
            window.api.getTimelineStats(selectedMac)
        ]);

        const kpiHours = document.getElementById('timeline-kpi-hours');
        const kpiSessions = document.getElementById('timeline-kpi-sessions');
        const kpiNight = document.getElementById('timeline-kpi-night');
        const kpiNightDesc = document.getElementById('timeline-kpi-night-desc');
        const kpiActive = document.getElementById('timeline-kpi-active');
        const tbody = document.getElementById('timeline-sessions-table-body');

        if (kpiHours) kpiHours.innerText = `${stats.totalHoursToday} h`;
        if (kpiSessions) kpiSessions.innerText = `${stats.totalSessionsToday}`;

        if (kpiNight) {
            kpiNight.innerText = stats.hasNightActivity ? 'OUI' : 'NON';
            kpiNight.className = stats.hasNightActivity ? 'stat-value text-orange' : 'stat-value text-green';
        }
        if (kpiNightDesc) {
            kpiNightDesc.innerText = stats.hasNightActivity ? 'Connexion nocturne détectée (23h - 6h)' : 'Aucune utilisation la nuit';
        }
        if (kpiActive) kpiActive.innerText = `${stats.activeNowCount}`;

        if (!tbody) return;

        if (!sessions || sessions.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 30px;">
                        Aucune session de connexion enregistrée. Les sessions se créent automatiquement à chaque scan réseau.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = sessions.map(s => {
            const dev = appState.devices.find(d => d.mac === s.mac) || {};
            const icon = getDeviceIcon(dev.deviceType || 'unknown');
            const isOnlineNow = !s.endedAt;
            const startFormatted = new Date(s.startedAt).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
            const endFormatted = s.endedAt ? new Date(s.endedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—';
            
            let durationStr = `${s.durationMinutes || 1} min`;
            if (s.durationMinutes >= 60) {
                const h = Math.floor(s.durationMinutes / 60);
                const m = s.durationMinutes % 60;
                durationStr = `${h}h ${m}m`;
            }

            return `
                <tr>
                    <td>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <i data-lucide="${icon}" style="width: 16px; height: 16px; color: var(--accent-cyan);"></i>
                            <div>
                                <span style="font-weight: 600;">${escapeHtml(s.hostname || 'Appareil')}</span>
                                <div style="font-size: 11px; color: var(--text-muted);">${escapeHtml(s.mac)}</div>
                            </div>
                        </div>
                    </td>
                    <td><span class="detail-val">${escapeHtml(s.ip || '—')}</span></td>
                    <td style="font-size: 12px;">${startFormatted}</td>
                    <td style="font-size: 12px;">${isOnlineNow ? '<span class="badge badge-online">Actif maintenant</span>' : endFormatted}</td>
                    <td>
                        <span style="font-family: monospace; font-weight: 600; color: var(--accent-cyan);">${durationStr}</span>
                    </td>
                    <td>
                        ${s.isNightSession ? '<span class="badge badge-unknown" title="Activité entre 23h et 06h"><i data-lucide="moon" style="width: 10px; height: 10px; display: inline;"></i> Nuit</span>' : '<span class="badge badge-trusted">Journée</span>'}
                        ${isOnlineNow ? '<span class="badge badge-online">Connecté</span>' : '<span class="badge badge-offline">Déconnecté</span>'}
                    </td>
                </tr>
            `;
        }).join('');

        if (window.lucide) window.lucide.createIcons();
    } catch (err) {
        console.error('Erreur render timeline:', err);
    }
}

// ─── Portail Invité Wi-Fi & QR Code ─────────────────────────────────────────
function initGuestPortalEvents() {
    const ssidInput = document.getElementById('guest-input-ssid');
    const passInput = document.getElementById('guest-input-password');
    const secSelect = document.getElementById('guest-select-security');
    const generateBtn = document.getElementById('btn-generate-guest-qr');
    const togglePassBtn = document.getElementById('btn-toggle-guest-pass');
    const printBtn = document.getElementById('btn-print-badge');

    togglePassBtn?.addEventListener('click', () => {
        const isPass = passInput.type === 'password';
        passInput.type = isPass ? 'text' : 'password';
        togglePassBtn.innerHTML = isPass ? '<i data-lucide="eye-off" style="width: 16px; height: 16px;"></i>' : '<i data-lucide="eye" style="width: 16px; height: 16px;"></i>';
        if (window.lucide) window.lucide.createIcons();
    });

    generateBtn?.addEventListener('click', () => {
        renderGuestBadge();
    });

    printBtn?.addEventListener('click', () => {
        window.print();
    });
}

function renderGuestView() {
    const ssidInput = document.getElementById('guest-input-ssid');
    if (ssidInput && !ssidInput.value && appState.environment?.wifi?.ssid) {
        ssidInput.value = appState.environment.wifi.ssid;
    }
    renderGuestBadge();
}

function renderGuestBadge() {
    const ssidInput = document.getElementById('guest-input-ssid');
    const passInput = document.getElementById('guest-input-password');
    const secSelect = document.getElementById('guest-select-security');
    const canvas = document.getElementById('guest-qr-canvas');
    const badgeSsid = document.getElementById('badge-display-ssid');
    const badgeSec = document.getElementById('badge-display-sec');

    const ssid = ssidInput?.value.trim() || appState.environment?.wifi?.ssid || 'Mon_WiFi';
    const password = passInput?.value || '';
    const security = secSelect?.value || 'WPA';

    if (badgeSsid) badgeSsid.innerText = ssid;
    if (badgeSec) badgeSec.innerText = security === 'OPEN' ? 'Réseau Ouvert (Sans code)' : security;

    if (typeof QRCodeGenerator !== 'undefined' && canvas) {
        const payload = QRCodeGenerator.formatWifiPayload(ssid, password, security);
        QRCodeGenerator.renderToCanvas(canvas, payload, {
            size: 190,
            fgColor: '#00f0ff',
            bgColor: '#090d16',
            margin: 3
        });
    }
}

// ─── RuView (Spatial Sensing & WiFi DensePose - ruvnet/RuView) ───────────────
function initRuViewEvents() {
    const btnToggle = document.getElementById('btn-ruview-toggle-feed');
    const btnCalibrate = document.getElementById('btn-ruview-calibrate');
    const btnToggleNode = document.getElementById('btn-ruview-toggle-node');
    const btnConnect = document.getElementById('btn-ruview-connect');
    const btnRevert = document.getElementById('btn-ruview-revert-rusense');
    const actSelect = document.getElementById('ruview-activity-select');

    btnToggle?.addEventListener('click', () => {
        toggleRuViewFeed(!appState.ruviewRunning);
    });

    btnCalibrate?.addEventListener('click', async () => {
        btnCalibrate.disabled = true;
        btnCalibrate.innerHTML = `<i data-lucide="loader-2" class="spin"></i> Étalonnage...`;
        if (window.lucide) window.lucide.createIcons();

        if (appState.voiceSentinel) {
            appState.voiceSentinel.speak("Étalonnage du bruit électromagnétique ambiant en cours.");
        }

        await window.api.calibrateRuView();

        setTimeout(() => {
            btnCalibrate.disabled = false;
            btnCalibrate.innerHTML = `<i data-lucide="sliders"></i> <span>Calibrer Espace RF</span>`;
            if (window.lucide) window.lucide.createIcons();
            if (appState.voiceSentinel) {
                appState.voiceSentinel.speak("Étalonnage terminé. Espace RF référencé.");
            }
        }, 1500);
    });

    btnToggleNode?.addEventListener('click', () => {
        const card = document.getElementById('ruview-hardware-card');
        if (card) {
            card.style.display = card.style.display === 'none' ? 'block' : 'none';
        }
    });

    btnConnect?.addEventListener('click', async () => {
        const url = document.getElementById('ruview-node-input-url')?.value.trim();
        if (!url) {
            window.showToast('Veuillez entrer une adresse WebSocket valide (ex: ws://192.168.1.150:8765)', 'warning');
            return;
        }
        await window.api.connectRuViewNode(url);
        toggleRuViewFeed(true);
    });

    btnRevert?.addEventListener('click', async () => {
        await window.api.connectRuViewNode(null);
        document.getElementById('ruview-hardware-card').style.display = 'none';
        toggleRuViewFeed(true);
    });

    actSelect?.addEventListener('change', async (e) => {
        const act = e.target.value;
        await window.api.setRuViewActivity(act);
        if (act === 'FALL_ALERT' && appState.voiceSentinel) {
            appState.voiceSentinel.speak("Alerte critique RuView : Chute d'une personne détectée dans la zone de surveillance !", 'critical');
        }
    });
}

async function toggleRuViewFeed(start) {
    appState.ruviewRunning = Boolean(start);
    const btnText = document.getElementById('ruview-feed-text');
    const btnIcon = document.getElementById('ruview-feed-icon');

    if (start) {
        await window.api.startRuView();
        if (btnText) btnText.innerText = 'Pause Flux RF';
        if (btnIcon) btnIcon.setAttribute('data-lucide', 'pause');
    } else {
        await window.api.stopRuView();
        if (btnText) btnText.innerText = 'Reprendre Flux RF';
        if (btnIcon) btnIcon.setAttribute('data-lucide', 'play');
    }
    if (window.lucide) window.lucide.createIcons();
}

function updateRuViewHud(data) {
    const presenceEl = document.getElementById('ruview-stat-presence');
    const confEl = document.getElementById('ruview-stat-conf');
    const occEl = document.getElementById('ruview-stat-occupancy');
    const breathEl = document.getElementById('ruview-stat-breathing');
    const heartEl = document.getElementById('ruview-stat-heart');

    if (presenceEl) {
        if (data.presence) {
            if (data.activity === 'FALL_ALERT') {
                presenceEl.innerText = 'CHUTE AU SOL';
                presenceEl.className = 'stat-value text-red';
            } else {
                presenceEl.innerText = 'DÉTECTÉE';
                presenceEl.className = 'stat-value text-cyan';
            }
        } else {
            presenceEl.innerText = 'ABSENCE';
            presenceEl.className = 'stat-value text-green';
        }
    }

    if (confEl) confEl.innerText = `${data.confidence || 0}% Confiance Spatiale`;
    if (occEl) occEl.innerText = `${data.occupancy || 0} Personne${(data.occupancy || 0) > 1 ? 's' : ''}`;
    if (breathEl) breathEl.innerHTML = `${data.breathingBpm || '--'} <span style="font-size: 13px; font-weight: normal; color: var(--text-muted);">BPM</span>`;
    if (heartEl) heartEl.innerHTML = `${data.heartBpm || '--'} <span style="font-size: 13px; font-weight: normal; color: var(--text-muted);">BPM</span>`;
}

// ─── Module : Mur SOC & War Room (Cyber Wallboard Grand Écran) ───────────────
function initWallboardEvents() {
    // Bouton de la barre de titre
    document.getElementById('btn-toggle-wallboard')?.addEventListener('click', async () => {
        switchView('wallboard');
        const isFS = await window.api.toggleFullScreen();
        document.body.classList.toggle('soc-fullscreen', isFS);
        updateWallboardFsBtn(isFS);
    });

    // Bouton plein écran interne au Wallboard
    document.getElementById('btn-wb-fullscreen-toggle')?.addEventListener('click', async () => {
        const isFS = await window.api.toggleFullScreen();
        document.body.classList.toggle('soc-fullscreen', isFS);
        updateWallboardFsBtn(isFS);
    });

    // Raccourcis F11 et Escape
    window.addEventListener('keydown', async (e) => {
        if (e.key === 'F11') {
            e.preventDefault();
            const isFS = await window.api.toggleFullScreen();
            document.body.classList.toggle('soc-fullscreen', isFS);
            updateWallboardFsBtn(isFS);
            if (appState.currentView === 'wallboard' && appState.wallboardRadar) {
                setTimeout(() => appState.wallboardRadar.initCanvas(), 150);
            }
        } else if (e.key === 'Escape' && document.body.classList.contains('soc-fullscreen')) {
            await window.api.toggleFullScreen();
            document.body.classList.remove('soc-fullscreen');
            updateWallboardFsBtn(false);
        }
    });

    // Rafraîchir WAN Shodan
    document.getElementById('btn-wb-refresh-wan')?.addEventListener('click', () => {
        refreshWallboardWan(true);
    });

    // Lancer les horloges numériques
    startWallboardClocks();
}

function updateWallboardFsBtn(isFS) {
    const label = document.getElementById('wb-fs-label');
    if (label) {
        label.innerText = isFS ? 'Quitter Plein Écran' : 'Plein Écran';
    }
}

function startWallboardClocks() {
    if (appState.wallboardClockInterval) clearInterval(appState.wallboardClockInterval);

    const updateClocks = () => {
        const now = new Date();
        const localEl = document.getElementById('wb-clock-local');
        const zuluEl = document.getElementById('wb-clock-zulu');

        if (localEl) {
            localEl.innerText = now.toLocaleTimeString('fr-FR', { hour12: false });
        }
        if (zuluEl) {
            const zHours = String(now.getUTCHours()).padStart(2, '0');
            const zMins = String(now.getUTCMinutes()).padStart(2, '0');
            const zSecs = String(now.getUTCSeconds()).padStart(2, '0');
            zuluEl.innerText = `${zHours}:${zMins}:${zSecs} UTC`;
        }
    };

    updateClocks();
    appState.wallboardClockInterval = setInterval(updateClocks, 1000);
}

async function refreshWallboard() {
    if (appState.currentView !== 'wallboard') return;

    // 1. Initialiser le radar SOC
    if (!appState.wallboardRadar && window.NetworkRadar) {
        appState.wallboardRadar = new window.NetworkRadar('wallboard-radar-canvas');
    }
    if (appState.wallboardRadar) {
        appState.wallboardRadar.initCanvas();
        appState.wallboardRadar.setData(appState.devices, appState.environment?.gatewayIp, appState.environment?.wifi);
    }

    // 2. Télémétrie & Nœuds
    const onlineDevs = appState.devices.filter(d => d.isOnline);
    const unknownDevs = onlineDevs.filter(d => !d.isTrusted);
    const isolatedDevs = appState.devices.filter(d => d.isBlocked);
    const unreadAlerts = appState.alerts.filter(a => !a.read);
    const criticalAlerts = unreadAlerts.filter(a => a.severity === 'critical');

    const teleNodes = document.getElementById('wb-tele-nodes');
    if (teleNodes) teleNodes.innerText = `${onlineDevs.length} / ${appState.devices.length}`;

    const devCount = document.getElementById('wb-devices-count');
    if (devCount) devCount.innerText = `${onlineDevs.length} en ligne`;

    const unkCount = document.getElementById('wb-unknown-count');
    if (unkCount) unkCount.innerText = `${unknownDevs.length} non identifié(s)`;

    const gwIp = document.getElementById('wb-gateway-ip');
    if (gwIp) gwIp.innerText = appState.environment?.gatewayIp || '192.168.1.1';

    const quarActive = document.getElementById('wb-quarantine-active');
    if (quarActive) quarActive.innerText = isolatedDevs.length > 0 ? `⚠️ ${isolatedDevs.length} isolé(s)` : 'Opérationnelle (0 isolés)';

    const wifiEnv = appState.environment?.wifi;
    const teleFreq = document.getElementById('wb-tele-freq');
    if (teleFreq && wifiEnv && wifiEnv.channel) {
        const is5GHz = Number(wifiEnv.channel) > 14;
        teleFreq.innerText = `${is5GHz ? '5 GHz' : '2.4 GHz'} (Ch ${wifiEnv.channel})`;
    }

    // Télémétrie Débit
    const currentSpeed = appState.stats?.currentThroughput || 0;
    const teleSpeed = document.getElementById('wb-tele-speed');
    if (teleSpeed) teleSpeed.innerText = `${currentSpeed.toFixed(1)} Mbps`;

    // 3. Calcul DEFCON Dynamique
    let defconLevel = 5;
    if (criticalAlerts.length > 0 || isolatedDevs.length > 0 || (appState.shodanAudit?.cves && appState.shodanAudit.cves.length > 0)) {
        defconLevel = 1; // DEFCON 1 CRITIQUE
    } else if (unreadAlerts.length > 2 || (appState.shodanAudit?.openPorts && appState.shodanAudit.openPorts.length > 0)) {
        defconLevel = 2; // DEFCON 2 ALERTE HAUTE
    } else if (unknownDevs.length > 2) {
        defconLevel = 3; // DEFCON 3 ÉLEVÉ
    } else if (unknownDevs.length > 0 || unreadAlerts.length > 0) {
        defconLevel = 4; // DEFCON 4 VIGILANCE
    } else {
        defconLevel = 5; // DEFCON 5 NOMINAL
    }

    for (let i = 1; i <= 5; i++) {
        const badge = document.getElementById(`defcon-${i}-badge`);
        if (badge) {
            badge.classList.toggle('active', i === defconLevel);
        }
    }

    // 4. Flux d'événements récents
    const eventsStream = document.getElementById('wallboard-events-stream');
    const eventsCount = document.getElementById('wb-events-count');
    if (eventsStream) {
        const recentAlerts = (appState.alerts || []).slice(0, 7);
        if (eventsCount) eventsCount.innerText = `${recentAlerts.length} alertes`;
        if (recentAlerts.length === 0) {
            eventsStream.innerHTML = `
                <div class="wb-event-item" style="border-left-color: var(--accent-green);">
                    <span>✅ Aucun incident détecté - Surveillance normale</span>
                    <span style="font-family: monospace; color: var(--text-muted);">Nominal</span>
                </div>
            `;
        } else {
            eventsStream.innerHTML = recentAlerts.map(a => `
                <div class="wb-event-item ${a.severity === 'critical' ? 'critical' : (a.severity === 'warning' ? 'warning' : '')}">
                    <div>
                        <strong style="color: var(--text-primary); font-size: 11px;">${escapeHtml(a.title)}</strong>
                        <div style="font-size: 10px; color: var(--text-muted);">${a.description ? escapeHtml(a.description.slice(0, 65)) + '...' : ''}</div>
                    </div>
                    <span style="font-family: monospace; color: var(--text-muted); font-size: 10px; white-space: nowrap;">
                        ${new Date(a.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
            `).join('');
        }
    }

    // 5. Statut Honeypot
    try {
        const hpStatus = await window.api.getHoneypotStatus();
        const hpEl = document.getElementById('wb-tele-honeypot');
        const hpPortEl = document.getElementById('wb-honeypot-port');
        if (hpStatus && hpStatus.isRunning) {
            if (hpEl) { hpEl.innerText = 'ARMÉ'; hpEl.className = 'wb-tele-val text-green'; }
            if (hpPortEl) hpPortEl.innerText = `Port ${hpStatus.port} (Décoy Actif)`;
        } else {
            if (hpEl) { hpEl.innerText = 'INACTIF'; hpEl.className = 'wb-tele-val text-orange'; }
            if (hpPortEl) hpPortEl.innerText = 'Désactivé';
        }
    } catch (_) {}

    // 6. Audit WAN & Shodan si pas encore chargé
    if (!appState.wanInfo) {
        refreshWallboardWan();
    }
}

async function refreshWallboardWan(force = false) {
    const wanIpEl = document.getElementById('wb-wan-ip');
    const wanIspEl = document.getElementById('wb-wan-isp');
    const shodanPortsEl = document.getElementById('wb-shodan-ports');
    const shodanCvesEl = document.getElementById('wb-shodan-cves');
    const shodanRatingEl = document.getElementById('wb-shodan-rating');
    const threatFoxEl = document.getElementById('wb-threatfox-status');
    const abuseScoreEl = document.getElementById('wb-abuse-score');

    if (force || !appState.wanInfo) {
        if (wanIpEl) wanIpEl.innerText = 'Résolution...';
        if (wanIspEl) wanIspEl.innerText = 'Recherche IP-API...';

        try {
            // API 2 : IP-API
            const wan = await window.api.getWanInfo();
            appState.wanInfo = wan;
            if (wanIpEl) wanIpEl.innerText = wan.ip;
            if (wanIspEl) wanIspEl.innerText = `${wan.city}, ${wan.country} (${wan.isp})`;

            // API 1 : Shodan InternetDB
            if (shodanPortsEl) shodanPortsEl.innerText = 'Audit Shodan en cours...';
            const shodan = await window.api.auditWanShodan(wan.ip);
            appState.shodanAudit = shodan;

            if (shodanPortsEl) {
                shodanPortsEl.innerText = shodan.openPorts && shodan.openPorts.length > 0 ? `${shodan.openPorts.length} port(s) [${shodan.openPorts.join(', ')}]` : '0 port exposé (Protégé)';
                shodanPortsEl.className = shodan.openPorts && shodan.openPorts.length > 0 ? 'wb-stat-val text-orange' : 'wb-stat-val text-green';
            }
            if (shodanCvesEl) {
                shodanCvesEl.innerText = shodan.cves && shodan.cves.length > 0 ? `${shodan.cves.length} vulnérabilité(s) CVE` : '0 faille CVE publique';
                shodanCvesEl.className = shodan.cves && shodan.cves.length > 0 ? 'wb-stat-val text-red' : 'wb-stat-val text-green';
            }
            if (shodanRatingEl) {
                shodanRatingEl.innerText = shodan.rating || (shodan.isExposed ? 'EXPOSÉ' : 'SÉCURISÉ');
                shodanRatingEl.className = `badge ${shodan.isExposed ? (shodan.cves && shodan.cves.length > 0 ? 'badge-blocked' : 'badge-unknown') : 'badge-trusted'}`;
            }

            // API 4 : ThreatFox / Abuse.ch
            const c2Check = await window.api.checkThreatC2(wan.ip);
            if (threatFoxEl) {
                if (c2Check && c2Check.isMalicious) {
                    threatFoxEl.innerText = `🚨 C2 DÉTECTÉ (${c2Check.threatType})`;
                    threatFoxEl.className = 'wb-stat-val text-red';
                } else {
                    threatFoxEl.innerText = 'AUCUNE MENACE C2 DÉTECTÉE';
                    threatFoxEl.className = 'wb-stat-val text-green';
                }
            }

            // API 3 : AbuseIPDB
            const abuseCheck = await window.api.checkIpReputation(wan.ip);
            if (abuseScoreEl) {
                abuseScoreEl.innerText = `${abuseCheck?.abuseConfidenceScore || 0} / 100 (${window.i18n.tr(abuseCheck?.status || 'Sain').slice(0, 24)})`;
            }

            if (force) {
                window.showToast(`Audit WAN Shodan terminé : ${shodan.rating}`, shodan.isExposed ? 'warning' : 'success');
            }
        } catch (err) {
            if (wanIpEl) wanIpEl.innerText = 'Mode Hors-Ligne';
            if (wanIspEl) wanIspEl.innerText = 'Réseau Intranet Privé';
            if (shodanPortsEl) shodanPortsEl.innerText = 'Non auditable (Hors-Ligne)';
        }
    }
}



