ALTER TABLE "attendances"
  ADD COLUMN "start_latitude" DECIMAL(9,6),
  ADD COLUMN "start_longitude" DECIMAL(9,6),
  ADD COLUMN "start_accuracy_meters" DECIMAL(8,2),
  ADD COLUMN "end_latitude" DECIMAL(9,6),
  ADD COLUMN "end_longitude" DECIMAL(9,6),
  ADD COLUMN "end_accuracy_meters" DECIMAL(8,2),
  ADD CONSTRAINT "attendances_start_coordinates" CHECK (("start_latitude" IS NULL AND "start_longitude" IS NULL) OR ("start_latitude" BETWEEN -90 AND 90 AND "start_longitude" BETWEEN -180 AND 180)),
  ADD CONSTRAINT "attendances_end_coordinates" CHECK (("end_latitude" IS NULL AND "end_longitude" IS NULL) OR ("end_latitude" BETWEEN -90 AND 90 AND "end_longitude" BETWEEN -180 AND 180));
