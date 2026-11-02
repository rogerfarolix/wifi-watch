/**
 * Wifi-Watch - Renderer : Paramètres, exports, langue/thème, toasts et palette de commandes
 * (module issu du découpage d'app.js ; scripts classiques, portée globale partagée)
 */

// ─── Paramètres ─────────────────────────────────────────────────────────────
async function initSettingsEvents() {
    const settings = await window.api.getSettings();
    appState.settings = settings;

    const intervalSelect = document.getElementById('setting-scan-interval');
    const notifCheck = document.getElementById('setting-notifications');
    const soundCheck = document.getElementById('setting-sound');
    const autoScanCheck = document.getElementById('setting-autoscan');
    const trayCheck = document.getElementById('setting-tray');

    if (intervalSelect) intervalSelect.value = String(settings.scanInterval || 30);
    if (notifCheck) notifCheck.checked = !!settings.notifications;
    if (soundCheck) soundCheck.checked = !!settings.soundAlerts;
    if (autoScanCheck) autoScanCheck.checked = !!settings.autoScan;
    if (trayCheck) trayCheck.checked = (settings.minimizeToTray !== false);

    intervalSelect?.addEventListener('change', async (e) => {
        await window.api.updateSettings({ scanInterval: parseInt(e.target.value, 10) });
    });

    notifCheck?.addEventListener('change', async (e) => {
        await window.api.updateSettings({ notifications: e.target.checked });
    });

    trayCheck?.addEventListener('change', async (e) => {
        await window.api.updateSettings({ minimizeToTray: e.target.checked });
    });

    soundCheck?.addEventListener('change', async (e) => {
        await window.api.updateSettings({ soundAlerts: e.target.checked });
        appState.settings.soundAlerts = e.target.checked;
    });

    autoScanCheck?.addEventListener('change', async (e) => {
        await window.api.updateSettings({ autoScan: e.target.checked });
    });

    // Multi-Sous-Réseaux & VLANs
    const customSubnetsInput = document.getElementById('setting-custom-subnets');
    if (customSubnetsInput) customSubnetsInput.value = settings.customSubnets || '';
    customSubnetsInput?.addEventListener('change', async (e) => {
        await window.api.updateSettings({ customSubnets: e.target.value.trim() });
    });

    // Webhooks Entreprise (Slack, Discord, Teams, Generic)
    const whEnabled = document.getElementById('setting-webhook-enabled');
    const whType = document.getElementById('setting-webhook-type');
    const whUrl = document.getElementById('setting-webhook-url');
    const whSev = document.getElementById('setting-webhook-severity');
    const abuseKey = document.getElementById('setting-abuse-key');

    if (whEnabled) whEnabled.checked = !!settings.webhookEnabled;
    if (whType) whType.value = settings.webhookType || 'slack';
    if (whUrl) whUrl.value = settings.webhookUrl || '';
    if (whSev) whSev.value = settings.webhookMinSeverity || 'warning';
    if (abuseKey) abuseKey.value = settings.abuseIpdbKey || '';

    const saveWebhookSettings = async () => {
        await window.api.updateSettings({
            webhookEnabled: whEnabled ? whEnabled.checked : false,
            webhookType: whType ? whType.value : 'slack',
            webhookUrl: whUrl ? whUrl.value.trim() : '',
            webhookMinSeverity: whSev ? whSev.value : 'warning',
            abuseIpdbKey: abuseKey ? abuseKey.value.trim() : ''
        });
    };

    whEnabled?.addEventListener('change', saveWebhookSettings);
    whType?.addEventListener('change', saveWebhookSettings);
    whUrl?.addEventListener('change', saveWebhookSettings);
    whSev?.addEventListener('change', saveWebhookSettings);
    abuseKey?.addEventListener('change', saveWebhookSettings);

    document.getElementById('btn-test-webhook')?.addEventListener('click', async () => {
        const url = whUrl?.value?.trim();
        if (!url) {
            window.showToast('Veuillez spécifier une URL de Webhook valide avant de tester.', 'warning');
            return;
        }

        const btn = document.getElementById('btn-test-webhook');
        btn.innerHTML = `<i data-lucide="loader-2" class="spin"></i> Envoi...`;
        if (window.lucide) window.lucide.createIcons();

        try {
            const res = await window.api.testWebhook({
                url,
                type: whType?.value || 'generic'
            });
            if (res && res.success) {
                window.showToast('Webhook expédié avec succès ! Vérifiez votre canal Slack/Teams/Discord.', 'success');
            } else {
                window.showToast(`Échec d'envoi du webhook : ${res?.message || 'Erreur réseau ou URL invalide'}`, 'danger');
            }
        } catch (err) {
            window.showToast('Erreur lors du test webhook : ' + err, 'danger');
        } finally {
            btn.innerHTML = `<i data-lucide="send"></i> <span>Tester le Webhook</span>`;
            if (window.lucide) window.lucide.createIcons();
        }
    });

    // Exports de sauvegarde
    document.getElementById('btn-export-db')?.addEventListener('click', () => {
        const payload = {
            generator: 'Wifi-Watch Enterprise Sentinel v2.0',
            exportedAt: new Date().toISOString(),
            environment: appState.environment,
            devices: appState.devices,
            alerts: appState.alerts
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `wifi-watch-backup-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    });

    document.getElementById('btn-export-alerts-csv')?.addEventListener('click', async () => {
        try {
            const csv = await window.api.exportAlertsCsv();
            const result = await window.api.saveExportFile(`wifi-watch-alerts-${new Date().toISOString().slice(0, 10)}.csv`, csv);
            if (result && result.success) {
                window.showToast(`Alertes exportées avec succès : ${result.filePath}`, 'success');
            }
        } catch (err) {
            window.showToast('Erreur export alertes : ' + err, 'danger');
        }
    });

    // Thème et Langue initiaux
    if (settings.theme === 'corporate') {
        document.body.classList.add('theme-corporate');
        const themeSel = document.getElementById('setting-theme');
        if (themeSel) themeSel.value = 'corporate';
    }
    if (settings.language && window.i18n) {
        window.i18n.setLanguage(settings.language);
        const label = document.getElementById('lang-current-label');
        if (label) label.innerText = settings.language.toUpperCase();
        const langSel = document.getElementById('setting-language');
        if (langSel) langSel.value = settings.language;
    }
}

// ─── Enterprise Exports Events ──────────────────────────────────────────────
function initEnterpriseExportEvents() {
    const triggerExport = async (format) => {
        try {
            let content = '';
            let defaultName = '';
            const dateStr = new Date().toISOString().slice(0, 10);

            if (format === 'csv') {
                content = await window.api.exportDevicesCsv();
                defaultName = `wifi-watch-inventory-${dateStr}.csv`;
            } else if (format === 'json') {
                content = await window.api.exportDevicesJson();
                defaultName = `wifi-watch-inventory-${dateStr}.json`;
            }

            const result = await window.api.saveExportFile(defaultName, content);
            if (result && result.success) {
                window.showToast(`Export réussi ! Enregistré sous : ${result.filePath}`, 'success');
            } else if (result && result.error) {
                window.showToast(`Échec de l'exportation : ${result.error}`, 'danger');
            }
        } catch (err) {
            window.showToast('Erreur lors de l\'exportation : ' + err, 'danger');
        }
    };

    document.getElementById('btn-export-csv')?.addEventListener('click', () => triggerExport('csv'));
    document.getElementById('btn-quick-export')?.addEventListener('click', () => triggerExport('csv'));
    document.getElementById('btn-export-json')?.addEventListener('click', () => triggerExport('json'));
}

