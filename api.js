/* ==========================================================
   api.js - cliente da API Medica+
   Incluir ANTES do script.js em todas as paginas:
   <script src="api.js"></script>
   ========================================================== */

// Unico lugar onde a URL da API aparece. Para trocar de dominio, edite aqui.
const API_URL = 'https://34-206-108-143.sslip.io';

const CHAVE_TOKEN = 'medicaMaisToken';
const CHAVE_EXPIRA = 'medicaMaisTokenExpira';

// Valores dos enums (a API devolve/recebe numeros)
const HUMOR = { Feliz: 0, Neutro: 1, Triste: 2, Estresse: 3 };
const HUMOR_NOME = ['Feliz', 'Neutro', 'Triste', 'Estresse'];

/* ---------- Sessao ---------- */
function obterToken() {
    try {
        const expira = localStorage.getItem(CHAVE_EXPIRA);
        if (expira && new Date(expira) <= new Date()) {
            limparSessao();
            return null;
        }
        return localStorage.getItem(CHAVE_TOKEN);
    } catch (e) {
        return null;
    }
}

function salvarSessao(resposta) {
    localStorage.setItem(CHAVE_TOKEN, resposta.token);
    localStorage.setItem(CHAVE_EXPIRA, resposta.expiraEm);
    // Mantem a chave antiga para o restante do front continuar funcionando
    localStorage.setItem('medicaMaisUsuarioLogado', JSON.stringify(resposta.usuario));
}

function limparSessao() {
    localStorage.removeItem(CHAVE_TOKEN);
    localStorage.removeItem(CHAVE_EXPIRA);
    localStorage.removeItem('medicaMaisUsuarioLogado');
}

// Chamar no inicio das paginas protegidas (logado.html, checkout.html)
function exigirLogin() {
    if (!obterToken()) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

/* ---------- Requisicao base ---------- */
function extrairMensagemErro(dados, status) {
    if (dados && dados.mensagem) return dados.mensagem;
    if (dados && dados.errors) {
        const primeiro = Object.values(dados.errors)[0];
        if (primeiro && primeiro.length) return primeiro[0];
    }
    if (dados && dados.title) return dados.title;
    return 'Erro inesperado (' + status + ').';
}

async function requisicao(caminho, { metodo = 'GET', corpo = null, auth = true } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (auth) {
        const token = obterToken();
        if (token) headers['Authorization'] = 'Bearer ' + token;
    }

    let resp;
    try {
        resp = await fetch(API_URL + caminho, {
            method: metodo,
            headers,
            body: corpo ? JSON.stringify(corpo) : null
        });
    } catch (e) {
        throw new Error('Não foi possível conectar ao servidor. Tente novamente em instantes.');
    }

    // Sessao expirada / token invalido em rota protegida
    if (resp.status === 401 && auth) {
        limparSessao();
        window.location.href = 'login.html';
        throw new Error('Sessão expirada. Faça login novamente.');
    }

    if (resp.status === 204) return null;

    let dados = null;
    try { dados = await resp.json(); } catch (e) { /* corpo vazio */ }

    if (!resp.ok) throw new Error(extrairMensagemErro(dados, resp.status));
    return dados;
}

// Monta query string ignorando valores vazios
function comQuery(caminho, params) {
    const q = Object.entries(params || {})
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v))
        .join('&');
    return q ? caminho + '?' + q : caminho;
}

/* ---------- Endpoints ---------- */
const api = {
    // Autenticacao (sem token)
    login: (email, senha) =>
        requisicao('/api/auth/login', { metodo: 'POST', auth: false, corpo: { email, senha } }),
    cadastro: (dados) =>
        requisicao('/api/auth/cadastro', { metodo: 'POST', auth: false, corpo: dados }),
    confirmarEmail: (email, codigo) =>
        requisicao('/api/auth/confirmar-email', { metodo: 'POST', auth: false, corpo: { email, codigo } }),

    // Recuperacao de senha (sem token): pede o codigo por e-mail e depois define a senha nova
    esqueciSenha: (email) =>
        requisicao('/api/auth/esqueci-senha', { metodo: 'POST', auth: false, corpo: { email } }),
    redefinirSenha: (email, codigo, novaSenha) =>
        requisicao('/api/auth/redefinir-senha', { metodo: 'POST', auth: false, corpo: { email, codigo, novaSenha } }),

    // Perfil
    perfil: () => requisicao('/api/usuarios/me'),
    atualizarPerfil: (dados) => requisicao('/api/usuarios/me', { metodo: 'PUT', corpo: dados }),
    excluirConta: () => requisicao('/api/usuarios/me', { metodo: 'DELETE' }),

    // Contatos
    contatos: () => requisicao('/api/contatos'),
    criarContato: (c) => requisicao('/api/contatos', { metodo: 'POST', corpo: c }),
    atualizarContato: (id, c) => requisicao('/api/contatos/' + id, { metodo: 'PUT', corpo: c }),
    excluirContato: (id) => requisicao('/api/contatos/' + id, { metodo: 'DELETE' }),

    // Pressao arterial: inicio/fim no formato yyyy-mm-dd
    pressoes: (inicio, fim) => requisicao(comQuery('/api/pressao', { inicio, fim })),
    registrarPressao: (sistolica, diastolica, dataHora) =>
        requisicao('/api/pressao', {
            metodo: 'POST',
            corpo: { sistolica, diastolica, dataHora: dataHora ? new Date(dataHora).toISOString() : null }
        }),
    excluirPressao: (id) => requisicao('/api/pressao/' + id, { metodo: 'DELETE' }),

    // Humor: use HUMOR.Feliz, HUMOR.Neutro, ...
    humores: (inicio, fim) => requisicao(comQuery('/api/humor', { inicio, fim })),
    registrarHumor: (humor, dataHora) =>
        requisicao('/api/humor', {
            metodo: 'POST',
            corpo: { humor, dataHora: dataHora ? new Date(dataHora).toISOString() : null }
        }),
    excluirHumor: (id) => requisicao('/api/humor/' + id, { metodo: 'DELETE' }),

    // Visitas de suporte (a data precisa estar no futuro)
    visitas: () => requisicao('/api/visitas'),
    proximaVisita: () => requisicao('/api/visitas/proxima'),
    agendarVisita: (dataHora, observacao) =>
        requisicao('/api/visitas', {
            metodo: 'POST',
            corpo: { dataHora: new Date(dataHora).toISOString(), observacao: observacao || null }
        }),
    reagendarVisita: (id, novaDataHora) =>
        requisicao('/api/visitas/' + id + '/reagendar', {
            metodo: 'PUT',
            corpo: { novaDataHora: new Date(novaDataHora).toISOString() }
        }),
    cancelarVisita: (id) => requisicao('/api/visitas/' + id, { metodo: 'DELETE' }),

    // Assinatura
    assinaturas: () => requisicao('/api/assinaturas'),
    checkout: (dados) => requisicao('/api/assinaturas/checkout', { metodo: 'POST', corpo: dados })
};