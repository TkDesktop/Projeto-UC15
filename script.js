/* ====== HOME ====== */
/*  MENU MOBILE */
(function () {
    if (!document.getElementById('funcionalidades')) return;

    const menuToggle = document.querySelector('#menuToggle');
    const menuNav = document.querySelector('#menuNav');

    function abrirMenu() {
        menuNav.classList.add('aberto');
        menuToggle.setAttribute('aria-expanded', 'true');
        menuToggle.setAttribute('aria-label', 'Fechar menu de navegação');
    }

    function fecharMenu() {
        menuNav.classList.remove('aberto');
        menuToggle.setAttribute('aria-expanded', 'false');
        menuToggle.setAttribute('aria-label', 'Abrir menu de navegação');
    }

    if (menuToggle && menuNav) {
        menuToggle.addEventListener('click', function () {
            if (menuNav.classList.contains('aberto')) {
                fecharMenu();
            } else {
                abrirMenu();
            }
        });

        menuNav.querySelectorAll('a').forEach(function (link) {
            link.addEventListener('click', fecharMenu);
        });

        document.addEventListener('click', function (evento) {
            const clicouNoMenu = menuNav.contains(evento.target);
            const clicouNoBotao = menuToggle.contains(evento.target);
            if (!clicouNoMenu && !clicouNoBotao) {
                fecharMenu();
            }
        });

        document.addEventListener('keydown', function (evento) {
            if (evento.key === 'Escape') {
                fecharMenu();
            }
        });
    }

    /*  SCROLL-SPY */
    const secoes = [{
            el: document.querySelector('.hero'),
            link: menuNav ? menuNav.querySelector('a[href="index.html"]') : null
        },
        {
            el: document.querySelector('#funcionalidades'),
            link: menuNav ? menuNav.querySelector('a[href="#funcionalidades"]') : null
        },
        {
            el: document.querySelector('#planos'),
            link: menuNav ? menuNav.querySelector('a[href="#planos"]') : null
        },
        {
            el: document.querySelector('#contato'),
            link: menuNav ? menuNav.querySelector('a[href="#contato"]') : null
        }
    ].filter(function (s) {
        return s.el && s.link;
    });

    function destacarLink(linkAtivo) {
        secoes.forEach(function (s) {
            if (s.link === linkAtivo) {
                s.link.setAttribute('aria-current', 'page');
            } else {
                s.link.removeAttribute('aria-current');
            }
        });
    }

    function atualizarScrollSpy() {
        var nav = document.querySelector('nav');
        if (!nav || secoes.length === 0) return;

        var alturaNav = nav.offsetHeight;
        var linhaDeteccao = alturaNav + window.innerHeight * 0.25;
        var ativa = null;

        secoes.forEach(function (s) {
            var rect = s.el.getBoundingClientRect();
            if (rect.top <= linhaDeteccao && rect.bottom > linhaDeteccao) {
                ativa = s;
            }
        });

        if (!ativa) {
            for (var i = secoes.length - 1; i >= 0; i--) {
                if (secoes[i].el.getBoundingClientRect().top <= linhaDeteccao) {
                    ativa = secoes[i];
                    break;
                }
            }
        }

        if (ativa) {
            destacarLink(ativa.link);
        }
    }

    window.addEventListener('scroll', atualizarScrollSpy, {
        passive: true
    });
    atualizarScrollSpy();

    /*  PLANOS */
    const planos = document.querySelectorAll('.planos .card > div');

    planos.forEach(function (cartao) {
        const botao = cartao.querySelector('button');
        if (!botao) return;

        botao.addEventListener('click', function () {
            const nomePlano = cartao.querySelector('h3').textContent.replace(/\s+/g, ' ').trim();
            const precoEl = cartao.querySelector('p span');
            const preco = precoEl ? precoEl.textContent.trim() : '0,00';

            const url = 'checkout.html' +
                '?plano=' + encodeURIComponent(nomePlano) +
                '&preco=' + encodeURIComponent(preco);
            window.location.href = url;
        });
    });
})();


/* ====== CHECKOUT ====== */
(function () {
    if (!document.querySelector('.checkout')) return;

    var params = new URLSearchParams(window.location.search);
    var nomePlano = params.get('plano') || 'Basic';
    var precoStr = params.get('preco') || '0,00';

    if (!obterToken()) {
        sessionStorage.setItem('medicaMaisRedirecionar', window.location.href);
        window.location.href = 'login.html';
        return;
    }

    var planoEnum = { 'essencial': 0, 'cuidado+': 1, 'cuidado total': 2 }[nomePlano.toLowerCase()];
    if (planoEnum === undefined) planoEnum = 0;

    // Contrata (1a vez) ou troca de plano. metodo: 0 = Cartao, 1 = Pix
    async function assinar(metodo) {
        var perfil = await api.perfil();
        var dto = { plano: planoEnum, metodoPagamento: metodo };
        if (perfil.plano === null || perfil.plano === undefined) return api.checkout(dto);
        if (perfil.plano === planoEnum) throw new Error('Você já possui este plano.');
        return api.trocarPlano(dto);
    }

    document.getElementById('resumo-plano').textContent = nomePlano;
    document.getElementById('resumo-preco').textContent = 'R$ ' + precoStr;

    var valorBotao = document.getElementById('valor-botao');
    if (valorBotao) valorBotao.textContent = 'R$ ' + precoStr;

    /*  PLANO GRÁTIS */
    var ehGratis = precoStr.replace(/\D/g, '').replace(/^0+$/, '') === '';

    if (ehGratis) {
        document.querySelector('.metodos').style.display = 'none';
        document.getElementById('form-cartao').style.display = 'none';
        document.getElementById('form-pix').style.display = 'none';

        var gratisBotao = document.createElement('button');
        gratisBotao.type = 'button';
        gratisBotao.className = 'btn-pagar';
        gratisBotao.textContent = 'Ativar plano grátis';
        document.querySelector('.checkout').appendChild(gratisBotao);
        gratisBotao.addEventListener('click', function () {
            gratisBotao.disabled = true;
            assinar(0).then(function () {
                mostrarSucesso('Plano ' + nomePlano + ' grátis ativado!');
            }).catch(function (erro) {
                gratisBotao.disabled = false;
                alert(erro.message);
            });
        });
    }

    /*  CARTÃO / PIX */
    var btnCartao = document.getElementById('btn-cartao');
    var btnPix = document.getElementById('btn-pix');
    var formCartao = document.getElementById('form-cartao');
    var formPix = document.getElementById('form-pix');

    btnCartao.addEventListener('click', function () {
        btnCartao.classList.add('ativo');
        btnCartao.setAttribute('aria-selected', 'true');
        btnPix.classList.remove('ativo');
        btnPix.setAttribute('aria-selected', 'false');
        formCartao.classList.remove('escondido');
        formPix.classList.add('escondido');
    });

    btnPix.addEventListener('click', function () {
        btnPix.classList.add('ativo');
        btnPix.setAttribute('aria-selected', 'true');
        btnCartao.classList.remove('ativo');
        btnCartao.setAttribute('aria-selected', 'false');
        formPix.classList.remove('escondido');
        formCartao.classList.add('escondido');
    });

    /*  MENSAGENS */
    function mostrarMsg(el, texto, tipo) {
        el.textContent = texto;
        el.className = 'mensagem mostrar ' + tipo;
    }

    function esconderMsg(el) {
        el.textContent = '';
        el.className = 'mensagem';
    }

    /*  FORMATAÇÃO DE CAMPOS */
    var campoNumero = document.getElementById('numero-cartao');
    var campoValidade = document.getElementById('validade');
    var campoCvv = document.getElementById('cvv');

    campoNumero.addEventListener('input', function () {
        var limpo = campoNumero.value.replace(/\D/g, '').slice(0, 16);
        campoNumero.value = limpo.replace(/(\d{4})(?=\d)/g, '$1 ');
    });

    campoValidade.addEventListener('input', function () {
        var limpo = campoValidade.value.replace(/\D/g, '').slice(0, 4);
        if (limpo.length >= 3) {
            campoValidade.value = limpo.slice(0, 2) + '/' + limpo.slice(2);
        } else {
            campoValidade.value = limpo;
        }
    });

    campoCvv.addEventListener('input', function () {
        campoCvv.value = campoCvv.value.replace(/\D/g, '').slice(0, 4);
    });

    /*  PAGAMENTO POR CARTÃO */
    var msgCartao = document.getElementById('msg-cartao');

    formCartao.addEventListener('submit', function (evento) {
        evento.preventDefault();
        esconderMsg(msgCartao);

        var nome = document.getElementById('nome-cartao').value.trim();
        var numero = campoNumero.value.replace(/\s/g, '');
        var validade = campoValidade.value.trim();
        var cvv = campoCvv.value.trim();

        if (nome === '') {
            mostrarMsg(msgCartao, 'Digite o nome como está no cartão.', 'erro');
            return;
        }
        if (numero.length < 13 || numero.length > 16) {
            mostrarMsg(msgCartao, 'O número do cartão deve ter entre 13 e 16 dígitos.', 'erro');
            return;
        }
        if (!/^\d{2}\/\d{2}$/.test(validade)) {
            mostrarMsg(msgCartao, 'Validade deve estar no formato MM/AA.', 'erro');
            return;
        }
        var mes = parseInt(validade.split('/')[0], 10);
        if (mes < 1 || mes > 12) {
            mostrarMsg(msgCartao, 'O mês da validade deve estar entre 01 e 12.', 'erro');
            return;
        }
        if (cvv.length < 3) {
            mostrarMsg(msgCartao, 'O CVV deve ter pelo menos 3 dígitos.', 'erro');
            return;
        }

        var btnPagar = document.getElementById('btn-pagar-cartao');
        btnPagar.disabled = true;
        btnPagar.textContent = 'Processando...';
        mostrarMsg(msgCartao, 'Processando pagamento, aguarde...', 'sucesso');

        assinar(0).then(function () {
            mostrarSucesso('Pagamento de R$ ' + precoStr + ' aprovado! Seu plano ' + nomePlano + ' já está ativo.');
        }).catch(function (erro) {
            mostrarMsg(msgCartao, erro.message, 'erro');
        }).then(function () {
            btnPagar.disabled = false;
            btnPagar.textContent = 'Pagar R$ ' + precoStr;
        });
    });

    /*  PIX */
    var msgPix = document.getElementById('msg-pix');
    var btnCopiar = document.getElementById('btn-copiar-pix');
    var codigoPix = document.getElementById('codigo-pix');
    var btnConfirmar = document.getElementById('btn-confirmar-pix');

    btnCopiar.addEventListener('click', function () {
        codigoPix.select();
        navigator.clipboard.writeText(codigoPix.value).then(function () {
            btnCopiar.textContent = 'Copiado!';
            setTimeout(function () {
                btnCopiar.textContent = 'Copiar';
            }, 2000);
        }).catch(function () {
            document.execCommand('copy');
            btnCopiar.textContent = 'Copiado!';
            setTimeout(function () {
                btnCopiar.textContent = 'Copiar';
            }, 2000);
        });
    });

    btnConfirmar.addEventListener('click', function () {
        btnConfirmar.disabled = true;
        btnConfirmar.textContent = 'Verificando pagamento...';
        mostrarMsg(msgPix, 'Confirmando com o banco, aguarde...', 'sucesso');

        assinar(1).then(function () {
            mostrarSucesso('Pix de R$ ' + precoStr + ' confirmado! Seu plano ' + nomePlano + ' já está ativo.');
        }).catch(function (erro) {
            mostrarMsg(msgPix, erro.message, 'erro');
        }).then(function () {
            btnConfirmar.disabled = false;
            btnConfirmar.textContent = 'Já paguei';
        });
    });

    /*  OVERLAY DE SUCESSO */
    function mostrarSucesso(texto) {
        var overlay = document.getElementById('overlay-sucesso');
        document.getElementById('sucesso-texto').textContent = texto;
        overlay.classList.add('ativo');
    }
})();


