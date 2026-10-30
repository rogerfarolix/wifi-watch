/**
 * Wifi-Watch — IoT Spy Hunter (Détecteur Caméras & Micros Espions)
 * Détecte les équipements de surveillance cachés sur le réseau local :
 * Caméras IP, Micros espions, flux RTSP non chiffrés, serveurs ONVIF,
 * DVRs, NVRs et objets connectés suspects.
 */

const net = require('net');
const http = require('http');

// Ports caractéristiques d'équipements de surveillance et streaming
const SPY_PORTS = [
    { port: 554, service: 'RTSP', protocol: 'Video Stream', desc: 'Flux vidéo en direct non chiffré (RTSP)', risk: 'high' },
    { port: 8554, service: 'RTSP-Alt', protocol: 'Video Stream', desc: 'Flux vidéo alternatif (RTSP)', risk: 'high' },
    { port: 8000, service: 'Hikvision / DVR', protocol: 'Camera Control', desc: 'Port de gestion Hikvision / DVR', risk: 'high' },
    { port: 8899, service: 'ONVIF', protocol: 'Camera API', desc: 'Service de découverte ONVIF IP Camera', risk: 'high' },
    { port: 37777, service: 'Dahua DVR', protocol: 'Camera Stream', desc: 'Port propriétaire Dahua Technology', risk: 'high' },
    { port: 37778, service: 'Dahua Audio', protocol: 'Audio Stream', desc: 'Port audio bidirectionnel Dahua', risk: 'high' },
    { port: 1935, service: 'RTMP', protocol: 'Live Stream', desc: 'Flux vidéo temps réel RTMP', risk: 'medium' },
    { port: 8080, service: 'MJPEG / WebCam', protocol: 'Web Stream', desc: 'Interface de streaming vidéo web MJPEG', risk: 'medium' }
];

// Mots-clés de fabricants reconnus pour la surveillance
const CAMERA_VENDORS = [
    { keyword: 'hikvision', brand: 'Hikvision', type: 'Caméra / NVR', risk: 'critical' },
    { keyword: 'dahua', brand: 'Dahua Technology', type: 'Caméra / DVR', risk: 'critical' },
    { keyword: 'foscam', brand: 'Foscam', type: 'Caméra IP Intérieure/Extérieure', risk: 'high' },
    { keyword: 'axis', brand: 'Axis Communications', type: 'Caméra Professionnelle', risk: 'high' },
    { keyword: 'reolink', brand: 'Reolink', type: 'Caméra de Sécurité', risk: 'high' },
    { keyword: 'wyze', brand: 'Wyze Labs', type: 'Micro & Caméra Connectée', risk: 'high' },
    { keyword: 'amcrest', brand: 'Amcrest', type: 'Caméra IP', risk: 'high' },
    { keyword: 'ring', brand: 'Ring (Amazon)', type: 'Sonnette Vidéo & Caméra', risk: 'medium' },
    { keyword: 'arlo', brand: 'Arlo Technologies', type: 'Caméra de Surveillance sans fil', risk: 'medium' },
    { keyword: 'eufy', brand: 'Eufy (Anker)', type: 'Caméra & Détecteur', risk: 'medium' },
    { keyword: 'nest', brand: 'Google Nest', type: 'Caméra & Micro Connecté', risk: 'medium' },
    { keyword: 'vstarcam', brand: 'VStarcam', type: 'Micro Caméra Espion', risk: 'critical' },
    { keyword: 'xiongmai', brand: 'Xiongmai Tech', type: 'Module Caméra OEM (Fréquemment vulnérable)', risk: 'critical' },
    { keyword: 'hangzhou', brand: 'Hangzhou Hikvision', type: 'Caméra de Surveillance', risk: 'critical' },
    { keyword: 'tuya', brand: 'Tuya Smart', type: 'Caméra / Micro IoT', risk: 'medium' },
    { keyword: 'espressif', brand: 'Espressif (ESP32-CAM)', type: 'Module Micro / Espion DIY', risk: 'high' },
    { keyword: 'tapo', brand: 'TP-Link Tapo', type: 'Caméra & Détecteur', risk: 'medium' }
];

/**
 * Teste la connexion à un port TCP donné
 */
function probePort(ip, port, timeoutMs = 500) {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(timeoutMs);

        socket.once('connect', () => {
            socket.destroy();
            resolve(true);
        });

        socket.once('timeout', () => {
            socket.destroy();
            resolve(false);
        });

        socket.once('error', () => {
            socket.destroy();
            resolve(false);
        });

        try {
            socket.connect(port, ip);
        } catch (_) {
            resolve(false);
        }
    });
}

/**
 * Tente d'extraire la bannière HTTP ou le titre HTML pour démasquer une caméra web
 */
