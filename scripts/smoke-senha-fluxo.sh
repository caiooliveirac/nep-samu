#!/usr/bin/env bash
# Exercita o fluxo de senha do NEP no LAB (porta 4062, banco nep_samu_lab).
set -uo pipefail
B=http://127.0.0.1:4062/NEP
EMAIL=caio@nep.samu.ba.gov.br
Q() { sudo -u postgres psql -d nep_samu_lab -Atc "$1"; }
ok() { printf "  \033[32mPASSA\033[0m %s\n" "$1"; }
falha() { printf "  \033[31mFALHA\033[0m %s -- %s\n" "$1" "$2"; FALHAS=$((FALHAS+1)); }
FALHAS=0

# O rate limit e por processo, em memoria: reiniciar zera a janela. Sem isto a
# propria bateria estoura o limite e mascara os casos seguintes.
zera_limite() { pm2 restart lab-nep >/dev/null 2>&1; sleep 4; }

Q "delete from password_reset_tokens" >/dev/null
zera_limite

echo "1. email desconhecido nao cria token e responde igual ao caso feliz"
R=$(curl -s -X POST $B/api/auth/password-reset -H 'Content-Type: application/json' -d '{"email":"ninguem@example.com"}')
N=$(Q "select count(*) from password_reset_tokens")
[ "$R" = '{"ok":true}' ] && [ "$N" = "0" ] && ok "resposta $R, tokens=$N" || falha "resposta=$R tokens=$N" "esperado ok:true sem token"

echo "2. email real cria exatamente um token"
R=$(curl -s -X POST $B/api/auth/password-reset -H 'Content-Type: application/json' -d "{\"email\":\"$EMAIL\"}")
N=$(Q "select count(*) from password_reset_tokens")
[ "$R" = '{"ok":true}' ] && [ "$N" = "1" ] && ok "resposta $R, tokens=$N" || falha "resposta=$R tokens=$N" "esperado ok:true com 1 token"

TOKEN=$(Q "select token from password_reset_tokens order by created_at desc limit 1")

echo "3. as duas respostas sao indistinguiveis (sem enumeracao de conta)"
A=$(curl -s -X POST $B/api/auth/password-reset -H 'Content-Type: application/json' -d '{"email":"outro@example.com"}')
[ "$A" = '{"ok":true}' ] && ok "identicas" || falha "$A" "difere do caso feliz"

echo "4. GET do token valido confirma o link"
R=$(curl -s $B/api/auth/password-reset/$TOKEN)
echo "$R" | grep -q '"valido":true' && ok "$R" || falha "$R" "esperado valido:true"

echo "5. token inventado nao vale"
R=$(curl -s -o /dev/null -w "%{http_code}" $B/api/auth/password-reset/naoexiste123)
[ "$R" = "400" ] && ok "HTTP $R" || falha "HTTP $R" "esperado 400"

echo "6. senha fraca e recusada pela politica"
R=$(curl -s -X POST $B/api/auth/password-reset/$TOKEN -H 'Content-Type: application/json' -d '{"password":"123456"}')
echo "$R" | grep -q "pelo menos 10" && ok "$R" || falha "$R" "esperado erro de politica"

echo "7. senha sem variedade de grupos e recusada"
R=$(curl -s -X POST $B/api/auth/password-reset/$TOKEN -H 'Content-Type: application/json' -d '{"password":"abcdefghijkl"}')
echo "$R" | grep -q "tr.s grupos" && ok "$R" || falha "$R" "esperado erro de grupos"

echo "8. senha forte troca a senha e queima o token"
R=$(curl -s -X POST $B/api/auth/password-reset/$TOKEN -H 'Content-Type: application/json' -d '{"password":"Chuva-Lenta-2026"}')
USADO=$(Q "select usado_em is not null from password_reset_tokens where token='$TOKEN'")
[ "$R" = '{"ok":true}' ] && [ "$USADO" = "t" ] && ok "resposta $R, usado_em preenchido" || falha "resposta=$R usado=$USADO" "esperado ok e token queimado"

zera_limite
echo "9. o mesmo link nao serve duas vezes"
R=$(curl -s -X POST $B/api/auth/password-reset/$TOKEN -H 'Content-Type: application/json' -d '{"password":"Outra-Senha-2026"}')
echo "$R" | grep -q "inv.lido ou j. expirou" && ok "$R" || falha "$R" "esperado recusa"

echo "10. a senha nova realmente entrou no banco"
cd /home/ubuntu/lab/nep-samu
H=$(Q "select password_hash from users where email='$EMAIL'")
node -e "
const bcrypt=require('bcryptjs');
const h=process.argv[1];
const nova=bcrypt.compareSync('Chuva-Lenta-2026',h);
const velha=bcrypt.compareSync('123456',h);
console.log(nova && !velha ? 'OK' : 'RUIM nova='+nova+' velha='+velha);
" "$H" | grep -q OK && ok "senha nova confere, a antiga nao" || falha "hash" "a troca nao pegou"

zera_limite
echo "11. link expirado nao vale"
Q "insert into password_reset_tokens (user_id, token, expira_em) select id, 'expirado123', now() - interval '1 hour' from users where email='$EMAIL'" >/dev/null
R=$(curl -s -o /dev/null -w "%{http_code}" $B/api/auth/password-reset/expirado123)
[ "$R" = "400" ] && ok "HTTP $R" || falha "HTTP $R" "esperado 400"

zera_limite
echo "12. redefinir limpa a marca de troca obrigatoria"
Q "update users set must_change_password = true where email='$EMAIL'" >/dev/null
curl -s -X POST $B/api/auth/password-reset -H 'Content-Type: application/json' -d "{\"email\":\"$EMAIL\"}" >/dev/null
T2=$(Q "select token from password_reset_tokens where usado_em is null and expira_em > now() order by created_at desc limit 1")
curl -s -X POST $B/api/auth/password-reset/$T2 -H 'Content-Type: application/json' -d '{"password":"Vento-Norte-2026"}' >/dev/null
M=$(Q "select must_change_password from users where email='$EMAIL'")
[ "$M" = "f" ] && ok "must_change_password=f" || falha "must_change_password=$M" "esperado f"

echo
[ "$FALHAS" = "0" ] && echo "TUDO PASSOU" || echo "$FALHAS FALHA(S)"
exit $FALHAS
