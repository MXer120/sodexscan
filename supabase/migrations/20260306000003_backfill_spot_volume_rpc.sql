-- Bulk upsert sodex_total_volume into leaderboard_weekly for a given week.
-- Rows in the JSONB array: { account_id, wallet_address, sodex_total_volume }
-- Updates existing rows; inserts new rows for spot-only traders.
CREATE OR REPLACE FUNCTION backfill_weekly_spot_volume(
  p_week INT,
  rows jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  touched integer;
BEGIN
  WITH input AS (
    SELECT
      (r->>'account_id')::integer AS account_id,
      r->>'wallet_address' AS wallet_address,
      (r->>'sodex_total_volume')::numeric(30,18) AS sodex_total_volume
    FROM jsonb_array_elements(rows) AS r
  )
  INSERT INTO leaderboard_weekly (
    week_number, account_id, wallet_address,
    sodex_total_volume, last_synced_at
  )
  SELECT p_week, account_id, wallet_address, sodex_total_volume, now()
  FROM input
  ON CONFLICT (week_number, account_id) DO UPDATE SET
    sodex_total_volume = EXCLUDED.sodex_total_volume,
    last_synced_at = now()
  WHERE leaderboard_weekly.sodex_total_volume IS DISTINCT FROM EXCLUDED.sodex_total_volume;

  GET DIAGNOSTICS touched = ROW_COUNT;
  RETURN touched;
END;
$$;

GRANT EXECUTE ON FUNCTION backfill_weekly_spot_volume(INT, jsonb) TO service_role;
