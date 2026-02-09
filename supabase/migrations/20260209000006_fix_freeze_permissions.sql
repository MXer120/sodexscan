-- Revoke anon/authenticated access to freeze (should be service_role only)
REVOKE EXECUTE ON FUNCTION freeze_current_week FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION sync_current_week FROM anon, authenticated;
