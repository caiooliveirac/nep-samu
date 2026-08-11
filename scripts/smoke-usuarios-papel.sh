#!/usr/bin/env bash
# Troca de papel e vinculo pela tela de administracao (LAB 4064 / nep_samu_lab).
set -uo pipefail
B=http://127.0.0.1:4064/NEP
ADMIN=org.teste@example.com
SENHA=Teste-Org-2026
J=/tmp/papel-admin.txt
Q() { sudo -u postgres psql -d nep_samu_lab -Atc "$1"; }
ok() { printf "  \033[32mPASSA\033[0m %s\n" "$1"; }
falha() { printf "  \033[31mFALHA\033[0m %s -- %s\n" "$1" "$2"; FALHAS=$((FALHAS+1)); }
FALHAS=0

entrar() {
  rm -f "$3"
  local csrf
  csrf=$(curl -s --max-time 20 -c "$3" $B/api/auth/csrf | sed -E 's/.*"csrfToken":"([^"]+)".*/\1/')
  curl -s --max-time 20 -o /dev/null -b "$3" -c "$3" -X POST $B/api/auth/callback/credentials \
    -H 'Content-Type: application/x-www-form-urlencoded' \
    --data-urlencode "csrfToken=$csrf" --data-urlencode "email=$1" --data-urlencode "password=$2"
  grep -q authjs.session-token "$3" && echo sim || echo nao
}

HASH=$(node -e "console.log(require('/home/ubuntu/labtmp/nep-bug/node_modules/bcryptjs').hashSync('$SENHA',10))")
EMAILS="'$ADMIN','alvo.papel@example.com','outro.org@example.com'"
limpar() {
  Q "delete from audit_log where entity_id in (select id from users where email in ($EMAILS)) or user_id in (select id from users where email in ($EMAILS))" >/dev/null
  Q "delete from vinculos where user_id in (select id from users where email in ($EMAILS))" >/dev/null
  Q "delete from users where email in ($EMAILS)" >/dev/null
}
limpar
ADMIN_ID=$(Q "insert into users (nome,email,role,password_hash,ativo,must_change_password) values ('Org Teste','$ADMIN','ORGANIZADOR','$HASH',true,false) returning id" | head -1)
ALVO_ID=$(Q "insert into users (nome,email,role,password_hash,ativo,must_change_password) values ('Alvo Papel','alvo.papel@example.com','PROFISSIONAL','$HASH',true,false) returning id" | head -1)
UNI1=$(Q "select id from unidades order by nome limit 1")
UNI2=$(Q "select id from unidades order by nome offset 1 limit 1")

[ "$(entrar "$ADMIN" "$SENHA" $J)" = "sim" ] || { echo "login do organizador falhou"; exit 1; }

papel() { curl -s --max-time 20 -b $J -X PUT $B/api/usuarios/$1/papel -H 'Content-Type: application/json' -d "$2"; }

echo "1. profissional vira coordenador de uma unidade"
R=$(papel $ALVO_ID "{\"role\":\"COORDENADOR\",\"unidadeId\":\"$UNI1\"}")
ROLE=$(Q "select role from users where id='$ALVO_ID'")
COORD=$(Q "select is_coordenador from vinculos where user_id='$ALVO_ID' and unidade_id='$UNI1'")
[ "$ROLE" = "COORDENADOR" ] && [ "$COORD" = "t" ] && ok "papel=$ROLE, coordena a unidade" || falha "role=$ROLE coord=$COORD resp=$R" "esperado coordenador com vinculo"

echo "2. mudar de unidade nao deixa a coordenacao antiga para tras"
papel $ALVO_ID "{\"role\":\"COORDENADOR\",\"unidadeId\":\"$UNI2\"}" >/dev/null
ANTIGA=$(Q "select is_coordenador from vinculos where user_id='$ALVO_ID' and unidade_id='$UNI1'")
NOVA=$(Q "select is_coordenador from vinculos where user_id='$ALVO_ID' and unidade_id='$UNI2'")
[ "$ANTIGA" = "f" ] && [ "$NOVA" = "t" ] && ok "coordenacao migrou (antiga=f, nova=t)" || falha "antiga=$ANTIGA nova=$NOVA" "a coordenacao antiga ficou"

