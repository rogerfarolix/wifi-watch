/**
 * Wifi-Watch - RuView Visualizer (WiFi DensePose & CSI Spatial Analyzer)
 * Rendu graphique Canvas temps réel pour la détection RF open-source RuView :
 * - Reconstruction du squelette humain 3D (17 articulations COCO) à travers les murs.
 * - Oscilloscope biométrique de la respiration et du rythme cardiaque.
 * - Analyseur de spectre OFDM (56 sous-porteuses CSI).
 */

class RuViewVisualizer {
    constructor(poseCanvasId, waveCanvasId) {
        this.poseCanvas = document.getElementById(poseCanvasId);
        this.waveCanvas = document.getElementById(waveCanvasId);

        this.poseCtx = this.poseCanvas ? this.poseCanvas.getContext('2d') : null;
        this.waveCtx = this.waveCanvas ? this.waveCanvas.getContext('2d') : null;

        // Historique pour l'oscilloscope de respiration
        this.waveHistory = new Array(120).fill(0.5);
        this.lastTelemetry = null;

        // Connexions anatomiques des 17 articulations COCO
        this.skeletonBones = [
            // Tête
            [1, 2], [1, 0], [2, 0], [1, 3], [2, 4],
            // Épaules et Torse
            [5, 6], [5, 11], [6, 12], [11, 12],
            // Bras Gauche
            [5, 7], [7, 9],
            // Bras Droit
            [6, 8], [8, 10],
            // Jambe Gauche
            [11, 13], [13, 15],
            // Jambe Droite
            [12, 14], [14, 16]
        ];

        this.init();
    }

