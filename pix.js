/* ==========================================================
   pix.js - Pix "copia e cola" (BR Code) e QR Code no checkout.
   Sem bibliotecas externas. Carregar DEPOIS do script.js em
   checkout.html:  <script src="pix.js"></script>

   MODO DEMONSTRACAO (padrao): o QR Code e legivel e traz o valor do
   plano escolhido, mas usa uma chave Pix FICTICIA. O banco nao encontra
   o destinatario, entao o pagamento nao pode ser concluido.
   ========================================================== */
(function (raiz) {
    'use strict';

    // ---------------------------------------------------------------
    // CONFIGURACAO (unico lugar para editar)
    // ---------------------------------------------------------------
    var PIX_CONFIG = {
        // true  = QR de demonstracao (chave ficticia, ninguem consegue pagar)
        // false = QR com a chave abaixo; coloque SUA chave e o pagamento passa a ser real
        demonstracao: true,

        // Chave aleatoria FICTICIA (formato valido, mas nao existe no Pix).
        chave: '00000000-0000-4000-8000-000000000000',
        nome: 'MEDICA MAIS',  // ate 25 caracteres, sem acento
        cidade: 'SAO PAULO'        // ate 15 caracteres, sem acento
    };
    var CHAVE_PADRAO = '55696100813'; // so vale se demonstracao = false

    // ---------------------------------------------------------------
    // BR CODE (padrao EMV do Banco Central)
    // ---------------------------------------------------------------
    function limparTexto(texto, max) {
        return String(texto || '')
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .toUpperCase().replace(/[^A-Z0-9 ]/g, '').trim().slice(0, max);
    }

    function limparDescricao(texto) {
        return String(texto || '')
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^A-Za-z0-9 .+\-]/g, '').trim().slice(0, 30);
    }

    function campo(id, valor) {
        var v = String(valor);
        if (v.length > 99) throw new Error('O campo ' + id + ' do Pix ficou grande demais.');
        return id + ('0' + v.length).slice(-2) + v;
    }

    // CRC16/CCITT-FALSE: polinomio 0x1021, inicio 0xFFFF
    function crc16(texto) {
        var crc = 0xFFFF;
        for (var i = 0; i < texto.length; i++) {
            crc ^= (texto.charCodeAt(i) & 0xFF) << 8;
            for (var j = 0; j < 8; j++) {
                crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
                crc &= 0xFFFF;
            }
        }
        return ('0000' + crc.toString(16).toUpperCase()).slice(-4);
    }

    function gerarBrCode(o) {
        var chave = String(o.chave || '').trim();
        if (!chave) throw new Error('Chave Pix não informada.');

        var conta = campo('00', 'br.gov.bcb.pix') + campo('01', chave);
        var desc = limparDescricao(o.descricao);
        if (desc && (conta + campo('02', desc)).length <= 99) conta += campo('02', desc);
        if (conta.length > 99) throw new Error('A chave Pix é longa demais.');

        var valor = Number(o.valor);
        var txid = String(o.txid || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 25) || '***';

        var corpo =
            campo('00', '01') +
            campo('01', '11') +
            campo('26', conta) +
            campo('52', '0000') +
            campo('53', '986') +
            (valor > 0 ? campo('54', valor.toFixed(2)) : '') +
            campo('58', 'BR') +
            campo('59', limparTexto(o.nome, 25) || 'RECEBEDOR') +
            campo('60', limparTexto(o.cidade, 15) || 'SAO PAULO') +
            campo('62', campo('05', txid));

        var semCrc = corpo + '6304';
        return semCrc + crc16(semCrc);
    }

    // Confere o CRC e a estrutura (usado antes de mostrar o QR)
    function validarBrCode(payload) {
        if (typeof payload !== 'string' || payload.length < 30) return { ok: false, erro: 'Código curto demais.' };
        if (payload.slice(-8, -4) !== '6304') return { ok: false, erro: 'Campo do CRC ausente.' };
        if (payload.slice(-4) !== crc16(payload.slice(0, -4))) return { ok: false, erro: 'CRC incorreto.' };
        var i = 0, ids = [];
        while (i < payload.length) {
            var tam = parseInt(payload.substr(i + 2, 2), 10);
            if (isNaN(tam)) return { ok: false, erro: 'Tamanho inválido em ' + i + '.' };
            ids.push(payload.substr(i, 2));
            i += 4 + tam;
        }
        if (i !== payload.length) return { ok: false, erro: 'Estrutura inconsistente.' };
        if (ids[0] !== '00' || ids[ids.length - 1] !== '63') return { ok: false, erro: 'Ordem dos campos inválida.' };
        return { ok: true, campos: ids };
    }

    // ---------------------------------------------------------------
    // QR CODE (modo byte, versoes 1 a 15, mascara automatica)
    // ---------------------------------------------------------------
    var ECL_BITS = { L: 1, M: 0, Q: 3, H: 2 };
    var ECC_POR_BLOCO = {
        L: [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22],
        M: [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24],
        Q: [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30],
        H: [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24]
    };
    var NUM_BLOCOS = {
        L: [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6],
        M: [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10],
        Q: [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12],
        H: [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18]
    };
    var VERSAO_MAX = 15;

    function bit(valor, i) { return ((valor >>> i) & 1) !== 0; }

    function numModulosDados(ver) {
        var r = (16 * ver + 128) * ver + 64;
        if (ver >= 2) {
            var na = Math.floor(ver / 7) + 2;
            r -= (25 * na - 10) * na - 55;
            if (ver >= 7) r -= 36;
        }
        return r;
    }

    function numCodewordsDados(ver, ecl) {
        return Math.floor(numModulosDados(ver) / 8) - ECC_POR_BLOCO[ecl][ver] * NUM_BLOCOS[ecl][ver];
    }

    function posAlinhamento(ver) {
        if (ver === 1) return [];
        var n = Math.floor(ver / 7) + 2;
        var passo = Math.ceil((ver * 4 + 4) / (n * 2 - 2)) * 2;
        var r = [6];
        for (var pos = ver * 4 + 10; r.length < n; pos -= passo) r.splice(1, 0, pos);
        return r;
    }

    // Reed-Solomon sobre GF(256)
    function rsMul(x, y) {
        var z = 0;
        for (var i = 7; i >= 0; i--) {
            z = (z << 1) ^ ((z >>> 7) * 0x11D);
            z ^= ((y >>> i) & 1) * x;
        }
        return z;
    }

    function rsDivisor(grau) {
        var r = [], i, j;
        for (i = 0; i < grau - 1; i++) r.push(0);
        r.push(1);
        var raiz = 1;
        for (i = 0; i < grau; i++) {
            for (j = 0; j < r.length; j++) {
                r[j] = rsMul(r[j], raiz);
                if (j + 1 < r.length) r[j] ^= r[j + 1];
            }
            raiz = rsMul(raiz, 0x02);
        }
        return r;
    }

    function rsResto(dados, divisor) {
        var r = divisor.map(function () { return 0; });
        dados.forEach(function (b) {
            var f = b ^ r.shift();
            r.push(0);
            divisor.forEach(function (c, i) { r[i] ^= rsMul(c, f); });
        });
        return r;
    }

    function bytesUtf8(texto) {
        var s = unescape(encodeURIComponent(texto)), r = [];
        for (var i = 0; i < s.length; i++) r.push(s.charCodeAt(i));
        return r;
    }

    function montarCodewords(bytes, ver, ecl) {
        var bits = [];
        function empurrar(valor, qtd) { for (var i = qtd - 1; i >= 0; i--) bits.push((valor >>> i) & 1); }

        empurrar(4, 4);                                // modo byte
        empurrar(bytes.length, ver <= 9 ? 8 : 16);     // tamanho
        bytes.forEach(function (b) { empurrar(b, 8); });

        var capBits = numCodewordsDados(ver, ecl) * 8;
        empurrar(0, Math.min(4, capBits - bits.length));
        empurrar(0, (8 - bits.length % 8) % 8);
        for (var pad = 0xEC; bits.length < capBits; pad ^= 0xEC ^ 0x11) empurrar(pad, 8);

        var dados = [];
        for (var i = 0; i < bits.length; i += 8) {
            var v = 0;
            for (var k = 0; k < 8; k++) v = (v << 1) | bits[i + k];
            dados.push(v);
        }

        var nBlocos = NUM_BLOCOS[ecl][ver], eccBloco = ECC_POR_BLOCO[ecl][ver];
        var brutos = Math.floor(numModulosDados(ver) / 8);
        var blocosCurtos = nBlocos - brutos % nBlocos;
        var tamCurto = Math.floor(brutos / nBlocos);
        var divisor = rsDivisor(eccBloco);
        var blocos = [], pos = 0;
        for (var b = 0; b < nBlocos; b++) {
            var tam = tamCurto - eccBloco + (b < blocosCurtos ? 0 : 1);
            var d = dados.slice(pos, pos + tam);
            pos += tam;
            var ecc = rsResto(d, divisor);
            if (b < blocosCurtos) d.push(0);
            blocos.push(d.concat(ecc));
        }

        var saida = [];
        for (var col = 0; col < blocos[0].length; col++) {
            blocos.forEach(function (bl, idx) {
                if (col !== tamCurto - eccBloco || idx >= blocosCurtos) saida.push(bl[col]);
            });
        }
        return saida;
    }

    function desenharMatriz(ver, ecl, codewords) {
        var tam = ver * 4 + 17, mod = [], func = [], y, x, i;
        for (y = 0; y < tam; y++) {
            mod.push(new Array(tam).fill(false));
            func.push(new Array(tam).fill(false));
        }
        function def(px, py, v) { mod[py][px] = v; func[py][px] = true; }

        for (i = 0; i < tam; i++) { def(6, i, i % 2 === 0); def(i, 6, i % 2 === 0); }

        function finder(cx, cy) {
            for (var dy = -4; dy <= 4; dy++) {
                for (var dx = -4; dx <= 4; dx++) {
                    var d = Math.max(Math.abs(dx), Math.abs(dy)), xx = cx + dx, yy = cy + dy;
                    if (xx >= 0 && xx < tam && yy >= 0 && yy < tam) def(xx, yy, d !== 2 && d !== 4);
                }
            }
        }
        finder(3, 3); finder(tam - 4, 3); finder(3, tam - 4);

        var al = posAlinhamento(ver), n = al.length;
        for (i = 0; i < n; i++) {
            for (var j = 0; j < n; j++) {
                if ((i === 0 && j === 0) || (i === 0 && j === n - 1) || (i === n - 1 && j === 0)) continue;
                for (var dy = -2; dy <= 2; dy++) {
                    for (var dx = -2; dx <= 2; dx++) def(al[i] + dx, al[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
                }
            }
        }

        function formato(mascara) {
            var dados = (ECL_BITS[ecl] << 3) | mascara, rem = dados, k;
            for (k = 0; k < 10; k++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
            var bits = ((dados << 10) | rem) ^ 0x5412;
            for (k = 0; k <= 5; k++) def(8, k, bit(bits, k));
            def(8, 7, bit(bits, 6)); def(8, 8, bit(bits, 7)); def(7, 8, bit(bits, 8));
            for (k = 9; k < 15; k++) def(14 - k, 8, bit(bits, k));
            for (k = 0; k < 8; k++) def(tam - 1 - k, 8, bit(bits, k));
            for (k = 8; k < 15; k++) def(8, tam - 15 + k, bit(bits, k));
            def(8, tam - 8, true);
        }
        formato(0);

        if (ver >= 7) {
            var rem = ver, k;
            for (k = 0; k < 12; k++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1F25);
            var bv = (ver << 12) | rem;
            for (k = 0; k < 18; k++) {
                var a = tam - 11 + k % 3, b = Math.floor(k / 3);
                def(a, b, bit(bv, k)); def(b, a, bit(bv, k));
            }
        }

        // posiciona os dados em zigue-zague
        var idx = 0;
        for (var dir = tam - 1; dir >= 1; dir -= 2) {
            if (dir === 6) dir = 5;
            for (var vert = 0; vert < tam; vert++) {
                for (j = 0; j < 2; j++) {
                    x = dir - j;
                    y = ((dir + 1) & 2) === 0 ? tam - 1 - vert : vert;
                    if (!func[y][x] && idx < codewords.length * 8) {
                        mod[y][x] = bit(codewords[idx >>> 3], 7 - (idx & 7));
                        idx++;
                    }
                }
            }
        }

        function aplicar(m) {
            for (var yy = 0; yy < tam; yy++) {
                for (var xx = 0; xx < tam; xx++) {
                    var inv;
                    switch (m) {
                        case 0: inv = (xx + yy) % 2 === 0; break;
                        case 1: inv = yy % 2 === 0; break;
                        case 2: inv = xx % 3 === 0; break;
                        case 3: inv = (xx + yy) % 3 === 0; break;
                        case 4: inv = (Math.floor(xx / 3) + Math.floor(yy / 2)) % 2 === 0; break;
                        case 5: inv = xx * yy % 2 + xx * yy % 3 === 0; break;
                        case 6: inv = (xx * yy % 2 + xx * yy % 3) % 2 === 0; break;
                        default: inv = ((xx + yy) % 2 + xx * yy % 3) % 2 === 0;
                    }
                    if (!func[yy][xx] && inv) mod[yy][xx] = !mod[yy][xx];
                }
            }
        }

        function penalidade() {
            var p = 0, r, c, k, corrida, escuro = 0;
            function linhaRuns(get) {
                for (r = 0; r < tam; r++) {
                    corrida = 1;
                    for (c = 1; c < tam; c++) {
                        if (get(r, c) === get(r, c - 1)) { corrida++; }
                        else { if (corrida >= 5) p += 3 + (corrida - 5); corrida = 1; }
                    }
                    if (corrida >= 5) p += 3 + (corrida - 5);
                    // padrao parecido com o localizador
                    for (c = 0; c + 11 <= tam; c++) {
                        var s = '';
                        for (k = 0; k < 11; k++) s += get(r, c + k) ? '1' : '0';
                        if (s === '10111010000' || s === '00001011101') p += 40;
                    }
                }
            }
            linhaRuns(function (a, b) { return mod[a][b]; });
            linhaRuns(function (a, b) { return mod[b][a]; });
            for (r = 0; r < tam - 1; r++) {
                for (c = 0; c < tam - 1; c++) {
                    var v = mod[r][c];
                    if (v === mod[r][c + 1] && v === mod[r + 1][c] && v === mod[r + 1][c + 1]) p += 3;
                }
            }
            for (r = 0; r < tam; r++) for (c = 0; c < tam; c++) if (mod[r][c]) escuro++;
            p += Math.floor(Math.abs(escuro * 100 / (tam * tam) - 50) / 5) * 10;
            return p;
        }

        var melhor = 0, menor = Infinity;
        for (var m = 0; m < 8; m++) {
            aplicar(m);
            formato(m);
            var pen = penalidade();
            if (pen < menor) { menor = pen; melhor = m; }
            aplicar(m); // desfaz
        }
        aplicar(melhor);
        formato(melhor);
        return { tamanho: tam, modulos: mod };
    }

    function criarQr(texto, nivel) {
        var ecl = nivel || 'M';
        var bytes = bytesUtf8(String(texto));
        var ver, usados;
        for (ver = 1; ver <= VERSAO_MAX; ver++) {
            usados = 4 + (ver <= 9 ? 8 : 16) + bytes.length * 8;
            if (usados <= numCodewordsDados(ver, ecl) * 8) break;
        }
        if (ver > VERSAO_MAX) throw new Error('Texto grande demais para o QR Code.');
        var qr = desenharMatriz(ver, ecl, montarCodewords(bytes, ver, ecl));
        qr.versao = ver;
        return qr;
    }

    function desenharQr(canvas, qr, escala, borda) {
        escala = escala || 8;
        borda = borda === undefined ? 4 : borda;
        var lado = (qr.tamanho + borda * 2) * escala;
        canvas.width = lado;
        canvas.height = lado;
        var ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, lado, lado);
        ctx.fillStyle = '#000000';
        for (var y = 0; y < qr.tamanho; y++) {
            for (var x = 0; x < qr.tamanho; x++) {
                if (qr.modulos[y][x]) ctx.fillRect((x + borda) * escala, (y + borda) * escala, escala, escala);
            }
        }
    }

    // ---------------------------------------------------------------
    // INTEGRACAO COM O CHECKOUT
    // ---------------------------------------------------------------
    function lerValor(texto) {
        var n = parseFloat(String(texto || '0').replace(/\./g, '').replace(',', '.'));
        return isFinite(n) ? n : 0;
    }

    function avisar(el, texto) {
        if (!el) return;
        el.textContent = texto;
        el.className = 'mensagem mostrar erro';
    }

    function iniciarCheckoutPix() {
        var caixa = document.querySelector('.pix-qr');
        var codigo = document.getElementById('codigo-pix');
        var msg = document.getElementById('msg-pix');
        if (!caixa || !codigo) return;

        var params = new URLSearchParams(window.location.search);
        var plano = params.get('plano') || '';
        var valor = lerValor(params.get('preco'));
        if (!(valor > 0)) return; // plano gratis: nao ha Pix

        if (!PIX_CONFIG.demonstracao && PIX_CONFIG.chave === CHAVE_PADRAO) {
            codigo.value = '';
            avisar(msg, 'Pix ainda não configurado: abra o pix.js e coloque a sua chave Pix.');
            return;
        }

        try {
            var txid = 'MM' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 1296).toString(36).toUpperCase();
            var payload = gerarBrCode({
                chave: PIX_CONFIG.chave,
                nome: PIX_CONFIG.nome,
                cidade: PIX_CONFIG.cidade,
                valor: valor,
                descricao: plano,
                txid: txid
            });
            var teste = validarBrCode(payload);
            if (!teste.ok) throw new Error(teste.erro);

            // Cada modulo ocupa um numero inteiro de pixels (nitido e facil de ler no celular)
            var qr = criarQr(payload, 'M');
            var porModulo = Math.max(4, Math.floor(260 / (qr.tamanho + 8)));
            var canvas = document.createElement('canvas');
            desenharQr(canvas, qr, porModulo * 2, 4);
            canvas.style.cssText = 'width:' + (canvas.width / 2) + 'px;height:' + (canvas.height / 2) + 'px;max-width:100%;image-rendering:pixelated;display:block;';

            caixa.textContent = '';
            caixa.style.cssText = 'display:flex;justify-content:center;align-items:center;width:auto;height:auto;padding:12px;font-size:0;background:#fff;';
            caixa.setAttribute('role', 'img');
            caixa.setAttribute('aria-label', 'QR Code Pix de R$ ' + valor.toFixed(2).replace('.', ','));
            caixa.removeAttribute('aria-hidden');
            caixa.appendChild(canvas);

            codigo.value = payload;

            // Legenda com plano e valor; no modo demonstracao, aviso de que e ficticio
            var antigaLegenda = document.getElementById('pix-legenda');
            if (antigaLegenda && antigaLegenda.parentNode) antigaLegenda.parentNode.removeChild(antigaLegenda);
            var legenda = document.createElement('div');
            legenda.id = 'pix-legenda';
            legenda.style.cssText = 'text-align:center;margin:8px 0 12px;';
            var linha1 = document.createElement('p');
            linha1.style.cssText = 'margin:0;font-weight:700;';
            linha1.textContent = (plano ? plano + ' · ' : '') + 'R$ ' + valor.toFixed(2).replace('.', ',');
            legenda.appendChild(linha1);
            if (PIX_CONFIG.demonstracao) {
                var linha2 = document.createElement('p');
                linha2.style.cssText = 'margin:4px 0 0;font-size:13px;color:#6b7280;';
                linha2.textContent = 'Demonstração do projeto: este QR Code é fictício e não realiza pagamento.';
                legenda.appendChild(linha2);
            }
            if (caixa.parentNode) caixa.parentNode.insertBefore(legenda, caixa.nextSibling);
        } catch (erro) {
            avisar(msg, 'Não foi possível gerar o QR Code Pix: ' + erro.message);
        }
    }

    var api = {
        gerarBrCode: gerarBrCode,
        validarBrCode: validarBrCode,
        crc16: crc16,
        criarQr: criarQr,
        desenharQr: desenharQr,
        iniciarCheckoutPix: iniciarCheckoutPix,
        PIX_CONFIG: PIX_CONFIG
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    } else {
        raiz.PixCheckout = api;
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', iniciarCheckoutPix);
        } else {
            iniciarCheckoutPix();
        }
    }
})(typeof window !== 'undefined' ? window : this);
