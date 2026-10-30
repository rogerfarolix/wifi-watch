/**
 * Base de données OUI (Organisationally Unique Identifier) locale
 * Déduit le constructeur et la catégorie d'appareil depuis l'adresse MAC et le nom d'hôte.
 */

// Préfixes MAC (3 premiers octets : XX:XX:XX) des principaux constructeurs
const OUI_VENDORS = {
    // Apple
    '00:03:93': 'Apple', '00:05:02': 'Apple', '00:0A:27': 'Apple', '00:0A:95': 'Apple',
    '00:0D:93': 'Apple', '00:10:FA': 'Apple', '00:11:24': 'Apple', '00:14:51': 'Apple',
    '00:16:CB': 'Apple', '00:17:F2': 'Apple', '00:19:E3': 'Apple', '00:1B:63': 'Apple',
    '00:1C:B3': 'Apple', '00:1D:4F': 'Apple', '00:1E:52': 'Apple', '00:1F:5B': 'Apple',
    '00:21:E9': 'Apple', '00:22:41': 'Apple', '00:23:12': 'Apple', '00:23:32': 'Apple',
    '00:23:6C': 'Apple', '00:24:36': 'Apple', '00:25:00': 'Apple', '00:25:4B': 'Apple',
    '00:26:08': 'Apple', '00:26:4A': 'Apple', '00:26:B0': 'Apple', '00:26:BB': 'Apple',
    '28:CF:E9': 'Apple', '34:36:3B': 'Apple', '3C:07:54': 'Apple', '40:6C:8F': 'Apple',
    '50:EA:D6': 'Apple', '70:DE:E2': 'Apple', '84:78:8B': 'Apple', 'A4:83:E7': 'Apple',
    'BC:D0:74': 'Apple', 'DC:2B:61': 'Apple', 'F0:98:9D': 'Apple', 'F4:F9:51': 'Apple',

    // Samsung
    '00:00:F0': 'Samsung', '00:02:78': 'Samsung', '00:07:AB': 'Samsung', '00:09:18': 'Samsung',
    '00:0D:AE': 'Samsung', '00:12:47': 'Samsung', '00:12:FB': 'Samsung', '00:13:77': 'Samsung',
    '00:15:99': 'Samsung', '00:16:6C': 'Samsung', '00:17:C9': 'Samsung', '00:18:AF': 'Samsung',
    '08:08:C2': 'Samsung', '14:49:E0': 'Samsung', '24:4B:03': 'Samsung', '2C:59:8A': 'Samsung',
    '50:01:D9': 'Samsung', '58:C5:CB': 'Samsung', '64:1C:AE': 'Samsung', '84:25:DB': 'Samsung',
    '88:32:9B': 'Samsung', '94:01:C2': 'Samsung', 'A8:06:00': 'Samsung', 'BC:72:B9': 'Samsung',

    // Canalbox / Sagemcom / Technicolor / Arcadyan (Box internet)
    'D8:9A:0D': 'Canalbox / Sagemcom',
    '00:19:70': 'Sagemcom', '00:1D:6A': 'Sagemcom', '00:24:D4': 'Sagemcom',
    '7C:03:D8': 'Sagemcom', 'E4:9E:12': 'Sagemcom', 'E8:F1:B0': 'Sagemcom',
    '00:18:02': 'Technicolor', '00:26:24': 'Technicolor', '18:82:8C': 'Technicolor',
    '38:43:7D': 'Technicolor', '88:F7:C7': 'Technicolor', 'AC:A0:16': 'Technicolor',
    '00:1A:2A': 'Arcadyan', '00:26:4D': 'Arcadyan', '84:A8:E4': 'Arcadyan',

    // Huawei & Honor
    '00:18:82': 'Huawei', '00:1E:10': 'Huawei', '00:25:9E': 'Huawei', '00:46:4B': 'Huawei',
    '04:25:C5': 'Huawei', '04:F9:38': 'Huawei', '0C:96:BF': 'Huawei', '10:1B:54': 'Huawei',
    '20:F3:A3': 'Huawei', '28:31:52': 'Huawei', '38:F8:89': 'Huawei', '48:46:FB': 'Huawei',
    '70:72:3C': 'Huawei', '84:A8:E4': 'Huawei', 'A4:93:3F': 'Huawei', 'DC:D2:FC': 'Huawei',

    // Xiaomi
    '00:EC:0A': 'Xiaomi', '14:F6:5A': 'Xiaomi', '18:59:36': 'Xiaomi', '28:6C:07': 'Xiaomi',
    '34:80:0D': 'Xiaomi', '38:A4:ED': 'Xiaomi', '50:64:2B': 'Xiaomi', '64:09:80': 'Xiaomi',
    '78:11:DC': 'Xiaomi', '84:F3:EB': 'Xiaomi', 'AC:C1:EE': 'Xiaomi', 'F4:60:E2': 'Xiaomi',

    // Realtek & Intel (PC, cartes mères, PC portables)
    '00:E0:4C': 'Realtek', '4C:23:38': 'Realtek Semiconductor', '52:54:00': 'Realtek / QEMU',
    '00:02:B3': 'Intel', '00:03:47': 'Intel', '00:04:23': 'Intel', '00:07:E9': 'Intel',
    '00:0E:0C': 'Intel', '00:13:02': 'Intel', '00:13:E8': 'Intel', '00:15:00': 'Intel',
    '00:1B:21': 'Intel', '00:21:5C': 'Intel', '00:24:D7': 'Intel', '3C:F8:62': 'Intel',
    '68:05:CA': 'Intel', '7C:B0:C2': 'Intel', '8C:85:90': 'Intel', 'A4:4E:31': 'Intel',

    // TP-Link
    '00:0A:EB': 'TP-Link', '00:14:78': 'TP-Link', '00:19:E0': 'TP-Link', '00:21:27': 'TP-Link',
    '00:23:CD': 'TP-Link', '00:27:19': 'TP-Link', '14:CF:92': 'TP-Link', '30:DE:4B': 'TP-Link',
    '50:C7:BF': 'TP-Link', '60:32:B1': 'TP-Link', '74:DA:38': 'TP-Link', '84:16:F9': 'TP-Link',
    '98:48:27': 'TP-Link', 'B0:4E:26': 'TP-Link', 'C0:25:E9': 'TP-Link', 'E8:48:B8': 'TP-Link',

    // Netgear
    '00:09:5B': 'Netgear', '00:0F:B5': 'Netgear', '00:14:6C': 'Netgear', '00:18:4D': 'Netgear',
    '00:1E:2A': 'Netgear', '00:24:B2': 'Netgear', '00:26:F2': 'Netgear', '20:4E:7F': 'Netgear',
    '44:94:FC': 'Netgear', '84:1B:5E': 'Netgear', '9C:3D:CF': 'Netgear', 'C0:3F:0E': 'Netgear',

    // Google / Cast / Nest
    '00:1A:11': 'Google', '18:D6:C7': 'Google', '20:DF:B9': 'Google', '3C:5A:B4': 'Google',
    '54:60:09': 'Google', '6C:AD:F8': 'Google', '74:C6:3B': 'Google', '94:EB:CD': 'Google',
    'A4:77:33': 'Google', 'D8:6C:63': 'Google', 'F8:8F:C2': 'Google',

    // Amazon (Echo, Kindle, FireTV)
    '00:71:47': 'Amazon', '18:74:2E': 'Amazon', '34:D2:70': 'Amazon', '40:B4:CD': 'Amazon',
    '44:65:0D': 'Amazon', '50:F5:DA': 'Amazon', '68:37:E9': 'Amazon', '74:75:48': 'Amazon',
    'AC:63:BE': 'Amazon', 'CC:9E:00': 'Amazon', 'FC:A6:67': 'Amazon',

    // Raspberry Pi & Espressif (IoT, Domotique)
    'B8:27:EB': 'Raspberry Pi', 'DC:A6:32': 'Raspberry Pi', 'E4:5F:01': 'Raspberry Pi',
    '28:CD:C1': 'Raspberry Pi', 'D8:3A:DD': 'Raspberry Pi',
    '18:FE:34': 'Espressif (ESP8266/ESP32)', '24:0A:C4': 'Espressif', '24:62:AB': 'Espressif',
    '30:AE:A4': 'Espressif', '3C:71:BF': 'Espressif', '84:0D:8E': 'Espressif', '84:F3:EB': 'Espressif',
    'A4:E5:7C': 'Espressif', 'BC:DD:C2': 'Espressif', 'CC:50:E3': 'Espressif',

    // Sony (PlayStation, TV)
    '00:04:1F': 'Sony', '00:13:15': 'Sony', '00:19:C5': 'Sony', '00:24:8D': 'Sony',
    '28:0D:FC': 'Sony', '70:9E:29': 'Sony Interactive (PlayStation)', 'F8:46:1C': 'Sony',

    // Microsoft (Xbox, Surface)
    '00:0D:3A': 'Microsoft', '00:12:5A': 'Microsoft', '00:15:5D': 'Microsoft (Hyper-V)',
    '00:1D:D8': 'Microsoft', '00:22:48': 'Microsoft (Xbox)', '28:18:78': 'Microsoft (Surface)',
    '7C:1E:52': 'Microsoft (Xbox)', 'DC:9B:9C': 'Microsoft',

    // Nintendo (Switch)
    '00:09:BF': 'Nintendo', '00:17:AB': 'Nintendo', '00:1B:EA': 'Nintendo', '00:22:D7': 'Nintendo',
    '34:AF:2C': 'Nintendo', '40:F4:07': 'Nintendo', '7C:BB:8A': 'Nintendo', '98:B6:E9': 'Nintendo',

    // Constructeurs PC (Dell, HP, Lenovo, Asus, Acer)
    '00:14:22': 'Dell', '00:16:76': 'Dell', '18:66:DA': 'Dell', '34:17:EB': 'Dell', 'B8:2A:72': 'Dell',
    '00:08:02': 'HP', '00:0E:7F': 'HP', '00:1E:0B': 'HP', '1C:C1:DE': 'HP', '3C:D9:2B': 'HP',
    '00:21:86': 'Lenovo', '08:11:96': 'Lenovo', '54:EE:75': 'Lenovo', '60:99:D1': 'Lenovo',
    '00:1E:8C': 'Asus', '04:D9:F5': 'Asus', '10:7B:44': 'Asus', '1C:87:2C': 'Asus', '2C:4D:54': 'Asus',
    '00:1F:16': 'Acer', '00:26:2D': 'Acer', '54:04:A6': 'Acer'
};

