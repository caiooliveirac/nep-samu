-- Recuperação de senha do NEP SAMU. Só acrescenta: nenhuma coluna existente é
-- tocada, nenhum dado é reescrito. Roda duas vezes sem estragar nada.
BEGIN;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      varchar(128) NOT NULL UNIQUE,
  expira_em  timestamptz NOT NULL,
  usado_em   timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_token ON password_reset_tokens (token);
CREATE INDEX IF NOT EXISTS idx_password_reset_user  ON password_reset_tokens (user_id);

COMMIT;
