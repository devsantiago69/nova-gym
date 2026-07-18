ALTER TABLE "clubs"
  ADD COLUMN "country" VARCHAR(100) NOT NULL DEFAULT 'Colombia',
  ADD COLUMN "department" VARCHAR(120),
  ADD COLUMN "latitude" DECIMAL(10,7),
  ADD COLUMN "longitude" DECIMAL(10,7),
  ADD COLUMN "avatar_key" VARCHAR(500);

CREATE INDEX "clubs_country_department_city_idx" ON "clubs"("country", "department", "city");
