/**
 * Wifi-Watch — Standalone Offline QR Code Generator
 * Générateur de QR Code 100% autonome et hors-ligne pour badges Wi-Fi Invités.
 * Ne nécessite aucune connexion Internet ni bibliothèque externe.
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof exports === 'object') {
        module.exports = factory();
    } else {
        root.QRCodeGenerator = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {

    // Polynomial math for Reed-Solomon error correction
    const QRMath = {
        glog: function (n) {
            if (n < 1) throw new Error("glog(" + n + ")");
            return QRMath.LOG_TABLE[n];
        },
        gexp: function (n) {
            while (n < 0) n += 255;
            while (n >= 255) n -= 255;
            return QRMath.EXP_TABLE[n];
        },
        EXP_TABLE: new Array(256),
        LOG_TABLE: new Array(256)
    };

    for (let i = 0; i < 8; i++) QRMath.EXP_TABLE[i] = 1 << i;
    for (let i = 8; i < 256; i++) QRMath.EXP_TABLE[i] = QRMath.EXP_TABLE[i - 4] ^ QRMath.EXP_TABLE[i - 5] ^ QRMath.EXP_TABLE[i - 6] ^ QRMath.EXP_TABLE[i - 8];
    for (let i = 0; i < 255; i++) QRMath.LOG_TABLE[QRMath.EXP_TABLE[i]] = i;

    function QRPolynomial(num, shift) {
        if (num.length === undefined) throw new Error(num.length + "/" + shift);
        let offset = 0;
        while (offset < num.length && num[offset] === 0) offset++;
        this.num = new Array(num.length - offset + shift);
        for (let i = 0; i < num.length - offset; i++) this.num[i] = num[i + offset];
    }

    QRPolynomial.prototype = {
        get: function (index) { return this.num[index]; },
        getLength: function () { return this.num.length; },
        multiply: function (e) {
            const num = new Array(this.getLength() + e.getLength() - 1);
            for (let i = 0; i < this.getLength(); i++) {
                for (let j = 0; j < e.getLength(); j++) {
                    num[i + j] ^= QRMath.gexp(QRMath.glog(this.get(i)) + QRMath.glog(e.get(j)));
                }
            }
            return new QRPolynomial(num, 0);
        },
        mod: function (e) {
            if (this.getLength() - e.getLength() < 0) return this;
            const ratio = QRMath.glog(this.get(0)) - QRMath.glog(e.get(0));
            const num = new Array(this.getLength());
            for (let i = 0; i < this.getLength(); i++) num[i] = this.get(i);
            for (let i = 0; i < e.getLength(); i++) {
                num[i] ^= QRMath.gexp(QRMath.glog(e.get(i)) + ratio);
            }
            return new QRPolynomial(num, 0).mod(e);
        }
    };

    const QRRSBlock = {
        RS_BLOCK_TABLE: [
            [1, 26, 19], [1, 26, 16], [1, 26, 13], [1, 26, 9],
            [1, 44, 34], [1, 44, 28], [1, 44, 22], [1, 44, 16],
            [1, 70, 55], [1, 70, 44], [2, 35, 17], [2, 35, 13],
            [1, 100, 80], [2, 50, 32], [2, 50, 24], [4, 25, 9],
            [1, 134, 108], [2, 67, 43], [2, 33, 15, 2, 34, 16], [2, 33, 11, 2, 34, 12],
            [2, 86, 68], [4, 43, 27], [4, 43, 19], [4, 43, 15]
        ],
        getRSBlocks: function (typeNumber, errorCorrectLevel) {
            const rsBlock = QRRSBlock.getRsBlockTable(typeNumber, errorCorrectLevel);
            if (rsBlock === undefined) throw new Error("bad rs block @ typeNumber:" + typeNumber);
            const length = rsBlock.length / 3;
            const list = [];
            for (let i = 0; i < length; i++) {
                const count = rsBlock[i * 3 + 0];
                const totalCount = rsBlock[i * 3 + 1];
                const dataCount = rsBlock[i * 3 + 2];
                for (let j = 0; j < count; j++) {
                    list.push({ totalCount: totalCount, dataCount: dataCount });
                }
            }
            return list;
        },
        getRsBlockTable: function (typeNumber, errorCorrectLevel) {
            switch (errorCorrectLevel) {
                case 1: return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 0];
                case 0: return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 1];
                case 3: return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 2];
                case 2: return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 3];
                default: return undefined;
            }
        }
    };

    function QRBitBuffer() {
        this.buffer = [];
        this.length = 0;
    }
    QRBitBuffer.prototype = {
        get: function (index) {
            const bufIndex = Math.floor(index / 8);
            return ((this.buffer[bufIndex] >>> (7 - index % 8)) & 1) === 1;
        },
        put: function (num, length) {
            for (let i = 0; i < length; i++) {
                this.putBit(((num >>> (length - i - 1)) & 1) === 1);
            }
        },
        putBit: function (bit) {
            const bufIndex = Math.floor(this.length / 8);
            if (this.buffer.length <= bufIndex) this.buffer.push(0);
            if (bit) this.buffer[bufIndex] |= (0x80 >>> (this.length % 8));
            this.length++;
        }
    };

    function QRCodeModel(typeNumber, errorCorrectLevel) {
        this.typeNumber = typeNumber;
        this.errorCorrectLevel = errorCorrectLevel;
        this.modules = null;
        this.moduleCount = 0;
        this.dataCache = null;
        this.dataList = [];
    }

    QRCodeModel.prototype = {
        addData: function (data) {
            this.dataList.push({
                mode: 4, // 8-bit byte mode
                data: data,
                getLength: function () { return this.data.length; },
                write: function (buffer) {
                    for (let i = 0; i < this.data.length; i++) {
                        buffer.put(this.data.charCodeAt(i), 8);
                    }
                }
            });
        },
        isDark: function (row, col) {
            if (row < 0 || this.moduleCount <= row || col < 0 || this.moduleCount <= col) {
                throw new Error(row + "," + col);
            }
            return this.modules[row][col];
        },
        getModuleCount: function () {
            return this.moduleCount;
        },
        make: function () {
            if (this.typeNumber < 1) {
                let typeNumber = 1;
                for (typeNumber = 1; typeNumber < 40; typeNumber++) {
                    const rsBlocks = QRRSBlock.getRSBlocks(typeNumber, this.errorCorrectLevel);
                    const buffer = new QRBitBuffer();
                    let totalDataCount = 0;
                    for (let i = 0; i < rsBlocks.length; i++) totalDataCount += rsBlocks[i].dataCount;
                    for (let i = 0; i < this.dataList.length; i++) {
                        const data = this.dataList[i];
                        buffer.put(data.mode, 4);
                        buffer.put(data.getLength(), 8);
                        data.write(buffer);
                    }
                    if (buffer.length <= totalDataCount * 8) break;
                }
                this.typeNumber = typeNumber;
            }
            this.makeImpl(false, 0);
        },
        makeImpl: function (test, maskPattern) {
            this.moduleCount = this.typeNumber * 4 + 17;
            this.modules = new Array(this.moduleCount);
            for (let row = 0; row < this.moduleCount; row++) {
                this.modules[row] = new Array(this.moduleCount);
                for (let col = 0; col < this.moduleCount; col++) {
                    this.modules[row][col] = null;
                }
            }
            this.setupPositionProbePattern(0, 0);
            this.setupPositionProbePattern(this.moduleCount - 7, 0);
            this.setupPositionProbePattern(0, this.moduleCount - 7);
            this.setupTimingPattern();
            this.mapData(this.createData(this.typeNumber, this.errorCorrectLevel, this.dataList), maskPattern);
        },
        setupPositionProbePattern: function (row, col) {
            for (let r = -1; r <= 7; r++) {
                if (row + r <= -1 || this.moduleCount <= row + r) continue;
                for (let c = -1; c <= 7; c++) {
                    if (col + c <= -1 || this.moduleCount <= col + c) continue;
                    if ((0 <= r && r <= 6 && (c === 0 || c === 6)) ||
                        (0 <= c && c <= 6 && (r === 0 || r === 6)) ||
                        (2 <= r && r <= 4 && 2 <= c && c <= 4)) {
                        this.modules[row + r][col + c] = true;
                    } else {
                        this.modules[row + r][col + c] = false;
                    }
                }
            }
        },
        setupTimingPattern: function () {
            for (let r = 8; r < this.moduleCount - 8; r++) {
                if (this.modules[r][6] !== null) continue;
                this.modules[r][6] = (r % 2 === 0);
            }
            for (let c = 8; c < this.moduleCount - 8; c++) {
                if (this.modules[6][c] !== null) continue;
                this.modules[6][c] = (c % 2 === 0);
            }
        },
        createData: function (typeNumber, errorCorrectLevel, dataList) {
            const rsBlocks = QRRSBlock.getRSBlocks(typeNumber, errorCorrectLevel);
            const buffer = new QRBitBuffer();
            for (let i = 0; i < dataList.length; i++) {
                const data = dataList[i];
                buffer.put(data.mode, 4);
                buffer.put(data.getLength(), 8);
                data.write(buffer);
            }
            let totalDataCount = 0;
            for (let i = 0; i < rsBlocks.length; i++) totalDataCount += rsBlocks[i].dataCount;
            if (buffer.length + 4 <= totalDataCount * 8) buffer.put(0, 4);
            while (buffer.length % 8 !== 0) buffer.putBit(false);
            while (true) {
                if (buffer.length >= totalDataCount * 8) break;
                buffer.put(0xEC, 8);
                if (buffer.length >= totalDataCount * 8) break;
                buffer.put(0x11, 8);
            }
            return this.createBytes(buffer, rsBlocks);
        },
        createBytes: function (buffer, rsBlocks) {
            let offset = 0;
            let maxDcCount = 0;
            let maxEcCount = 0;
            const dcdata = new Array(rsBlocks.length);
            const ecdata = new Array(rsBlocks.length);
            for (let r = 0; r < rsBlocks.length; r++) {
                const dcCount = rsBlocks[r].dataCount;
                const ecCount = rsBlocks[r].totalCount - dcCount;
                maxDcCount = Math.max(maxDcCount, dcCount);
                maxEcCount = Math.max(maxEcCount, ecCount);
                dcdata[r] = new Array(dcCount);
                for (let i = 0; i < dcdata[r].length; i++) {
                    dcdata[r][i] = 0xff & buffer.buffer[i + offset];
                }
                offset += dcCount;

                // Reed-Solomon Poly
                let g = new QRPolynomial([1], 0);
                for (let i = 0; i < ecCount; i++) {
                    g = g.multiply(new QRPolynomial([1, QRMath.gexp(i)], 0));
                }
                const rawPoly = new QRPolynomial(dcdata[r], g.getLength() - 1);
                const modPoly = rawPoly.mod(g);
                ecdata[r] = new Array(g.getLength() - 1);
                for (let i = 0; i < ecdata[r].length; i++) {
                    const modIndex = i + modPoly.getLength() - ecdata[r].length;
                    ecdata[r][i] = (modIndex >= 0) ? modPoly.get(modIndex) : 0;
                }
            }
            let totalCodeCount = 0;
            for (let i = 0; i < rsBlocks.length; i++) totalCodeCount += rsBlocks[i].totalCount;
            const data = new Array(totalCodeCount);
            let index = 0;
            for (let i = 0; i < maxDcCount; i++) {
                for (let r = 0; r < rsBlocks.length; r++) {
                    if (i < dcdata[r].length) data[index++] = dcdata[r][i];
                }
            }
            for (let i = 0; i < maxEcCount; i++) {
                for (let r = 0; r < rsBlocks.length; r++) {
                    if (i < ecdata[r].length) data[index++] = ecdata[r][i];
                }
            }
            return data;
        },
        mapData: function (data, maskPattern) {
            let inc = -1;
            let row = this.moduleCount - 1;
            let bitIndex = 7;
            let byteIndex = 0;
            for (let col = this.moduleCount - 1; col > 0; col -= 2) {
                if (col === 6) col--;
                while (true) {
                    for (let c = 0; c < 2; c++) {
                        if (this.modules[row][col - c] === null) {
                            let dark = false;
                            if (byteIndex < data.length) {
                                dark = (((data[byteIndex] >>> bitIndex) & 1) === 1);
                            }
                            const mask = (row + (col - c)) % 2 === 0;
                            if (mask) dark = !dark;
                            this.modules[row][col - c] = dark;
                            bitIndex--;
                            if (bitIndex === -1) {
                                byteIndex++;
                                bitIndex = 7;
                            }
                        }
                    }
                    row += inc;
                    if (row < 0 || this.moduleCount <= row) {
                        row -= inc;
                        inc = -inc;
                        break;
                    }
                }
            }
        }
    };

    /**
     * Rendu dans un canvas HTML
     */
    function renderToCanvas(canvas, text, options = {}) {
        const size = options.size || 220;
        const fgColor = options.fgColor || '#00f0ff';
        const bgColor = options.bgColor || '#090d16';
        const margin = options.margin !== undefined ? options.margin : 4;

        const qr = new QRCodeModel(0, 1); // Auto type, Medium EC
        qr.addData(text);
        qr.make();

        const count = qr.getModuleCount();
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, size, size);

        const totalModules = count + margin * 2;
        const cellSize = size / totalModules;

        ctx.fillStyle = fgColor;
        for (let r = 0; r < count; r++) {
            for (let c = 0; c < count; c++) {
                if (qr.isDark(r, c)) {
                    ctx.fillRect(
                        Math.round((c + margin) * cellSize),
                        Math.round((r + margin) * cellSize),
                        Math.ceil(cellSize),
                        Math.ceil(cellSize)
                    );
                }
            }
        }

        return canvas;
    }

    /**
     * Encode les paramètres de connexion Wi-Fi selon le standard WiFi Alliance
     */
    function formatWifiPayload(ssid, password, security = 'WPA') {
        const cleanSsid = (ssid || '').replace(/([\\;,:"])/g, '\\$1');
        const cleanPass = (password || '').replace(/([\\;,:"])/g, '\\$1');
        const secType = security.toUpperCase() === 'OPEN' ? 'nopass' : 'WPA';

        if (secType === 'nopass') {
            return `WIFI:T:nopass;S:${cleanSsid};;`;
        }
        return `WIFI:T:${secType};S:${cleanSsid};P:${cleanPass};;`;
    }

    return {
        QRCodeModel,
        renderToCanvas,
        formatWifiPayload
    };
}));
