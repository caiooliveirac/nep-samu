-- "Excluir" na tela de Unidades passa a esconder da lista, não a apagar: sem
-- isso, tentar excluir uma unidade com vínculo/turma/matrícula/convite
-- associado batia num 409 (violaria a integridade referencial dessas
-- tabelas). Só acrescenta uma coluna com default: nenhuma coluna existente é
-- tocada, nenhum dado é reescrito. Roda duas vezes sem estragar nada.
BEGIN;

ALTER TABLE unidades
  ADD COLUMN IF NOT EXISTS oculta boolean NOT NULL DEFAULT false;

COMMIT;