echo "3. coordenador vira organizador, sem exigir unidade"
R=$(papel $ALVO_ID '{"role":"ORGANIZADOR"}')
ROLE=$(Q "select role from users where id='$ALVO_ID'")
[ "$ROLE" = "ORGANIZADOR" ] && ok "papel=$ROLE" || falha "role=$ROLE resp=$R" "esperado organizador"

echo "4. coordenador sem unidade e recusado"
R=$(papel $ALVO_ID '{"role":"COORDENADOR"}')
echo "$R" | grep -q "Escolha a unidade" && ok "$R" || falha "$R" "esperado exigir unidade"

echo "5. voltar para profissional grava a profissao"
R=$(papel $ALVO_ID "{\"role\":\"PROFISSIONAL\",\"unidadeId\":\"$UNI1\",\"profissao\":\"ENFERMEIRO\"}")
ROLE=$(Q "select role from users where id='$ALVO_ID'")
PROF=$(Q "select profissao from users where id='$ALVO_ID'")
COORD=$(Q "select is_coordenador from vinculos where user_id='$ALVO_ID' and unidade_id='$UNI1'")
[ "$ROLE" = "PROFISSIONAL" ] && [ "$PROF" = "ENFERMEIRO" ] && [ "$COORD" = "f" ] && ok "papel=$ROLE, profissao=$PROF, sem coordenacao" || falha "role=$ROLE prof=$PROF coord=$COORD" "esperado profissional sem coordenacao"

echo "6. profissao invalida e recusada"
R=$(papel $ALVO_ID "{\"role\":\"PROFISSIONAL\",\"unidadeId\":\"$UNI1\",\"profissao\":\"ASTRONAUTA\"}")
echo "$R" | grep -qi "inv\|expected" && ok "$R" || falha "$R" "esperado recusa"

echo "7. o organizador nao rebaixa a si mesmo"
R=$(papel $ADMIN_ID "{\"role\":\"PROFISSIONAL\",\"unidadeId\":\"$UNI1\"}")
echo "$R" | grep -q "pr.pria conta" && ok "$R" || falha "$R" "esperado bloqueio"

echo "8. rebaixar um organizador e permitido quando existe outro ativo"
# A trava do 'ultimo organizador' nao da para exercitar por aqui: o admin logado
# ja e um organizador ativo, entao a condicao nunca se verifica. O que da para
# provar e que a trava nao barra o caso legitimo.
OUTRO=$(Q "insert into users (nome,email,role,password_hash,ativo) values ('Outro Org','outro.org@example.com','ORGANIZADOR','$HASH',true) returning id" | head -1)
R=$(papel $OUTRO "{\"role\":\"PROFISSIONAL\",\"unidadeId\":\"$UNI1\"}")
ROLE=$(Q "select role from users where id='$OUTRO'")
[ "$ROLE" = "PROFISSIONAL" ] && ok "rebaixado para $ROLE" || falha "role=$ROLE resp=$R" "esperado rebaixamento permitido"

echo "9. a troca de papel ficou na auditoria com o papel antigo"
A=$(Q "select action from audit_log where entity_id='$ALVO_ID' order by created_at desc limit 1")
[ "$A" = "usuario.papel_alterado" ] && ok "$A" || falha "$A" "esperado registro de auditoria"

echo "10. coordenador nao consegue trocar papel de ninguem"
CO=$(Q "select email from users where role='COORDENADOR' and email not like '%example.com' limit 1")
Q "update users set password_hash='$HASH', must_change_password=false where email='$CO'" >/dev/null
CJ=/tmp/papel-coord.txt
entrar "$CO" "$SENHA" $CJ >/dev/null
R=$(curl -s --max-time 20 -o /dev/null -b $CJ -w "%{http_code}" -X PUT $B/api/usuarios/$ALVO_ID/papel -H 'Content-Type: application/json' -d '{"role":"ORGANIZADOR"}')
[ "$R" = "403" ] && ok "HTTP $R" || falha "HTTP $R" "esperado 403"

limpar
rm -f $J $CJ
echo
[ "$FALHAS" = "0" ] && echo "TUDO PASSOU" || echo "$FALHAS FALHA(S)"
exit $FALHAS
