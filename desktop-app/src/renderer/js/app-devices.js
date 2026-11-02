/**
 * Wifi-Watch — Renderer : Dashboard, inventaire des appareils, sécurité, filtres et fiche appareil
 * (module issu du découpage d'app.js ; scripts classiques, portée globale partagée)
 */

// ─── Rendu Spécifique au Dashboard ──────────────────────────────────────────
function renderDashboardDevices(devices) {
    const tbody = document.getElementById('dash-recent-devices-tbody');
    if (!tbody) return;

    if (!devices || devices.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 20px;">Aucun équipement répertorié. Lancez un scan.</td></tr>`;
        return;
    }

    const top5 = devices.slice(0, 5);
    tbody.innerHTML = top5.map(d => `
        <tr>
            <td>
                <div class="device-name-col">
                    <div class="device-icon-box">
                        <i data-lucide="${getDeviceIcon(d.deviceType)}"></i>
                    </div>
                    <div>
                        <div class="device-primary-name">${escapeHtml(d.customName || d.hostname || d.mac)}</div>
                        <div class="device-secondary-name">${escapeHtml(d.vendor || 'Inconnu')} • ${d.mac}</div>
                    </div>
                </div>
            </td>
            <td><span class="detail-val">${escapeHtml(d.ip)}</span></td>
            <td>
                ${d.isOnline ? '<span class="badge badge-online">En ligne</span>' : '<span class="badge badge-offline">Hors ligne</span>'}
                ${d.isBlocked ? '<span class="badge badge-blocked">Bloqué</span>' : (d.isTrusted ? '<span class="badge badge-trusted">Fiable</span>' : '<span class="badge badge-unknown">Inconnu</span>')}
            </td>
            <td>
                <button class="btn btn-secondary btn-sm" data-action="openDeviceModal" data-arg1="${escapeHtml(d.mac)}">Gérer</button>
            </td>
        </tr>
    `).join('');

    if (window.lucide) window.lucide.createIcons();
}

function renderDashboardAlerts(alerts) {
    const list = document.getElementById('dash-recent-alerts-list');
    if (!list) return;

    if (!alerts || alerts.length === 0) {
        list.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 24px;">Aucune anomalie réseau détectée.</div>`;
        return;
    }

    const top3 = alerts.slice(0, 3);
    list.innerHTML = top3.map(a => `
        <div class="alert-item ${a.severity}">
            <div class="alert-body">
                <h4>${escapeHtml(a.title)}</h4>
                <p>${escapeHtml(a.description)}</p>
                <div class="alert-meta">
                    <span>${formatTime(a.timestamp)}</span>
                    ${a.ip ? `<span>IP : ${escapeHtml(a.ip)}</span>` : ''}
                </div>
            </div>
            ${!a.isRead ? `<button class="btn btn-secondary btn-sm" data-action="markAlertRead" data-arg1="${escapeHtml(a.id)}">Lu</button>` : ''}
        </div>
    `).join('');

    if (window.lucide) window.lucide.createIcons();
}

function defaultCategoryOf(dev) {
    if (dev.category) return dev.category;
    switch (dev.deviceType) {
        case 'router': return 'network';
        case 'phone': return 'mobile';
        case 'iot': case 'camera': case 'tv': return 'iot';
        case 'printer': return 'printer';
        case 'server': case 'nas': return 'server';
        default: return 'workstation';
    }
}

function getCategoryLabel(cat) {
    switch (cat) {
        case 'server': return 'Serveur Critique';
        case 'network': return 'Équipement Réseau';
        case 'printer': return 'Imprimante';
        case 'iot': return 'IoT / Caméra';
        case 'mobile': return 'Mobile / Tablette';
        case 'guest': return 'Invité';
        case 'unauthorized': return 'Non Autorisé';
        case 'workstation':
        default: return 'Poste Travail';
    }
}

