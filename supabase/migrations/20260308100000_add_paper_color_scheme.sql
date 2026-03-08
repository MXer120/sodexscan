-- Add 'paper' to valid_color_scheme constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS valid_color_scheme;
ALTER TABLE profiles ADD CONSTRAINT valid_color_scheme
  CHECK (color_scheme IN ('cyan','orange','purple','green','monochrome','cli','nsa','paper'));

-- Fix any existing rows that stored capitalized 'Paper'
UPDATE profiles SET color_scheme = 'paper' WHERE color_scheme = 'Paper';
