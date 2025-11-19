-- Insert sample shops data
INSERT INTO public.shops (owner_id, name, description, address, location_lat, location_lng, category, average_service_time, is_active) VALUES
  ((SELECT id FROM auth.users LIMIT 1), 'Fresh Groceries Market', 'Your local grocery store with fresh produce and daily essentials', '123 Main Street, Downtown', 40.7128, -74.0060, 'grocery', 10, true),
  ((SELECT id FROM auth.users LIMIT 1), 'Quick Bites Cafe', 'Fast and delicious meals, coffee, and snacks', '456 Oak Avenue, City Center', 40.7580, -73.9855, 'restaurant', 15, true),
  ((SELECT id FROM auth.users LIMIT 1), 'Tech Repair Hub', 'Professional electronics repair and service center', '789 Tech Boulevard, Tech District', 40.7489, -73.9680, 'electronics', 30, true),
  ((SELECT id FROM auth.users LIMIT 1), 'Wellness Pharmacy', '24/7 pharmacy with healthcare products and consultations', '321 Health Street, Medical Quarter', 40.7614, -73.9776, 'pharmacy', 5, true),
  ((SELECT id FROM auth.users LIMIT 1), 'Style Studio Salon', 'Premium hair and beauty salon services', '654 Fashion Lane, Uptown', 40.7829, -73.9654, 'salon', 45, true);

-- Grant admin role to specified user (email: umangjajal@gmail.com)
-- First, we need to ensure this user exists and has a customer role
DO $$
DECLARE
  target_user_id uuid;
BEGIN
  -- Get the user ID for the specified email
  SELECT id INTO target_user_id FROM auth.users WHERE email = 'umangjajal@gmail.com';
  
  -- If user exists, add admin role
  IF target_user_id IS NOT NULL THEN
    -- Insert admin role if not exists
    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;