// ─── Rendu de la Vue Appareils (Grille / Tableau) ────────────────────────────
function renderDevicesView() {
    let filtered = [...appState.devices];

    if (appState.deviceFilter === 'online') filtered = filtered.filter(d => d.isOnline);
    else if (appState.deviceFilter === 'offline') filtered = filtered.filter(d => !d.isOnline);
    else if (appState.deviceFilter === 'trusted') filtered = filtered.filter(d => d.isTrusted || d.authorized);
    else if (appState.deviceFilter === 'unknown') filtered = filtered.filter(d => !d.isTrusted && !d.isBlocked && !d.authorized);
    else if (appState.deviceFilter === 'blocked') filtered = filtered.filter(d => d.isBlocked || d.quarantined);
    else if (appState.deviceFilter === 'workstation') filtered = filtered.filter(d => (d.category || 'workstation') === 'workstation');
    else if (appState.deviceFilter === 'server') filtered = filtered.filter(d => d.category === 'server');
    else if (appState.deviceFilter === 'network') filtered = filtered.filter(d => d.category === 'network' || d.deviceType === 'router');
    else if (appState.deviceFilter === 'iot') filtered = filtered.filter(d => d.category === 'iot' || d.deviceType === 'iot');
    else if (appState.deviceFilter === 'unauthorized') filtered = filtered.filter(d => !d.authorized && !d.isTrusted && !d.isBlocked);

    if (appState.searchQuery) {
        const q = appState.searchQuery.toLowerCase();
        filtered = filtered.filter(d =>
            (d.customName && d.customName.toLowerCase().includes(q)) ||
            (d.hostname && d.hostname.toLowerCase().includes(q)) ||
            (d.ip && d.ip.includes(q)) ||
            (d.mac && d.mac.toLowerCase().includes(q)) ||
            (d.vendor && d.vendor.toLowerCase().includes(q)) ||
            (d.category && d.category.toLowerCase().includes(q)) ||
            (d.owner && d.owner.toLowerCase().includes(q)) ||
            (d.department && d.department.toLowerCase().includes(q))
        );
    }

    const gridContainer = document.getElementById('devices-grid-container');
    const tableCard = document.getElementById('devices-table-card');
    const tableBody = document.getElementById('devices-full-tbody');

    if (appState.viewMode === 'grid') {
        gridContainer.style.display = 'grid';
        tableCard.style.display = 'none';

        if (filtered.length === 0) {
            gridContainer.innerHTML = `<div style="grid-column: 1/-1;">${emptyState('search-x', 'Aucun appareil correspondant aux critères de recherche.', 'Modifiez le filtre ou lancez un nouveau scan.')}</div>`;
            if (window.lucide) window.lucide.createIcons();
            return;
        }

        gridContainer.innerHTML = filtered.map(d => {
            const cat = defaultCategoryOf(d);
            return `
            <div class="device-card">
                <div class="device-card-header">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div class="device-icon-box">
                            <i data-lucide="${getDeviceIcon(d.deviceType)}"></i>
                        </div>
                        <div>
                            <div class="device-primary-name">${escapeHtml(d.customName || d.hostname || d.mac)}</div>
                            <div class="device-secondary-name">${escapeHtml(d.vendor || 'Inconnu')}</div>
                        </div>
                    </div>
                    ${d.isOnline ? '<span class="status-pulse" title="En ligne"></span>' : '<span style="width: 7px; height: 7px; border-radius: 50%; background: #64748b;" title="Hors ligne"></span>'}
                </div>

                <div class="device-card-details">
                    <div class="detail-line"><span>IP :</span><span class="detail-val" style="font-family: monospace;">${escapeHtml(d.ip)}</span></div>
                    <div class="detail-line"><span>MAC :</span><span class="detail-val" style="font-family: monospace;">${escapeHtml(d.mac)}</span></div>
                    <div class="detail-line"><span>Catégorie :</span><span class="badge-tag tag-${cat}">${getCategoryLabel(cat)}</span></div>
                    ${d.owner ? `<div class="detail-line"><span>Responsable :</span><span class="detail-val">${escapeHtml(d.owner)} ${d.department ? `(${escapeHtml(d.department)})` : ''}</span></div>` : ''}
                    <div class="detail-line"><span>Latence :</span><span class="detail-val">${d.latencyMs !== null ? d.latencyMs + ' ms' : '--'}</span></div>
                </div>

                <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-top: 4px;">
                    ${d.isOnline ? '<span class="badge badge-online">En ligne</span>' : '<span class="badge badge-offline">Hors ligne</span>'}
                    ${d.isBlocked || d.quarantined ? '<span class="badge badge-blocked">Bloqué / Isolé</span>' : (d.authorized || d.isTrusted ? '<span class="badge-authorized">Approuvé</span>' : '<span class="badge-unauthorized">Non Validé</span>')}
                </div>

                <div class="device-card-actions">
                    <button class="btn btn-secondary btn-sm" data-action="openDeviceModal" data-arg1="${escapeHtml(d.mac)}" style="flex: 1;">Fiche & Actions</button>
                    ${!d.isTrusted && !d.authorized && !d.isBlocked ? `<button class="btn btn-success btn-sm" data-action="trustDevice" data-arg1="${escapeHtml(d.mac)}" title="Approuver cet équipement"><i data-lucide="check"></i></button>` : ''}
                    ${!d.isBlocked ? `<button class="btn btn-danger btn-sm" data-action="blockDevice" data-arg1="${escapeHtml(d.mac)}" title="Bloquer l'appareil"><i data-lucide="ban"></i></button>` : `<button class="btn btn-secondary btn-sm" data-action="unblockDevice" data-arg1="${escapeHtml(d.mac)}" title="Débloquer"><i data-lucide="unlock"></i></button>`}
                </div>
            </div>
            `;
        }).join('');
    } else {
        gridContainer.style.display = 'none';
        tableCard.style.display = 'block';

        tableBody.innerHTML = filtered.map(d => {
            const cat = defaultCategoryOf(d);
            return `
            <tr>
                <td>
                    <div class="device-name-col">
                        <div class="device-icon-box">
                            <i data-lucide="${getDeviceIcon(d.deviceType)}"></i>
                        </div>
                        <div>
                            <div class="device-primary-name">${escapeHtml(d.customName || d.hostname || d.mac)}</div>
                            <div class="device-secondary-name">${escapeHtml(d.vendor || 'Inconnu')}</div>
                        </div>
                    </div>
                </td>
                <td><span class="detail-val" style="font-family: monospace;">${escapeHtml(d.ip)}</span></td>
                <td><span class="detail-val" style="font-family: monospace;">${escapeHtml(d.mac)}</span></td>
                <td>${escapeHtml(d.vendor || 'Inconnu')}</td>
                <td><span class="badge-tag tag-${cat}">${getCategoryLabel(cat)}</span></td>
                <td><span style="font-size: 12px; color: var(--text-secondary);">${escapeHtml(d.owner || '--')} ${d.department ? `<br><small style="color:var(--text-muted);">${escapeHtml(d.department)}</small>` : ''}</span></td>
                <td>${d.isOnline ? '<span class="badge badge-online">En ligne</span>' : '<span class="badge badge-offline">Hors ligne</span>'}</td>
                <td>${d.isBlocked || d.quarantined ? '<span class="badge badge-blocked">Bloqué / Isolé</span>' : (d.authorized || d.isTrusted ? '<span class="badge-authorized">Approuvé</span>' : '<span class="badge-unauthorized">Non Validé</span>')}</td>
                <td>
                    <button class="btn btn-secondary btn-sm" data-action="openDeviceModal" data-arg1="${escapeHtml(d.mac)}">Fiche</button>
                </td>
            </tr>
            `;
        }).join('');
    }

    if (window.lucide) window.lucide.createIcons();
}

