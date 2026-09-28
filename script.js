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
            mostrarSucesso('Plano Basic grátis ativado!');
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

        setTimeout(function () {
            btnPagar.disabled = false;
            btnPagar.textContent = 'Pagar R$ ' + precoStr;
            mostrarSucesso('Pagamento de R$ ' + precoStr + ' aprovado! Seu plano ' + nomePlano + ' já está ativo.');
        }, 2000);
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

        setTimeout(function () {
            btnConfirmar.disabled = false;
            btnConfirmar.textContent = 'Já paguei';
            mostrarSucesso('Pix de R$ ' + precoStr + ' confirmado! Seu plano ' + nomePlano + ' já está ativo.');
        }, 2500);
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

    const picoAlto = gerarPressaoAleatoria(140, 180, 90, 115);
    const picoBaixo = gerarPressaoAleatoria(60, 90, 40, 60);

    const dataAlto = gerarDataAleatoria(72);
    const dataBaixo = gerarDataAleatoria(72);

    preencherCard(cardAlto, picoAlto, dataAlto);
    preencherCard(cardBaixo, picoBaixo, dataBaixo);
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
const dadosPressao = [{
        data: '2026-05-01T00:00',
        valor: 115
    }, {
        data: '2026-05-01T12:00',
        valor: 118
    },
    {
        data: '2026-05-02T00:00',
        valor: 112
    }, {
        data: '2026-05-02T12:00',
        valor: 116
    },
    {
        data: '2026-05-03T00:00',
        valor: 110
    }, {
        data: '2026-05-03T12:00',
        valor: 114
    },
    {
        data: '2026-05-04T00:00',
        valor: 117
    }, {
        data: '2026-05-04T12:00',
        valor: 119
    },

    {
        data: '2026-05-05T00:00',
        valor: 125
    }, {
        data: '2026-05-05T12:00',
        valor: 135
    },
    {
        data: '2026-05-06T00:00',
        valor: 148
    }, {
        data: '2026-05-06T12:00',
        valor: 158
    },
    {
        data: '2026-05-07T00:00',
        valor: 165
    }, {
        data: '2026-05-07T12:00',
        valor: 150
    },

    {
        data: '2026-05-08T00:00',
        valor: 130
    }, {
        data: '2026-05-08T12:00',
        valor: 110
    },
    {
        data: '2026-05-09T00:00',
        valor: 90
    }, {
        data: '2026-05-09T12:00',
        valor: 75
    },
    {
        data: '2026-05-10T00:00',
        valor: 65
    }, {
        data: '2026-05-10T12:00',
        valor: 85
    },

    {
        data: '2026-05-11T00:00',
        valor: 110
    }, {
        data: '2026-05-11T12:00',
        valor: 116
    },
    {
        data: '2026-05-12T00:00',
        valor: 118
    }, {
        data: '2026-05-12T12:00',
        valor: 115
    },
    {
        data: '2026-05-13T00:00',
        valor: 112
    }, {
        data: '2026-05-13T12:00',
        valor: 117
    },
    {
        data: '2026-05-14T00:00',
        valor: 119
    }, {
        data: '2026-05-14T12:00',
        valor: 116
    },

    {
        data: '2026-05-15T00:00',
        valor: 128
    }, {
        data: '2026-05-15T12:00',
        valor: 140
    },
    {
        data: '2026-05-16T00:00',
        valor: 155
    }, {
        data: '2026-05-16T12:00',
        valor: 168
    },

    {
        data: '2026-05-17T00:00',
        valor: 172
    }, {
        data: '2026-05-17T12:00',
        valor: 150
    },

    {
        data: '2026-05-18T00:00',
        valor: 130
    }, {
        data: '2026-05-18T12:00',
        valor: 118
    },
    {
        data: '2026-05-19T00:00',
        valor: 115
    }, {
        data: '2026-05-19T12:00',
        valor: 117
    },
    {
        data: '2026-05-20T00:00',
        valor: 114
    }, {
        data: '2026-05-20T12:00',
        valor: 116
    }
];


/*  GRÁFICO + FILTRO + BADGES */
let graficoPressao = null;

