-- Update orders status check constraint to include binary option statuses and existing legacy statuses
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE public.orders 
ADD CONSTRAINT orders_status_check 
CHECK (status IN ('pending', 'filled', 'partially_filled', 'cancelled', 'canceled', 'rejected', 'OPEN', 'WIN', 'LOSS'));
