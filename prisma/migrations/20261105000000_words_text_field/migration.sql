-- Ensure profile descriptions are not limited to a short varchar column.
ALTER TABLE "Info"
ALTER COLUMN "words" TYPE TEXT;