function corDoPonto(valor) {
    if (valor > 140) return '#e63946';
    if (valor < 90) return '#2d7ff9';
    return '#2e9e3f';
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
    const valores = dados.map(item => item.valor);
    const cores = dados.map(item => corDoPonto(item.valor));

    if (graficoPressao) {
        graficoPressao.destroy();
    }

    graficoPressao = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Pressão sistólica (mmHg)',
                data: valores,
                borderColor: '#2e9e3f',
                borderWidth: 2,
                pointBackgroundColor: cores,
                pointBorderColor: cores,
                pointRadius: 5,
                pointHoverRadius: 7,
                tension: 0.4,
                fill: false
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
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

    const picoAlto = dados.reduce((maior, atual) => atual.valor > maior.valor ? atual : maior, dados[0]);
    const picoBaixo = dados.reduce((menor, atual) => atual.valor < menor.valor ? atual : menor, dados[0]);

    const temPicoAlto = picoAlto.valor > 140;
    const temPicoBaixo = picoBaixo.valor < 90;

    if (temPicoAlto) listaBadges.appendChild(criarBadge(picoAlto, 'alto'));
    if (temPicoBaixo) listaBadges.appendChild(criarBadge(picoBaixo, 'baixo'));

    statusFiltro.textContent = (!temPicoAlto && !temPicoBaixo) ?
        'Nesse período a pressão de Maria se manteve dentro da faixa normal 👍' :
        '';
}

function criarBadge(item, tipo) {
    const li = document.createElement('li');
    li.className = `badge badge-${tipo}`;

    const dataFormatada = formatarDataCompleta(new Date(item.data));
    const textoTag = tipo === 'alto' ? 'Pico de pressão alta' : 'Pico de pressão baixa';

    li.innerHTML = `
        <span>${dataFormatada}</span>
        <p>${textoTag}</p>
        <strong>${item.valor} mmHg</strong>
    `;

    return li;
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
    atualizarBadges(dadosFiltrados);
    atualizarUltimaAtualizacao(dadosFiltrados);
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
const CHAVE_USUARIOS = 'medicaMaisUsuarios';
const CHAVE_LOGADO = 'medicaMaisUsuarioLogado';

function lerJson(chave, padrao) {
    try {
        return JSON.parse(localStorage.getItem(chave)) || padrao;
    } catch (e) {
        return padrao;
    }
}

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

function carregarUsuarioLogado() {
    const logado = lerJson(CHAVE_LOGADO, null) || {};
    const cadastro = lerJson(CHAVE_USUARIOS, []).find(function (u) {
        return u.email === logado.email;
    }) || {};

    return {
        nome: cadastro.nome || logado.nome || '',
        email: cadastro.email || logado.email || '',
        cpf: formatarCpf(cadastro.cpf),
        telefone: formatarTelefone(cadastro.telefone),
        tipo: cadastro.papel || logado.papel || 'paciente',
        plano: cadastro.plano || 'Basic + Anual',
        foto: cadastro.foto || null
    };
}

let dadosUsuario = carregarUsuarioLogado();

function gravarUsuarioLogado(dados) {
    const usuarios = lerJson(CHAVE_USUARIOS, []);
    const emailAntigo = (lerJson(CHAVE_LOGADO, {}) || {}).email;

    const indice = usuarios.findIndex(function (u) {
        return u.email === emailAntigo;
    });

    if (indice >= 0) {
        usuarios[indice] = Object.assign({}, usuarios[indice], {
            nome: dados.nome,
            email: dados.email.toLowerCase(),
            cpf: dados.cpf,
            telefone: dados.telefone,
            papel: dados.tipo,
            foto: dados.foto || null
        });
        localStorage.setItem(CHAVE_USUARIOS, JSON.stringify(usuarios));
    }

    localStorage.setItem(CHAVE_LOGADO, JSON.stringify({
        nome: dados.nome,
        email: dados.email.toLowerCase(),
        papel: dados.tipo
    }));
}

function atualizarSaudacao() {
    const titulo = document.getElementById('saudacaoNome');
    if (!titulo) return;

    const primeiroNome = dadosUsuario.nome ? dadosUsuario.nome.split(' ')[0] : '';
    titulo.textContent = primeiroNome ? 'Olá, ' + primeiroNome + '!' : 'Olá!';
}

const overlay = document.getElementById('perfilOverlay');
const overlayFundo = document.getElementById('perfilFundo');
const formPerfil = document.getElementById('formPerfil');
const btnSalvarPerfil = document.getElementById('btnSalvarPerfil');
const mensagemStatus = document.getElementById('mensagemStatus');

function buscarPerfil() {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(dadosUsuario);
        }, 500);
    });
}

