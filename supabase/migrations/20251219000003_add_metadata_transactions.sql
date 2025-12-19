-- Add metadata column to transactions table to support frontend usage
ALTER TABLE "public"."transactions"
ADD COLUMN IF NOT EXISTS "metadata" JSONB DEFAULT '{}'::jsonb;
