-- ============================================================
-- Update Mod List
-- ============================================================

INSERT INTO discord_users (id, username, display_name, is_mod) VALUES
  ('877444818643599420', 'forsom', 'eric', TRUE),
  ('1035494175606591499', 'nanee70092', 'Cryptoboy/Sodex', TRUE),
  ('955706126563967036', 'yucelcrypto', 'Yücel | SoSoValue', TRUE),
  ('878554789766660136', 'manjirow555', '萬次郎', TRUE),
  ('927577910892711946', 'lutzs120', 'LutzS120', TRUE),
  ('970506842318995487', '.oliver6', 'Oliver', TRUE),
  ('1197970651781275698', 'mickmite.', 'Mickmite', TRUE),
  ('751097503637700609', 'frankabababa', 'FrankAba | SoSoValue', TRUE),
  ('885109448799043585', 'djye', 'djye', TRUE),
  ('627282807600840715', 'kouhi2550', 'Dobee', TRUE),
  ('1010844860510646332', 'yuxialun', 'SoSoValue Jazon ジャン 강산', TRUE),
  ('1450674711682879498', 'sodexteam', 'sherry', TRUE),
  ('1087899759425097860', 'dongdongrobin', '东东弗斯 (hype/acc) 👺', TRUE),
  ('954206609486254110', 'jasminezhong7089', 'jasminezhong', TRUE),
  ('952765858822881310', '.0xtab', '0xTab', TRUE),
  ('1232027142284640299', 'yefz1688', '余额疯涨 丨SODEX', TRUE)
ON CONFLICT (id) DO UPDATE SET
  username = EXCLUDED.username,
  display_name = EXCLUDED.display_name,
  is_mod = TRUE;