function salvarPerfilNoServidor(dadosNovos) {
    return new Promise((resolve) => {
        setTimeout(() => {
            dadosUsuario = {
                ...dadosUsuario,
                ...dadosNovos
            };
            gravarUsuarioLogado(dadosUsuario);
            resolve(dadosUsuario);
        }, 900);
    });
}

async function abrirPerfil() {
    overlay.classList.add('aberto');
    overlay.setAttribute('aria-hidden', 'false');
    mensagemStatus.textContent = '';
    mensagemStatus.className = 'mensagem-status';

    const perfil = await buscarPerfil();
    preencherFormulario(perfil);

    document.getElementById('campoNome').focus();
}

function preencherFormulario(perfil) {
    document.getElementById('campoNome').value = perfil.nome;
    document.getElementById('campoEmail').value = perfil.email;
    document.getElementById('campoCpf').value = perfil.cpf;
    document.getElementById('campoTelefone').value = perfil.telefone;
    document.getElementById('campoTipo').value = perfil.tipo;
    document.getElementById('campoPlano').textContent = perfil.plano;
    document.getElementById('fotoPreview').src = perfil.foto || 'img/avatar.png';
}

function fecharPerfil() {
    overlay.classList.remove('aberto');
    overlay.setAttribute('aria-hidden', 'true');
    limparErros();
    document.getElementById('btnVerPerfil').focus();
}

function sairDaConta() {
    localStorage.removeItem('medicaMaisUsuarioLogado');
    window.location.href = 'index.html';
}

function aplicarMascaraCpf(evento) {
    let numeros = evento.target.value.replace(/\D/g, '');
    numeros = numeros.slice(0, 11);

    numeros = numeros.replace(/(\d{3})(\d)/, '$1.$2');
    numeros = numeros.replace(/(\d{3})(\d)/, '$1.$2');
    numeros = numeros.replace(/(\d{3})(\d{1,2})$/, '$1-$2');

    evento.target.value = numeros;
}

function aplicarMascaraTelefone(evento) {
    let numeros = evento.target.value.replace(/\D/g, '');
    numeros = numeros.slice(0, 11);

    numeros = numeros.replace(/(\d{2})(\d)/, '($1) $2');
    numeros = numeros.replace(/(\d{5})(\d{1,4})$/, '$1-$2');

    evento.target.value = numeros;
}

function preverFoto(evento) {
    const arquivo = evento.target.files[0];
    if (!arquivo) return;

    const leitor = new FileReader();

    leitor.onload = () => {
        document.getElementById('fotoPreview').src = leitor.result;
        dadosUsuario.foto = leitor.result;
    };

    leitor.readAsDataURL(arquivo);
}