function inspectHttpBanner(ip, port = 80, timeoutMs = 1200) {
    return new Promise((resolve) => {
        const req = http.get({
            host: ip,
            port,
            path: '/',
            timeout: timeoutMs,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Security Scanner)'
            }
        }, (res) => {
            let body = '';
            const serverHeader = res.headers['server'] || '';
            const authHeader = res.headers['www-authenticate'] || '';

            res.setEncoding('utf8');
            res.on('data', chunk => {
                if (body.length < 2048) body += chunk;
            });
            res.on('end', () => {
                const combined = (serverHeader + ' ' + authHeader + ' ' + body).toLowerCase();
                let cameraBrand = null;

                for (const v of CAMERA_VENDORS) {
                    if (combined.includes(v.keyword)) {
                        cameraBrand = v.brand;
                        break;
                    }
                }

                const isCamera = !!cameraBrand ||
                    combined.includes('webcam') ||
                    combined.includes('ip camera') ||
                    combined.includes('live stream') ||
                    combined.includes('video stream') ||
                    combined.includes('netcam') ||
                    combined.includes('surveillance');

                resolve({
                    isCamera,
                    detectedBrand: cameraBrand,
                    server: serverHeader,
                    hasAuth: Boolean(authHeader)
                });
            });
        });

        req.on('timeout', () => {
            req.destroy();
            resolve({ isCamera: false });
        });

        req.on('error', () => {
            resolve({ isCamera: false });
        });
    });
}

/**
 * Analyse approfondie d'un équipement pour détecter s'il s'agit d'une caméra ou d'un micro
 */
async function scanDeviceForSurveillance(device) {
    const ip = device.ip;
    const vendor = (device.vendor || '').toLowerCase();
    const hostname = (device.hostname || '').toLowerCase();

    // 1. Analyse basée sur le fabricant
    let matchedVendor = null;
    for (const v of CAMERA_VENDORS) {
        if (vendor.includes(v.keyword) || hostname.includes(v.keyword)) {
            matchedVendor = v;
            break;
        }
    }

    // 2. Scan parallèle des ports de streaming et caméras
    const openPorts = [];
    const portChecks = SPY_PORTS.map(async (p) => {
        const isOpen = await probePort(ip, p.port, 450);
        if (isOpen) {
            openPorts.push(p);
        }
    });

    await Promise.all(portChecks);

    // 3. Inspection HTTP pour signature vidéo
    let httpInfo = { isCamera: false };
    const hasHttp = openPorts.some(p => p.port === 8080) || await probePort(ip, 80, 400);
    if (hasHttp) {
        httpInfo = await inspectHttpBanner(ip, openPorts.some(p => p.port === 8080) ? 8080 : 80);
    }

    // Détermination de la classification
    const hasRtsp = openPorts.some(p => p.port === 554 || p.port === 8554);
    const hasOnvif = openPorts.some(p => p.port === 8899 || p.port === 8000 || p.port === 37777);
    const isConfirmedSurveillance = (hasRtsp || hasOnvif || httpInfo.isCamera || (matchedVendor && openPorts.length > 0));

    // Construction des URLs de flux probables
    const streamUrls = [];
    if (hasRtsp) {
        streamUrls.push(`rtsp://${ip}:554/live/ch0`);
        streamUrls.push(`rtsp://${ip}:554/h264Preview_01_main`);
        streamUrls.push(`rtsp://${ip}:554/onvif1`);
    }

    // Niveau de risque
    let threatLevel = 'SAFE';
    let riskReason = 'Aucun flux vidéo ou micro détecté';

    if (hasRtsp && !httpInfo.hasAuth) {
        threatLevel = 'CRITICAL';
        riskReason = 'Flux vidéo direct (RTSP) ouvert sans authentification requise !';
    } else if (hasRtsp || hasOnvif) {
        threatLevel = 'HIGH';
        riskReason = 'Équipement de diffusion audio/vidéo actif sur le réseau local';
    } else if (matchedVendor) {
        threatLevel = 'MEDIUM';
        riskReason = `Fabricant spécialisé dans la surveillance (${matchedVendor.brand})`;
    } else if (httpInfo.isCamera) {
        threatLevel = 'HIGH';
        riskReason = 'Interface web de visualisation vidéo active';
    }

    return {
        ip: device.ip,
        mac: device.mac,
        hostname: device.hostname || 'Appareil Inconnu',
        vendor: device.vendor || 'Inconnu',
        isSurveillanceDevice: isConfirmedSurveillance || Boolean(matchedVendor),
        threatLevel,
        riskReason,
        detectedBrand: matchedVendor ? matchedVendor.brand : (httpInfo.detectedBrand || null),
        equipmentType: matchedVendor ? matchedVendor.type : (isConfirmedSurveillance ? 'Caméra / Micro IP' : 'Équipement Standard'),
        openSurveillancePorts: openPorts,
        streamUrls,
        hasAudioCapability: openPorts.some(p => p.port === 37778 || p.port === 554),
        scannedAt: new Date().toISOString()
    };
}

/**
 * Chasse réseau complète : analyse tous les équipements connectés
 */
async function huntAllSpyDevices(devicesList, onProgress) {
    const onlineDevices = devicesList.filter(d => d.isOnline);
    const results = [];

    for (let i = 0; i < onlineDevices.length; i++) {
        const dev = onlineDevices[i];
        if (onProgress) {
            onProgress({
                current: i + 1,
                total: onlineDevices.length,
                currentIp: dev.ip,
                currentName: dev.customName || dev.hostname || dev.ip
            });
        }

        try {
            const report = await scanDeviceForSurveillance(dev);
            if (report.isSurveillanceDevice || report.threatLevel !== 'SAFE') {
                results.push(report);
            }
        } catch (err) {
            console.error(`[SPY-HUNTER] Erreur scan ${dev.ip}:`, err);
        }
    }

    return {
        scannedCount: onlineDevices.length,
        spyDevicesFound: results.length,
        devices: results,
        timestamp: new Date().toISOString()
    };
}

module.exports = {
    scanDeviceForSurveillance,
    huntAllSpyDevices,
    SPY_PORTS,
    CAMERA_VENDORS
};
