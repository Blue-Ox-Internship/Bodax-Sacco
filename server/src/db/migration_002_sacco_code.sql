-- Migration 002: Add sacco code to saccos table

ALTER TABLE saccos ADD COLUMN IF NOT EXISTS code VARCHAR(30);

-- Seed the default SACCO with the BODAX code
UPDATE saccos SET code = 'BODAX' WHERE id = '00000000-0000-0000-0000-000000000001';

-- Make the code column NOT NULL after seeding
ALTER TABLE saccos ALTER COLUMN code SET NOT NULL;

-- Ensure the code is unique
ALTER TABLE saccos ADD CONSTRAINT unique_sacco_code UNIQUE (code);