// ─── Rendu de la Vue Sécurité ───────────────────────────────────────────────
function renderSecurityView() {
    let filtered = [...appState.alerts];

    if (appState.alertFilter === 'critical') filtered = filtered.filter(a => a.severity === 'critical');
    else if (appState.alertFilter === 'warning') filtered = filtered.filter(a => a.severity === 'warning');
    else if (appState.alertFilter === 'info') filtered = filtered.filter(a => a.severity === 'info');

    const container = document.getElementById('full-alerts-list');
    if (!container) return;

    if (filtered.length === 0) {
        container.innerHTML = emptyState('shield-check', 'Aucune alerte enregistrée dans cette catégorie.', 'Le Sentinel surveille le réseau en continu.');
        if (window.lucide) window.lucide.createIcons();
        return;
    }

    container.innerHTML = filtered.map(a => `
        <div class="alert-item ${a.severity}">
            <div class="alert-body">
                <h4>${escapeHtml(a.title)}</h4>
                <p>${escapeHtml(a.description)}</p>
                <div class="alert-meta">
                    <span>${new Date(a.timestamp).toLocaleString('fr-FR')}</span>
                    ${a.ip ? `<span>IP : ${escapeHtml(a.ip)}</span>` : ''}
                    ${a.deviceMac ? `<span>MAC : ${a.deviceMac}</span>` : ''}
                </div>
            </div>
            <div>
                ${!a.isRead ? `<button class="btn btn-secondary btn-sm" data-action="markAlertRead" data-arg1="${escapeHtml(a.id)}">Marquer comme lu</button>` : '<span style="color: var(--text-muted); font-size: 11px;">Lu</span>'}
            </div>
        </div>
    `).join('');
}