/* ====== LOGADO ====== */
/*  CARDS DO TOPO */
function atualizarPicosDePressao() {
    const cardAlto = document.querySelector('.pico-alto');
    const cardBaixo = document.querySelector('.pico-baixo');

    if (!dadosPressao.length) {
        [cardAlto, cardBaixo].forEach(li => {
            li.querySelector('.valor').textContent = '--';
            li.querySelector('span').textContent = ' Sem registros';
        });
        return;
    }

    const alto = dadosPressao.reduce((a, b) => b.valor > a.valor ? b : a);
    const baixo = dadosPressao.reduce((a, b) => b.valor < a.valor ? b : a);
    preencherCard(cardAlto, { sistolica: alto.valor, diastolica: alto.diastolica }, new Date(alto.data));
    preencherCard(cardBaixo, { sistolica: baixo.valor, diastolica: baixo.diastolica }, new Date(baixo.data));
}

function gerarPressaoAleatoria(sisMin, sisMax, diaMin, diaMax) {
    const sistolica = Math.floor(Math.random() * (sisMax - sisMin + 1)) + sisMin;
    const diastolica = Math.floor(Math.random() * (diaMax - diaMin + 1)) + diaMin;
    return {
        sistolica,
        diastolica
    };
}

function gerarDataAleatoria(horasMax) {
    const agora = new Date();
    const horasAtras = Math.floor(Math.random() * horasMax);
    const minutosAtras = Math.floor(Math.random() * 60);
    agora.setHours(agora.getHours() - horasAtras);
    agora.setMinutes(agora.getMinutes() - minutosAtras);
    return agora;
}

function preencherCard(elementoLi, pressao, data) {
    const spanData = elementoLi.querySelector('span');
    const valorTexto = elementoLi.querySelector('.valor');

    spanData.textContent = ` ${formatarDataCompleta(data)}`;
    valorTexto.textContent = `${pressao.sistolica}/${pressao.diastolica} mmHg`;

    valorTexto.classList.remove('atualizado');
    void valorTexto.offsetWidth;
    valorTexto.classList.add('atualizado');
}


/*  DADOS DO GRÁFICO */
let dadosPressao = [];


/*  GRÁFICO + FILTRO + BADGES */
let graficoPressao = null;

const COR_MEDIDA = { alta: '#e63946', baixa: '#2d7ff9', normal: '#2e9e3f' };

// Regra unica usada no grafico, nos picos e nas estatisticas
function classificarMedida(item) {
    if (item.valor > 140 || item.diastolica > 90) return 'alta';
    if (item.valor < 90 || item.diastolica < 60) return 'baixa';
    return 'normal';
}

function corDoPonto(valor) {
    if (valor > 140) return COR_MEDIDA.alta;
    if (valor < 90) return COR_MEDIDA.baixa;
    return COR_MEDIDA.normal;
}

function filtrarPorPeriodo(dataInicio, dataFim) {
    return dadosPressao.filter(item => {
        const dataItem = new Date(item.data);
        return dataItem >= dataInicio && dataItem <= dataFim;
    });
}

function renderizarGrafico(dados) {
    const ctx = document.getElementById('pressaoChart');

    const labels = dados.map(item => formatarDataCurta(new Date(item.data)));
    const sistolicas = dados.map(item => item.valor);
    const diastolicas = dados.map(item => item.diastolica);
    const cores = dados.map(item => COR_MEDIDA[classificarMedida(item)]);

    if (graficoPressao) {
        graficoPressao.destroy();
    }

    graficoPressao = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Sistólica (mmHg)',
                data: sistolicas,
                borderColor: '#2e9e3f',
                borderWidth: 2,
                pointBackgroundColor: cores,
                pointBorderColor: cores,
                pointRadius: 5,
                pointHoverRadius: 7,
                tension: 0.4,
                fill: false
            }, {
                label: 'Diastólica (mmHg)',
                data: diastolicas,
                borderColor: '#7a8ba6',
                borderDash: [6, 4],
                borderWidth: 2,
                pointBackgroundColor: '#7a8ba6',
                pointBorderColor: '#7a8ba6',
                pointRadius: 3,
                tension: 0.4,
                fill: false
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom'
                }
            },
            scales: {
                y: {
                    title: {
                        display: true,
                        text: 'mmHg'
                    }
                }
            }
        }
    });
}

function atualizarBadges(dados) {
    const listaBadges = document.querySelector('.badges');
    const statusFiltro = document.getElementById('statusFiltro');

    listaBadges.innerHTML = '';

    if (dados.length === 0) {
        statusFiltro.textContent = 'Nenhum registro encontrado nesse período.';
        return;
    }

    const altas = dados.filter(d => classificarMedida(d) === 'alta');
    const baixas = dados.filter(d => classificarMedida(d) === 'baixa');

    if (altas.length) {
        listaBadges.appendChild(criarBadge(altas.reduce((a, b) => b.valor > a.valor ? b : a), 'alto'));
    }
    if (baixas.length) {
        listaBadges.appendChild(criarBadge(baixas.reduce((a, b) => b.valor < a.valor ? b : a), 'baixo'));
    }

    statusFiltro.textContent = (!altas.length && !baixas.length) ?
        'Nesse período sua pressão se manteve dentro da faixa normal 👍' :
        '';
}

function criarBadge(item, tipo) {
    const li = document.createElement('li');
    li.className = `badge badge-${tipo}`;

    const textoTag = tipo === 'alto' ? 'Pico de pressão alta' : 'Pico de pressão baixa';
    li.appendChild(criarItem('span', '', formatarDataCompleta(new Date(item.data))));
    li.appendChild(criarItem('p', '', textoTag));
    li.appendChild(criarItem('strong', '', `${item.valor}/${item.diastolica} mmHg`));

    return li;
}

function atualizarEstatisticas(dados) {
    let painel = document.getElementById('estatisticasPressao');
    if (!painel) {
        painel = document.createElement('div');
        painel.id = 'estatisticasPressao';
        painel.className = 'estatisticas';
        const alvo = document.querySelector('.badges');
        alvo.parentNode.insertBefore(painel, alvo);
    }
    painel.innerHTML = '';

    if (dados.length === 0) {
        painel.appendChild(criarItem('p', 'estat-vazio', 'Sem medições no período para avaliar.'));
        return;
    }

    const n = dados.length;
    const media = campo => Math.round(dados.reduce((soma, d) => soma + d[campo], 0) / n);
    const mediaSis = media('valor');
    const mediaDia = media('diastolica');
    const maior = dados.reduce((a, b) => b.valor > a.valor ? b : a);
    const menor = dados.reduce((a, b) => b.valor < a.valor ? b : a);
    const normais = dados.filter(d => classificarMedida(d) === 'normal').length;
    const altas = dados.filter(d => classificarMedida(d) === 'alta').length;
    const baixas = dados.filter(d => classificarMedida(d) === 'baixa').length;
    const classeMedia = classificarMedida({ valor: mediaSis, diastolica: mediaDia });

    const textos = {
        normal: 'A média do período está dentro da faixa normal.',
        alta: 'A média do período está acima do ideal. Converse com um profissional de saúde.',
        baixa: 'A média do período está abaixo do ideal. Converse com um profissional de saúde.'
    };

    const itens = [
        ['Medições', String(n)],
        ['Média', `${mediaSis}/${mediaDia} mmHg`],
        ['Maior sistólica', `${maior.valor}/${maior.diastolica} mmHg`],
        ['Menor sistólica', `${menor.valor}/${menor.diastolica} mmHg`],
        ['Na faixa normal', `${Math.round(normais * 100 / n)}% (${normais} de ${n})`],
        ['Alertas', `${altas} alta(s) · ${baixas} baixa(s)`]
    ];

    const grade = criarItem('div', 'estat-grade');
    itens.forEach(([rotulo, valor]) => {
        const caixa = criarItem('div', 'estat-item');
        caixa.appendChild(criarItem('span', 'estat-rotulo', rotulo));
        caixa.appendChild(criarItem('strong', 'estat-valor', valor));
        grade.appendChild(caixa);
    });
    painel.appendChild(grade);

    painel.appendChild(criarItem('p', 'estat-avaliacao estat-' + classeMedia, textos[classeMedia]));
    painel.appendChild(criarItem('p', 'estat-nota', 'Informação de apoio, não substitui avaliação médica.'));
}

