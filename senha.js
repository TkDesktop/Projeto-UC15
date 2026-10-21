
(function (raiz) {
    'use strict';

    // ---------------------------------------------------------------
    // PARAMETROS DA POLITICA (edite aqui)
    // ---------------------------------------------------------------
    var TAMANHO_MINIMO = 8;
    var TAMANHO_FORTE = 12;
    // palavras fracas: a senha e recusada se, tirando numeros e simbolos, sobrar so isso
    var PALAVRAS_FRACAS = ['senha', 'password', 'qwerty', 'admin', 'medica', 'medicamais', 'brasil',
        'abcdef', 'mudar', 'teste', 'welcome', 'letmein', 'usuario', 'login', 'saopaulo'];
    var SENHAS_COMUNS = ['12345678', '123456789', '1234567890', '11111111', '00000000', '87654321',
        'senha123', 'senha1234', 'password1', 'qwerty123', 'abc12345', 'abcd1234', 'admin123',
        'iloveyou', 'mudar123', 'brasil123'];

    var ROTULOS_FORCA = ['', 'Fraca', 'Média', 'Forte', 'Muito forte'];

    // ---------------------------------------------------------------
    // AVALIACAO (funcao pura)
    // ---------------------------------------------------------------
    function semAcento(t) {
        return String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }

    function temSequencia(s) {
        var t = semAcento(s).toLowerCase();
        for (var i = 0; i <= t.length - 4; i++) {
            var asc = true, desc = true;
            for (var j = 1; j < 4; j++) {
                var d = t.charCodeAt(i + j) - t.charCodeAt(i + j - 1);
                if (d !== 1) asc = false;
                if (d !== -1) desc = false;
            }
            if ((asc || desc) && /^[a-z0-9]{4}$/.test(t.substr(i, 4))) return true;
        }
        return false;
    }

    function padraoFraco(s) {
        var baixa = semAcento(s).toLowerCase();
        if (/(.)\1{3,}/i.test(s)) return true;                   // 4 caracteres iguais seguidos
        if (temSequencia(s)) return true;                        // 1234, abcd, 4321...
        if (SENHAS_COMUNS.indexOf(baixa) >= 0) return true;      // lista de senhas comuns
        var soLetras = baixa.replace(/[^a-z]/g, '');
        return PALAVRAS_FRACAS.indexOf(soLetras) >= 0;           // "Senha@123", "Teste#2024"...
    }

    function avaliar(senha, contexto) {
        senha = String(senha || '');
        var email = String((contexto && contexto.email) || '').trim().toLowerCase();
        var usuario = email.split('@')[0];

        var regras = [
            { id: 'tamanho', texto: 'Pelo menos ' + TAMANHO_MINIMO + ' caracteres', ok: senha.length >= TAMANHO_MINIMO },
            { id: 'maiuscula', texto: 'Uma letra maiúscula (A-Z)', ok: /\p{Lu}/u.test(senha) },
            { id: 'minuscula', texto: 'Uma letra minúscula (a-z)', ok: /\p{Ll}/u.test(senha) },
            { id: 'numero', texto: 'Um número (0-9)', ok: /\d/.test(senha) },
            { id: 'especial', texto: 'Um caractere especial (! @ # $ % & *)', ok: /[^\p{L}\d\s]/u.test(senha) },
            { id: 'espaco', texto: 'Sem espaços', ok: senha.length > 0 && !/\s/.test(senha) },
            { id: 'padrao', texto: 'Sem sequências (1234, abcd), repetições ou senhas comuns', ok: senha.length > 0 && !padraoFraco(senha) },
            { id: 'email', texto: 'Não conter o seu e-mail', ok: !(usuario.length >= 3 && senha.toLowerCase().indexOf(usuario) >= 0) }
        ];

        var passou = regras.filter(function (r) { return r.ok; }).length;
        var ok = passou === regras.length;
        var nivel = 0;
        if (senha) {
            if (!ok) nivel = passou <= 4 ? 1 : 2;
            else nivel = senha.length >= TAMANHO_FORTE ? 4 : 3;
        }
        return { ok: ok, regras: regras, nivel: nivel, rotulo: ROTULOS_FORCA[nivel], vazia: senha.length === 0 };
    }

    // ---------------------------------------------------------------
    // INTERFACE
    // ---------------------------------------------------------------
    function injetarEstilo() {
        if (document.getElementById('mm-senha-estilo')) return;
        var st = document.createElement('style');
        st.id = 'mm-senha-estilo';
        st.textContent =
            '.mm-senha{margin:8px 0 12px;font-size:13px;text-align:left}' +
            '.mm-senha-topo{display:flex;align-items:center;gap:10px;margin-bottom:6px}' +
            '.mm-forca{display:flex;gap:4px;flex:1}' +
            '.mm-forca i{flex:1;height:6px;border-radius:99px;background:var(--mm-borda-media,#d0d7e6);transition:background-color .16s ease}' +
            '.mm-forca.n1 i:nth-child(-n+1){background:var(--mm-cor-perigo,#d62839)}' +
            '.mm-forca.n2 i:nth-child(-n+2){background:#e9a100}' +
            '.mm-forca.n3 i:nth-child(-n+3){background:var(--mm-cor-sucesso,#2e9e3f)}' +
            '.mm-forca.n4 i{background:var(--mm-cor-sucesso-escura,#22752f)}' +
            '.mm-forca-rotulo{min-width:78px;font-weight:700;color:var(--mm-texto-medio,#4b5563);text-align:right}' +
            '.mm-mostrar{border:0;background:transparent;color:var(--mm-cor-primaria,#2d7ff9);font-size:13px;font-weight:600;cursor:pointer;padding:2px 4px}' +
            '.mm-regras{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:1fr 1fr;gap:3px 12px}' +
            '.mm-regras li{display:flex;gap:6px;align-items:flex-start;color:var(--mm-texto-suave,#6b7280)}' +
            '.mm-regras li::before{content:"○";flex:none}' +
            '.mm-regras li.mm-ok{color:var(--mm-cor-sucesso-escura,#22752f)}' +
            '.mm-regras li.mm-ok::before{content:"✓";font-weight:700}' +
            '.mm-regras li.mm-falha{color:var(--mm-cor-perigo-escura,#b3202d)}' +
            '.mm-regras li.mm-falha::before{content:"✕";font-weight:700}' +
            '.mm-coincide{margin:4px 0 8px;font-size:13px;min-height:16px}' +
            '.mm-coincide.mm-ok{color:var(--mm-cor-sucesso-escura,#22752f)}' +
            '.mm-coincide.mm-falha{color:var(--mm-cor-perigo-escura,#b3202d)}' +
            '@media (max-width:480px){.mm-regras{grid-template-columns:1fr}}';
        document.head.appendChild(st);
    }

    function criar(tag, classe, texto) {
        var e = document.createElement(tag);
        if (classe) e.className = classe;
        if (texto !== undefined) e.textContent = texto;
        return e;
    }

    function mostrarErroDoForm(el, texto) {
        if (!el) return;
        el.textContent = texto;
        el.classList.remove('sucesso');
        el.classList.add('mostrar');
    }

    function ligar(cfg) {
        var campo = document.querySelector(cfg.senha);
        if (!campo) return;
        var confirma = cfg.confirma ? document.querySelector(cfg.confirma) : null;
        var form = campo.closest('form');
        var erro = cfg.erro ? document.querySelector(cfg.erro) : null;
        var tentou = false;

        campo.setAttribute('autocomplete', 'new-password');
        if (confirma) confirma.setAttribute('autocomplete', 'new-password');

        var caixa = criar('div', 'mm-senha');
        caixa.setAttribute('aria-live', 'polite');
        var topo = criar('div', 'mm-senha-topo');
        var barra = criar('div', 'mm-forca');
        for (var i = 0; i < 4; i++) barra.appendChild(document.createElement('i'));
        var rotulo = criar('span', 'mm-forca-rotulo', '');
        var mostrar = criar('button', 'mm-mostrar', 'Mostrar');
        mostrar.type = 'button';
        topo.appendChild(barra);
        topo.appendChild(rotulo);
        topo.appendChild(mostrar);
        var lista = criar('ul', 'mm-regras');
        caixa.appendChild(topo);
        caixa.appendChild(lista);
        campo.insertAdjacentElement('afterend', caixa);

        var coincide = null;
        if (confirma) {
            coincide = criar('p', 'mm-coincide', '');
            confirma.insertAdjacentElement('afterend', coincide);
        }

        function emailAtual() {
            return cfg.email ? cfg.email() : '';
        }

        function atualizar() {
            var r = avaliar(campo.value, { email: emailAtual() });
            barra.className = 'mm-forca n' + r.nivel;
            rotulo.textContent = r.rotulo;
            lista.textContent = '';
            r.regras.forEach(function (regra) {
                var li = criar('li', '', regra.texto);
                if (!r.vazia || tentou) li.className = regra.ok ? 'mm-ok' : 'mm-falha';
                lista.appendChild(li);
            });
            if (coincide) {
                if (!confirma.value) { coincide.textContent = ''; coincide.className = 'mm-coincide'; }
                else if (confirma.value === campo.value) { coincide.textContent = '✓ As senhas coincidem'; coincide.className = 'mm-coincide mm-ok'; }
                else { coincide.textContent = '✕ As senhas não coincidem'; coincide.className = 'mm-coincide mm-falha'; }
            }
            return r;
        }

        mostrar.addEventListener('click', function () {
            var ver = campo.type === 'password';
            campo.type = ver ? 'text' : 'password';
            if (confirma) confirma.type = ver ? 'text' : 'password';
            mostrar.textContent = ver ? 'Ocultar' : 'Mostrar';
        });

        campo.addEventListener('input', atualizar);
        if (confirma) confirma.addEventListener('input', atualizar);
        if (cfg.email && cfg.emailCampo) {
            var ec = document.querySelector(cfg.emailCampo);
            if (ec) ec.addEventListener('input', atualizar);
        }

        // Fase de captura: roda ANTES do tratamento de envio do script.js e bloqueia senha fraca
        if (form) {
            form.addEventListener('submit', function (evento) {
                var r = avaliar(campo.value, { email: emailAtual() });
                if (r.ok) return;
                tentou = true;
                atualizar();
                evento.preventDefault();
                evento.stopImmediatePropagation();
                mostrarErroDoForm(erro, 'A senha não atende à política de senha forte. Veja os itens marcados abaixo do campo.');
                campo.focus();
            }, true);
        }

        atualizar();
    }

    function iniciar() {
        injetarEstilo();
        ligar({
            senha: '#senha-cadastro', confirma: '#confirma-senha', erro: '#erro-cadastro',
            emailCampo: '#email-cadastro',
            email: function () { var e = document.querySelector('#email-cadastro'); return e ? e.value : ''; }
        });
        ligar({
            senha: '#nova-senha', confirma: '#confirma-nova-senha', erro: '#erro-redefinir',
            email: function () { var s = document.querySelector('#texto-redefinir strong'); return s ? s.textContent : ''; }
        });
    }

    var publico = { avaliar: avaliar, TAMANHO_MINIMO: TAMANHO_MINIMO, iniciar: iniciar };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = publico;
    } else {
        raiz.PoliticaSenha = publico;
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', iniciar);
        } else {
            iniciar();
        }
    }
})(typeof window !== 'undefined' ? window : this);