// ─── Filtres, Recherche & Actions Rapides ────────────────────────────────────
function initFiltersAndSearch() {
    document.querySelectorAll('.filter-btn[data-filter]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn[data-filter]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            appState.deviceFilter = btn.getAttribute('data-filter');
            renderDevicesView();
        });
    });

    document.getElementById('devices-search-input')?.addEventListener('input', (e) => {
        appState.searchQuery = e.target.value;
        renderDevicesView();
    });

    document.getElementById('btn-toggle-view-grid')?.addEventListener('click', () => {
        appState.viewMode = 'grid';
        renderDevicesView();
    });
    document.getElementById('btn-toggle-view-table')?.addEventListener('click', () => {
        appState.viewMode = 'table';
        renderDevicesView();
    });

    document.querySelectorAll('.filter-btn[data-alert-filter]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn[data-alert-filter]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            appState.alertFilter = btn.getAttribute('data-alert-filter');
            renderSecurityView();
        });
    });

    document.getElementById('btn-sec-clear-all')?.addEventListener('click', async () => {
        if (confirm('Voulez-vous vraiment effacer tout l\'historique des alertes ?')) {
            await window.api.clearAlerts();
            await refreshAlerts();
        }
    });

    document.getElementById('btn-sec-mark-all')?.addEventListener('click', async () => {
        await window.api.markAllAlertsRead();
        await refreshAlerts();
    });
    document.getElementById('btn-mark-all-read-dash')?.addEventListener('click', async () => {
        await window.api.markAllAlertsRead();
        await refreshAlerts();
    });
}