function atualizarUltimaAtualizacao(dados) {
    const textoUltimaAtualizacao = document.querySelector('.filtro-info strong');
    if (dados.length === 0) {
        textoUltimaAtualizacao.textContent = '--';
        return;
    }
    const ultimoItem = dados[dados.length - 1];
    textoUltimaAtualizacao.textContent = formatarDataCompleta(new Date(ultimoItem.data));
}

function aplicarFiltro() {
    const inicioInput = document.getElementById('periodoInicio').value;
    const fimInput = document.getElementById('periodoFim').value;

    if (!inicioInput || !fimInput) return;

    const dataInicio = new Date(`${inicioInput}T00:00:00`);
    const dataFim = new Date(`${fimInput}T23:59:59`);

    const dadosFiltrados = filtrarPorPeriodo(dataInicio, dataFim);

    renderizarGrafico(dadosFiltrados);
    renderizarListaPressao(dadosFiltrados);
    atualizarBadges(dadosFiltrados);
    atualizarUltimaAtualizacao(dadosFiltrados);
    atualizarEstatisticas(dadosFiltrados);
}


/*  FORMATAÇÃO DE DATA */
function formatarDataCompleta(data) {
    const dia = String(data.getDate()).padStart(2, '0');
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const ano = data.getFullYear();
    const hora = String(data.getHours()).padStart(2, '0');
    const min = String(data.getMinutes()).padStart(2, '0');
    return `${dia}/${mes}/${ano} ${hora}:${min}`;
}

function formatarDataCurta(data) {
    const dia = String(data.getDate()).padStart(2, '0');
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const hora = String(data.getHours()).padStart(2, '0');
    return `${dia}/${mes} ${hora}:00`;
}


/*  PERFIL */
const TIPOS_USUARIO = ['paciente', 'cuidador', 'parente'];
const CHAVE_SESSAO_USUARIO = 'medicaMaisUsuarioLogado';

function formatarCpf(valor) {
    const numeros = String(valor || '').replace(/\D/g, '').slice(0, 11);
    return numeros
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

function formatarTelefone(valor) {
    const numeros = String(valor || '').replace(/\D/g, '').slice(0, 11);
    if (numeros.length <= 10) {
        return numeros.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2');
    }
    return numeros.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
}

function tipoUsuarioDaApi(t) {
    if (typeof t === 'string') return t.toLowerCase();
    return TIPOS_USUARIO[t] || 'paciente';
}

const PLANOS_NOME = ['Essencial (grátis)', 'Cuidado+', 'Cuidado Total'];

// Converte o JSON da API (UsuarioRespostaDto) para o formato usado nos campos da tela
function usuarioDaApi(u) {
    u = u || {};
    return {
        nome: u.nome || '',
        email: u.email || '',
        cpf: formatarCpf(u.cpf),
        telefone: formatarTelefone(u.telefone),
        tipo: tipoUsuarioDaApi(u.tipoUsuario),
        plano: (u.plano !== null && u.plano !== undefined) ? (PLANOS_NOME[u.plano] || 'Plano ativo') : 'Nenhum plano contratado',
        foto: u.fotoUrl || null
    };
}

function lerSessaoUsuario() {
    try {
        return JSON.parse(localStorage.getItem(CHAVE_SESSAO_USUARIO)) || {};
    } catch (e) {
        return {};
    }
}

let dadosUsuario = usuarioDaApi(lerSessaoUsuario());
let fotoPendente; // undefined = a foto nao mudou

function atualizarSaudacao() {
    const titulo = document.getElementById('saudacaoNome');
    if (!titulo) return;

    const primeiroNome = dadosUsuario.nome ? dadosUsuario.nome.split(' ')[0] : '';
    titulo.textContent = primeiroNome ? 'Olá, ' + primeiroNome + '!' : 'Olá!';

    const grafico = document.getElementById('pressaoChart');
    if (grafico) {
        grafico.setAttribute('aria-label',
            'Gráfico da variação da pressão arterial' + (primeiroNome ? ' de ' + primeiroNome : ''));
    }
}

const overlay = document.getElementById('perfilOverlay');
const overlayFundo = document.getElementById('perfilFundo');
const formPerfil = document.getElementById('formPerfil');
const btnSalvarPerfil = document.getElementById('btnSalvarPerfil');
const mensagemStatus = document.getElementById('mensagemStatus');

async function buscarPerfil() {
    const u = await api.perfil();
    localStorage.setItem(CHAVE_SESSAO_USUARIO, JSON.stringify(u));
    dadosUsuario = usuarioDaApi(u);
    return dadosUsuario;
}

// A API so aceita telefone, email e fotoUrl no PUT /api/usuarios/me
async function salvarPerfilNoServidor(novos) {
    const u = await api.atualizarPerfil({
        telefone: novos.telefone,
        email: novos.email,
        fotoUrl: novos.foto
    });
    localStorage.setItem(CHAVE_SESSAO_USUARIO, JSON.stringify(u));
    dadosUsuario = usuarioDaApi(u);
    return dadosUsuario;
}

function mostrarMensagemPerfil(texto, classe) {
    mensagemStatus.textContent = texto;
    mensagemStatus.className = 'mensagem-status ' + (classe || '');
}

async function abrirPerfil() {
    overlay.classList.add('aberto');
    overlay.setAttribute('aria-hidden', 'false');
    mostrarMensagemPerfil('');
    fotoPendente = undefined;

    preencherFormulario(dadosUsuario);
    try {
        preencherFormulario(await buscarPerfil());
        atualizarSaudacao();
    } catch (erro) {
        mostrarMensagemPerfil(erro.message, 'erro-geral');
    }

    document.getElementById('campoTelefone').focus();
}

function preencherFormulario(p) {
    document.getElementById('campoNome').value = p.nome;
    document.getElementById('campoEmail').value = p.email;
    document.getElementById('campoCpf').value = p.cpf;
    document.getElementById('campoTelefone').value = p.telefone;
    document.getElementById('campoTipo').value = p.tipo;
    document.getElementById('campoPlano').textContent = p.plano;

    const foto = document.getElementById('fotoPreview');
    foto.src = p.foto || 'img/avatar.png';
    foto.alt = 'Foto de perfil' + (p.nome ? ' de ' + p.nome : '');

    // A API nao permite alterar estes dados por aqui
    ['campoNome', 'campoEmail', 'campoCpf'].forEach(function (id) {
        const el = document.getElementById(id);
        el.readOnly = true;
        el.title = 'Este dado não pode ser alterado por aqui.';
        el.style.background = '#f1f1f1';
    });
    const tipo = document.getElementById('campoTipo');
    tipo.disabled = true;
    tipo.style.background = '#f1f1f1';
}

function fecharPerfil() {
    overlay.classList.remove('aberto');
    overlay.setAttribute('aria-hidden', 'true');
    limparErros();
    document.getElementById('btnVerPerfil').focus();
}

function sairDaConta() {
    limparSessao();
    window.location.href = 'index.html';
}

function aplicarMascaraCpf(evento) {
    evento.target.value = formatarCpf(evento.target.value);
}

function aplicarMascaraTelefone(evento) {
    evento.target.value = formatarTelefone(evento.target.value);
}

// Reduz a foto (max. 256 px, JPEG) para caber no banco como texto
function reduzirImagem(arquivo, lado) {
    lado = lado || 256;
    return new Promise(function (resolve, reject) {
        const leitor = new FileReader();
        leitor.onerror = function () { reject(new Error('Não foi possível ler a imagem.')); };
        leitor.onload = function () {
            const img = new Image();
            img.onerror = function () { reject(new Error('Arquivo de imagem inválido.')); };
            img.onload = function () {
                const escala = Math.min(1, lado / Math.max(img.width, img.height));
                const canvas = document.createElement('canvas');
                canvas.width = Math.max(1, Math.round(img.width * escala));
                canvas.height = Math.max(1, Math.round(img.height * escala));
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.85));
            };
            img.src = leitor.result;
        };
        leitor.readAsDataURL(arquivo);
    });
}

async function preverFoto(evento) {
    const entrada = evento.target;
    const arquivo = entrada.files[0];
    if (!arquivo) return;

    if (!/^image\/(png|jpeg)$/.test(arquivo.type)) {
        mostrarMensagemPerfil('Use uma imagem PNG ou JPG.', 'erro-geral');
        entrada.value = '';
        return;
    }

    try {
        fotoPendente = await reduzirImagem(arquivo);
        document.getElementById('fotoPreview').src = fotoPendente;
        mostrarMensagemPerfil('Foto escolhida. Clique em "Salvar alterações" para guardá-la.');
    } catch (erro) {
        mostrarMensagemPerfil(erro.message, 'erro-geral');
    }
    entrada.value = '';
}

function validarFormulario() {
    limparErros();
    const telefone = document.getElementById('campoTelefone').value.trim();
    if (telefone.replace(/\D/g, '').length < 10) {
        mostrarErro('campoTelefone', 'erroTelefone', 'Telefone incompleto.');
        return false;
    }
    return true;
}

function mostrarErro(idCampo, idErro, mensagem) {
    document.getElementById(idErro).textContent = mensagem;
    document.getElementById(idCampo).closest('.campo').classList.add('campo-invalido');
}

function limparErros() {
    document.querySelectorAll('.campo .erro').forEach(span => span.textContent = '');
    document.querySelectorAll('.campo-invalido').forEach(campo => campo.classList.remove('campo-invalido'));
}

