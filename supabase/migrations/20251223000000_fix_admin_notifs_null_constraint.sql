-- Fix for null value violations in admin_notifications message construction

-- Redefine Function to handle transaction notifications with safe concatenation
CREATE OR REPLACE FUNCTION notify_admin_on_transaction()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify on NEW Deposit
  IF (TG_OP = 'INSERT') AND (NEW.type = 'deposit') THEN
    INSERT INTO admin_notifications (user_id, type, message)
    VALUES (NEW.user_id, 'deposit', concat('A user has uploaded a deposit receipt of $', NEW.amount));
  END IF;

  -- Notify on NEW Withdrawal Request
  IF (TG_OP = 'INSERT') AND (NEW.type = 'withdrawal') THEN
    INSERT INTO admin_notifications (user_id, type, message)
    VALUES (NEW.user_id, 'withdrawal', concat('A new withdrawal request of $', NEW.amount, ' has been submitted.'));
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Redefine Function to handle trade notifications (Order Book matches) with safe concatenation
CREATE OR REPLACE FUNCTION notify_admin_on_trade()
RETURNS TRIGGER AS $$
DECLARE
  v_pair_symbol TEXT;
BEGIN
  SELECT symbol INTO v_pair_symbol FROM trading_pairs WHERE id = NEW.trading_pair_id;

  INSERT INTO admin_notifications (user_id, type, message)
  VALUES (NEW.buyer_id, 'trade', concat('Trade executed (Order Book): ', NEW.amount, ' ', COALESCE(v_pair_symbol, 'Asset'), ' at ', NEW.price));
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Redefine Function to handle trades from the 'trades' table (Binary/Direct trades) with safe concatenation
CREATE OR REPLACE FUNCTION notify_admin_on_direct_trade()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO admin_notifications (user_id, type, message)
  VALUES (NEW.user_id, 'trade', concat('New Trade: ', NEW.type, ' on ', COALESCE(NEW.asset_symbol, 'Asset'), ' - Amount: ', NEW.amount));
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
