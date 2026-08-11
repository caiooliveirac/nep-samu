-- Público externo da turma. Só acrescenta uma coluna anulável: nenhuma coluna
-- existente é tocada, nenhum dado é reescrito. Roda duas vezes sem estragar nada.
--
-- Motivo: turmas do SAMU Solidário, de empresa parceira e da rede municipal de
-- ensino não tinham onde ser registradas — profissoes_elegiveis só aceita
-- cargos do SAMU.
BEGIN;

ALTER TABLE turmas
  ADD COLUMN IF NOT EXISTS publico_externo text;

COMMIT;
