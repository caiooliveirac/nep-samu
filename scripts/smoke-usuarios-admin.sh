#!/usr/bin/env bash
# Exercita a tela de administracao de usuarios no LAB (4062 / nep_samu_lab).
set -uo pipefail
B=http://127.0.0.1:4063/NEP
ADMIN=caio@nep.samu.ba.gov.br
SENHA_ADMIN=Serra-Azul-2026
J=/tmp/nep-admin-cookies.txt
Q() { sudo -u postgres psql -d nep_samu_lab -Atc "$1"; }
ok() { printf "  \033[32mPASSA\033[0m %s\n" "$1"; }
falha() { printf "  \033[31mFALHA\033[0m %s -- %s\n" "$1" "$2"; FALHAS=$((FALHAS+1)); }
FALHAS=0

entrar() { # entrar <email> <senha> <arquivo-cookies>
  rm -f "$3"
  local csrf
  csrf=$(curl -s --max-time 20 -c "$3" $B/api/auth/csrf | sed -E 's/.*"csrfToken":"([^"]+)".*/\1/')
  curl -s --max-time 20 -o /dev/null -b "$3" -c "$3" -X POST $B/api/auth/callback/credentials \
    -H 'Content-Type: application/x-www-form-urlencoded' \
    --data-urlencode "csrfToken=$csrf" --data-urlencode "email=$1" --data-urlencode "password=$2"
  grep -q "authjs.session-token" "$3" && echo sim || echo nao
}

# O organizador precisa entrar sem o portao da troca obrigatoria no caminho.
Q "update users set must_change_password=false where email='$ADMIN'" >/dev/null
[ "$(entrar "$ADMIN" "$SENHA_ADMIN" $J)" = "sim" ] || { echo "nao consegui logar como organizador"; exit 1; }

# Alvo proprio, criado e removido pelo script: mexer numa conta do cadastro faz
# a segunda rodada partir de um estado diferente da primeira.
ALVO_EMAIL=alvo.teste@nep.samu.ba.gov.br
ALVO_NOVO=alvo.teste@gmail.com
limpar() { Q "delete from audit_log where entity_id in (select id from users where email in ('$ALVO_EMAIL','$ALVO_NOVO'))" >/dev/null; Q "delete from users where email in ('$ALVO_EMAIL','$ALVO_NOVO')" >/dev/null; }
limpar
ALVO_ID=$(Q "insert into users (nome, email, role, password_hash, ativo) values ('Alvo de Teste', '$ALVO_EMAIL', 'PROFISSIONAL', 'x', true) returning id" | head -1)

echo "1. a lista traz o veredito de entrega de cada dominio"
export ALVO_EMAIL
R=$(curl -s --max-time 20 -b $J $B/api/usuarios)
NADJA=$(echo "$R" | python3 -c "import json,sys,os; d=json.load(sys.stdin); u=[x for x in d if x['email']==os.environ['ALVO_EMAIL']][0]; print(u['emailRecebe'])")
SALVADOR=$(echo "$R" | python3 -c "import json,sys; d=json.load(sys.stdin); u=[x for x in d if x['email'].endswith('@salvador.ba.gov.br')][0]; print(u['emailRecebe'])")
[ "$NADJA" = "False" ] && [ "$SALVADOR" = "True" ] && ok "nep.samu.ba.gov.br=nao recebe, salvador.ba.gov.br=recebe" || falha "nadja=$NADJA salvador=$SALVADOR" "veredito de MX errado"

echo "2. trocar email grava e passa a receber"
curl -s --max-time 20 -o /dev/null -b $J -X PATCH $B/api/usuarios/$ALVO_ID -H 'Content-Type: application/json' -d "{\"email\":\"$ALVO_NOVO\"}"
NOVO=$(Q "select email from users where id='$ALVO_ID'")
[ "$NOVO" = "$ALVO_NOVO" ] && ok "email agora e $NOVO" || falha "$NOVO" "o email nao mudou"

echo "3. a troca ficou registrada na auditoria, com o valor antigo"
A=$(Q "select action from audit_log where entity_id='$ALVO_ID' order by created_at desc limit 1")
V=$(Q "select old_value->>'email' from audit_log where entity_id='$ALVO_ID' order by created_at desc limit 1")
[ "$A" = "usuario.email_alterado" ] && [ "$V" = "$ALVO_EMAIL" ] && ok "$A, antes: $V" || falha "action=$A old=$V" "auditoria incompleta"

echo "4. email ja usado por outra conta e recusado"
R=$(curl -s --max-time 20 -b $J -X PATCH $B/api/usuarios/$ALVO_ID -H 'Content-Type: application/json' -d "{\"email\":\"$ADMIN\"}")
echo "$R" | grep -q "pertence a outra conta" && ok "$R" || falha "$R" "esperado conflito"

