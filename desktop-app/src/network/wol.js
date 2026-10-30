/**
 * Wifi-Watch — Wake-on-LAN Engine (Allumage d'appareils à distance)
 * Envoie un « Magic Packet » UDP de diffusion pour démarrer à distance
 * un ordinateur ou un NAS équipé d'une carte réseau compatible WoL.
 */

const dgram = require('dgram');

/**
 * Crée le paquet magique (6 x 0xFF + 16 x MAC)
 */
function createMagicPacket(mac) {
    const cleanMac = mac.toUpperCase().replace(/[:-]/g, '');
    if (cleanMac.length !== 12) {
        throw new Error('Adresse MAC invalide pour Wake-on-LAN (12 caractères hexadécimaux requis).');
    }

    const macBuffer = Buffer.from(cleanMac, 'hex');
    const magicPacket = Buffer.alloc(102);

    // 6 octets de 0xFF
    magicPacket.fill(0xFF, 0, 6);

    // 16 répétitions de l'adresse MAC
    for (let i = 0; i < 16; i++) {
        macBuffer.copy(magicPacket, 6 + i * 6, 0, 6);
    }

    return magicPacket;
}

/**
 * Envoie le paquet magique Wake-on-LAN en broadcast UDP
 */
function wakeDevice(mac, broadcastIp = '255.255.255.255', port = 9) {
    return new Promise((resolve, reject) => {
        try {
            const packet = createMagicPacket(mac);
            const client = dgram.createSocket('udp4');

            client.on('error', (err) => {
                client.close();
                reject(err);
            });

            client.bind(() => {
                client.setBroadcast(true);
                client.send(packet, 0, packet.length, port, broadcastIp, (err) => {
                    client.close();
                    if (err) return reject(err);
                    resolve({ ok: true, mac, broadcastIp, port });
                });
            });
        } catch (err) {
            reject(err);
        }
    });
}

module.exports = {
    wakeDevice,
    createMagicPacket
};