async function aoEnviarFormulario(evento) {
    evento.preventDefault();

    if (!validarFormulario()) {
        mostrarMensagemPerfil('Verifique os campos destacados.', 'erro-geral');
        return;
    }

    const dadosNovos = {
        email: document.getElementById('campoEmail').value.trim(),
        telefone: document.getElementById('campoTelefone').value.trim(),
        foto: fotoPendente !== undefined ? fotoPendente : dadosUsuario.foto
    };

    btnSalvarPerfil.disabled = true;
    btnSalvarPerfil.textContent = 'Salvando...';
    mostrarMensagemPerfil('');

    try {
        const emailAntes = dadosUsuario.email;
        await salvarPerfilNoServidor(dadosNovos);
        const emailMudou = dadosUsuario.email !== emailAntes;
        fotoPendente = undefined;
        atualizarSaudacao();
        mostrarMensagemPerfil(emailMudou
            ? 'Perfil atualizado! Enviamos um código para o novo e-mail: confirme-o na tela de login antes do próximo acesso.'
            : 'Perfil atualizado com sucesso!', 'sucesso');
        setTimeout(fecharPerfil, emailMudou ? 4500 : 1200);
    } catch (erro) {
        mostrarMensagemPerfil(erro.message, 'erro-geral');
    } finally {
        btnSalvarPerfil.disabled = false;
        btnSalvarPerfil.textContent = 'Salvar alterações';
    }
}

function iniciarPerfil() {
    document.getElementById('btnVerPerfil').addEventListener('click', abrirPerfil);
    document.getElementById('linkPerfilNav').addEventListener('click', (e) => {
        e.preventDefault();
        abrirPerfil();
    });

    document.getElementById('btnFecharPerfil').addEventListener('click', fecharPerfil);
    document.getElementById('btnCancelarPerfil').addEventListener('click', fecharPerfil);
    document.getElementById('btnSair').addEventListener('click', sairDaConta);
    document.getElementById('sairDaConta').addEventListener('click', sairDaConta);
    overlayFundo.addEventListener('click', fecharPerfil);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && overlay.classList.contains('aberto')) {
            fecharPerfil();
        }
    });

    document.getElementById('campoCpf').addEventListener('input', aplicarMascaraCpf);
    document.getElementById('campoTelefone').addEventListener('input', aplicarMascaraTelefone);
    document.getElementById('inputFoto').addEventListener('change', preverFoto);
    formPerfil.addEventListener('submit', aoEnviarFormulario);

    // Atualiza nome/saudacao com os dados reais do banco
    buscarPerfil().then(atualizarSaudacao).catch(function () { /* mostrado ao abrir o perfil */ });
}


/*  MENU MOBILE */
function iniciarMenuMobile() {
    const botaoMenu = document.getElementById('menuToggle');
    const menu = document.getElementById('menuNav');

    botaoMenu.addEventListener('click', () => {
        const estaAberto = menu.classList.toggle('aberto');

        botaoMenu.setAttribute('aria-expanded', estaAberto);
        botaoMenu.setAttribute(
            'aria-label',
            estaAberto ? 'Fechar menu de navegação' : 'Abrir menu de navegação'
        );
    });

    menu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            menu.classList.remove('aberto');
            botaoMenu.setAttribute('aria-expanded', 'false');
            botaoMenu.setAttribute('aria-label', 'Abrir menu de navegação');
        });
    });
}


/*  SCROLL-SPY */
function iniciarScrollSpy() {
    const idsComLink = ['monitoramento', 'contatos', 'suporte'];
    const secoes = idsComLink.map(id => document.getElementById(id)).filter(Boolean);
    const linksNav = document.querySelectorAll('#menuNav a');

    function marcarAtivo(id) {
        linksNav.forEach(link => {
            const alvo = id ? `#${id}` : 'logado.html';
            link.classList.toggle('ativo', link.getAttribute('href') === alvo);
        });
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                marcarAtivo(entry.target.id);
            }
        });
    }, {
        rootMargin: '-45% 0px -50% 0px'
    });

    secoes.forEach(secao => observer.observe(secao));

    window.addEventListener('scroll', () => {
        const primeiraSecao = secoes[0];
        if (primeiraSecao && window.scrollY < primeiraSecao.offsetTop - window.innerHeight * 0.5) {
            marcarAtivo(null);
        }
    });
}