// ─── Modal Appareil ─────────────────────────────────────────────────────────
function initModal() {
    const modal = document.getElementById('device-modal');
    const closeBtn = document.getElementById('modal-btn-close');
    const cancelBtn = document.getElementById('modal-btn-cancel');
    const saveBtn = document.getElementById('modal-btn-save');

    const closeModal = () => modal.classList.remove('active');
    closeBtn?.addEventListener('click', closeModal);
    cancelBtn?.addEventListener('click', closeModal);

    // Gestion des Onglets Intuitifs du Modal
    const tabs = modal.querySelectorAll('.modal-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.getAttribute('data-tab');
            tabs.forEach(t => t.classList.toggle('active', t === tab));
            modal.querySelectorAll('.modal-tab-pane').forEach(p => {
                p.classList.toggle('active', p.id === `modal-pane-${target}`);
            });
            if (window.lucide) window.lucide.createIcons();
        });
    });

    saveBtn?.addEventListener('click', async () => {
        const mac = document.getElementById('modal-device-mac').value;
        const customName = document.getElementById('modal-device-custom-name').value;
        const category = document.getElementById('modal-device-category')?.value || 'workstation';
        const owner = document.getElementById('modal-device-owner')?.value || '';
        const department = document.getElementById('modal-device-department')?.value || '';
        const location = document.getElementById('modal-device-location')?.value || '';
        const authorized = document.getElementById('modal-device-authorized')?.checked || false;
        const isCritical = document.getElementById('modal-device-critical')?.checked || false;
        const notes = document.getElementById('modal-device-notes')?.value || '';

        if (mac) {
            await window.api.updateDevice(mac, {
                customName,
                category,
                owner,
                department,
                location,
                authorized,
                isTrusted: authorized,
                isCritical,
                notes
            });
            closeModal();
            window.showToast('Propriétés de l\'équipement sauvegardées.', 'success');
            await refreshDevices();
        }
    });

    document.getElementById('modal-btn-toggle-block')?.addEventListener('click', async () => {
        const mac = document.getElementById('modal-device-mac').value;
        const dev = appState.devices.find(d => d.mac === mac);
        if (dev) {
            const isBlocked = !dev.isBlocked;
            await window.api.updateDevice(mac, { isBlocked, isTrusted: isBlocked ? false : dev.isTrusted });
            closeModal();
            window.showToast(isBlocked ? `Équipement ${dev.ip} bloqué et placé sur liste noire.` : `Équipement ${dev.ip} débloqué.`, isBlocked ? 'warning' : 'success');
            await refreshDevices();
        }
    });

    document.getElementById('modal-btn-scan-ports')?.addEventListener('click', async () => {
        const ip = document.getElementById('modal-info-ip').innerText;
        const mac = document.getElementById('modal-device-mac').value;
        const btn = document.getElementById('modal-btn-scan-ports');
        const container = document.getElementById('modal-ports-container');
        const listEl = document.getElementById('modal-ports-list');
        const countBadge = document.getElementById('modal-ports-count-badge');

        if (!ip || ip === '--') return;

        btn.disabled = true;
        btn.innerHTML = `<i data-lucide="loader-2" class="spin"></i> Scan en cours...`;
        if (window.lucide) window.lucide.createIcons();

        try {
            const ports = await window.api.scanDevicePortsDetailed(ip, mac);
            container.style.display = 'block';
            countBadge.innerText = `${ports.length} port(s) ouvert(s)`;

            if (ports.length === 0) {
                listEl.innerHTML = `<span style="font-size: 11px; color: var(--accent-green); padding: 4px 0; display: block;">✅ Aucun port vulnérable courant exposé.</span>`;
                window.showToast(`Audit terminé : aucun port critique exposé sur ${ip}.`, 'success');
            } else {
                listEl.innerHTML = ports.map(p => `
                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                        <span><strong style="color: var(--accent-cyan); font-family: monospace;">Port ${p.port}</strong> (${escapeHtml(p.service)})</span>
                        <span class="badge ${p.risk === 'CRITICAL' || p.risk === 'HIGH' ? 'badge-blocked' : (p.risk === 'MEDIUM' ? 'badge-unknown' : 'badge-trusted')}">
                            ${p.risk}
                        </span>
                    </div>
                `).join('');
                window.showToast(`${ports.length} port(s) ouvert(s) identifiés sur ${ip}.`, ports.some(p => p.risk === 'CRITICAL' || p.risk === 'HIGH') ? 'danger' : 'warning');
            }
        } catch (err) {
            window.showToast('Erreur scan de ports : ' + err, 'danger');
        } finally {
            btn.disabled = false;
            btn.innerHTML = `<i data-lucide="scan"></i> <span>Lancer Audit Ports</span>`;
            if (window.lucide) window.lucide.createIcons();
        }
    });

    // Bouton Wake-on-LAN
    document.getElementById('modal-btn-wol')?.addEventListener('click', async () => {
        const mac = document.getElementById('modal-device-mac').value;
        if (!mac) return;
        try {
            await window.api.wakeOnLan(mac);
            window.showToast(`Paquet Magique Wake-on-LAN transmis avec succès à ${mac} !`, 'success');
        } catch (err) {
            window.showToast(`Échec Wake-on-LAN : ${err}`, 'danger');
        }
    });

    // Bouton Audit Espion (Caméras / Micros)
    document.getElementById('modal-btn-spy-check')?.addEventListener('click', async () => {
        const mac = document.getElementById('modal-device-mac').value;
        const dev = appState.devices.find(d => d.mac === mac);
        if (!dev) return;

        const btn = document.getElementById('modal-btn-spy-check');
        btn.innerHTML = `<i data-lucide="loader-2" class="spin"></i> Analyse...`;
        if (window.lucide) window.lucide.createIcons();

        try {
            const report = await window.api.scanDeviceSpy(dev);
            if (report && report.isSurveillanceDevice) {
                if (appState.voiceSentinel) {
                    appState.voiceSentinel.announceSpyDevice(report.detectedBrand, report.ip);
                }
                window.showToast(`Alerte Surveillance : Caméra/Micro ${report.detectedBrand || ''} détecté sur ${dev.ip} !`, 'danger', 'ALERTE ESPION');
            } else {
                window.showToast(`Aucune signature d'espionnage détectée sur ${dev.ip}.`, 'success');
            }
        } catch (err) {
            window.showToast(`Erreur audit espion : ${err}`, 'danger');
        } finally {
            btn.innerHTML = `<i data-lucide="video"></i> <span>Auditer</span>`;
            if (window.lucide) window.lucide.createIcons();
        }
    });

    // Bouton Isolation Réseau (Pare-feu Windows)
    document.getElementById('modal-btn-toggle-isolate')?.addEventListener('click', async () => {
        const mac = document.getElementById('modal-device-mac').value;
        const dev = appState.devices.find(d => d.mac === mac);
        if (!dev) return;

        const textEl = document.getElementById('modal-isolate-text');
        const isCurrentlyIsolated = await window.api.checkQuarantineStatus(dev.ip);

        if (isCurrentlyIsolated) {
            await window.api.unisolateDevice(dev.ip, dev.mac);
            textEl.innerText = 'Isoler (Pare-feu)';
            window.showToast(`Quarantaine levée : trafic rétabli pour ${dev.ip}.`, 'success');
        } else {
            if (confirm(`Voulez-vous couper immédiatement tout trafic réseau avec ${dev.ip} (${dev.hostname || dev.customName || 'Inconnu'}) via le pare-feu Windows ?`)) {
                await window.api.isolateDevice(dev.ip, dev.mac);
                textEl.innerText = 'Lever Isolation';
                if (appState.voiceSentinel) {
                    appState.voiceSentinel.speak(`Équipement ${dev.ip} placé en quarantaine.`);
                }
                window.showToast(`Bouclier activé : l'équipement ${dev.ip} est totalement isolé via le Pare-feu Windows.`, 'danger', 'QUARANTAINE ACTIVE');
            }
        }
        await refreshDevices();
    });

    // ─── API 5 : Résolution OUI en ligne via MACVendors ─────────────────────
    document.getElementById('modal-btn-lookup-mac')?.addEventListener('click', async () => {
        const mac = document.getElementById('modal-device-mac').value;
        const btn = document.getElementById('modal-btn-lookup-mac');
        const vendorEl = document.getElementById('modal-info-vendor');
        if (!mac) return;

        btn.disabled = true;
        btn.innerHTML = `<i data-lucide="loader-2" class="spin"></i> ...`;
        if (window.lucide) window.lucide.createIcons();

        try {
            const vendor = await window.api.lookupMacOnline(mac);
            if (vendor && vendor !== 'Inconnu') {
                vendorEl.innerText = vendor;
                vendorEl.style.color = 'var(--accent-cyan)';
                vendorEl.style.fontWeight = 'bold';
                await window.api.updateDevice(mac, { vendor });
                window.showToast(`Constructeur identifié (MACVendors) : ${vendor}`, 'success');
                await refreshDevices();
            } else {
                window.showToast('Constructeur non référencé dans la base en ligne.', 'warning');
            }
        } catch (err) {
            window.showToast('Erreur résolution MAC : ' + err.message, 'danger');
        } finally {
            btn.disabled = false;
            btn.innerHTML = `<i data-lucide="search" style="width: 11px; height: 11px;"></i> <span>OUI En Ligne</span>`;
            if (window.lucide) window.lucide.createIcons();
        }
    });

    // ─── APIs 3 & 4 : Audit Cyber ThreatFox (Abuse.ch) & AbuseIPDB ───────────
    document.getElementById('modal-btn-threat-check')?.addEventListener('click', async () => {
        const ip = document.getElementById('modal-info-ip').innerText;
        const btn = document.getElementById('modal-btn-threat-check');
        const resultEl = document.getElementById('modal-threat-result');
        if (!ip || ip === '--') return;

        btn.disabled = true;
        btn.innerHTML = `<i data-lucide="loader-2" class="spin"></i> Analyse Cyber...`;
        if (window.lucide) window.lucide.createIcons();

        try {
            resultEl.style.display = 'block';
            resultEl.innerHTML = `<span style="color: var(--accent-cyan); display: flex; align-items: center; gap: 6px;"><i data-lucide="loader-2" class="spin"></i> Interrogation des bases ThreatFox (Abuse.ch) et AbuseIPDB en cours...</span>`;
            if (window.lucide) window.lucide.createIcons();

            const [c2Data, abuseData] = await Promise.all([
                window.api.checkThreatC2(ip),
                window.api.checkIpReputation(ip)
            ]);

            const isC2 = c2Data && c2Data.isMalicious;
            const abuseScore = abuseData?.abuseConfidenceScore || 0;

            resultEl.innerHTML = `
                <div style="display: flex; flex-direction: column; gap: 6px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-weight: 700; color: ${isC2 ? 'var(--accent-red)' : 'var(--accent-green)'};">
                            ${isC2 ? '🚨 DÉTECTION C2 / BOTNET' : '✅ Aucune signature C2 Botnet (ThreatFox)'}
                        </span>
                        <span class="badge ${isC2 ? 'badge-blocked' : 'badge-trusted'}">${isC2 ? 'MALVEILLANT' : 'CONFORME'}</span>
                    </div>
                    ${isC2 ? `<div style="color: var(--accent-red); font-size: 11px;">Type : ${c2Data.threatType} | Malware : ${c2Data.malware} | Confiance : ${c2Data.confidence}%</div>` : ''}
                    <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 5px;">
                        <span>Score de Malveillance (AbuseIPDB) :</span>
                        <span style="font-weight: 700; color: ${abuseScore > 20 ? 'var(--accent-amber)' : 'var(--accent-green)'};">${abuseScore} / 100</span>
                    </div>
                    <div style="font-size: 10px; color: var(--text-muted);">${escapeHtml(abuseData?.status || 'Analyse heuristique locale')}</div>
                </div>
            `;
            window.showToast(isC2 ? `Alerte : IP ${ip} identifiée comme malveillante !` : `Audit de réputation : ${ip} est saine.`, isC2 ? 'danger' : 'success');
        } catch (err) {
            resultEl.innerHTML = `<span style="color: var(--accent-red);">Échec de l'audit cyber : ${escapeHtml(err.message)}</span>`;
            window.showToast('Erreur audit cyber : ' + err.message, 'danger');
        } finally {
            btn.disabled = false;
            btn.innerHTML = `<i data-lucide="crosshair"></i> <span>Auditer IP</span>`;
            if (window.lucide) window.lucide.createIcons();
        }
    });
}