function validarFormulario() {
    limparErros();
    let valido = true;

    const nome = document.getElementById('campoNome').value.trim();
    const email = document.getElementById('campoEmail').value.trim();
    const cpf = document.getElementById('campoCpf').value.trim();
    const telefone = document.getElementById('campoTelefone').value.trim();

    if (nome.length < 3) {
        mostrarErro('campoNome', 'erroNome', 'Digite o nome completo.');
        valido = false;
    }

    const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regexEmail.test(email)) {
        mostrarErro('campoEmail', 'erroEmail', 'Digite um e-mail válido.');
        valido = false;
    }

    if (cpf.replace(/\D/g, '').length !== 11) {
        mostrarErro('campoCpf', 'erroCpf', 'CPF deve ter 11 números.');
        valido = false;
    }

    if (telefone.replace(/\D/g, '').length < 10) {
        mostrarErro('campoTelefone', 'erroTelefone', 'Telefone incompleto.');
        valido = false;
    }

    return valido;
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
        mensagemStatus.textContent = 'Verifique os campos destacados.';
        mensagemStatus.className = 'mensagem-status erro-geral';
        return;
    }

    const dadosNovos = {
        nome: document.getElementById('campoNome').value.trim(),
        email: document.getElementById('campoEmail').value.trim(),
        cpf: document.getElementById('campoCpf').value.trim(),
        telefone: document.getElementById('campoTelefone').value.trim(),
        tipo: document.getElementById('campoTipo').value
    };

    btnSalvarPerfil.disabled = true;
    btnSalvarPerfil.textContent = 'Salvando...';
    mensagemStatus.textContent = '';
    mensagemStatus.className = 'mensagem-status';

    try {
        const perfilAtualizado = await salvarPerfilNoServidor(dadosNovos);

        mensagemStatus.textContent = 'Perfil atualizado com sucesso!';
        mensagemStatus.className = 'mensagem-status sucesso';

        const primeiroNome = perfilAtualizado.nome.split(' ')[0];
        document.getElementById('saudacaoNome').textContent = `Olá, ${primeiroNome}! `;

        setTimeout(fecharPerfil, 1200);

    } catch (erro) {
        mensagemStatus.textContent = erro.message;
        mensagemStatus.className = 'mensagem-status erro-geral';
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
    document.getElementById('sairDaConta').addEventListener('click', sairDaConta)
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
let listaContatos = [{
        id: 1,
        nome: 'Ana (Filha)',
        telefone: '(11) 91234-5678',
        tipo: 'familiar'
    },
    {
        id: 2,
        nome: 'Carlos',
        telefone: '(11) 99876-5432',
        tipo: 'cuidador'
    }
];

let proximoIdContato = 3;

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

function buscarContatos() {
    return new Promise(resolve => {
        setTimeout(() => resolve(listaContatos), 400);
    });
}

function salvarContatoNoServidor(contato) {
    return new Promise(resolve => {
        setTimeout(() => {
            const novoContato = {
                id: proximoIdContato++,
                ...contato
            };
            listaContatos.push(novoContato);
            resolve(novoContato);
        }, 700);
    });
}

function removerContatoNoServidor(id) {
    return new Promise(resolve => {
        setTimeout(() => {
            listaContatos = listaContatos.filter(c => c.id !== id);
            resolve();
        }, 400);
    });
}

function renderizarContatos(contatos) {
    const lista = document.getElementById('listaContatosCompleta');
    lista.innerHTML = '';

    if (contatos.length === 0) {
        lista.innerHTML = '<li class="mensagem-vazio">Você ainda não tem contatos cadastrados.</li>';
        return;
    }

    contatos.forEach(contato => {
        const li = document.createElement('li');
        li.className = 'contato-item';

        li.innerHTML = `
            <div class="contato-info">
                <strong>${contato.nome}</strong>
                <span>${contato.telefone}</span>
            </div>
            <span class="contato-tipo">${contato.tipo}</span>
            <button type="button" class="btn-remover-contato" data-id="${contato.id}">Remover</button>
        `;

        lista.appendChild(li);
    });
}

async function carregarContatos() {
    const contatos = await buscarContatos();
    renderizarContatos(contatos);
}

function iniciarRemocaoContatos() {
    document.getElementById('listaContatosCompleta').addEventListener('click', async (evento) => {
        const botao = evento.target.closest('.btn-remover-contato');
        if (!botao) return;

        const id = Number(botao.dataset.id);
        botao.disabled = true;
        botao.textContent = 'Removendo...';

        await removerContatoNoServidor(id);
        renderizarContatos(listaContatos);
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
    const mensagem = document.getElementById('mensagemStatusContato');

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

        await salvarContatoNoServidor(contato);
        renderizarContatos(listaContatos);

        mensagem.textContent = 'Contato adicionado com sucesso!';
        mensagem.className = 'mensagem-status sucesso';
        form.reset();

        btnSalvar.disabled = false;
        btnSalvar.textContent = 'Adicionar contato';

        setTimeout(() => {
            mensagem.textContent = '';
        }, 2000);
    });
}


/*  SUPORTE PRIORITÁRIO */
let proximaVisita = new Date('2026-06-02T10:00:00');

function atualizarVisualVisita() {
    const dia = String(proximaVisita.getDate()).padStart(2, '0');
    const mes = String(proximaVisita.getMonth() + 1).padStart(2, '0');
    const ano = proximaVisita.getFullYear();
    const hora = String(proximaVisita.getHours()).padStart(2, '0');
    const min = String(proximaVisita.getMinutes()).padStart(2, '0');

    document.querySelectorAll('.js-visita-data').forEach(el => {
        el.textContent = `${dia}/${mes}/${ano}`;
    });

    document.querySelectorAll('.js-visita-hora').forEach(el => {
        el.textContent = `${hora}:${min}`;
    });
}

function reagendarVisitaNoServidor() {
    return new Promise(resolve => {
        setTimeout(() => {
            proximaVisita.setDate(proximaVisita.getDate() + 14);
            resolve(proximaVisita);
        }, 600);
    });
}

function iniciarReagendamento() {
    const botao = document.getElementById('btnReagendar');
    const mensagem = document.getElementById('mensagemStatusVisita');

    botao.addEventListener('click', async () => {
        botao.disabled = true;
        botao.textContent = 'Reagendando...';

        await reagendarVisitaNoServidor();
        atualizarVisualVisita();

        mensagem.textContent = 'Visita reagendada! Confira a nova data acima.';
        mensagem.className = 'mensagem-status sucesso';

        botao.disabled = false;
        botao.textContent = 'Reagendar';

        setTimeout(() => {
            mensagem.textContent = '';
        }, 3000);
    });
}


/*  REGISTRO DE HUMOR */
const emojisPorHumor = {
    feliz: document.querySelector('.feliz'),
    neutro: document.querySelector('.triste'),
    triste: document.querySelector('.estresse'),
    estresse: document.querySelector('.neutro')
};

const dadosHumor = [{
        data: '2026-05-10T12:00',
        humor: 'feliz'
    },
    {
        data: '2026-05-11T12:00',
        humor: 'neutro'
    },
    {
        data: '2026-05-12T12:00',
        humor: 'triste'
    },
    {
        data: '2026-05-13T12:00',
        humor: 'neutro'
    },
    {
        data: '2026-05-14T12:00',
        humor: 'neutro'
    },
    {
        data: '2026-05-15T12:00',
        humor: 'estresse'
    },
    {
        data: '2026-05-16T12:00',
        humor: 'feliz'
    },
    {
        data: '2026-05-17T12:00',
        humor: 'neutro'
    },
    {
        data: '2026-05-18T12:00',
        humor: 'feliz'
    }
];

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
            <span class="data">${dia}/${mes}<br>${hora}:00</span>
        `;

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


/*  INICIALIZAÇÃO DO LOGADO */
document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('saudacaoNome')) return;

    atualizarSaudacao();
    iniciarMenuMobile();
    iniciarScrollSpy();
    iniciarCardsRapidos();

    atualizarPicosDePressao();
    aplicarFiltro();
    document.getElementById('periodoInicio').addEventListener('change', aplicarFiltro);
    document.getElementById('periodoFim').addEventListener('change', aplicarFiltro);

    iniciarPerfil();

    iniciarAbasContatos();
    carregarContatos();
    iniciarRemocaoContatos();
    iniciarFormularioContato();

    atualizarVisualVisita();
    iniciarReagendamento();

    aplicarFiltroHumor();
    document.getElementById('humorInicio').addEventListener('change', aplicarFiltroHumor);
    document.getElementById('humorFim').addEventListener('change', aplicarFiltroHumor);
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
    const campoCpfEmail = document.querySelector('#cpf-email');
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
                window.location.href = 'logado.html';
            }, 1200);
        } catch (erro) {
            mostrarMensagem(erroLogin, erro.message + ' Se você acabou de se cadastrar, confirme seu email antes de entrar.', 'erro');
            if (botao) botao.disabled = false;
        }
    });

    /*  ESQUECI A SENHA */
    linkEsqueceu.addEventListener('click', function (evento) {
        evento.preventDefault();
        overlayEsqueci.classList.add('ativo');
    });

    btnCancelar.addEventListener('click', function () {
        overlayEsqueci.classList.remove('ativo');
        esconderMensagem(erroEsqueci);
    });

    formEsqueci.addEventListener('submit', function (evento) {
        evento.preventDefault();
        esconderMensagem(erroEsqueci);

        const valor = campoCpfEmail.value.trim();
        const pareceEmail = valor.includes('@');
        const semFormatacao = valor.replace(/[.\-\s]/g, '');
        const ehCpfValido = /^\d{11}$/.test(semFormatacao);

        if (valor === '') {
            mostrarMensagem(erroEsqueci, 'Digite seu CPF ou email para continuar.', 'erro');
            return;
        }

        if (!pareceEmail && !ehCpfValido) {
            mostrarMensagem(erroEsqueci, 'Digite um CPF com 11 números ou um email válido.', 'erro');
            return;
        }

        mostrarMensagem(erroEsqueci, 'Pronto! Enviamos um link de recuperação. Verifique seu email (e a caixa de spam).', 'sucesso');

        setTimeout(function () {
            overlayEsqueci.classList.remove('ativo');
            esconderMensagem(erroEsqueci);
            formEsqueci.reset();
        }, 2500);
    });

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

            mostrarMensagem(erroCadastro, 'Cadastro realizado! Enviamos um código de confirmação para o seu email.', 'sucesso');
            campoEmail.value = email.toLowerCase();

            setTimeout(function () {
                overlayCadastro.classList.remove('ativo');
                esconderMensagem(erroCadastro);
                formCadastro.reset();
                abrirConfirmacao(email.toLowerCase());
            }, 1500);
        } catch (erro) {
            mostrarMensagem(erroCadastro, erro.message, 'erro');
        } finally {
            if (botao) botao.disabled = false;
        }
    });

    /*  CONFIRMACAO DE EMAIL */
    document.querySelector('.cadastro').insertAdjacentHTML('afterend',
        '<p class="cadastro"><strong id="link-confirmar">Confirmar meu email</strong></p>');

    const overlayConfirmar = document.querySelector('#overlay-confirmar');
    const formConfirmar = document.querySelector('.form-confirmar');
    const campoConfirmaEmail = document.querySelector('#confirma-email');
    const campoCodigo = document.querySelector('#codigo-confirmacao');
    const erroConfirmar = document.querySelector('#erro-confirmar');

    function abrirConfirmacao(email) {
        if (email) campoConfirmaEmail.value = email;
        esconderMensagem(erroConfirmar);
        overlayConfirmar.classList.add('ativo');
    }

    document.querySelector('#link-confirmar').addEventListener('click', function () {
        abrirConfirmacao(campoEmail.value.trim());
    });

    document.querySelector('#cancelar-confirmar').addEventListener('click', function () {
        overlayConfirmar.classList.remove('ativo');
        esconderMensagem(erroConfirmar);
    });

    formConfirmar.addEventListener('submit', async function (evento) {
        evento.preventDefault();
        esconderMensagem(erroConfirmar);

        const botao = formConfirmar.querySelector('button[type="submit"]');
        if (botao) botao.disabled = true;

        try {
            const r = await api.confirmarEmail(campoConfirmaEmail.value.trim(), campoCodigo.value.trim());
            mostrarMensagem(erroConfirmar, (r && r.mensagem) || 'Email confirmado! Agora é só fazer login.', 'sucesso');
            campoEmail.value = campoConfirmaEmail.value.trim();

            setTimeout(function () {
                overlayConfirmar.classList.remove('ativo');
                esconderMensagem(erroConfirmar);
                formConfirmar.reset();
            }, 1800);
        } catch (erro) {
            mostrarMensagem(erroConfirmar, erro.message, 'erro');
        } finally {
            if (botao) botao.disabled = false;
        }
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