/*  CARDS RÁPIDOS */
function iniciarCardsRapidos() {
    document.querySelectorAll('[data-scroll-to]').forEach(card => {
        card.setAttribute('tabindex', '0');
        card.setAttribute('role', 'button');

        const irParaSecao = () => {
            const alvo = document.querySelector(card.dataset.scrollTo);
            if (alvo) {
                alvo.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        };

        card.addEventListener('click', (evento) => {
            if (evento.target.closest('button, a')) return;
            irParaSecao();
        });

        card.addEventListener('keydown', (evento) => {
            if (evento.key === 'Enter' || evento.key === ' ') {
                evento.preventDefault();
                irParaSecao();
            }
        });
    });
}


/*  CONTATOS */
// Enum TipoContato do back: Familiar=0, Cuidador=1, Medico=2, Outro=3
const TIPOS_CONTATO = ['familiar', 'cuidador', 'medico', 'outro'];
const ROTULOS_CONTATO = { familiar: 'Familiar', cuidador: 'Cuidador(a)', medico: 'Médico(a)', outro: 'Outro' };

let listaContatos = [];

function tipoContatoDaApi(t) {
    if (typeof t === 'string') return t.toLowerCase();
    return TIPOS_CONTATO[t] || 'outro';
}

function iniciarAbasContatos() {
    const abas = document.querySelectorAll('.contatos-abas .aba');

    abas.forEach(aba => {
        aba.addEventListener('click', () => {
            abas.forEach(a => a.setAttribute('aria-selected', 'false'));
            document.querySelectorAll('.contatos-painel').forEach(painel => painel.hidden = true);

            aba.setAttribute('aria-selected', 'true');
            const idPainel = aba.getAttribute('aria-controls');
            document.getElementById(idPainel).hidden = false;
        });
    });
}

async function buscarContatos() {
    const lista = await api.contatos();
    listaContatos = lista.map(c => ({
        id: c.id, nome: c.nome, telefone: c.telefone, tipo: tipoContatoDaApi(c.tipo)
    }));
    return listaContatos;
}

function salvarContatoNoServidor(contato) {
    return api.criarContato({
        nome: contato.nome,
        telefone: contato.telefone,
        tipo: TIPOS_CONTATO.indexOf(contato.tipo)
    });
}

function removerContatoNoServidor(id) {
    return api.excluirContato(id);
}

function criarItem(tag, classe, texto) {
    const el = document.createElement(tag);
    if (classe) el.className = classe;
    if (texto !== undefined) el.textContent = texto; // textContent evita injecao de HTML
    return el;
}

function renderizarContatos(contatos) {
    const lista = document.getElementById('listaContatosCompleta');
    lista.innerHTML = '';

    if (contatos.length === 0) {
        lista.appendChild(criarItem('li', 'mensagem-vazio', 'Você ainda não tem contatos cadastrados.'));
    }

    contatos.forEach(contato => {
        const li = criarItem('li', 'contato-item');
        const info = criarItem('div', 'contato-info');
        info.appendChild(criarItem('strong', '', contato.nome));
        info.appendChild(criarItem('span', '', contato.telefone));

        const botao = criarItem('button', 'btn-remover-contato', 'Remover');
        botao.type = 'button';
        botao.dataset.id = contato.id;

        li.appendChild(info);
        li.appendChild(criarItem('span', 'contato-tipo', ROTULOS_CONTATO[contato.tipo] || contato.tipo));
        li.appendChild(botao);
        lista.appendChild(li);
    });

    // Card "Contatos" do topo da pagina
    const resumo = document.querySelector('.card-contatos .lista-contatos');
    if (resumo) {
        resumo.innerHTML = '';
        if (contatos.length === 0) {
            resumo.appendChild(criarItem('li', '', 'Nenhum contato ainda'));
        }
        contatos.slice(0, 3).forEach(contato => {
            const li = document.createElement('li');
            const b = criarItem('button', 'btn-contato', contato.nome + ' (' + (ROTULOS_CONTATO[contato.tipo] || contato.tipo) + ')');
            b.type = 'button';
            li.appendChild(b);
            resumo.appendChild(li);
        });
    }
}

async function carregarContatos() {
    try {
        await buscarContatos();
    } catch (e) {
        listaContatos = [];
        mostrarStatus('mensagemStatusContato', e.message, 'erro');
    }
    renderizarContatos(listaContatos);
}

function iniciarRemocaoContatos() {
    document.getElementById('listaContatosCompleta').addEventListener('click', async (evento) => {
        const botao = evento.target.closest('.btn-remover-contato');
        if (!botao) return;

        botao.disabled = true;
        botao.textContent = 'Removendo...';

        try {
            await removerContatoNoServidor(Number(botao.dataset.id));
            await carregarContatos();
        } catch (e) {
            botao.disabled = false;
            botao.textContent = 'Remover';
            mostrarStatus('mensagemStatusContato', e.message, 'erro');
        }
    });
}

function validarFormularioContato() {
    let valido = true;

    const nome = document.getElementById('novoContatoNome').value.trim();
    const telefone = document.getElementById('novoContatoTelefone').value.trim();

    document.getElementById('erroNovoContatoNome').textContent = '';
    document.getElementById('erroNovoContatoTelefone').textContent = '';

    if (nome.length < 2) {
        document.getElementById('erroNovoContatoNome').textContent = 'Digite um nome.';
        valido = false;
    }

    if (telefone.replace(/\D/g, '').length < 10) {
        document.getElementById('erroNovoContatoTelefone').textContent = 'Telefone incompleto.';
        valido = false;
    }

    return valido;
}

function iniciarFormularioContato() {
    const form = document.getElementById('formNovoContato');
    const btnSalvar = document.getElementById('btnSalvarContato');

    document.getElementById('novoContatoTelefone').addEventListener('input', aplicarMascaraTelefone);

    form.addEventListener('submit', async (evento) => {
        evento.preventDefault();

        if (!validarFormularioContato()) return;

        const contato = {
            nome: document.getElementById('novoContatoNome').value.trim(),
            telefone: document.getElementById('novoContatoTelefone').value.trim(),
            tipo: document.getElementById('novoContatoTipo').value
        };

        btnSalvar.disabled = true;
        btnSalvar.textContent = 'Adicionando...';

        try {
            await salvarContatoNoServidor(contato);
            await carregarContatos();
            form.reset();
            mostrarStatus('mensagemStatusContato', 'Contato adicionado com sucesso!', 'sucesso');
        } catch (e) {
            mostrarStatus('mensagemStatusContato', e.message, 'erro');
        } finally {
            btnSalvar.disabled = false;
            btnSalvar.textContent = 'Adicionar contato';
        }
    });
}


/*  SUPORTE PRIORITÁRIO */
let visitaAtual = null; // { id, data: Date }

function atualizarVisualVisita() {
    atualizarBotoesVisita();
    const datas = document.querySelectorAll('.js-visita-data');
    const horas = document.querySelectorAll('.js-visita-hora');

    if (!visitaAtual) {
        datas.forEach(el => { el.textContent = 'Nenhuma visita agendada'; });
        horas.forEach(el => { el.textContent = ''; });
        return;
    }

    const d = visitaAtual.data;
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    datas.forEach(el => { el.textContent = `${dia}/${mes}/${d.getFullYear()}`; });
    horas.forEach(el => {
        el.textContent = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    });
}

async function carregarVisita() {
    try {
        const v = await api.proximaVisita();
        visitaAtual = v ? { id: v.id, data: new Date(dataDaApi(v.dataHora)) } : null;
    } catch (e) {
        visitaAtual = null; // sem visita futura
    }
    atualizarVisualVisita();
    await carregarHistoricoVisitas();
}

function iniciarVisitas() {
    const form = document.getElementById('formVisita');
    const inputData = document.getElementById('visitaDataHora');
    const status = 'mensagemStatusVisita';
    inputData.addEventListener('focus', () => { inputData.min = paraInputDataHora(new Date()); });

    form.addEventListener('submit', async (evento) => {
        evento.preventDefault();
        if (!inputData.value || new Date(inputData.value) <= new Date()) {
            mostrarStatus(status, 'Escolha uma data e hora no futuro.', 'erro');
            return;
        }
        try {
            await api.agendarVisita(inputData.value, document.getElementById('visitaObservacao').value.trim());
            await carregarVisita();
            form.reset();
            mostrarStatus(status, 'Visita agendada!', 'sucesso');
        } catch (e) {
            mostrarStatus(status, e.message, 'erro');
        }
    });

    const formReagendar = document.getElementById('formReagendar');
    const inputReagendar = document.getElementById('reagendarDataHora');

    document.getElementById('btnReagendar').addEventListener('click', () => {
        if (!visitaAtual) {
            mostrarStatus(status, 'Você não tem visita agendada para reagendar.', 'erro');
            return;
        }
        inputReagendar.min = paraInputDataHora(new Date());
        inputReagendar.value = '';
        formReagendar.hidden = false;
        inputReagendar.focus();
    });

    document.getElementById('btnCancelarReagendar').addEventListener('click', () => {
        formReagendar.hidden = true;
    });

    formReagendar.addEventListener('submit', async (evento) => {
        evento.preventDefault();
        if (!visitaAtual) {
            formReagendar.hidden = true;
            mostrarStatus(status, 'Você não tem visita agendada para reagendar.', 'erro');
            return;
        }
        if (!inputReagendar.value) {
            mostrarStatus(status, 'Escolha a nova data e hora da visita.', 'erro');
            return;
        }
        const nova = new Date(inputReagendar.value);
        if (nova <= new Date()) {
            mostrarStatus(status, 'A nova data precisa estar no futuro.', 'erro');
            return;
        }
        try {
            await api.reagendarVisita(visitaAtual.id, nova);
            formReagendar.hidden = true;
            await carregarVisita();
            mostrarStatus(status, 'Visita reagendada! Confira a nova data acima.', 'sucesso');
        } catch (e) {
            mostrarStatus(status, e.message, 'erro');
        }
    });

    document.getElementById('btnCancelarVisita').addEventListener('click', async () => {
        if (!visitaAtual) {
            mostrarStatus(status, 'Não há visita agendada para cancelar.', 'erro');
            return;
        }
        if (!confirm('Cancelar a visita agendada?')) return;
        try {
            await api.cancelarVisita(visitaAtual.id);
            await carregarVisita();
            mostrarStatus(status, 'Visita cancelada.', 'sucesso');
        } catch (e) {
            mostrarStatus(status, e.message, 'erro');
        }
    });
}


/*  REGISTRO DE HUMOR */
const emojisPorHumor = {
    feliz: document.querySelector('.humor-legenda .feliz'),
    neutro: document.querySelector('.humor-legenda .neutro'),
    triste: document.querySelector('.humor-legenda .triste'),
    estresse: document.querySelector('.humor-legenda .estresse')
};

let dadosHumor = [];

function filtrarHumorPorPeriodo(dataInicio, dataFim) {
    return dadosHumor.filter(item => {
        const dataItem = new Date(item.data);
        return dataItem >= dataInicio && dataItem <= dataFim;
    });
}

function renderizarTimelineHumor(dados) {
    const container = document.getElementById('humorTimeline');
    container.innerHTML = '';

    if (dados.length === 0) {
        container.innerHTML = '<p class="mensagem-vazio">Nenhum registro nesse período.</p>';
        return;
    }

    dados.forEach(item => {
        const data = new Date(item.data);
        const dia = String(data.getDate()).padStart(2, '0');
        const mes = String(data.getMonth() + 1).padStart(2, '0');
        const hora = String(data.getHours()).padStart(2, '0');

        const div = document.createElement('div');
        div.className = 'humor-dia';
        div.innerHTML = `
            <span class="emoji">${emojisPorHumor[item.humor].outerHTML}</span>
            <span class="data">${dia}/${mes}<br>${hora}:${String(data.getMinutes()).padStart(2, '0')}</span>
        `;

        const excluir = document.createElement('button');
        excluir.type = 'button';
        excluir.className = 'btn-excluir-humor';
        excluir.dataset.id = item.id;
        excluir.setAttribute('aria-label', 'Excluir este registro de humor');
        excluir.textContent = '×';
        div.appendChild(excluir);
        container.appendChild(div);
    });
}

function atualizarUltimaAtualizacaoHumor(dados) {
    const elemento = document.getElementById('ultimaAtualizacaoHumor');
    if (dados.length === 0) {
        elemento.textContent = '--';
        return;
    }
    const ultimoItem = dados[dados.length - 1];
    elemento.textContent = formatarDataCompleta(new Date(ultimoItem.data));
}

function aplicarFiltroHumor() {
    const inicioInput = document.getElementById('humorInicio').value;
    const fimInput = document.getElementById('humorFim').value;

    if (!inicioInput || !fimInput) return;

    const dataInicio = new Date(`${inicioInput}T00:00:00`);
    const dataFim = new Date(`${fimInput}T23:59:59`);

    const dadosFiltrados = filtrarHumorPorPeriodo(dataInicio, dataFim);

    renderizarTimelineHumor(dadosFiltrados);
    atualizarUltimaAtualizacaoHumor(dadosFiltrados);
}


/*  INTEGRAÇÃO COM A API */
// A API devolve datas em UTC sem o "Z"; sem ele o navegador leria como hora local.
function dataDaApi(texto) {
    return /Z$|[+-]\d\d:\d\d$/.test(texto) ? texto : texto + 'Z';
}

function paraInputData(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function mostrarStatus(id, texto, tipo) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = texto;
    el.className = 'mensagem-status ' + (tipo || '');
    clearTimeout(el._t);
    if (texto) el._t = setTimeout(() => { el.textContent = ''; }, 4000);
}

function definirPeriodoPadrao() {
    const fim = new Date();
    const inicio = new Date();
    inicio.setDate(inicio.getDate() - 30);
    ['periodoInicio', 'humorInicio'].forEach(id => { document.getElementById(id).value = paraInputData(inicio); });
    ['periodoFim', 'humorFim'].forEach(id => { document.getElementById(id).value = paraInputData(fim); });
}

async function carregarPressao() {
    try {
        const lista = await api.pressoes();
        dadosPressao = lista.map(p => ({
            id: p.id, data: dataDaApi(p.dataHora), valor: p.sistolica, diastolica: p.diastolica
        }));
    } catch (e) {
        dadosPressao = [];
        mostrarStatus('mensagemPressao', e.message, 'erro');
    }
    atualizarPicosDePressao();
    aplicarFiltro();
}

async function carregarHumor() {
    try {
        const lista = await api.humores();
        dadosHumor = lista.map(h => ({
            id: h.id, data: dataDaApi(h.dataHora), humor: HUMOR_NOME[h.humor].toLowerCase()
        }));
    } catch (e) {
        dadosHumor = [];
        mostrarStatus('mensagemHumor', e.message, 'erro');
    }
    aplicarFiltroHumor();
}

function iniciarFormPressao() {
    const form = document.getElementById('formPressao');
    const inputQuando = document.getElementById('pressaoDataHora');
    const definirLimites = () => {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        inputQuando.min = paraInputDataHora(hoje);
        inputQuando.max = paraInputDataHora(new Date());
    };
    definirLimites();
    inputQuando.addEventListener('focus', definirLimites);

    form.addEventListener('submit', async (evento) => {
        evento.preventDefault();
        const sis = parseInt(document.getElementById('pressaoSistolica').value, 10);
        const dia = parseInt(document.getElementById('pressaoDiastolica').value, 10);
        const quando = document.getElementById('pressaoDataHora').value;

        if (!sis || !dia) return mostrarStatus('mensagemPressao', 'Informe a sistólica e a diastólica.', 'erro');
        if (sis < 40 || sis > 300 || dia < 20 || dia > 200) return mostrarStatus('mensagemPressao', 'Valores fora do intervalo aceito.', 'erro');
        if (sis <= dia) return mostrarStatus('mensagemPressao', 'A sistólica deve ser maior que a diastólica.', 'erro');
        if (quando) {
            const escolhida = new Date(quando);
            const inicioHoje = new Date();
            inicioHoje.setHours(0, 0, 0, 0);
            if (escolhida < inicioHoje) return mostrarStatus('mensagemPressao', 'Não é possível registrar medidas em datas anteriores a hoje.', 'erro');
            if (escolhida > new Date(Date.now() + 60000)) return mostrarStatus('mensagemPressao', 'A data da medida não pode estar no futuro.', 'erro');
        }

        const botao = form.querySelector('button[type="submit"]');
        botao.disabled = true;
        try {
            await api.registrarPressao(sis, dia, quando || null);
            form.reset();
            await carregarPressao();
            mostrarStatus('mensagemPressao', 'Medida registrada!', 'sucesso');
        } catch (e) {
            mostrarStatus('mensagemPressao', e.message, 'erro');
        } finally {
            botao.disabled = false;
        }
    });
}

function iniciarBotoesHumor() {
    document.querySelectorAll('.btn-humor').forEach(botao => {
        botao.addEventListener('click', async () => {
            document.querySelectorAll('.btn-humor').forEach(b => { b.disabled = true; });
            try {
                await api.registrarHumor(Number(botao.dataset.humor), null);
                await carregarHumor();
                mostrarStatus('mensagemHumor', 'Humor registrado!', 'sucesso');
            } catch (e) {
                mostrarStatus('mensagemHumor', e.message, 'erro');
            } finally {
                document.querySelectorAll('.btn-humor').forEach(b => { b.disabled = false; });
            }
        });
    });
}


/*  REGISTROS: LISTA, EXCLUSÃO E HISTÓRICO */
const STATUS_VISITA = ['Agendada', 'Reagendada', 'Concluída', 'Cancelada'];

function renderizarListaPressao(dados) {
    const ul = document.getElementById('listaPressao');
    if (!ul) return;
    const contador = document.getElementById('contadorPressao');
    if (contador) contador.textContent = dados.length;
    ul.innerHTML = '';
    if (!dados.length) {
        ul.appendChild(criarItem('li', 'reg-vazio', 'Nenhuma medida registrada nesse período.'));
        return;
    }
    const rotulos = { alta: 'Alta', baixa: 'Baixa', normal: 'Normal' };
    [...dados].sort((a, b) => new Date(b.data) - new Date(a.data)).forEach(item => {
        const d = new Date(item.data);
        const dia = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
        const hora = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        const tipo = classificarMedida(item);

        const li = criarItem('li', 'reg-item reg-' + tipo);
        const quando = criarItem('div', 'reg-quando');
        quando.append(criarItem('strong', '', dia), criarItem('span', '', hora));
        const valor = criarItem('div', 'reg-valor');
        valor.append(criarItem('strong', '', String(item.valor)), criarItem('span', 'reg-barra', '/'),
            criarItem('strong', '', String(item.diastolica)), criarItem('small', '', 'mmHg'));
        const tag = criarItem('span', 'reg-tag reg-tag-' + tipo, rotulos[tipo]);
        const botao = criarItem('button', 'btn-excluir', 'Excluir');
        botao.type = 'button';
        botao.dataset.id = item.id;
        botao.setAttribute('aria-label', `Excluir a medida de ${dia} às ${hora}`);
        li.append(quando, valor, tag, botao);
        ul.appendChild(li);
    });
}

function linhaVisita(v) {
    const d = new Date(dataDaApi(v.dataHora));
    const passou = d < new Date();
    let rotulo = 'Agendada', classe = 'agendada';
    if (v.status === 3) { rotulo = 'Cancelada'; classe = 'cancelada'; }
    else if (passou) { rotulo = 'Concluída'; classe = 'concluida'; } // o back não marca "concluída": derivamos pela data
    else if (v.status === 1) { rotulo = 'Reagendada'; classe = 'reagendada'; }

    const dia = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    const hora = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    const li = criarItem('li', 'reg-item reg-visita reg-visita-' + classe);
    const quando = criarItem('div', 'reg-quando');
    quando.append(criarItem('strong', '', dia), criarItem('span', '', hora));
    li.append(quando,
        criarItem('div', 'reg-info', v.observacao ? v.observacao : 'Visita de suporte'),
        criarItem('span', 'reg-tag reg-tag-' + classe, rotulo));
    return { li, futura: !passou && v.status !== 3 };
}

async function carregarHistoricoVisitas() {
    const ulProximas = document.getElementById('listaVisitasProximas');
    const ulPassadas = document.getElementById('listaVisitasPassadas');
    if (!ulProximas || !ulPassadas) return;
    let lista = [];
    try {
        const resposta = await api.visitas();
        lista = Array.isArray(resposta) ? resposta : [];
    } catch (e) {
        ulProximas.innerHTML = '';
        ulPassadas.innerHTML = '';
        ulProximas.appendChild(criarItem('li', 'reg-vazio', e.message));
        return;
    }
    const quando = v => new Date(dataDaApi(v.dataHora));
    const itens = lista.map(v => ({ v, ...linhaVisita(v) }));
    const proximas = itens.filter(i => i.futura).sort((a, b) => quando(a.v) - quando(b.v));
    const passadas = itens.filter(i => !i.futura).sort((a, b) => quando(b.v) - quando(a.v));

    ulProximas.innerHTML = '';
    ulPassadas.innerHTML = '';
    if (!proximas.length) ulProximas.appendChild(criarItem('li', 'reg-vazio', 'Nenhuma visita agendada.'));
    if (!passadas.length) ulPassadas.appendChild(criarItem('li', 'reg-vazio', 'Nenhuma visita passada ainda.'));
    proximas.forEach(i => ulProximas.appendChild(i.li));
    passadas.forEach(i => ulPassadas.appendChild(i.li));
}

function iniciarExclusoes() {
    document.getElementById('listaPressao').addEventListener('click', async (evento) => {
        const botao = evento.target.closest('.btn-excluir');
        if (!botao || !confirm('Excluir esta medida de pressão?')) return;
        botao.disabled = true;
        try {
            await api.excluirPressao(Number(botao.dataset.id));
            await carregarPressao();
            mostrarStatus('mensagemPressao', 'Medida excluída.', 'sucesso');
        } catch (e) {
            botao.disabled = false;
            mostrarStatus('mensagemPressao', e.message, 'erro');
        }
    });

    document.getElementById('humorTimeline').addEventListener('click', async (evento) => {
        const botao = evento.target.closest('.btn-excluir-humor');
        if (!botao || !confirm('Excluir este registro de humor?')) return;
        try {
            await api.excluirHumor(Number(botao.dataset.id));
            await carregarHumor();
            mostrarStatus('mensagemHumor', 'Registro excluído.', 'sucesso');
        } catch (e) {
            mostrarStatus('mensagemHumor', e.message, 'erro');
        }
    });
}


/*  MEU PLANO E UTILITÁRIOS */
function paraInputDataHora(d) {
    return paraInputData(d) + 'T' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

function atualizarBotoesVisita() {
    const tem = !!visitaAtual;
    ['btnReagendar', 'btnCancelarVisita'].forEach(id => {
        const botao = document.getElementById(id);
        if (!botao) return;
        botao.disabled = !tem;
        botao.title = tem ? '' : 'Você não tem visita agendada.';
    });
    if (!tem) {
        const formReagendar = document.getElementById('formReagendar');
        if (formReagendar) formReagendar.hidden = true;
    }
}

const PLANOS_INFO = [
    { nome: 'Essencial', preco: '0,00', periodo: '/mês' },
    { nome: 'Cuidado+', preco: '59,90', periodo: '/mês' },
    { nome: 'Cuidado Total', preco: '699,99', periodo: '/ano' }
];

function renderizarPlanos(planoAtual) {
    const grade = document.getElementById('planosOpcoes');
    if (!grade) return;
    const temPlano = planoAtual !== null && planoAtual !== undefined;
    document.getElementById('planoAtualNome').textContent = temPlano ? (PLANOS_NOME[planoAtual] || 'Plano ativo') : 'Nenhum plano contratado';
    grade.innerHTML = '';
    PLANOS_INFO.forEach((p, i) => {
        const eAtual = temPlano && planoAtual === i;
        const card = criarItem('article', 'plano-card' + (eAtual ? ' atual' : ''));
        card.appendChild(criarItem('h3', '', p.nome));
        const preco = criarItem('p', 'plano-preco', 'R$ ' + p.preco);
        preco.appendChild(criarItem('small', '', ' ' + p.periodo));
        card.appendChild(preco);
        if (eAtual) {
            card.appendChild(criarItem('span', 'plano-selo', 'Seu plano atual'));
            const botao = criarItem('button', 'btn-registrar', 'Plano atual');
            botao.type = 'button';
            botao.disabled = true;
            card.appendChild(botao);
        } else {
            const link = criarItem('a', 'btn-registrar btn-link', temPlano ? 'Trocar para este plano' : 'Assinar este plano');
            link.href = 'checkout.html?plano=' + encodeURIComponent(p.nome) + '&preco=' + encodeURIComponent(p.preco);
            card.appendChild(link);
        }
        grade.appendChild(card);
    });
}

async function carregarPlano() {
    let plano = null;
    try {
        const u = await api.perfil();
        localStorage.setItem(CHAVE_SESSAO_USUARIO, JSON.stringify(u));
        dadosUsuario = usuarioDaApi(u);
        plano = u.plano;
    } catch (e) {
        plano = lerSessaoUsuario().plano;
    }
    renderizarPlanos(plano);
}


/*  INICIALIZAÇÃO DO LOGADO */
document.addEventListener('DOMContentLoaded', async () => {
    if (!document.getElementById('saudacaoNome')) return;
    if (!exigirLogin()) return;

    atualizarSaudacao();
    iniciarMenuMobile();
    iniciarScrollSpy();
    iniciarCardsRapidos();

    definirPeriodoPadrao();
    document.getElementById('periodoInicio').addEventListener('change', aplicarFiltro);
    document.getElementById('periodoFim').addEventListener('change', aplicarFiltro);
    document.getElementById('humorInicio').addEventListener('change', aplicarFiltroHumor);
    document.getElementById('humorFim').addEventListener('change', aplicarFiltroHumor);

    iniciarPerfil();
    const linkPlano = document.getElementById('linkTrocarPlano');
    if (linkPlano) linkPlano.addEventListener('click', fecharPerfil);

    iniciarAbasContatos();
    carregarContatos();
    iniciarRemocaoContatos();
    iniciarFormularioContato();

    iniciarFormPressao();
    iniciarBotoesHumor();
    iniciarVisitas();
    iniciarExclusoes();

    await Promise.all([carregarPressao(), carregarHumor(), carregarVisita(), carregarPlano()]);
});


/* ====== LOGIN ====== */
(function () {
    if (!document.querySelector('.login-form')) return;

    const CHAVE_USUARIOS = 'medicaMaisUsuarios';
    const CHAVE_LEMBRAR = 'medicaMaisLembrar';
    const CHAVE_LOGADO = 'medicaMaisUsuarioLogado';

    /*  MENSAGENS */
    function mostrarMensagem(elemento, mensagem, tipo) {
        elemento.textContent = mensagem;
        elemento.classList.remove('sucesso');
        if (tipo === 'sucesso') {
            elemento.classList.add('sucesso');
        }
        elemento.classList.add('mostrar');
    }

    function esconderMensagem(elemento) {
        elemento.textContent = '';
        elemento.classList.remove('mostrar', 'sucesso');
    }

    function ehEmailValido(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    /*  ARMAZENAMENTO */
    function obterUsuarios() {
        try {
            return JSON.parse(localStorage.getItem(CHAVE_USUARIOS)) || [];
        } catch (e) {
            return [];
        }
    }

    function salvarUsuarios(lista) {
        localStorage.setItem(CHAVE_USUARIOS, JSON.stringify(lista));
    }

    function buscarUsuarioPorEmail(email) {
        const emailNormalizado = email.trim().toLowerCase();
        return obterUsuarios().find(function (u) {
            return u.email === emailNormalizado;
        });
    }

    /*  ELEMENTOS */
    const botaoOlho = document.querySelector('.olho');
    const campoSenha = document.querySelector('.senha-container input');
    const formLogin = document.querySelector('.login-form');
    const campoEmail = document.querySelector('input[type="email"]');
    const erroLogin = document.querySelector('#erro-login');
    const erroEmail = document.querySelector('#erro-email');
    const lembrarSenha = document.querySelector('#lembrar-senha');

    const linkEsqueceu = document.querySelector('.esqueceu');
    const overlayEsqueci = document.querySelector('#overlay-esqueci');
    const btnCancelar = document.querySelector('.btn-cancelar');
    const formEsqueci = document.querySelector('.form-esqueci');
    const campoEmailEsqueci = document.querySelector('#esqueci-email');
    const erroEsqueci = document.querySelector('#erro-esqueci');

    const linkCadastro = document.querySelector('.cadastro strong');
    const overlayCadastro = document.querySelector('#overlay-cadastro');
    const btnCancelarCadastro = document.querySelector('#cancelar-cadastro');
    const formCadastro = document.querySelector('.form-cadastro');
    const erroCadastro = document.querySelector('#erro-cadastro');
    const erroCpf = document.querySelector('#erro-cpf');
    const campoCpf = document.querySelector('#cpf');
    const campoNome = document.querySelector('#nome');
    const campoEmailCadastro = document.querySelector('#email-cadastro');
    const erroEmailCadastro = document.querySelector('#erro-email-cadastro');
    const campoTelefoneCadastro = document.querySelector('#telefone-cadastro');
    const erroTelefoneCadastro = document.querySelector('#erro-telefone-cadastro');
    const campoSenhaCadastro = document.querySelector('#senha-cadastro');
    const campoConfirmaSenha = document.querySelector('#confirma-senha');

    /*  EMAIL LEMBRADO */
    window.addEventListener('DOMContentLoaded', function () {
        const emailLembrado = localStorage.getItem(CHAVE_LEMBRAR);
        if (emailLembrado) {
            campoEmail.value = emailLembrado;
            if (lembrarSenha) {
                lembrarSenha.checked = true;
            }
        }
    });

    /*  LOGIN */
    formLogin.addEventListener('submit', async function (evento) {
        evento.preventDefault();
        esconderMensagem(erroLogin);
        esconderMensagem(erroEmail);

        const email = campoEmail.value.trim();
        const senha = campoSenha.value;

        if (email === '' || senha === '') {
            mostrarMensagem(erroLogin, 'Preencha o email e a senha para continuar.', 'erro');
            return;
        }

        if (!ehEmailValido(email)) {
            mostrarMensagem(erroEmail, 'Digite um email válido, como exemplo@gmail.com.', 'erro');
            return;
        }

        const botao = formLogin.querySelector('button[type="submit"]');
        if (botao) botao.disabled = true;

        try {
            const resposta = await api.login(email, senha);
            salvarSessao(resposta);

            if (lembrarSenha && lembrarSenha.checked) {
                localStorage.setItem(CHAVE_LEMBRAR, email.toLowerCase());
            } else {
                localStorage.removeItem(CHAVE_LEMBRAR);
            }

            const primeiroNome = resposta.usuario.nome ? resposta.usuario.nome.split(' ')[0] : '';
            mostrarMensagem(erroLogin, 'Login realizado com sucesso! Bem-vindo(a), ' + primeiroNome + '. Redirecionando...', 'sucesso');

            setTimeout(function () {
                const destino = sessionStorage.getItem('medicaMaisRedirecionar');
                sessionStorage.removeItem('medicaMaisRedirecionar');
                window.location.href = destino || 'logado.html';
            }, 1200);
        } catch (erro) {
            mostrarMensagem(erroLogin, erro.message + ' Se você acabou de se cadastrar e não confirmou o email, use "Esqueceu sua senha?" para receber um código que também confirma o email.', 'erro');
            if (botao) botao.disabled = false;
        }
    });

    /*  ESQUECI A SENHA */
    const overlayRedefinir = document.querySelector('#overlay-redefinir');
    const formRedefinir = document.querySelector('.form-redefinir');
    const textoRedefinir = document.querySelector('#texto-redefinir');
    const erroRedefinir = document.querySelector('#erro-redefinir');
    const campoNovaSenha = document.querySelector('#nova-senha');
    const campoConfirmaNovaSenha = document.querySelector('#confirma-nova-senha');
    const digitosRedefinir = Array.from(document.querySelectorAll('#overlay-redefinir .codigo-digito'));
    let emailRedefinicao = '';

    function limparRedefinicao() {
        digitosRedefinir.forEach(function (d) {
            d.value = '';
            d.classList.remove('preenchido');
        });
        campoNovaSenha.value = '';
        campoConfirmaNovaSenha.value = '';
        esconderMensagem(erroRedefinir);
    }

    function abrirRedefinicao(email) {
        emailRedefinicao = email;
        limparRedefinicao();
        textoRedefinir.innerHTML = 'Se <strong></strong> tiver cadastro, enviamos um código de 6 números. Digite o código e escolha a nova senha.';
        textoRedefinir.querySelector('strong').textContent = email;
        overlayRedefinir.classList.add('ativo');
        setTimeout(function () { digitosRedefinir[0].focus(); }, 50);
    }

    function fecharRedefinicao() {
        overlayRedefinir.classList.remove('ativo');
        limparRedefinicao();
    }

    linkEsqueceu.addEventListener('click', function (evento) {
        evento.preventDefault();
        if (ehEmailValido(campoEmail.value.trim())) {
            campoEmailEsqueci.value = campoEmail.value.trim();
        }
        overlayEsqueci.classList.add('ativo');
        setTimeout(function () { campoEmailEsqueci.focus(); }, 50);
    });

    btnCancelar.addEventListener('click', function () {
        overlayEsqueci.classList.remove('ativo');
        esconderMensagem(erroEsqueci);
    });

    formEsqueci.addEventListener('submit', async function (evento) {
        evento.preventDefault();
        esconderMensagem(erroEsqueci);

        const email = campoEmailEsqueci.value.trim().toLowerCase();

        if (email === '') {
            mostrarMensagem(erroEsqueci, 'Digite o email cadastrado na sua conta.', 'erro');
            return;
        }

        if (!ehEmailValido(email)) {
            mostrarMensagem(erroEsqueci, 'Digite um email válido, como exemplo@gmail.com.', 'erro');
            return;
        }

        const botao = formEsqueci.querySelector('button[type="submit"]');
        if (botao) botao.disabled = true;

        try {
            await api.esqueciSenha(email);
            overlayEsqueci.classList.remove('ativo');
            abrirRedefinicao(email);
        } catch (erro) {
            mostrarMensagem(erroEsqueci, erro.message, 'erro');
        } finally {
            if (botao) botao.disabled = false;
        }
    });

    digitosRedefinir.forEach(function (campo, i) {
        campo.addEventListener('input', function () {
            campo.value = campo.value.replace(/\D/g, '').slice(-1);
            campo.classList.toggle('preenchido', campo.value !== '');
            if (campo.value && i < digitosRedefinir.length - 1) digitosRedefinir[i + 1].focus();
        });

        campo.addEventListener('keydown', function (evento) {
            if (evento.key === 'Backspace' && !campo.value && i > 0) {
                digitosRedefinir[i - 1].focus();
            }
        });

        campo.addEventListener('paste', function (evento) {
            evento.preventDefault();
            const colado = (evento.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, digitosRedefinir.length);
            colado.split('').forEach(function (numero, k) {
                digitosRedefinir[k].value = numero;
                digitosRedefinir[k].classList.add('preenchido');
            });
            if (colado.length) digitosRedefinir[Math.min(colado.length, digitosRedefinir.length - 1)].focus();
        });
    });

    formRedefinir.addEventListener('submit', async function (evento) {
        evento.preventDefault();
        esconderMensagem(erroRedefinir);

        const codigo = digitosRedefinir.map(function (d) { return d.value; }).join('');
        const novaSenha = campoNovaSenha.value;

        if (codigo.length !== digitosRedefinir.length) {
            mostrarMensagem(erroRedefinir, 'Digite os 6 números do código.', 'erro');
            return;
        }

        if (novaSenha.length < 6) {
            mostrarMensagem(erroRedefinir, 'A nova senha deve ter no mínimo 6 caracteres.', 'erro');
            return;
        }

        if (novaSenha !== campoConfirmaNovaSenha.value) {
            mostrarMensagem(erroRedefinir, 'As senhas não coincidem. Digite a mesma senha nos dois campos.', 'erro');
            return;
        }

        const botao = formRedefinir.querySelector('button[type="submit"]');
        if (botao) botao.disabled = true;

        try {
            const r = await api.redefinirSenha(emailRedefinicao, codigo, novaSenha);
            mostrarMensagem(erroRedefinir, (r && r.mensagem) || 'Senha redefinida com sucesso.', 'sucesso');
            campoEmail.value = emailRedefinicao;

            setTimeout(function () {
                fecharRedefinicao();
                campoSenha.value = '';
                campoSenha.focus();
            }, 1800);
        } catch (erro) {
            mostrarMensagem(erroRedefinir, erro.message, 'erro');
        } finally {
            if (botao) botao.disabled = false;
        }
    });

    document.querySelector('#reenviar-redefinir').addEventListener('click', async function () {
        esconderMensagem(erroRedefinir);
        try {
            await api.esqueciSenha(emailRedefinicao);
            mostrarMensagem(erroRedefinir, 'Se o email estiver cadastrado, enviamos um novo código.', 'sucesso');
        } catch (erro) {
            mostrarMensagem(erroRedefinir, erro.message, 'erro');
        }
    });

    document.querySelector('#cancelar-redefinir').addEventListener('click', fecharRedefinicao);

    /*  CADASTRO */
    linkCadastro.addEventListener('click', function () {
        overlayCadastro.classList.add('ativo');
    });

    btnCancelarCadastro.addEventListener('click', function () {
        overlayCadastro.classList.remove('ativo');
        esconderMensagem(erroCadastro);
        esconderMensagem(erroCpf);
        esconderMensagem(erroEmailCadastro);
    });

    formCadastro.addEventListener('submit', async function (evento) {
        evento.preventDefault();
        esconderMensagem(erroCadastro);
        esconderMensagem(erroCpf);
        esconderMensagem(erroTelefoneCadastro);
        esconderMensagem(erroEmailCadastro);

        const nome = campoNome.value.trim();
        const email = campoEmailCadastro.value.trim();
        const senha = campoSenhaCadastro.value;
        const confirmaSenha = campoConfirmaSenha.value;
        const papelSelecionado = document.querySelector('input[name="papel"]:checked');

        if (nome === '') {
            mostrarMensagem(erroCadastro, 'Digite seu nome completo.', 'erro');
            return;
        }

        if (campoCpf.value.length !== 11) {
            mostrarMensagem(erroCpf, 'O CPF deve ter 11 números.', 'erro');
            return;
        }

        if (campoTelefoneCadastro.value.replace(/\D/g, '').length < 10) {
            mostrarMensagem(erroTelefoneCadastro, 'Digite um telefone com DDD, como (11) 90000-0000.', 'erro');
            return;
        }

        if (!ehEmailValido(email)) {
            mostrarMensagem(erroEmailCadastro, 'Digite um email válido, como exemplo@gmail.com.', 'erro');
            return;
        }

        if (!papelSelecionado) {
            mostrarMensagem(erroCadastro, 'Selecione se você é Cuidador, Paciente ou Parente.', 'erro');
            return;
        }

        if (senha.length < 6) {
            mostrarMensagem(erroCadastro, 'A senha deve ter no mínimo 6 caracteres.', 'erro');
            return;
        }

        if (senha !== confirmaSenha) {
            mostrarMensagem(erroCadastro, 'As senhas não coincidem. Digite a mesma senha nos dois campos.', 'erro');
            return;
        }

        const tiposUsuario = { paciente: 0, cuidador: 1, parente: 2 };
        const botao = formCadastro.querySelector('button[type="submit"]');
        if (botao) botao.disabled = true;

        try {
            await api.cadastro({
                nome: nome,
                cpf: campoCpf.value,
                telefone: campoTelefoneCadastro.value,
                email: email.toLowerCase(),
                senha: senha,
                tipoUsuario: tiposUsuario[papelSelecionado.value]
            });

            campoEmail.value = email.toLowerCase();
            overlayCadastro.classList.remove('ativo');
            esconderMensagem(erroCadastro);
            formCadastro.reset();
            abrirConfirmacao(email.toLowerCase());
        } catch (erro) {
            mostrarMensagem(erroCadastro, erro.message, 'erro');
        } finally {
            if (botao) botao.disabled = false;
        }
    });

    /*  CONFIRMACAO DE EMAIL */

    const overlayConfirmar = document.querySelector('#overlay-confirmar');
    const formConfirmar = document.querySelector('.form-confirmar');
    const campoConfirmaEmail = document.querySelector('#confirma-email');
    const linhaEmailConfirma = document.querySelector('#linha-email-confirma');
    const textoConfirmar = document.querySelector('#texto-confirmar');
    const erroConfirmar = document.querySelector('#erro-confirmar');
    const digitos = Array.from(document.querySelectorAll('#overlay-confirmar .codigo-digito'));

    function codigoDigitado() {
        return digitos.map(function (d) { return d.value; }).join('');
    }

    function limparDigitos() {
        digitos.forEach(function (d) {
            d.value = '';
            d.classList.remove('preenchido');
        });
    }

    function abrirConfirmacao(email) {
        limparDigitos();
        esconderMensagem(erroConfirmar);

        if (email) {
            campoConfirmaEmail.value = email;
            linhaEmailConfirma.hidden = true;
            textoConfirmar.innerHTML = 'Enviamos um código de 6 números para <strong></strong>.';
            textoConfirmar.querySelector('strong').textContent = email;
        } else {
            linhaEmailConfirma.hidden = false;
            textoConfirmar.textContent = 'Digite o seu email e o código de 6 números que enviamos para você.';
        }

        overlayConfirmar.classList.add('ativo');
        setTimeout(function () {
            (email ? digitos[0] : campoConfirmaEmail).focus();
        }, 50);
    }

    function fecharConfirmacao() {
        overlayConfirmar.classList.remove('ativo');
        esconderMensagem(erroConfirmar);
    }

    digitos.forEach(function (campo, i) {
        campo.addEventListener('input', function () {
            campo.value = campo.value.replace(/\D/g, '').slice(-1);
            campo.classList.toggle('preenchido', campo.value !== '');
            if (campo.value && i < digitos.length - 1) digitos[i + 1].focus();
        });

        campo.addEventListener('keydown', function (evento) {
            if (evento.key === 'Backspace' && !campo.value && i > 0) {
                digitos[i - 1].focus();
            }
        });

        campo.addEventListener('paste', function (evento) {
            evento.preventDefault();
            const colado = (evento.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, digitos.length);
            colado.split('').forEach(function (numero, k) {
                digitos[k].value = numero;
                digitos[k].classList.add('preenchido');
            });
            if (colado.length) digitos[Math.min(colado.length, digitos.length - 1)].focus();
        });
    });

    document.querySelector('#cancelar-confirmar').addEventListener('click', fecharConfirmacao);

    formConfirmar.addEventListener('submit', async function (evento) {
        evento.preventDefault();
        esconderMensagem(erroConfirmar);

        const emailConfirmar = campoConfirmaEmail.value.trim();
        const codigo = codigoDigitado();

        if (!ehEmailValido(emailConfirmar)) {
            mostrarMensagem(erroConfirmar, 'Digite um email válido.', 'erro');
            return;
        }

        if (codigo.length !== digitos.length) {
            mostrarMensagem(erroConfirmar, 'Digite os 6 números do código.', 'erro');
            return;
        }

        const botao = formConfirmar.querySelector('button[type="submit"]');
        if (botao) botao.disabled = true;

        try {
            const r = await api.confirmarEmail(emailConfirmar, codigo);
            mostrarMensagem(erroConfirmar, (r && r.mensagem) || 'Email confirmado! Agora é só fazer login.', 'sucesso');
            campoEmail.value = emailConfirmar;

            setTimeout(function () {
                fecharConfirmacao();
                limparDigitos();
                campoSenha.focus();
            }, 1800);
        } catch (erro) {
            mostrarMensagem(erroConfirmar, erro.message, 'erro');
            if (botao) botao.disabled = false;
            return;
        }

        if (botao) botao.disabled = false;
    });

    /*  TELEFONE */
    campoTelefoneCadastro.addEventListener('input', function () {
        const numeros = campoTelefoneCadastro.value.replace(/\D/g, '').slice(0, 11);
        campoTelefoneCadastro.value = numeros.length <= 10
            ? numeros.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2')
            : numeros.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
    });

    /*  CPF */
    campoCpf.addEventListener('input', function () {
        let valor = campoCpf.value.replace(/\D/g, '');
        valor = valor.slice(0, 11);
        campoCpf.value = valor;
    });
})();