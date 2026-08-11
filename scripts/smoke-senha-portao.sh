#!/usr/bin/env bash
# Prova o portao da senha provisoria: com must_change_password ligado, uma sessao
# valida so consegue chegar em /trocar-senha.
set -uo pipefail
B=http://127.0.0.1:4062/NEP
EMAIL=caio@nep.samu.ba.gov.br
SENHA=Vento-Norte-2026
J=/tmp/nep-cookies.txt
Q() { sudo -u postgres psql -d nep_samu_lab -Atc "$1"; }
ok() { printf "  \033[32mPASSA\033[0m %s\n" "$1"; }
falha() { printf "  \033[31mFALHA\033[0m %s -- %s\n" "$1" "$2"; FALHAS=$((FALHAS+1)); }
FALHAS=0

entrar() {
  rm -f $J
  CSRF=$(curl -s -c $J $B/api/auth/csrf | sed -E 's/.*"csrfToken":"([^"]+)".*/\1/')
  curl -s -o /dev/null -b $J -c $J -X POST $B/api/auth/callback/credentials \
    -H 'Content-Type: application/x-www-form-urlencoded' \
    --data-urlencode "csrfToken=$CSRF" \
    --data-urlencode "email=$EMAIL" \
    --data-urlencode "password=$SENHA"
  grep -q "authjs.session-token" $J && echo sim || echo nao
}

destino() { curl -s -o /dev/null -b $J -w "%{http_code} %{redirect_url}" "$B$1"; }

echo "A. login com a senha certa cria sessao"
[ "$(entrar)" = "sim" ] && ok "cookie de sessao emitido" || falha "sem cookie" "o login falhou"

echo "B. sem a marca, a sessao chega no painel"
Q "update users set must_change_password=false where email='$EMAIL'" >/dev/null
entrar >/dev/null
R=$(destino /painel)
echo "$R" | grep -q "^200" && ok "/painel $R" || falha "/painel $R" "esperado 200"

echo "C. com a marca, /painel e desviado para /trocar-senha"
Q "update users set must_change_password=true where email='$EMAIL'" >/dev/null
entrar >/dev/null
R=$(destino /painel)
echo "$R" | grep -q "trocar-senha" && ok "/painel -> $R" || falha "/painel $R" "esperado desvio para /trocar-senha"

echo "D. com a marca, qualquer outra rota tambem e desviada"
R=$(destino /turmas)
echo "$R" | grep -q "trocar-senha" && ok "/turmas -> $R" || falha "/turmas $R" "esperado desvio"

echo "E. a propria tela de troca abre (senao seria um laco)"
R=$(destino /trocar-senha)
echo "$R" | grep -q "^200" && ok "/trocar-senha $R" || falha "/trocar-senha $R" "esperado 200"

echo "F. a troca pela tela limpa a marca e libera o sistema"
R=$(curl -s -b $J -X POST $B/api/auth/trocar-senha -H 'Content-Type: application/json' \
     -d "{\"senhaAtual\":\"$SENHA\",\"novaSenha\":\"Serra-Azul-2026\"}")
M=$(Q "select must_change_password from users where email='$EMAIL'")
[ "$R" = '{"ok":true}' ] && [ "$M" = "f" ] && ok "$R, marca limpa" || falha "resposta=$R marca=$M" "esperado ok e marca limpa"

echo "G. senha fraca na troca obrigatoria e recusada"
Q "update users set must_change_password=true where email='$EMAIL'" >/dev/null
SENHA=Serra-Azul-2026 entrar >/dev/null
R=$(curl -s -b $J -X POST $B/api/auth/trocar-senha -H 'Content-Type: application/json' \
     -d '{"senhaAtual":"Serra-Azul-2026","novaSenha":"123456"}')
echo "$R" | grep -q "pelo menos 10" && ok "$R" || falha "$R" "esperado erro de politica"

echo "H. senha atual errada nao troca nada"
R=$(curl -s -b $J -X POST $B/api/auth/trocar-senha -H 'Content-Type: application/json' \
     -d '{"senhaAtual":"chute-errado","novaSenha":"Serra-Verde-2026"}')
echo "$R" | grep -q "senha atual est. incorreta" && ok "$R" || falha "$R" "esperado recusa"

echo "I. sem sessao, a API da troca recusa"
R=$(curl -s -X POST $B/api/auth/trocar-senha -H 'Content-Type: application/json' \
     -d '{"senhaAtual":"x","novaSenha":"Serra-Verde-2026"}')
echo "$R" | grep -q "login" && ok "$R" || falha "$R" "esperado recusa por falta de sessao"

rm -f $J
echo
[ "$FALHAS" = "0" ] && echo "TUDO PASSOU" || echo "$FALHAS FALHA(S)"
exit $FALHAS
