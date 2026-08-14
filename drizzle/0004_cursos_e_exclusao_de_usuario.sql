-- Quatro mudanças pequenas, todas com IF NOT EXISTS: roda duas vezes sem
-- estragar nada.
--
-- 1. cursos.publico_alvo_profissoes — as profissões do curso viravam só uma
--    frase ("Médico(a), Enfermeiro(a)"); agora ficam como dado, e toda turma
--    nova do curso já nasce com elas marcadas.
-- 2. cursos.carga_horaria passa de MINUTOS para HORAS.
-- 3. usuarios_removidos — apagar usuário passa a apagar de verdade; o que
--    sobra é a ficha para reconhecer a pessoa num cadastro futuro.
-- 4. notificacao_tipo ganha TROCA_UNIDADE_SOLICITADA.

-- ALTER TYPE ... ADD VALUE fica fora da transação: o valor novo não pode ser
-- usado na mesma transação em que nasce.
ALTER TYPE notificacao_tipo ADD VALUE IF NOT EXISTS 'TROCA_UNIDADE_SOLICITADA';

BEGIN;

ALTER TABLE cursos
  ADD COLUMN IF NOT EXISTS publico_alvo_profissoes jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Converte os valores herdados, que estavam em minutos. O corte em 24 é o que
-- torna esta linha re-executável: 480 min vira 8 h, e 8 h continua 8 h numa
-- segunda passagem. Nenhum curso do catálogo tem 25 horas ou mais.
UPDATE cursos
   SET carga_horaria = GREATEST(1, ROUND(carga_horaria / 60.0))
 WHERE carga_horaria IS NOT NULL
   AND carga_horaria > 24;

CREATE TABLE IF NOT EXISTS usuarios_removidos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  nome text NOT NULL,
  email text NOT NULL,
  cpf varchar(11),
  telefone varchar(15),
  role text NOT NULL,
  profissao text,
  snapshot jsonb,
  removido_por uuid REFERENCES users(id) ON DELETE SET NULL,
  removido_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_usuarios_removidos_email ON usuarios_removidos (email);
CREATE INDEX IF NOT EXISTS idx_usuarios_removidos_cpf ON usuarios_removidos (cpf);

COMMIT;
