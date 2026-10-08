-- Conserva nombres, credenciales y cuentas existentes; la clave se valida en nuevos registros.
ALTER TABLE "User" ADD COLUMN "municipalityCode" VARCHAR(5);
