-- Drop old check constraint and add updated one that includes cli and nsa
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS valid_color_scheme;
ALTER TABLE profiles ADD CONSTRAINT valid_color_scheme
  CHECK (color_scheme IN ('cyan','orange','purple','green','monochrome','cli','nsa'));
