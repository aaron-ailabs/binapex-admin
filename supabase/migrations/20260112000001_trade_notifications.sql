-- Add sound_enabled to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS sound_enabled BOOLEAN DEFAULT true;

-- Function to handle binary trade notifications (Orders table)
CREATE OR REPLACE FUNCTION notify_admin_on_binary_order()
RETURNS TRIGGER AS $$
DECLARE
  v_user_name TEXT;
  v_user_email TEXT;
  v_asset_symbol TEXT;
BEGIN
  -- Get user details
  SELECT full_name, email INTO v_user_name, v_user_email FROM profiles WHERE id = NEW.user_id;
  
  -- Fallback if not found
  IF v_user_name IS NULL THEN v_user_name := 'Unknown User'; END IF;
  IF v_user_email IS NULL THEN v_user_email := 'No Email'; END IF;

  -- Get Asset Symbol (Join with assets table)
  SELECT symbol INTO v_asset_symbol FROM assets WHERE id = NEW.asset_id;
  IF v_asset_symbol IS NULL THEN v_asset_symbol := 'Unknown Asset'; END IF;

  -- Notify on NEW Order (Open Trade)
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO admin_notifications (user_id, type, message)
    VALUES (
      NEW.user_id, 
      'trade', 
      concat('BINARY OPEN: ', v_user_name, ' (', v_user_email, ') opened ', NEW.type, ' on ', v_asset_symbol, ' - Amount: $', NEW.size)
    );
  END IF;

  -- Notify on Trade Result (WIN/LOSS)
  IF (TG_OP = 'UPDATE') AND (OLD.status = 'OPEN') AND (NEW.status IN ('WIN', 'LOSS')) THEN
    INSERT INTO admin_notifications (user_id, type, message)
    VALUES (
      NEW.user_id, 
      'trade', 
      concat('BINARY RESULT: ', v_user_name, ' (', v_user_email, ') ', NEW.status, ' on ', v_asset_symbol, ' - P/L: $', NEW.profit_loss)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on orders table
DROP TRIGGER IF EXISTS tr_notify_admin_on_binary_order ON orders;
CREATE TRIGGER tr_notify_admin_on_binary_order
AFTER INSERT OR UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION notify_admin_on_binary_order();