    init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        if (this.poseCanvas) {
            const rect = this.poseCanvas.parentElement.getBoundingClientRect();
            this.poseCanvas.width = rect.width;
            this.poseCanvas.height = Math.max(340, rect.height || 360);
        }
        if (this.waveCanvas) {
            const rect = this.waveCanvas.parentElement.getBoundingClientRect();
            this.waveCanvas.width = rect.width;
            this.waveCanvas.height = Math.max(200, rect.height || 220);
        }
    }

    updateTelemetry(data) {
        this.lastTelemetry = data;

        if (data.breathingWave !== undefined) {
            this.waveHistory.push(data.breathingWave);
            if (this.waveHistory.length > 120) {
                this.waveHistory.shift();
            }
        }

        this.renderPose(data);
        this.renderWaveAndCsi(data);
    }

    /**
     * Rendu du squelette 3D DensePose (Wi-Fi Human Pose Estimation)
     */
    renderPose(data) {
        if (!this.poseCtx || !this.poseCanvas) return;
        const ctx = this.poseCtx;
        const w = this.poseCanvas.width;
        const h = this.poseCanvas.height;

        // 1. Fond Cyber-Radar
        ctx.fillStyle = '#070b12';
        ctx.fillRect(0, 0, w, h);

        // Grille de perspective spatiale
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.08)';
        ctx.lineWidth = 1;

        const centerX = w / 2;
        const centerY = h * 0.48;

        for (let y = centerY; y < h; y += 22) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }
        for (let x = -w; x <= w * 2; x += 60) {
            ctx.beginPath();
            ctx.moveTo(centerX, centerY - 60);
            ctx.lineTo(x, h);
            ctx.stroke();
        }

        // Si aucune présence humaine n'est détectée
        if (!data.presence) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.font = '13px "Segoe UI", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(window.i18n ? window.i18n.tr('Périmètre vide : Aucune onde de diffusion corporelle détectée') : 'Périmètre vide : Aucune onde de diffusion corporelle détectée', centerX, centerY);

            ctx.strokeStyle = 'rgba(0, 240, 255, 0.2)';
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.arc(centerX, centerY, 80, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            return;
        }

        const isFall = data.activity === 'FALL_ALERT';
        const primaryColor = isFall ? '#ff3366' : '#00f0ff';
        const jointGlow = isFall ? 'rgba(255, 51, 102, 0.4)' : 'rgba(0, 240, 255, 0.4)';
        const keypoints = data.keypoints || [];

        // Conversion des coordonnées normalisées en pixels
        const scale = Math.min(w * 0.42, h * 0.44);
        const mappedPoints = keypoints.map(pt => ({
            x: centerX + pt.x * scale,
            y: centerY + pt.y * scale,
            conf: pt.confidence || 0.9
        }));

        // 2. Tracé des os du squelette (Bones)
        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = 3;
        ctx.shadowColor = primaryColor;
        ctx.shadowBlur = 12;

        this.skeletonBones.forEach(([idxA, idxB]) => {
            const pA = mappedPoints[idxA];
            const pB = mappedPoints[idxB];
            if (pA && pB) {
                ctx.beginPath();
                ctx.moveTo(pA.x, pA.y);
                ctx.lineTo(pB.x, pB.y);
                ctx.stroke();
            }
        });

        // 3. Tracé des articulations (Joints)
        mappedPoints.forEach((pt, idx) => {
            const isHead = idx <= 4;
            const radius = isHead ? 4 : 5.5;

            // Halo
            ctx.fillStyle = jointGlow;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, radius * 2, 0, Math.PI * 2);
            ctx.fill();

            // Point central
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.shadowBlur = 0;

        // 4. Badges HUD sur le canvas
        ctx.fillStyle = 'rgba(9, 13, 22, 0.85)';
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(14, 14, 210, 56, 8);
        ctx.fill();
        ctx.stroke();

        ctx.font = '11px monospace';
        ctx.fillStyle = 'var(--text-muted, #7c8ba1)';
        ctx.textAlign = 'left';
        ctx.fillText('RUVIEW DENSEPOSE 3D', 26, 32);

        ctx.font = 'bold 12px "Segoe UI", sans-serif';
        ctx.fillStyle = isFall ? '#ff3366' : '#00f0ff';
        ctx.fillText(`${data.confidence}% ${window.i18n ? window.i18n.tr('Confiance RF //') : 'Confiance RF //'} ${data.occupancy} ${window.i18n ? window.i18n.tr('Humain') : 'Humain'}`, 26, 52);
    }

    /**
     * Rendu de l'oscilloscope de respiration et du spectre CSI 56 sous-porteuses
     */
    renderWaveAndCsi(data) {
        if (!this.waveCtx || !this.waveCanvas) return;
        const ctx = this.waveCtx;
        const w = this.waveCanvas.width;
        const h = this.waveCanvas.height;

        ctx.fillStyle = '#070b12';
        ctx.fillRect(0, 0, w, h);

        const splitY = h * 0.48;

        // ─── 1. Onde de Respiration (Haut) ──────────────────────────────────
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, splitY / 2);
        ctx.lineTo(w, splitY / 2);
        ctx.stroke();

        // Tracé de l'onde
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 8;

        ctx.beginPath();
        const step = w / (this.waveHistory.length - 1);
        for (let i = 0; i < this.waveHistory.length; i++) {
            const val = this.waveHistory[i];
            const x = i * step;
            const y = 8 + (1 - val) * (splitY - 16);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Label Respiration
        ctx.font = '11px monospace';
        ctx.fillStyle = 'rgba(0, 240, 255, 0.8)';
        ctx.fillText(`${window.i18n ? window.i18n.tr('ONDE RESPIRATOIRE :') : 'ONDE RESPIRATOIRE :'} ${data.breathingBpm || '--'} BPM`, 14, 20);

        // Ligne de séparation
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.beginPath();
        ctx.moveTo(0, splitY);
        ctx.lineTo(w, splitY);
        ctx.stroke();

        // ─── 2. Spectre OFDM CSI 56 Sous-Porteuses (Bas) ────────────────────
        const spectrum = data.csiSpectrum || [];
        const barAreaH = h - splitY - 14;
        const barW = Math.max(2, (w - 28) / 56);

        ctx.font = '10px monospace';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fillText(window.i18n ? window.i18n.tr('SPECTRE DE SOUS-PORTEUSES CSI (56 CANAUX OFDM)') : 'SPECTRE DE SOUS-PORTEUSES CSI (56 CANAUX OFDM)', 14, splitY + 16);

        for (let i = 0; i < spectrum.length; i++) {
            const val = spectrum[i]; // 0 à 70
            const barH = (val / 70) * (barAreaH - 18);
            const x = 14 + i * barW;
            const y = h - 6 - barH;

            // Dégradé cyan vers orange si forte distorsion corporelle
            const isDisturbed = Math.abs(i - 28) < 14;
            ctx.fillStyle = isDisturbed ? 'rgba(0, 240, 255, 0.75)' : 'rgba(0, 150, 255, 0.35)';

            ctx.fillRect(x, y, barW - 1.5, barH);
        }
    }
}

window.RuViewVisualizer = RuViewVisualizer;