window.openDeviceModal = async function(mac) {
    const dev = appState.devices.find(d => d.mac === mac);
    if (!dev) return;

    // Réinitialiser sur le premier onglet (Identité & CMDB)
    const tabs = document.querySelectorAll('#device-modal .modal-tab');
    tabs.forEach(t => t.classList.toggle('active', t.getAttribute('data-tab') === 'cmdb'));
    document.querySelectorAll('#device-modal .modal-tab-pane').forEach(p => {
        p.classList.toggle('active', p.id === 'modal-pane-cmdb');
    });

    const threatResultEl = document.getElementById('modal-threat-result');
    if (threatResultEl) {
        threatResultEl.style.display = 'none';
        threatResultEl.innerHTML = '';
    }

    document.getElementById('modal-device-mac').value = dev.mac;
    document.getElementById('modal-device-custom-name').value = dev.customName || '';
    if (document.getElementById('modal-device-category')) {
        document.getElementById('modal-device-category').value = defaultCategoryOf(dev);
    }
    if (document.getElementById('modal-device-owner')) {
        document.getElementById('modal-device-owner').value = dev.owner || '';
    }
    if (document.getElementById('modal-device-department')) {
        document.getElementById('modal-device-department').value = dev.department || '';
    }
    if (document.getElementById('modal-device-location')) {
        document.getElementById('modal-device-location').value = dev.location || '';
    }
    if (document.getElementById('modal-device-authorized')) {
        document.getElementById('modal-device-authorized').checked = !!(dev.authorized || dev.isTrusted);
    }
    if (document.getElementById('modal-device-critical')) {
        document.getElementById('modal-device-critical').checked = !!dev.isCritical;
    }
    if (document.getElementById('modal-device-notes')) {
        document.getElementById('modal-device-notes').value = dev.notes || '';
    }

    document.getElementById('modal-info-ip').innerText = dev.ip;
    document.getElementById('modal-info-mac').innerText = dev.mac;
    document.getElementById('modal-info-vendor').innerText = dev.vendor || 'Inconnu';
    document.getElementById('modal-info-model').innerText = dev.model || 'Non détecté';
    document.getElementById('modal-info-hostname').innerText = dev.hostname || 'Non résolu';
    document.getElementById('modal-info-firstseen').innerText = new Date(dev.firstSeen).toLocaleString('fr-FR');
    document.getElementById('modal-info-lastseen').innerText = new Date(dev.lastSeen).toLocaleString('fr-FR');

    const container = document.getElementById('modal-ports-container');
    const listEl = document.getElementById('modal-ports-list');
    const countBadge = document.getElementById('modal-ports-count-badge');
    if (container && dev.openPorts && dev.openPorts.length > 0) {
        container.style.display = 'block';
        countBadge.innerText = `${dev.openPorts.length} port(s)`;
        listEl.innerHTML = dev.openPorts.map(p => `
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; padding: 3px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                <span><strong style="color: var(--accent-cyan); font-family: monospace;">Port ${typeof p === 'object' ? p.port : p}</strong> ${typeof p === 'object' ? `(${escapeHtml(p.service)})` : ''}</span>
                <span class="badge ${typeof p === 'object' && (p.risk === 'CRITICAL' || p.risk === 'HIGH') ? 'badge-blocked' : 'badge-trusted'}">${typeof p === 'object' ? p.risk : 'OUVERT'}</span>
            </div>
        `).join('');
    } else if (container) {
        container.style.display = 'none';
    }

    const blockText = document.getElementById('modal-block-text');
    if (blockText) {
        blockText.innerText = dev.isBlocked ? 'Débloquer' : 'Bloquer';
    }

    const isolateText = document.getElementById('modal-isolate-text');
    if (isolateText) {
        const isIsolated = await window.api.checkQuarantineStatus(dev.ip);
        isolateText.innerText = isIsolated ? 'Lever Isolation' : 'Isoler (Pare-feu)';
    }

    document.getElementById('device-modal').classList.add('active');
    if (window.lucide) window.lucide.createIcons();
};

window.trustDevice = async function(mac) {
    await window.api.updateDevice(mac, { isTrusted: true, isBlocked: false });
    await refreshDevices();
};

window.blockDevice = async function(mac) {
    await window.api.updateDevice(mac, { isBlocked: true, isTrusted: false });
    await refreshDevices();
};

window.unblockDevice = async function(mac) {
    await window.api.updateDevice(mac, { isBlocked: false });
    await refreshDevices();
};

window.markAlertRead = async function(id) {
    await window.api.markAlertRead(id);
    await refreshAlerts();
};