const KEYWORD_DEVICE_TYPES = {
    phone: ['iphone', 'android', 'galaxy', 'pixel', 'redmi', 'xiaomi', 'huawei', 'honor', 'oneplus', 'oppo', 'vivo'],
    tablet: ['ipad', 'tab', 'kindle', 'pad'],
    laptop: ['macbook', 'thinkpad', 'latitude', 'inspiron', 'spectre', 'zenbook', 'surface', 'portable', 'laptop'],
    desktop: ['desktop', 'pc-', 'workstation', 'optiplex', 'imac', 'prodesk'],
    tv: ['tv', 'bravia', 'tizen', 'firetv', 'chromecast', 'shield', 'roku', 'webos', 'appletv'],
    router: ['canalbox', 'livebox', 'freebox', 'sfrbox', 'bbox', 'router', 'gateway', 'accesspoint', 'ap-', 'passerelle'],
    console: ['playstation', 'ps4', 'ps5', 'xbox', 'nintendo', 'switch'],
    iot: ['esp32', 'esp8266', 'raspberry', 'sonoff', 'shelly', 'tasmota', 'hue', 'tuya', 'nest', 'alexa'],
    printer: ['printer', 'epson', 'canon', 'hp-print', 'brother', 'xerox']
};

/**
 * Détecte si l'adresse MAC est une adresse aléatoire/privée (iOS/Android Private Wi-Fi Address)
 * (si le 2e bit le moins significatif du 1er octet vaut 1, ex: x2:..., x6:..., xA:..., xE:...)
 */