// ─── Langue & Thème Events ──────────────────────────────────────────────────
function initLanguageAndThemeEvents() {
    const langToggleBtn = document.getElementById('btn-lang-toggle');
    langToggleBtn?.addEventListener('click', async () => {
        const cur = window.i18n ? window.i18n.getLanguage() : 'fr';
        const next = cur === 'fr' ? 'en' : 'fr';
        if (window.i18n) window.i18n.setLanguage(next);
        const label = document.getElementById('lang-current-label');
        if (label) label.innerText = next.toUpperCase();
        const sel = document.getElementById('setting-language');
        if (sel) sel.value = next;
        await window.api.updateSettings({ language: next });
    });

    document.getElementById('setting-language')?.addEventListener('change', async (e) => {
        const lang = e.target.value;
        if (window.i18n) window.i18n.setLanguage(lang);
        const label = document.getElementById('lang-current-label');
        if (label) label.innerText = lang.toUpperCase();
        await window.api.updateSettings({ language: lang });
    });

    document.getElementById('setting-theme')?.addEventListener('change', async (e) => {
    });
}

// ─── Système de Notifications Toast Unifié ───────────────────────────────────
function initToastSystem() {
    window.showToast = function(message, type = 'info', title = null) {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const icons = {
            success: '✓',
            warning: '!',
            danger: '×',
            info: 'i'
        };

        const titles = {
            success: title || 'Succès',
            warning: title || 'Avertissement',
            danger: title || 'Alerte Sécurité',
            info: title || 'Information'
        };

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-icon">${icons[type] || ''}</div>
            <div class="toast-content">
                <div class="toast-title">${titles[type]}</div>
                <div class="toast-message">${message}</div>
            </div>
        `;

        container.appendChild(toast);
        playAlertBeep(type === 'danger' ? 'critical' : 'warning');

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(12px) scale(0.96)';
            setTimeout(() => toast.remove(), 250);
        }, 4000);
    };
}

// ─── Command Palette & Fast Navigator (Ctrl + K) ────────────────────────────
function initCommandPalette() {
    const overlay = document.getElementById('command-palette-modal');
    const input = document.getElementById('cmd-palette-input');
    const resultsContainer = document.getElementById('cmd-palette-results');
    const triggerBtn = document.getElementById('btn-quick-command');

    if (!overlay || !input || !resultsContainer) return;

    let selectedIndex = 0;
    let currentItems = [];

    const defaultCommands = [
        { id: 'scan', icon: 'refresh-cw', title: 'Scanner le Réseau (Balayage ARP & mDNS)', badge: 'Action', action: () => window.api.startScan() },
        { id: 'view-dashboard', icon: 'layout-dashboard', title: 'Aller au Tableau de Bord', badge: 'Vue', action: () => switchView('dashboard') },
        { id: 'view-radar', icon: 'radar', title: 'Ouvrir le Radar Tactique & Topologie', badge: 'Vue', action: () => switchView('radar') },
        { id: 'view-devices', icon: 'laptop-2', title: 'Voir l\'Inventaire des Actifs', badge: 'Vue', action: () => switchView('devices') },
        { id: 'view-honeypot', icon: 'crosshair', title: 'Canari Réseau (Honeypot Decoy Trap)', badge: 'Sécurité', action: () => switchView('honeypot') },
        { id: 'view-dnsguard', icon: 'globe', title: 'DNS Guard & Détection Altération', badge: 'Sécurité', action: () => switchView('dnsguard') },
        { id: 'view-audit', icon: 'award', title: 'Audit de Conformité NIS2 & ISO 27001', badge: 'Audit', action: () => switchView('audit') },
        { id: 'view-speedtest', icon: 'gauge', title: 'Test Débit & Benchmark SLA', badge: 'Performance', action: () => switchView('speedtest') },
        { id: 'view-channels', icon: 'radio-tower', title: 'Analyseur Wi-Fi & Canaux Spectres', badge: 'Spectre', action: () => switchView('channels') },
        { id: 'view-spy', icon: 'video', title: 'Chasseur Espion IoT (Caméras & Micros)', badge: 'Sécurité', action: () => switchView('spy') },
        { id: 'view-wallboard', icon: 'tv-2', title: 'Mur Vidéo SOC / Cyber War Room (Plein Écran)', badge: 'War Room', action: () => { switchView('wallboard'); window.api.toggleFullScreen().then(isFS => { document.body.classList.toggle('soc-fullscreen', isFS); updateWallboardFsBtn(isFS); }); } },
        { id: 'audit-shodan', icon: 'shield-alert', title: 'Audit Exposition WAN & CVEs (Shodan InternetDB)', badge: 'Cyber Intel', action: () => { switchView('wallboard'); refreshWallboardWan(true); } },
        { id: 'view-ruview', icon: 'activity', title: 'RuView RF Spatial Sensing', badge: 'Spatial', action: () => switchView('ruview') },
        { id: 'export-csv', icon: 'file-spreadsheet', title: 'Exporter l\'Inventaire en CSV (Excel)', badge: 'Export', action: () => document.getElementById('btn-quick-export')?.click() }
    ];

    function openPalette() {
        overlay.classList.add('open');
        input.value = '';
        selectedIndex = 0;
        renderResults('');
        input.focus();
    }

    function closePalette() {
        overlay.classList.remove('open');
    }

    triggerBtn?.addEventListener('click', openPalette);

    window.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            if (overlay.classList.contains('open')) {
                closePalette();
            } else {
                openPalette();
            }
        } else if (e.key === 'Escape' && overlay.classList.contains('open')) {
            closePalette();
        }
    });

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closePalette();
    });

    function renderResults(query) {
        const q = (query || '').toLowerCase().trim();
        let items = [];

        if (!q) {
            items = defaultCommands;
        } else {
            const matchedCommands = defaultCommands.filter(c => 
                c.title.toLowerCase().includes(q) || c.badge.toLowerCase().includes(q)
            );

            const matchedDevices = appState.devices.filter(d => 
                (d.customName && d.customName.toLowerCase().includes(q)) ||
                (d.ip && d.ip.includes(q)) ||
                (d.mac && d.mac.toLowerCase().includes(q)) ||
                (d.vendor && d.vendor.toLowerCase().includes(q)) ||
                (d.model && d.model.toLowerCase().includes(q)) ||
                (d.hostname && d.hostname.toLowerCase().includes(q))
            ).map(d => ({
                id: `dev-${d.mac}`,
                icon: 'laptop-2',
                title: `${d.customName || d.hostname || d.vendor || 'Appareil'} (${d.ip})`,
                badge: d.isOnline ? 'En Ligne' : 'Hors Ligne',
                action: () => {
                    closePalette();
                    window.openDeviceModal(d.mac);
                }
            }));

            items = [...matchedCommands, ...matchedDevices];
        }

        currentItems = items;
        if (selectedIndex >= items.length) selectedIndex = 0;

        if (items.length === 0) {
            resultsContainer.innerHTML = `<div style="padding: 24px; text-align: center; color: var(--text-muted); font-size: 13px;">Aucun équipement ou commande correspondant à « ${query} »</div>`;
            return;
        }

        resultsContainer.innerHTML = items.map((item, idx) => `
            <div class="command-item ${idx === selectedIndex ? 'selected' : ''}" data-idx="${idx}">
                <div class="command-item-left">
                    <i data-lucide="${item.icon}"></i>
                    <span>${escapeHtml(item.title)}</span>
                </div>
                <span class="command-badge">${item.badge}</span>
            </div>
        `).join('');

        if (window.lucide) window.lucide.createIcons();

        resultsContainer.querySelectorAll('.command-item').forEach(el => {
            el.addEventListener('click', () => {
                const idx = parseInt(el.getAttribute('data-idx'), 10);
                if (currentItems[idx]) {
                    closePalette();
                    currentItems[idx].action();
                }
            });
        });
    }

    input.addEventListener('input', (e) => {
        selectedIndex = 0;
        renderResults(e.target.value);
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (currentItems.length > 0) {
                selectedIndex = (selectedIndex + 1) % currentItems.length;
                renderResults(input.value);
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (currentItems.length > 0) {
                selectedIndex = (selectedIndex - 1 + currentItems.length) % currentItems.length;
                renderResults(input.value);
            }
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (currentItems[selectedIndex]) {
                const action = currentItems[selectedIndex].action;
                closePalette();
                action();
            }
        }
    });
}

