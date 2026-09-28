# Medica+ - versão corrigida após juntar as subpastas

Arquivos:
- index.html
- login.html
- logado.html
- checkout.html
- style.css
- script.js

Principais correções:
1. O CSS da página de Login estava aplicando `overflow: hidden` ao `html, body` de todas as páginas.
2. O `.hero` do Login estava sobrescrevendo o `.hero` da Home.
3. O `.cards`, `main`, `nav` e outros seletores do Painel estavam sobrescrevendo elementos da Home.
4. O `.overlay` do Login estava entrando em conflito com o modal de perfil do Painel.
5. O scroll suave foi restaurado.
6. Os links entre as páginas continuam usando a estrutura achatada:
   `index.html`, `login.html`, `logado.html` e `checkout.html`.

IMPORTANTE:
As pastas/arquivos de imagens (`img logo`, `img home`, `img footer`) precisam continuar no local que os HTMLs indicam.
