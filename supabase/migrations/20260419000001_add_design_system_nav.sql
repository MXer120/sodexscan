INSERT INTO nav_config (path, label, enabled, tag, sort_order, in_more) VALUES
  ('/design-system', 'Design System', true, NULL, 78, true)
ON CONFLICT (path) DO NOTHING;
