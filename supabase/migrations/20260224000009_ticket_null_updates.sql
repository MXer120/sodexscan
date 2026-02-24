-- Fix update_ticket_fields to correctly support setting values to NULL
CREATE OR REPLACE FUNCTION update_ticket_fields(
  p_ticket_id BIGINT,
  p_fields JSONB
) RETURNS void AS $$
DECLARE
  v_assigned TEXT[];
BEGIN
  IF NOT public.is_mod() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Parse assigned array from JSONB if provided
  IF p_fields ? 'assigned' THEN
    IF jsonb_typeof(p_fields->'assigned') = 'null' THEN
      v_assigned := '{}'::TEXT[];
    ELSE
      SELECT ARRAY(SELECT jsonb_array_elements_text(p_fields->'assigned')) INTO v_assigned;
    END IF;
    UPDATE tickets SET assigned = v_assigned WHERE id = p_ticket_id;
  END IF;

  UPDATE tickets SET
    details        = CASE WHEN p_fields ? 'details' THEN p_fields->>'details' ELSE details END,
    project        = CASE WHEN p_fields ? 'project' THEN p_fields->>'project' ELSE project END,
    issue_type     = CASE WHEN p_fields ? 'issue_type' THEN p_fields->>'issue_type' ELSE issue_type END,
    progress       = CASE WHEN p_fields ? 'progress' THEN p_fields->>'progress' ELSE progress END,
    wallet_address = CASE WHEN p_fields ? 'wallet_address' THEN p_fields->>'wallet_address' ELSE wallet_address END,
    account_id     = CASE WHEN p_fields ? 'account_id' THEN p_fields->>'account_id' ELSE account_id END,
    tx_id          = CASE WHEN p_fields ? 'tx_id' THEN p_fields->>'tx_id' ELSE tx_id END
  WHERE id = p_ticket_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
