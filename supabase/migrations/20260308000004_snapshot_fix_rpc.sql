-- RPC to batch-update prev week snapshot sodex values
-- Called once with 24h-derived snapshot data
CREATE OR REPLACE FUNCTION fix_weekly_sodex_snapshot(p_week INT, rows JSONB)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  row_data JSONB;
  touched INT := 0;
BEGIN
  FOR row_data IN SELECT * FROM jsonb_array_elements(rows) LOOP
    UPDATE leaderboard_weekly
    SET sodex_total_volume = (row_data->>'sodex_total_volume')::NUMERIC,
        sodex_pnl = (row_data->>'sodex_pnl')::NUMERIC
    WHERE week_number = p_week
      AND account_id = (row_data->>'account_id')::INT;
    IF FOUND THEN touched := touched + 1; END IF;
  END LOOP;
  RETURN touched;
END;
$$;
