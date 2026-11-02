/**
 * Wifi-Watch — Radar & Interactive Network Topology Engine
 * Moteur de rendu Canvas haute performance pour visualiser le réseau
 * sous forme de radar tactique cyberpunk avec détection interactive.
 */

class NetworkRadar {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');

        this.devices = [];
        this.nodes = [];
        this.gatewayIp = null;
        this.wifiInfo = {};
        this.gateway = null;
        this.hoveredNode = null;
        this.animationFrameId = null;

        this.sweepAngle = 0;
        this.sweepSpeed = 0.025; // radians par frame
        this.pulseRadius = 0;

        this.showOffline = true;
        this.mode = 'radar'; // 'radar' ou 'topology'
        this.dpr = window.devicePixelRatio || 1;

        this.initCanvas();
        this.setupEventListeners();
        this.startAnimation();
    }

    initCanvas() {
        if (!this.canvas) return;
        const rect = this.canvas.getBoundingClientRect();
        this.width = rect.width;
        this.height = rect.height;

        this.canvas.width = this.width * this.dpr;
        this.canvas.height = this.height * this.dpr;
        this.ctx.scale(this.dpr, this.dpr);

        this.centerX = this.width / 2;
        this.centerY = this.height / 2;
        this.maxRadius = Math.min(this.centerX, this.centerY) - 40;
    }

    setupEventListeners() {
        if (!this.canvas) return;

        window.addEventListener('resize', () => {
            this.initCanvas();
            this.calculatePositions();
        });

        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            this.checkHover(mouseX, mouseY);
        });

        this.canvas.addEventListener('mouseleave', () => {
            this.hoveredNode = null;
            this.canvas.style.cursor = 'default';
        });

        this.canvas.addEventListener('click', () => {
            if (this.hoveredNode && window.openDeviceModal) {
                window.openDeviceModal(this.hoveredNode.mac);
            }
        });
    }

    setData(devices, gatewayIp, wifiInfo) {
        this.devices = devices || [];
        this.gatewayIp = gatewayIp;
        this.wifiInfo = wifiInfo || {};
        this.calculatePositions();
    }

    /** Texte traduit dans la langue courante (libellés dessinés sur le canvas). */
    tr(text) {
        return window.i18n ? window.i18n.tr(text) : text;
    }

    toggleMode() {
        this.mode = this.mode === 'radar' ? 'topology' : 'radar';
        this.calculatePositions();
        return this.mode;
    }

    calculatePositions() {
        this.nodes = [];
        const activeDevices = this.showOffline ? this.devices : this.devices.filter(d => d.isOnline);

        // Nœud central : Box / Routeur
        const gatewayDevice = this.devices.find(d => d.ip === this.gatewayIp) || {
            mac: this.wifiInfo.bssid || '00:00:00:00:00:00',
            ip: this.gatewayIp || '192.168.1.254',
            customName: `Box Internet (${this.wifiInfo.ssid || 'Routeur'})`,
            vendor: 'Canalbox / Passerelle',
            deviceType: 'router',
            isOnline: true,
            isTrusted: true
        };

        if (this.mode === 'topology') {
            this.calculateTopologyPositions(activeDevices, gatewayDevice);
            return;
        }

        this.centralNode = {
            ...gatewayDevice,
            x: this.centerX,
            y: this.centerY,
            radius: 24,
            isCentral: true
        };

        // Appareils périphériques en mode radar polaire
        const orbiting = activeDevices.filter(d => d.ip !== this.gatewayIp);
        const count = orbiting.length;

        orbiting.forEach((dev, idx) => {
            let ringFactor = 0.55;
            if (dev.isBlocked) ringFactor = 0.88;
            else if (!dev.isTrusted) ringFactor = 0.72;
            else if (dev.deviceType === 'laptop' || dev.deviceType === 'desktop') ringFactor = 0.42;

            const baseRadius = this.maxRadius * ringFactor;
            const angle = (idx / Math.max(1, count)) * (Math.PI * 2) - Math.PI / 2;

            const x = this.centerX + Math.cos(angle) * baseRadius;
            const y = this.centerY + Math.sin(angle) * baseRadius;

            this.nodes.push({
                ...dev,
                x,
                y,
                radius: 16,
                angle,
                distance: baseRadius,
                isCentral: false
            });
        });
    }

    calculateTopologyPositions(activeDevices, gatewayDevice) {
        this.centralNode = {
            ...gatewayDevice,
            x: this.centerX,
            y: 80,
            radius: 24,
            isCentral: true
        };

        const orbiting = activeDevices.filter(d => d.ip !== this.gatewayIp);
        if (orbiting.length === 0) return;

        // Regrouper par catégorie
        const cats = {};
        for (const dev of orbiting) {
            const c = dev.category || dev.deviceType || 'workstation';
            if (!cats[c]) cats[c] = [];
            cats[c].push(dev);
        }

        const catKeys = Object.keys(cats);
        const colWidth = Math.max(80, (this.width - 100) / Math.max(1, catKeys.length));

        catKeys.forEach((catKey, catIdx) => {
            const colCenterX = 50 + colWidth * (catIdx + 0.5);
            const devList = cats[catKey];

            devList.forEach((dev, devIdx) => {
                const y = 180 + devIdx * 65;
                this.nodes.push({
                    ...dev,
                    x: colCenterX,
                    y: y,
                    radius: 16,
                    isCentral: false,
                    categoryKey: catKey
                });
            });
        });
    }

    checkHover(mouseX, mouseY) {
        let found = null;

        // Vérifier d'abord les nœuds périphériques
        for (const node of this.nodes) {
            const dist = Math.hypot(node.x - mouseX, node.y - mouseY);
            if (dist <= node.radius + 6) {
                found = node;
                break;
            }
        }

        // Vérifier le nœud central
        if (!found && this.centralNode) {
            const dist = Math.hypot(this.centralNode.x - mouseX, this.centralNode.y - mouseY);
            if (dist <= this.centralNode.radius + 6) {
                found = this.centralNode;
            }
        }

        this.hoveredNode = found;
        this.canvas.style.cursor = found ? 'pointer' : 'default';
    }

    startAnimation() {
        const loop = () => {
            this.draw();
            this.sweepAngle += this.sweepSpeed;
            if (this.sweepAngle >= Math.PI * 2) this.sweepAngle = 0;

            this.pulseRadius += 0.8;
            if (this.pulseRadius > this.maxRadius) this.pulseRadius = 0;

            this.animationFrameId = requestAnimationFrame(loop);
        };
        loop();
    }

    draw() {
        if (!this.ctx || !this.width) return;
        const ctx = this.ctx;

        ctx.clearRect(0, 0, this.width, this.height);

        if (this.mode === 'topology') {
            // Mode Topologie d'entreprise (Arborescence et liaisons courbes)
            this.drawTopologyGrid(ctx);
            this.drawTopologyLinks(ctx);
        } else {
            // Mode Radar Tactique Polaire
            this.drawRadarGrid(ctx);
            this.drawSweepLine(ctx);
            this.drawConnectionLinks(ctx);
        }

        // 4. Dessin des nœuds périphériques
        for (const node of this.nodes) {
            this.drawDeviceNode(ctx, node);
        }

        // 5. Dessin du nœud central (Box Internet)
        if (this.centralNode) {
            this.drawCentralNode(ctx, this.centralNode);
        }

        // 6. Tooltip d'information en survol
        if (this.hoveredNode) {
            this.drawTooltip(ctx, this.hoveredNode);
        }
    }

    drawTopologyGrid(ctx) {
        ctx.save();
        ctx.strokeStyle = 'rgba(45, 62, 96, 0.2)';
        ctx.lineWidth = 1;

        const step = 45;
        for (let x = 0; x < this.width; x += step) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.height);
            ctx.stroke();
        }
        for (let y = 0; y < this.height; y += step) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.width, y);
            ctx.stroke();
        }

        // WAN / Internet badge au-dessus de la passerelle
        if (this.centralNode) {
            const bx = this.centralNode.x;
            ctx.fillStyle = 'rgba(0, 240, 255, 0.12)';
            ctx.fillRect(bx - 60, 16, 120, 24);
            ctx.strokeStyle = 'rgba(0, 240, 255, 0.45)';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(bx - 60, 16, 120, 24);

            ctx.fillStyle = '#00f0ff';
            ctx.font = 'bold 11px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('🌐 INTERNET / WAN', bx, 32);

            // Liaison descendante vers la Box
            ctx.beginPath();
            ctx.moveTo(bx, 40);
            ctx.lineTo(bx, this.centralNode.y - this.centralNode.radius);
            ctx.strokeStyle = '#00f0ff';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        ctx.restore();
    }

    drawTopologyLinks(ctx) {
        ctx.save();
        if (!this.centralNode) return;

        for (const node of this.nodes) {
            ctx.beginPath();
            ctx.moveTo(this.centralNode.x, this.centralNode.y);

            const cpX = (this.centralNode.x + node.x) / 2;
            const cpY = (this.centralNode.y + node.y) / 2 - 20;
            ctx.quadraticCurveTo(cpX, cpY, node.x, node.y);

            if (node.isBlocked) {
                ctx.strokeStyle = 'rgba(239, 68, 68, 0.45)';
                ctx.setLineDash([3, 4]);
            } else if (!node.isOnline) {
                ctx.strokeStyle = 'rgba(100, 116, 139, 0.2)';
                ctx.setLineDash([2, 4]);
            } else if (node.isTrusted) {
                ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
            } else {
                ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
                ctx.setLineDash([4, 4]);
            }

            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.setLineDash([]);
        }
        ctx.restore();
    }

    drawRadarGrid(ctx) {
        ctx.save();
        const rings = [0.25, 0.5, 0.75, 1.0];

        // Anneaux concentriques
        rings.forEach((ring) => {
            const r = this.maxRadius * ring;
            ctx.beginPath();
            ctx.arc(this.centerX, this.centerY, r, 0, Math.PI * 2);
            ctx.strokeStyle = ring === 1.0 ? 'rgba(0, 240, 255, 0.35)' : 'rgba(45, 62, 96, 0.4)';
            ctx.lineWidth = ring === 1.0 ? 1.5 : 1;
            ctx.stroke();

            // Labels de distance / latence
            ctx.fillStyle = 'rgba(100, 116, 139, 0.6)';
            ctx.font = '10px monospace';
            const label = (window.i18n ? window.i18n.tr.bind(window.i18n) : (x) => x)(ring === 0.25 ? '0-5ms' : (ring === 0.5 ? 'Zone Fiable' : (ring === 0.75 ? 'Périphérie' : 'Limite Réseau')));
            ctx.fillText(label, this.centerX + 6, this.centerY - r + 12);
        });

        // Axes en croix
        ctx.beginPath();
        ctx.moveTo(this.centerX - this.maxRadius, this.centerY);
        ctx.lineTo(this.centerX + this.maxRadius, this.centerY);
        ctx.moveTo(this.centerX, this.centerY - this.maxRadius);
        ctx.lineTo(this.centerX, this.centerY + this.maxRadius);
        ctx.strokeStyle = 'rgba(45, 62, 96, 0.25)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Onde d'impulsion périodique
        if (this.pulseRadius > 0) {
            const alpha = 1 - (this.pulseRadius / this.maxRadius);
            ctx.beginPath();
            ctx.arc(this.centerX, this.centerY, this.pulseRadius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(0, 240, 255, ${alpha * 0.35})`;
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }

        ctx.restore();
    }

    drawSweepLine(ctx) {
        ctx.save();
        ctx.translate(this.centerX, this.centerY);

        // Faisceau lumineux avec gradient angulaire
        const gradient = ctx.createRadialGradient(0, 0, 10, 0, 0, this.maxRadius);
        gradient.addColorStop(0, 'rgba(0, 240, 255, 0.25)');
        gradient.addColorStop(1, 'rgba(0, 240, 255, 0.0)');

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, this.maxRadius, this.sweepAngle - 0.45, this.sweepAngle);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();

        // Ligne de front brillante
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(this.sweepAngle) * this.maxRadius, Math.sin(this.sweepAngle) * this.maxRadius);
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 8;
        ctx.stroke();

        ctx.restore();
    }

    drawConnectionLinks(ctx) {
        ctx.save();
        for (const node of this.nodes) {
            ctx.beginPath();
            ctx.moveTo(this.centerX, this.centerY);
            ctx.lineTo(node.x, node.y);

            if (node.isBlocked) {
                ctx.strokeStyle = 'rgba(239, 68, 68, 0.3)';
                ctx.setLineDash([3, 5]);
            } else if (!node.isOnline) {
                ctx.strokeStyle = 'rgba(100, 116, 139, 0.15)';
                ctx.setLineDash([2, 4]);
            } else if (node.isTrusted) {
                ctx.strokeStyle = 'rgba(16, 185, 129, 0.25)';
            } else {
                ctx.strokeStyle = 'rgba(245, 158, 11, 0.25)';
                ctx.setLineDash([4, 4]);
            }

            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.setLineDash([]);
        }
        ctx.restore();
    }

    drawCentralNode(ctx, node) {
        ctx.save();

        // Halo lumineux cyan
        const glow = ctx.createRadialGradient(node.x, node.y, 4, node.x, node.y, 38);
        glow.addColorStop(0, 'rgba(0, 240, 255, 0.4)');
        glow.addColorStop(1, 'rgba(0, 240, 255, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(node.x, node.y, 38, 0, Math.PI * 2);
        ctx.fill();

        // Cercle extérieur
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#091528';
        ctx.fill();
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 12;
        ctx.stroke();

        // Texte au centre : BOX / AP
        ctx.fillStyle = '#00f0ff';
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('BOX', node.x, node.y);

        // Nom en dessous
        ctx.fillStyle = '#f8fafc';
        ctx.font = '600 11px Inter, sans-serif';
        ctx.fillText(window.i18n ? window.i18n.tr(node.customName || 'Passerelle') : (node.customName || 'Passerelle'), node.x, node.y + node.radius + 14);

        ctx.restore();
    }

    drawDeviceNode(ctx, node) {
        ctx.save();
        const isHovered = (this.hoveredNode === node);

        // Couleur selon le statut
        let color = '#10b981'; // vert : en ligne de confiance
        let shadowColor = '#10b981';

        if (node.isBlocked) {
            color = '#ef4444';
            shadowColor = '#ef4444';
        } else if (!node.isOnline) {
            color = '#64748b';
            shadowColor = 'transparent';
        } else if (!node.isTrusted) {
            color = '#f59e0b';
            shadowColor = '#f59e0b';
        }

        // Halo en survol
        if (isHovered) {
            ctx.beginPath();
            ctx.arc(node.x, node.y, node.radius + 8, 0, Math.PI * 2);
            ctx.fillStyle = color.replace(')', ', 0.25)').replace('rgb', 'rgba');
            ctx.fill();
        }

        // Cercle de l'appareil
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#0e172a';
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = isHovered ? 2.5 : 1.8;

        if (node.isOnline && !node.isBlocked) {
            ctx.shadowColor = shadowColor;
            ctx.shadowBlur = 8;
        }
        ctx.stroke();

        // Nom d'abréviation ou symbole
        ctx.fillStyle = color;
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const shortType = (node.deviceType === 'phone' ? 'MOB' : (node.deviceType === 'laptop' ? 'PC' : (node.deviceType === 'tv' ? 'TV' : 'DEV')));
        ctx.fillText(shortType, node.x, node.y);

        // Nom de l'appareil sous le cercle
        ctx.fillStyle = isHovered ? '#00f0ff' : '#94a3b8';
        ctx.font = `${isHovered ? '600' : '500'} 10px Inter, sans-serif`;
        const displayName = this.tr(node.customName || node.hostname || node.ip).slice(0, 16);
        ctx.fillText(displayName, node.x, node.y + node.radius + 12);

        ctx.restore();
    }

    drawTooltip(ctx, node) {
        ctx.save();
        const padding = 12;
        const boxWidth = 230;
        const boxHeight = 110;

        let tx = node.x + 20;
        let ty = node.y - 40;

        // Éviter de déborder de l'écran
        if (tx + boxWidth > this.width) tx = node.x - boxWidth - 20;
        if (ty + boxHeight > this.height) ty = this.height - boxHeight - 10;
        if (ty < 10) ty = 10;

        // Boîte avec bordure cyan néon
        ctx.fillStyle = 'rgba(10, 15, 29, 0.95)';
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
        ctx.shadowBlur = 14;

        ctx.beginPath();
        ctx.roundRect(tx, ty, boxWidth, boxHeight, 8);
        ctx.fill();
        ctx.stroke();

        // Contenu texte
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        // Titre
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 12px Inter, sans-serif';
        const title = this.tr(node.customName || node.hostname || node.mac).slice(0, 24);
        ctx.fillText(title, tx + padding, ty + padding);

        // Détails
        ctx.font = '11px monospace';
        ctx.fillStyle = '#00f0ff';
        ctx.fillText(`IP  : ${node.ip}`, tx + padding, ty + padding + 22);

        ctx.fillStyle = '#94a3b8';
        ctx.fillText(`MAC : ${node.mac}`, tx + padding, ty + padding + 38);

        ctx.font = '11px Inter, sans-serif';
        ctx.fillText(`${window.i18n ? window.i18n.tr('Marque :') : 'Marque :'} ${node.vendor || 'Inconnu'}`, tx + padding, ty + padding + 54);

        // Statut & Ping
        const statusText = node.isBlocked ? 'BLOQUÉ' : (node.isOnline ? 'EN LIGNE' : 'HORS LIGNE');
        const statusColor = node.isBlocked ? '#ef4444' : (node.isOnline ? '#10b981' : '#64748b');

        ctx.fillStyle = statusColor;
        ctx.font = 'bold 10px Inter, sans-serif';
        const pingTxt = node.latencyMs !== null ? ` • Latence: ${node.latencyMs}ms` : '';
        ctx.fillText(`${statusText}${pingTxt}`, tx + padding, ty + padding + 72);

        // Indication de clic
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.font = 'italic 9px Inter, sans-serif';
        ctx.fillText(window.i18n ? window.i18n.tr('Cliquez pour gérer cet appareil') : 'Cliquez pour gérer cet appareil', tx + padding, ty + padding + 90);

        ctx.restore();
    }

    destroy() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
    }
}

window.NetworkRadar = NetworkRadar;
