/* 
   sessao.js - login entre as paginas, checkout protegido e logo.
   Carregar DEPOIS do script.js em index.html, logado.html e checkout.html:
   <script src="sessao.js"></script>
   Nao depende do api.js (le a sessao direto do localStorage).
    */
(function () {
    var CHAVE_TOKEN = 'medicaMaisToken';
    var CHAVE_EXPIRA = 'medicaMaisTokenExpira';
    var CHAVE_DESTINO = 'medicaMaisDestino';

    function sessaoAtiva() {
        try {
            if (!localStorage.getItem(CHAVE_TOKEN)) return false;
            var expira = localStorage.getItem(CHAVE_EXPIRA);
            if (expira && new Date(expira) <= new Date()) return false;
            return true;
        } catch (e) {
            return false;
        }
    }

    function guardarDestino(destino) {
        try { sessionStorage.setItem(CHAVE_DESTINO, destino); } catch (e) { /* sem armazenamento */ }
    }

    function limparDestino() {
        try { sessionStorage.removeItem(CHAVE_DESTINO); } catch (e) { /* sem armazenamento */ }
    }

    /* ---------- LOGO: volta ao topo da pagina atual (home e painel) ---------- */
    var logo = document.querySelector('nav .nav-container img') || document.querySelector('nav img');
    if (logo && !logo.closest('a')) {
        var voltarAoTopo = function () {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };
        logo.style.cursor = 'pointer';
        logo.setAttribute('role', 'button');
        logo.setAttribute('tabindex', '0');
        logo.setAttribute('aria-label', 'Voltar ao topo da página');
        logo.addEventListener('click', voltarAoTopo);
        logo.addEventListener('keydown', function (evento) {
            if (evento.key === 'Enter' || evento.key === ' ') {
                evento.preventDefault();
                voltarAoTopo();
            }
        });
    }

    /* ---------- MENU: quem esta logado nao ve "Login", ve "Meu painel" ---------- */
    var linkLogin = document.querySelector('#menuNav a[href="login.html"]');
    if (linkLogin) {
        if (sessaoAtiva()) {
            linkLogin.setAttribute('href', 'logado.html');
            linkLogin.textContent = 'Meu painel';
        } else {
            // Entrar pelo menu nao deve herdar um destino de checkout abandonado
            linkLogin.addEventListener('click', limparDestino);
        }
    }

    /* ---------- HOME (index.html) ---------- */
    if (document.getElementById('planos')) {

        // Na fase de captura: roda antes do clique de planos do script.js
        document.addEventListener('click', function (evento) {
            var botao = evento.target.closest('.planos .card button');
            if (!botao || sessaoAtiva()) return;

            var cartao = botao.closest('.planos .card > div');
            if (!cartao) return;

            var titulo = cartao.querySelector('h3');
            var precoEl = cartao.querySelector('p span');
            var nome = titulo ? titulo.textContent.replace(/\s+/g, ' ').trim() : '';
            var preco = precoEl ? precoEl.textContent.trim() : '0,00';

            evento.preventDefault();
            evento.stopImmediatePropagation();

            guardarDestino('checkout.html?plano=' + encodeURIComponent(nome) + '&preco=' + encodeURIComponent(preco));
            window.location.href = 'login.html';
        }, true);
    }

    /* ---------- CHECKOUT (checkout.html) ---------- */
    if (document.querySelector('.checkout')) {
        if (!sessaoAtiva()) {
            // Checkout so depois do login: guarda o plano escolhido e volta para ele depois
            guardarDestino('checkout.html' + window.location.search);
            window.location.replace('login.html');
            return;
        }

        // Logado: "Voltar" leva ao painel (a sessao continua ativa)
        var voltar = document.querySelector('.voltar');
        if (voltar) {
            voltar.setAttribute('href', 'logado.html');
            voltar.textContent = '← Voltar ao painel';
        }

        var linkSucesso = document.querySelector('#overlay-sucesso a');
        if (linkSucesso) {
            linkSucesso.setAttribute('href', 'logado.html');
            linkSucesso.textContent = 'Voltar para o painel';
        }

        // Quando a tela "Pagamento aprovado" aparece, guarda o plano escolhido neste navegador
        // (usado pelo mapa de hospitais ate o back-end gravar o plano da conta).
        var overlaySucesso = document.getElementById('overlay-sucesso');
        if (overlaySucesso && typeof MutationObserver !== 'undefined') {
            var nomePlano = new URLSearchParams(window.location.search).get('plano') || '';
            var aparece = function (el) {
                var c = el.classList;
                return c.contains('ativo') || c.contains('aberto') || c.contains('mostrar') || c.contains('visivel') ||
                    (el.style && el.style.display && el.style.display !== 'none');
            };
            new MutationObserver(function () {
                if (!nomePlano || !aparece(overlaySucesso)) return;
                try {
                    var u = JSON.parse(localStorage.getItem('medicaMaisUsuarioLogado')) || {};
                    localStorage.setItem('medicaMaisPlano', JSON.stringify({
                        nome: nomePlano,
                        origem: 'checkout',
                        usuario: String(u.id !== undefined ? u.id : (u.email || '')),
                        quando: new Date().toISOString()
                    }));
                } catch (e) { /* sem armazenamento */ }
            }).observe(overlaySucesso, { attributes: true, attributeFilter: ['class', 'style'] });
        }
    }
})();