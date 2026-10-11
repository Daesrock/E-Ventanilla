BEGIN;

-- Los apellidos anteriores permanecen intactos. No se pueden dividir sin confirmación.
ALTER TABLE "User"
  ALTER COLUMN "lastName" TYPE VARCHAR(201),
  ADD COLUMN "paternalLastName" VARCHAR(100),
  ADD COLUMN "maternalLastName" VARCHAR(100),
  ADD CONSTRAINT user_separate_surnames CHECK (
    ("paternalLastName" IS NULL AND "maternalLastName" IS NULL)
    OR (
      "paternalLastName" IS NOT NULL
      AND char_length(btrim("paternalLastName")) > 0
      AND ("maternalLastName" IS NULL OR char_length(btrim("maternalLastName")) > 0)
    )
  );

-- Mantiene el valor combinado que leen los clientes anteriores, incluso desde pgAdmin.
CREATE FUNCTION synchronize_user_surnames() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."paternalLastName" IS NOT NULL THEN
    NEW."lastName" := concat_ws(' ', NEW."paternalLastName", NEW."maternalLastName");
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER user_surnames_compatibility
BEFORE INSERT OR UPDATE OF "paternalLastName", "maternalLastName", "lastName" ON "User"
FOR EACH ROW EXECUTE FUNCTION synchronize_user_surnames();

COMMIT;