function isRandomizedMac(mac) {
    if (!mac || mac.length < 2) return false;
    const firstByteHex = mac.substring(0, 2);
    const firstByte = parseInt(firstByteHex, 16);
    if (isNaN(firstByte)) return false;
    return (firstByte & 0x02) !== 0;
}

/**
 * Recherche le constructeur à partir de l'adresse MAC
 */
function lookupVendor(mac) {
    if (!mac) return 'Inconnu';
    const cleanMac = mac.toUpperCase().replace(/[:-]/g, '');
    if (cleanMac.length < 6) return 'Inconnu';

    const prefix = `${cleanMac.substring(0, 2)}:${cleanMac.substring(2, 4)}:${cleanMac.substring(4, 6)}`;
    const known = OUI_VENDORS[prefix];
    if (known) return known;

    if (isRandomizedMac(mac)) {
        return 'Adresse MAC Privée (Smartphone iOS / Android)';
    }

    return 'Inconnu';
}

/**
 * Détermine le type d'appareil à partir du nom d'hôte et du constructeur
 */
function guessDeviceType(hostname = '', vendor = '') {
    if (vendor.includes('Smartphone') || vendor.includes('Privée')) {
        return 'phone';
    }

    const text = `${hostname} ${vendor}`.toLowerCase();

    for (const [type, keywords] of Object.entries(KEYWORD_DEVICE_TYPES)) {
        if (keywords.some(k => text.includes(k))) {
            return type;
        }
    }

    const v = vendor.toLowerCase();
    if (v.includes('sagemcom') || v.includes('technicolor') || v.includes('arcadyan') || v.includes('canalbox')) return 'router';
    if (v.includes('tp-link') || v.includes('netgear') || v.includes('cisco')) return 'router';
    if (v.includes('apple')) return 'phone'; // défaut Apple (iPhone/Mac)
    if (v.includes('samsung') || v.includes('xiaomi') || v.includes('huawei')) return 'phone';
    if (v.includes('intel') || v.includes('realtek') || v.includes('dell') || v.includes('lenovo')) return 'laptop';
    if (v.includes('raspberry') || v.includes('espressif')) return 'iot';
    if (v.includes('sony') || v.includes('nintendo')) return 'console';

    return 'unknown';
}

module.exports = {
    lookupVendor,
    guessDeviceType
};