echo "5. email malformado e recusado"
R=$(curl -s --max-time 20 -b $J -X PATCH $B/api/usuarios/$ALVO_ID -H 'Content-Type: application/json' -d '{"email":"nao-e-email"}')
echo "$R" | grep -qi "inv.lido" && ok "$R" || falha "$R" "esperado erro de validacao"

echo "6. resetar senha devolve a provisoria e liga a troca obrigatoria"
R=$(curl -s --max-time 20 -b $J -X POST $B/api/usuarios/$ALVO_ID/resetar-senha)
SENHA=$(echo "$R" | python3 -c "import json,sys; print(json.load(sys.stdin)['senhaProvisoria'])")
M=$(Q "select must_change_password from users where id='$ALVO_ID'")
echo "$SENHA" | grep -qE '^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$' && [ "$M" = "t" ] && ok "senha no formato ditavel, troca obrigatoria ligada" || falha "senha=$SENHA marca=$M" "formato ou marca errados"

echo "7. a senha provisoria realmente entra na conta"
CJ=/tmp/nep-alvo-cookies.txt
[ -n "$SENHA" ] && [ "$(entrar "$ALVO_NOVO" "$SENHA" $CJ)" = "sim" ] && ok "login com a provisoria funciona" || falha "sem sessao" "a provisoria nao entra"

echo "8. e a conta cai no portao da troca"
R=$(curl -s --max-time 20 -o /dev/null -b $CJ -w "%{http_code} %{redirect_url}" $B/painel)
echo "$R" | grep -q "trocar-senha" && ok "/painel -> $R" || falha "$R" "esperado desvio"

echo "9. a senha em claro nao vai para a auditoria"
if [ -z "$SENHA" ]; then N=IMPOSSIVEL; else N=$(Q "select count(*) from audit_log where new_value::text like '%$SENHA%' or old_value::text like '%$SENHA%'"); fi
[ "$N" = "0" ] && ok "nenhum registro contem a senha" || falha "$N registros" "senha vazou para o log"

echo "10. coordenador nao enxerga a administracao de usuarios"
CO=$(Q "select email from users where role='COORDENADOR' limit 1")
# hash gerado na hora: inventar um hash a mao so faz o login falhar e mascarar o teste
HASH=$(cd /home/ubuntu/labtmp/nep-usuarios && node -e "console.log(require('bcryptjs').hashSync('Coord-Teste-2026',10))")
Q "update users set password_hash='$HASH', must_change_password=false where email='$CO'" >/dev/null
CJ2=/tmp/nep-coord-cookies.txt
LOGOU=$(entrar "$CO" Coord-Teste-2026 $CJ2)
[ "$LOGOU" = "sim" ] || echo "  (aviso: coordenador nao logou; os casos abaixo perdem o sentido)"
R=$(curl -s --max-time 20 -o /dev/null -b $CJ2 -w "%{http_code}" $B/api/usuarios)
[ "$R" = "403" ] && ok "GET /api/usuarios -> HTTP $R" || falha "HTTP $R" "esperado 403"

echo "11. coordenador tambem nao consegue resetar senha de ninguem"
R=$(curl -s --max-time 20 -o /dev/null -b $CJ2 -w "%{http_code}" -X POST $B/api/usuarios/$ALVO_ID/resetar-senha)
[ "$R" = "403" ] && ok "POST resetar-senha -> HTTP $R" || falha "HTTP $R" "esperado 403"

echo "12. sem sessao nenhuma, a API nem chega na rota (middleware manda para o login)"
R=$(curl -s --max-time 20 -o /dev/null -w "%{http_code} %{redirect_url}" $B/api/usuarios)
echo "$R" | grep -q "login" && ok "$R" || falha "$R" "esperado desvio para o login"

echo "13. a tela /usuarios abre para o organizador"
R=$(curl -s --max-time 20 -o /dev/null -b $J -w "%{http_code}" $B/usuarios)
[ "$R" = "200" ] && ok "HTTP $R" || falha "HTTP $R" "esperado 200"

echo "14. e desvia o coordenador para o painel"
R=$(curl -s --max-time 20 -o /dev/null -b $CJ2 -w "%{http_code} %{redirect_url}" $B/usuarios)
echo "$R" | grep -q "painel" && ok "$R" || falha "$R" "esperado desvio para /painel"

limpar
rm -f $J $CJ $CJ2
echo
[ "$FALHAS" = "0" ] && echo "TUDO PASSOU" || echo "$FALHAS FALHA(S)"
exit $FALHAS
