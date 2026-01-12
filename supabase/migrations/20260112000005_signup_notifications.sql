-- Function to notify admin on new user signup
CREATE OR REPLACE FUNCTION notify_admin_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO admin_notifications (user_id, type, message)
  VALUES (
    NEW.id, 
    'user', 
    concat('N E W  S I G N U P: ', COALESCE(NEW.full_name, 'Unknown'), ' (', NEW.email, ') just joined the platform.')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on profiles table (since profiles are created on signup)
DROP TRIGGER IF EXISTS tr_notify_admin_on_signup ON profiles;
CREATE TRIGGER tr_notify_admin_on_signup
AFTER INSERT ON profiles
FOR EACH ROW
EXECUTE FUNCTION notify_admin_on_signup();
