-- Add is_suspended and suspended_reason columns to shops table
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS is_suspended boolean NOT NULL DEFAULT false;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS suspended_reason text DEFAULT NULL;