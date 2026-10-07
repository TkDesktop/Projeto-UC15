/*
   mapa.js - Hospitais e Postos perto de voce (secao #hospitais do logado.html)
   Mapa: Leaflet + OpenStreetMap.  Dados: Overpass API (OSM).
   Busca de enderecos: Nominatim (OSM).  Sem chave de API.

   Ordem dos scripts no logado.html:
   leaflet.js -> api.js -> script.js -> mapa.js

   Nao usa sessao.js e nao grava nada no navegador alem do cache de buscas
   (sessionStorage). O plano vem da propria conta (api.perfil / sessao do painel).
*/
(function (raiz) {
    'use strict';

    /* ---------------------------------------------------------------
       CONFIGURACAO
       --------------------------------------------------------------- */
    var CHAVE_SESSAO_USUARIO = 'medicaMaisUsuarioLogado'; // mesma chave do script.js
    var CENTRO_PADRAO = { lat: -23.5505, lon: -46.6333 }; // Sao Paulo
    var ENDPOINTS = [
        'https://overpass-api.de/api/interpreter',
        'https://overpass.private.coffee/api/interpreter'
    ];
    var TTL_CACHE_MS = 10 * 60 * 1000;
    var TIMEOUT_MS = 28000;
    var URL_NOMINATIM = 'https://nominatim.openstreetmap.org/search';

    var CATEGORIAS = {
        hospital: { rotulo: 'Hospital', emoji: '🏥' },
        posto: { rotulo: 'Posto / UPA / clínica', emoji: '⚕️' },
        farmacia: { rotulo: 'Farmácia', emoji: '💊' }
    };

    // Mesma ordem do enum do back-end: 0 = Essencial, 1 = Cuidado+, 2 = Cuidado Total
    var ORDEM_PLANOS = ['essencial', 'cuidado', 'total'];
    var TODOS_RAIOS = [2, 5, 10, 20];

    // O "Localizador de Hospitais e Postos" existe nos TRES planos (conforme a home).
    // O que muda por plano e o raio de busca e o que o mapa oferece alem do basico.
    var PLANOS = {
        essencial: {
            chave: 'essencial', nome: 'Essencial',
            raios: [2, 5], raioPadrao: 5, maxResultados: 10,
            categorias: ['hospital', 'posto'], filtro24h: false, sos: false, suporte: false,
            beneficios: [
                'Hospitais e postos num raio de até 5 km (até 10 resultados)',
                'Como chegar e ligar com um toque',
                'Salvar o telefone do local nos seus contatos'
            ]
        },
        cuidado: {
            chave: 'cuidado', nome: 'Cuidado+',
            raios: [2, 5, 10], raioPadrao: 10, maxResultados: 25,
            categorias: ['hospital', 'posto'], filtro24h: true, sos: true, suporte: false,
            beneficios: [
                'Raio de até 10 km e até 25 resultados',
                'Filtro "abre 24 horas"',
                'Modo SOS: hospital de emergência mais próximo e telefones de urgência'
            ]
        },
        total: {
            chave: 'total', nome: 'Cuidado Total',
            raios: [2, 5, 10, 20], raioPadrao: 10, maxResultados: 50,
            categorias: ['hospital', 'posto', 'farmacia'], filtro24h: true, sos: true, suporte: true,
            beneficios: [
                'Raio de até 20 km e até 50 resultados',
                'Inclui farmácias (com o filtro 24 horas)',
                'Tudo do Cuidado+ e atalho para agendar a visita do Suporte Prioritário'
            ]
        }
    };

    /* ---------------------------------------------------------------
       FUNCOES PURAS
       --------------------------------------------------------------- */
    function semAcento(t) {
        return String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }

    function chaveDoNome(nome) {
        var n = semAcento(nome).toLowerCase();
        if (!n) return null;
        if (n.indexOf('total') >= 0) return 'total';
        if (n.indexOf('essencial') >= 0 || n.indexOf('basic') >= 0 || n.indexOf('gratis') >= 0 || n.indexOf('free') >= 0) return 'essencial';
        if (n.indexOf('cuidado') >= 0 || n.indexOf('+') >= 0 || n.indexOf('plus') >= 0) return 'cuidado';
        return null;
    }

    // Aceita o que o back devolve em "plano": numero (0/1/2), texto ou objeto com nome.
    // Sem plano (null) devolve null: quem chama usa o Essencial.
    function chaveDoPlano(p) {
        if (p === null || p === undefined || p === '') return null;
        if (typeof p === 'number') return ORDEM_PLANOS[p] || null;
        if (typeof p === 'string') {
            if (/^\d+$/.test(p.trim())) return ORDEM_PLANOS[parseInt(p, 10)] || null;
            return chaveDoNome(p);
        }
        if (typeof p === 'object') {
            return chaveDoPlano(p.nome !== undefined ? p.nome : (p.name !== undefined ? p.name : p.tipo));
        }
        return null;
    }

    function planoDaApi(perfil) {
        return chaveDoPlano(perfil && perfil.plano);
    }

    // Menor plano que libera um raio (para mostrar o cadeado na lista)
    function planoMinimoDoRaio(raio) {
        for (var i = 0; i < ORDEM_PLANOS.length; i++) {
            if (PLANOS[ORDEM_PLANOS[i]].raios.indexOf(raio) >= 0) return ORDEM_PLANOS[i];
        }
        return 'total';
    }

    function distanciaKm(lat1, lon1, lat2, lon2) {
        var R = 6371, rad = Math.PI / 180;
        var dLat = (lat2 - lat1) * rad, dLon = (lon2 - lon1) * rad;
        var a = Math.pow(Math.sin(dLat / 2), 2) +
            Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.pow(Math.sin(dLon / 2), 2);
        return 2 * R * Math.asin(Math.sqrt(a));
    }

    function montarConsulta(lat, lon, raioKm, categorias) {
        var around = '(around:' + Math.round(raioKm * 1000) + ',' + lat.toFixed(5) + ',' + lon.toFixed(5) + ')';
        var p = [];
        if (categorias.indexOf('hospital') >= 0) {
            p.push('nwr["amenity"="hospital"]' + around + ';');
        }
        if (categorias.indexOf('posto') >= 0) {
            p.push('nwr["amenity"="clinic"]' + around + ';');
            p.push('nwr["healthcare"~"^(clinic|centre)$"]' + around + ';');
            p.push('nwr["name"~"(^|[ -])(UBS|UPA)([ -]|$)",i]["amenity"~"^(hospital|clinic|doctors)$"]' + around + ';');
        }
        if (categorias.indexOf('farmacia') >= 0) {
            p.push('nwr["amenity"="pharmacy"]' + around + ';');
        }
        return '[out:json][timeout:25];(' + p.join('') + ');out tags center 250;';
    }

    function classificar(tags) {
        if (tags.amenity === 'pharmacy') return 'farmacia';
        if (tags.amenity === 'hospital') return 'hospital';
        return 'posto';
    }

    function enderecoDe(t) {
        var rua = t['addr:street'] ? t['addr:street'] + (t['addr:housenumber'] ? ', ' + t['addr:housenumber'] : '') : '';
        return [rua, t['addr:suburb'] || t['addr:neighbourhood'] || '', t['addr:city'] || '']
            .filter(Boolean).join(' · ');
    }

    function telefoneLimpo(tel) {
        var primeiro = String(tel || '').split(';')[0].trim();
        if (!primeiro) return '';
        if (primeiro.length <= 20) return primeiro;
        var so = primeiro.replace(/[^\d+]/g, '');
        return so.length <= 20 ? so : '';
    }

    function processarResposta(dados, lat, lon) {
        var vistos = {}, itens = [];
        ((dados && dados.elements) || []).forEach(function (e) {
            var t = e.tags || {};
            var la = e.lat !== undefined ? e.lat : (e.center && e.center.lat);
            var lo = e.lon !== undefined ? e.lon : (e.center && e.center.lon);
            if (typeof la !== 'number' || typeof lo !== 'number') return;
            var id = e.type + '/' + e.id;
            if (vistos[id]) return;
            vistos[id] = true;

            var tipo = classificar(t);
            var nome = t.name || t['name:pt'] || t.official_name || '';
            var op = t['operator:type'];
            itens.push({
                id: id,
                tipo: tipo,
                nome: nome || 'Local sem nome',
                semNome: !nome,
                lat: la,
                lon: lo,
                dist: distanciaKm(lat, lon, la, lo),
                tel: telefoneLimpo(t.phone || t['contact:phone']),
                site: t.website || t['contact:website'] || '',
                horario: t.opening_hours || '',
                endereco: enderecoDe(t),
                emergencia: t.emergency === 'yes' || /\bUPA\b|pronto[ -]?(socorro|atendimento)|emerg/i.test(nome),
                h24: String(t.opening_hours || '').replace(/\s/g, '') === '24/7',
                natureza: op ? ((op === 'public' || op === 'government') ? 'Público' : 'Privado') : ''
            });
        });
        itens.sort(function (a, b) { return a.dist - b.dist; });

        // remove duplicatas (mesmo nome a menos de 150 m: ex. predio + entrada)
        var unicos = [];
        itens.forEach(function (it) {
            var repetido = unicos.some(function (u) {
                return !it.semNome && u.nome === it.nome && distanciaKm(u.lat, u.lon, it.lat, it.lon) < 0.15;
            });
            if (!repetido) unicos.push(it);
        });
        return unicos;
    }

    function filtrarItens(itens, filtros, plano) {
        var lista = itens.filter(function (i) {
            if (plano.categorias.indexOf(i.tipo) < 0) return false;
            if (filtros.tipos[i.tipo] === false) return false;
            if (filtros.so24h && plano.filtro24h && !i.h24) return false;
            return true;
        });
        return { visiveis: lista.slice(0, plano.maxResultados), total: lista.length };
    }

    function escolherHospitalSOS(itens) {
        var hospitais = itens.filter(function (i) { return i.tipo === 'hospital'; });
        var urgentes = hospitais.filter(function (i) { return i.emergencia || i.h24; });
        return (urgentes[0] || hospitais[0] || null);
    }

    function linkRota(item) {
        return 'https://www.google.com/maps/dir/?api=1&destination=' + item.lat + ',' + item.lon;
    }

    /* ---------------------------------------------------------------
       REDE: Overpass com cache e servidor reserva
       (so servicos publicos do OpenStreetMap; nada do back-end da Medica+)
       --------------------------------------------------------------- */
    function lerCache(chave) {
        try {
            var bruto = sessionStorage.getItem(chave);
            if (!bruto) return null;
            var obj = JSON.parse(bruto);
            return (Date.now() - obj.t < TTL_CACHE_MS) ? obj.d : null;
        } catch (e) { return null; }
    }

    function gravarCache(chave, dados) {
        try { sessionStorage.setItem(chave, JSON.stringify({ t: Date.now(), d: dados })); } catch (e) { /* cheio */ }
    }

    async function buscarOverpass(lat, lon, raioKm, categorias) {
        var chave = 'mmHosp:' + lat.toFixed(3) + ':' + lon.toFixed(3) + ':' + raioKm + ':' + categorias.join(',');
        var emCache = lerCache(chave);
        if (emCache) return emCache;

        var consulta = montarConsulta(lat, lon, raioKm, categorias);
        var ultimoErro = null;
        for (var i = 0; i < ENDPOINTS.length; i++) {
            var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
            var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, TIMEOUT_MS) : null;
            try {
                var resp = await fetch(ENDPOINTS[i], {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
                    body: 'data=' + encodeURIComponent(consulta),
                    signal: ctrl ? ctrl.signal : undefined
                });
                if (!resp.ok) throw new Error('HTTP ' + resp.status);
                var dados = await resp.json();
                if (!dados || !Array.isArray(dados.elements)) throw new Error('Resposta inesperada');
                gravarCache(chave, dados);
                return dados;
            } catch (e) {
                ultimoErro = e;
            } finally {
                if (timer) clearTimeout(timer);
            }
        }
        throw new Error('O serviço de mapas está ocupado agora. Tente de novo em instantes. (' + (ultimoErro && ultimoErro.message) + ')');
    }

    async function geocodificar(texto) {
        var url = URL_NOMINATIM + '?format=jsonv2&limit=1&countrycodes=br&accept-language=pt-BR&q=' + encodeURIComponent(texto);
        var resp = await fetch(url, { headers: { 'Accept': 'application/json' } });
        if (!resp.ok) throw new Error('A busca de endereço falhou (HTTP ' + resp.status + ').');
        var lista = await resp.json();
        if (!lista.length) return null;
        return { lat: parseFloat(lista[0].lat), lon: parseFloat(lista[0].lon), rotulo: lista[0].display_name };
    }

    /* ---------------------------------------------------------------
       PLANO DO USUARIO (vem da conta, igual ao resto do painel)
       --------------------------------------------------------------- */
    // Leitura imediata: o script.js do painel ja guardou o perfil nesta chave
    function planoDaSessao() {
        try {
            var u = JSON.parse(localStorage.getItem(CHAVE_SESSAO_USUARIO)) || {};
            return planoDaApi(u);
        } catch (e) { return null; }
    }

    /* ---------------------------------------------------------------
       INTERFACE
       --------------------------------------------------------------- */
    function iniciarPagina() {
        if (typeof obterToken === 'function' && !obterToken()) return; // o script.js ja redireciona ao login

        var $ = function (id) { return document.getElementById(id); };
        var estado = {
            lat: null, lon: null, plano: PLANOS.essencial, origemPlano: 'padrao', raio: 5,
            itens: [], mapa: null, camada: null, circulo: null, voce: null, marcadores: {}, reqId: 0
        };

        function criar(tag, classe, texto) {
            var e = document.createElement(tag);
            if (classe) e.className = classe;
            if (texto !== undefined) e.textContent = texto; // textContent: dados do OSM nunca viram HTML
            return e;
        }

        function status(texto, tipo) {
            var s = $('statusMapa');
            s.textContent = texto;
            s.className = 'mm-status' + (tipo ? ' mm-' + tipo : '');
        }

        /* ----- mapa ----- */
        estado.mapa = L.map('mapa').setView([CENTRO_PADRAO.lat, CENTRO_PADRAO.lon], 12);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(estado.mapa);
        estado.camada = L.layerGroup().addTo(estado.mapa);

        // A secao fica no meio da pagina: recalcula o tamanho quando tudo carregar ou a janela mudar
        var recalcular = function () { if (estado.mapa) estado.mapa.invalidateSize(); };
        setTimeout(recalcular, 250);
        window.addEventListener('load', recalcular);
        window.addEventListener('resize', recalcular);

        function icone(tipo) {
            return L.divIcon({
                className: 'mm-pin-wrap',
                html: '<span class="mm-pin mm-pin-' + tipo + '">' + CATEGORIAS[tipo].emoji + '</span>',
                iconSize: [36, 36], iconAnchor: [18, 18], popupAnchor: [0, -18]
            });
        }

        /* ----- cartao do local (lista e popup) ----- */
        function selo(texto, classe) { return criar('span', 'mm-selo ' + classe, texto); }

        function criarCartao(item, popup) {
            var c = criar('div', popup ? 'mm-popup' : 'mm-item');
            c.appendChild(criar('strong', 'mm-nome', CATEGORIAS[item.tipo].emoji + ' ' + item.nome));

            var selos = criar('div', 'mm-selos');
            selos.appendChild(selo(item.dist < 1 ? Math.round(item.dist * 1000) + ' m' : item.dist.toFixed(1).replace('.', ',') + ' km', 'mm-selo-dist'));
            selos.appendChild(selo(CATEGORIAS[item.tipo].rotulo, 'mm-selo-tipo'));
            if (item.h24) selos.appendChild(selo('24 horas', 'mm-selo-24'));
            if (item.emergencia) selos.appendChild(selo('Urgência', 'mm-selo-urg'));
            if (item.natureza) selos.appendChild(selo(item.natureza, 'mm-selo-nat'));
            c.appendChild(selos);

            if (item.endereco) c.appendChild(criar('p', 'mm-linha', '📍 ' + item.endereco));
            if (item.horario) c.appendChild(criar('p', 'mm-linha', '🕒 ' + item.horario));

            var acoes = criar('div', 'mm-acoes');
            var rota = criar('a', 'mm-btn mm-btn-prim', 'Como chegar');
            rota.href = linkRota(item); rota.target = '_blank'; rota.rel = 'noopener noreferrer';
            acoes.appendChild(rota);

            if (item.tel) {
                var ligar = criar('a', 'mm-btn', 'Ligar');
                ligar.href = 'tel:' + item.tel.replace(/[^\d+]/g, '');
                acoes.appendChild(ligar);

                var salvar = criar('button', 'mm-btn', 'Salvar nos contatos');
                salvar.type = 'button';
                salvar.addEventListener('click', function () { salvarContato(item, salvar); });
                acoes.appendChild(salvar);
            }
            if (item.site && /^https?:\/\//i.test(item.site)) {
                var site = criar('a', 'mm-btn', 'Site');
                site.href = item.site; site.target = '_blank'; site.rel = 'noopener noreferrer';
                acoes.appendChild(site);
            }
            c.appendChild(acoes);
            return c;
        }

        // Usa a mesma chamada de contatos que o painel ja usa (api.criarContato)
        async function salvarContato(item, botao) {
            botao.disabled = true;
            botao.textContent = 'Salvando...';
            try {
                // TipoContato.Medico = 2
                await api.criarContato({ nome: item.nome.slice(0, 150), telefone: item.tel, tipo: 2 });
                botao.textContent = 'Salvo ✓';
                status('Contato "' + item.nome + '" salvo na sua Lista de Contatos.', 'ok');
                // Atualiza a lista de contatos do painel sem recarregar a pagina
                try { if (typeof carregarContatos === 'function') carregarContatos(); } catch (e) { /* so visual */ }
            } catch (e) {
                botao.disabled = false;
                botao.textContent = 'Salvar nos contatos';
                status(e.message, 'erro');
            }
        }

        /* ----- desenho dos resultados ----- */
        function filtrosAtuais() {
            return {
                tipos: { hospital: $('fltHospital').checked, posto: $('fltPosto').checked, farmacia: $('fltFarmacia').checked },
                so24h: $('fltH24').checked
            };
        }

        function zoomPorRaio(r) { return r <= 2 ? 14 : (r <= 5 ? 13 : (r <= 10 ? 12 : 11)); }

        function desenhar() {
            var plano = estado.plano;
            estado.camada.clearLayers();
            estado.marcadores = {};
            var lista = $('listaResultados');
            lista.textContent = '';

            if (estado.lat === null) return;

            var r = filtrarItens(estado.itens, filtrosAtuais(), plano);
            var pontos = [[estado.lat, estado.lon]];

            r.visiveis.forEach(function (item) {
                var m = L.marker([item.lat, item.lon], { icon: icone(item.tipo), title: item.nome });
                m.bindPopup(criarCartao(item, true), { maxWidth: 280 });
                m.addTo(estado.camada);
                estado.marcadores[item.id] = m;
                pontos.push([item.lat, item.lon]);

                var li = criar('li', 'mm-li');
                var cartao = criarCartao(item, false);
                cartao.addEventListener('click', function (ev) {
                    if (ev.target.closest('a, button')) return;
                    estado.mapa.setView([item.lat, item.lon], 16);
                    m.openPopup();
                });
                li.appendChild(cartao);
                lista.appendChild(li);
            });

            if (r.visiveis.length === 0) {
                lista.appendChild(criar('li', 'mm-vazio', 'Nenhum local encontrado com esses filtros em ' + estado.raio + ' km. Tente aumentar o raio.'));
                estado.mapa.setView([estado.lat, estado.lon], zoomPorRaio(estado.raio));
            } else {
                estado.mapa.fitBounds(L.latLngBounds(pontos), { padding: [40, 40], maxZoom: 15 });
            }

            var msg = r.visiveis.length + ' local(is) em até ' + estado.raio + ' km';
            if (r.total > r.visiveis.length) {
                msg += ' (mostrando os ' + r.visiveis.length + ' mais próximos de ' + r.total + '; o seu plano mostra até ' + plano.maxResultados + ')';
            }
            status(msg + '.', 'ok');
        }

        async function buscar() {
            if (estado.lat === null) return;
            var meu = ++estado.reqId;
            status('Buscando hospitais e postos perto de você...', 'carregando');
            $('listaResultados').textContent = '';
            try {
                var dados = await buscarOverpass(estado.lat, estado.lon, estado.raio, estado.plano.categorias);
                if (meu !== estado.reqId) return; // chegou uma busca mais nova
                estado.itens = processarResposta(dados, estado.lat, estado.lon);
                desenhar();
            } catch (e) {
                if (meu !== estado.reqId) return;
                estado.itens = [];
                desenhar();
                status(e.message, 'erro');
            }
        }

        function definirLocal(lat, lon, rotulo) {
            estado.lat = lat; estado.lon = lon;
            $('rotuloLocal').textContent = rotulo ? 'Local: ' + rotulo : 'Local: sua posição atual';
            if (estado.voce) estado.mapa.removeLayer(estado.voce);
            estado.voce = L.marker([lat, lon], {
                icon: L.divIcon({ className: 'mm-pin-wrap', html: '<span class="mm-voce"></span>', iconSize: [22, 22], iconAnchor: [11, 11] }),
                title: 'Você está aqui', zIndexOffset: 1000
            }).addTo(estado.mapa);
            if (estado.circulo) estado.mapa.removeLayer(estado.circulo);
            estado.circulo = L.circle([lat, lon], { radius: estado.raio * 1000, color: '#2d7ff9', weight: 1, fillOpacity: 0.05 }).addTo(estado.mapa);
            estado.mapa.setView([lat, lon], zoomPorRaio(estado.raio));
            buscar();
        }

        /* ----- localizacao ----- */
        function pegarPosicao() {
            return new Promise(function (resolve, reject) {
                if (!navigator.geolocation) { reject(new Error('Este navegador não oferece localização.')); return; }
                navigator.geolocation.getCurrentPosition(resolve, function (erro) {
                    var msgs = {
                        1: 'Você não permitiu o acesso à localização. Libere nas permissões do navegador ou busque um endereço.',
                        2: 'Não foi possível descobrir a sua posição. Busque um endereço.',
                        3: 'A localização demorou demais. Tente de novo ou busque um endereço.'
                    };
                    reject(new Error(msgs[erro && erro.code] || 'Falha ao obter a localização.'));
                }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
            });
        }

        async function usarMinhaLocalizacao() {
            var b = $('btnLocalizar');
            b.disabled = true;
            status('Obtendo a sua localização...', 'carregando');
            try {
                var pos = await pegarPosicao();
                definirLocal(pos.coords.latitude, pos.coords.longitude, '');
            } catch (e) {
                status(e.message, 'erro');
            } finally {
                b.disabled = false;
            }
        }

        $('btnLocalizar').addEventListener('click', usarMinhaLocalizacao);

        $('formEndereco').addEventListener('submit', async function (ev) {
            ev.preventDefault();
            var texto = $('campoEndereco').value.trim();
            if (texto.length < 3) { status('Digite um endereço, bairro ou CEP.', 'erro'); return; }
            var b = $('btnBuscarEndereco');
            b.disabled = true;
            status('Procurando o endereço...', 'carregando');
            try {
                var achado = await geocodificar(texto);
                if (!achado) { status('Não encontramos esse endereço. Tente incluir a cidade.', 'erro'); }
                else { definirLocal(achado.lat, achado.lon, achado.rotulo); }
            } catch (e) {
                status(e.message, 'erro');
            } finally {
                setTimeout(function () { b.disabled = false; }, 1200); // regra do Nominatim: no maximo 1 busca por segundo
            }
        });

        /* ----- raio e filtros ----- */
        $('selRaio').addEventListener('change', function () {
            var novo = parseInt($('selRaio').value, 10);
            if (estado.plano.raios.indexOf(novo) < 0) { // raio de plano maior: volta para o permitido
                $('selRaio').value = String(estado.raio);
                return;
            }
            estado.raio = novo;
            if (estado.circulo) estado.circulo.setRadius(estado.raio * 1000);
            buscar();
        });
        $('fltFarmacia').addEventListener('change', function () { $('fltFarmacia').dataset.tocado = '1'; });
        ['fltHospital', 'fltPosto', 'fltFarmacia', 'fltH24'].forEach(function (id) {
            $(id).addEventListener('change', desenhar);
        });

        /* ----- SOS (Cuidado+ e Cuidado Total) ----- */
        function abrirSOS() {
            if (!estado.plano.sos) {
                status('O modo SOS faz parte do plano Cuidado+. Veja “Meu plano” para fazer o upgrade.', 'erro');
                return;
            }
            if (estado.lat === null) {
                status('Para o modo SOS, primeiro use a sua localização ou busque um endereço.', 'erro');
                return;
            }
            var painel = $('painelSOS'), conteudo = $('sosConteudo');
            conteudo.textContent = '';
            var alvo = escolherHospitalSOS(estado.itens);

            if (alvo) {
                conteudo.appendChild(criar('p', 'mm-sos-titulo', 'Hospital mais próximo' + ((alvo.emergencia || alvo.h24) ? ' com atendimento de urgência' : '') + ':'));
                conteudo.appendChild(criarCartao(alvo, false));
                var m = estado.marcadores[alvo.id];
                estado.mapa.setView([alvo.lat, alvo.lon], 15);
                if (m) m.openPopup();
            } else {
                conteudo.appendChild(criar('p', 'mm-sos-titulo', 'Nenhum hospital encontrado em ' + estado.raio + ' km. Ligue para o SAMU.'));
            }
            painel.hidden = false;
            painel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        $('btnSOS').addEventListener('click', abrirSOS);
        $('btnFecharSOS').addEventListener('click', function () { $('painelSOS').hidden = true; });

        /* ----- aplicar o plano na tela ----- */
        function textoAviso(origem) {
            if (origem === 'padrao') return 'Sem plano contratado: usando os recursos do Essencial (grátis).';
            return 'Plano lido da sua conta.';
        }

        function aplicarPlano(chave, origem) {
            var plano = PLANOS[chave] || PLANOS.essencial;
            estado.plano = plano;
            estado.origemPlano = origem;

            $('planoAtual').textContent = plano.nome;
            var ul = $('listaBeneficios');
            ul.textContent = '';
            plano.beneficios.forEach(function (b) { ul.appendChild(criar('li', '', b)); });

            // Lista todos os raios; os de planos maiores aparecem travados
            var sel = $('selRaio');
            sel.textContent = '';
            TODOS_RAIOS.forEach(function (r) {
                var liberado = plano.raios.indexOf(r) >= 0;
                var o = document.createElement('option');
                o.value = String(r);
                o.textContent = r + ' km' + (liberado ? '' : ' 🔒 ' + PLANOS[planoMinimoDoRaio(r)].nome);
                o.disabled = !liberado;
                sel.appendChild(o);
            });
            estado.raio = plano.raios.indexOf(estado.raio) >= 0 ? estado.raio : plano.raioPadrao;
            sel.value = String(estado.raio);

            var temFarm = plano.categorias.indexOf('farmacia') >= 0;
            $('fltFarmacia').disabled = !temFarm;
            if (!temFarm) $('fltFarmacia').checked = false; else if (!$('fltFarmacia').dataset.tocado) $('fltFarmacia').checked = true;
            $('dicaFarmacia').textContent = temFarm ? '' : ' 🔒 Cuidado Total';

            $('fltH24').disabled = !plano.filtro24h;
            if (!plano.filtro24h) $('fltH24').checked = false;
            $('dicaH24').textContent = plano.filtro24h ? '' : ' 🔒 Cuidado+';

            $('btnSOS').classList.toggle('mm-bloqueado', !plano.sos);
            $('btnSOS').setAttribute('aria-disabled', String(!plano.sos));
            $('dicaSOS').textContent = plano.sos ? 'Hospital de emergência mais próximo e telefones de urgência.' : '🔒 O modo SOS faz parte do Cuidado+.';
            if (!plano.sos) $('painelSOS').hidden = true;

            $('atalhoSuporte').hidden = !plano.suporte;
            $('linkUpgradeMapa').hidden = plano.chave === 'total';
            $('avisoPlano').textContent = textoAviso(origem);

            if (estado.lat !== null) {
                if (estado.circulo) estado.circulo.setRadius(estado.raio * 1000);
                buscar();
            }
        }

        // Confirma o plano na conta (mesma rota que o painel ja usa para o perfil)
        function confirmarPlanoNaConta() {
            if (typeof api === 'undefined' || typeof api.perfil !== 'function') return;
            api.perfil().then(function (perfil) {
                var k = planoDaApi(perfil) || 'essencial';
                if (k !== estado.plano.chave) {
                    aplicarPlano(k, 'api');
                } else {
                    estado.origemPlano = 'api';
                    $('avisoPlano').textContent = textoAviso('api');
                }
            }).catch(function () { /* mantem o plano da sessao */ });
        }

        /* ----- partida ----- */
        status('Toque em “Usar minha localização” ou busque um endereço.', '');
        var inicial = planoDaSessao();
        aplicarPlano(inicial || 'essencial', inicial ? 'sessao' : 'padrao');
        confirmarPlanoNaConta();

        // se o navegador ja tem permissao, localiza sozinho
        try {
            if (navigator.permissions && navigator.permissions.query) {
                navigator.permissions.query({ name: 'geolocation' }).then(function (r) {
                    if (r.state === 'granted') usarMinhaLocalizacao();
                }, function () { /* sem Permissions API */ });
            }
        } catch (e) { /* ignora */ }

        // exposto para depuracao/testes
        raiz.MapaMedica = raiz.MapaMedica || {};
        raiz.MapaMedica._estado = estado;
        raiz.MapaMedica._definirLocal = definirLocal;
    }

    var publico = {
        PLANOS: PLANOS,
        chaveDoNome: chaveDoNome,
        chaveDoPlano: chaveDoPlano,
        planoDaApi: planoDaApi,
        planoMinimoDoRaio: planoMinimoDoRaio,
        distanciaKm: distanciaKm,
        montarConsulta: montarConsulta,
        processarResposta: processarResposta,
        filtrarItens: filtrarItens,
        escolherHospitalSOS: escolherHospitalSOS,
        telefoneLimpo: telefoneLimpo,
        linkRota: linkRota,
        iniciarPagina: iniciarPagina
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = publico;
    } else {
        raiz.MapaMedica = Object.assign(raiz.MapaMedica || {}, publico);
        var partir = function () { if (document.getElementById('mapa')) iniciarPagina(); };
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', partir);
        } else {
            partir();
        }
    }
})(typeof window !== 'undefined' ? window : this);