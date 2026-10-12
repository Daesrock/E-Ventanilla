-- La ausencia de información oficial se guarda como NULL, nunca como un dato inventado.
ALTER TABLE "Branch"
  ALTER COLUMN "street" DROP NOT NULL,
  ALTER COLUMN "exteriorNumber" DROP NOT NULL,
  ALTER COLUMN "neighborhood" DROP NOT NULL,
  ALTER COLUMN "postalCode" DROP NOT NULL,
  ADD COLUMN "address" TEXT,
  ADD COLUMN "phone" VARCHAR(150),
  ADD COLUMN "email" VARCHAR(254),
  ADD COLUMN "officeHours" VARCHAR(200),
  ADD COLUMN "sourceKey" VARCHAR(100),
  ADD COLUMN "sourceUrl" TEXT,
  ADD COLUMN "sourceSha256" CHAR(64),
  ADD COLUMN "sourceCheckedAt" TIMESTAMP(3),
  ADD COLUMN "published" BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE "Procedure"
  ALTER COLUMN "category" DROP NOT NULL,
  ALTER COLUMN "requirements" DROP NOT NULL,
  ADD COLUMN "description" TEXT,
  ADD COLUMN "sourceKey" VARCHAR(100),
  ADD COLUMN "sourceUrl" TEXT,
  ADD COLUMN "sourceSha256" CHAR(64),
  ADD COLUMN "sourceCheckedAt" TIMESTAMP(3),
  ADD COLUMN "published" BOOLEAN NOT NULL DEFAULT FALSE;

CREATE UNIQUE INDEX "Branch_sourceKey_key" ON "Branch"("sourceKey");
CREATE UNIQUE INDEX "Procedure_sourceKey_key" ON "Procedure"("sourceKey");
ALTER TABLE "Branch" ADD CONSTRAINT "Branch_publication_source_check" CHECK (
  NOT "published" OR ("sourceKey" IS NOT NULL AND "sourceUrl" IS NOT NULL AND "sourceUrl" LIKE 'https://%'
    AND "sourceSha256" IS NOT NULL AND "sourceSha256" ~ '^[a-f0-9]{64}$' AND "sourceCheckedAt" IS NOT NULL)
);
ALTER TABLE "Procedure" ADD CONSTRAINT "Procedure_publication_source_check" CHECK (
  NOT "published" OR ("sourceKey" IS NOT NULL AND "sourceUrl" IS NOT NULL AND "sourceUrl" LIKE 'https://%'
    AND "sourceSha256" IS NOT NULL AND "sourceSha256" ~ '^[a-f0-9]{64}$' AND "sourceCheckedAt" IS NOT NULL)
);
