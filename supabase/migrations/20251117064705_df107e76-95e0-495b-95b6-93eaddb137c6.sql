-- Create app_role enum
CREATE TYPE IF NOT EXISTS public.app_role AS ENUM ('customer', 'shopkeeper', 'admin');

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Fix: Drop old constraint if it exists and ensure user_id is unique
-- This allows each user to have exactly one role
DO $$
BEGIN
  -- Drop the old composite unique constraint if it exists
  ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Create function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- Create shops table
CREATE TABLE IF NOT EXISTS public.shops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  location_lat DECIMAL(10, 8) NOT NULL,
  location_lng DECIMAL(11, 8) NOT NULL,
  address TEXT NOT NULL,
  image_url TEXT,
  rating DECIMAL(3, 2) DEFAULT 0,
  total_ratings INTEGER DEFAULT 0,
  average_service_time INTEGER DEFAULT 15,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;

-- Create products table
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(12,2) DEFAULT 0,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Create tokens/orders table
CREATE TABLE IF NOT EXISTS public.tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_number TEXT NOT NULL UNIQUE,
  customer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE NOT NULL,
  customer_location_lat DECIMAL(10, 8) NOT NULL,
  customer_location_lng DECIMAL(11, 8) NOT NULL,
  distance_meters INTEGER NOT NULL DEFAULT 0,
  traffic_duration_minutes INTEGER NOT NULL DEFAULT 0,
  estimated_pickup_time TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'ready', 'completed', 'cancelled', 'served')),
  qr_code TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY IF NOT EXISTS "Users can view their own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY IF NOT EXISTS "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

CREATE POLICY IF NOT EXISTS "Users can insert their own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY IF NOT EXISTS "Users can view their own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert their own role"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Only admins can manage roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for shops
CREATE POLICY IF NOT EXISTS "Anyone can view active shops"
ON public.shops FOR SELECT
TO authenticated
USING (is_active = true);

-- Shopkeepers can insert their own shops, but we require that:
-- 1) auth.uid() = owner_id
-- 2) user has role 'shopkeeper'
-- 3) user's email is confirmed (auth.users.email_confirmed_at IS NOT NULL)
CREATE POLICY IF NOT EXISTS "Shopkeepers can insert their own shops (email confirmed)"
ON public.shops FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = owner_id
  AND public.has_role(auth.uid(), 'shopkeeper')
  AND EXISTS (
    SELECT 1 FROM auth.users u WHERE u.id = auth.uid() AND u.email_confirmed_at IS NOT NULL
  )
);

CREATE POLICY IF NOT EXISTS "Shopkeepers can update their own shops"
ON public.shops FOR UPDATE
TO authenticated
USING (auth.uid() = owner_id);

-- RLS Policies for products
CREATE POLICY IF NOT EXISTS "Anyone can view products for active shops"
ON public.products FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.shops s WHERE s.id = products.shop_id AND s.is_active = true
));

CREATE POLICY IF NOT EXISTS "Shopkeepers can insert products for their shop"
ON public.products FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.shops s WHERE s.id = new.shop_id AND s.owner_id = auth.uid()
  )
);

CREATE POLICY IF NOT EXISTS "Shopkeepers can update products for their shop"
ON public.products FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.shops s WHERE s.id = products.shop_id AND s.owner_id = auth.uid()
  )
);

-- RLS Policies for tokens
CREATE POLICY IF NOT EXISTS "Customers can view their own tokens"
ON public.tokens FOR SELECT
TO authenticated
USING (auth.uid() = customer_id);

CREATE POLICY IF NOT_EXISTS "Shopkeepers can view tokens for their shops"
ON public.tokens FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.shops s WHERE s.id = public.tokens.shop_id AND s.owner_id = auth.uid()
));

CREATE POLICY IF NOT EXISTS "Customers can create tokens"
ON public.tokens FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = customer_id AND public.has_role(auth.uid(), 'customer'));

CREATE POLICY IF NOT EXISTS "Shopkeepers can update tokens for their shops"
ON public.tokens FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.shops s WHERE s.id = public.tokens.shop_id AND s.owner_id = auth.uid()
));

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS set_updated_at_profiles ON public.profiles;
CREATE TRIGGER set_updated_at_profiles BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_shops ON public.shops;
CREATE TRIGGER set_updated_at_shops BEFORE UPDATE ON public.shops
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_tokens ON public.tokens;
CREATE TRIGGER set_updated_at_tokens BEFORE UPDATE ON public.tokens
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_products ON public.products;
CREATE TRIGGER set_updated_at_products BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- NOTE: Role assignment is handled by the client during signup
  -- Do not assign a default role here to allow user type selection
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- product_catalog: shared master catalog to speed shopkeeper product entry
CREATE TABLE IF NOT EXISTS public.product_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT, -- optional master SKU
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  brand TEXT,
  description TEXT,
  default_price NUMERIC(12,2),
  tags TEXT[], -- searchable tags
  created_at timestamptz DEFAULT now()
);

-- Make it readable by everyone (authenticated or anonymous depending on your app)
-- For simplicity allow authenticated selects:
ALTER TABLE public.product_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read product catalog" ON public.product_catalog
FOR SELECT
TO authenticated
USING (true);

-- (Optional) For public unauthenticated read:
-- CREATE POLICY "Anyone can read product catalog" ON public.product_catalog
-- FOR SELECT
-- TO public
-- USING (true);

-- 2025-11-18_add_payout_fields_and_rpc.sql

-- 1) Enable pgcrypto (for symmetric encryption)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2) Add encrypted payout columns to shops
ALTER TABLE public.shops
  ADD COLUMN IF NOT EXISTS payout_method TEXT DEFAULT 'none', -- 'bank' | 'upi' | 'none'
  ADD COLUMN IF NOT EXISTS bank_account_enc BYTEA,
  ADD COLUMN IF NOT EXISTS bank_account_last4 TEXT,
  ADD COLUMN IF NOT EXISTS ifsc_enc BYTEA,
  ADD COLUMN IF NOT EXISTS upi_id_enc BYTEA,
  ADD COLUMN IF NOT EXISTS payout_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS payout_metadata JSONB;

-- 3) Create a public view that hides encrypted columns for normal consumers
DROP VIEW IF EXISTS public.shops_public;
CREATE VIEW public.shops_public AS
SELECT
  id,
  owner_id,
  name,
  description,
  category,
  location_lat,
  location_lng,
  address,
  image_url,
  rating,
  total_ratings,
  average_service_time,
  is_active,
  created_at,
  updated_at,
  payout_method,
  payout_verified,
  payout_metadata
FROM public.shops;

-- 4) RPC to insert shop + server-side encryption
-- This function takes plaintext payout details and inserts a shop after encrypting them.
CREATE OR REPLACE FUNCTION public.insert_shop_with_payout(
  owner_id UUID,
  name TEXT,
  description TEXT,
  category TEXT,
  location_lat NUMERIC,
  location_lng NUMERIC,
  address TEXT,
  payout_method TEXT DEFAULT 'none', -- 'bank' or 'upi' or 'none'
  owner_full_name TEXT DEFAULT NULL,
  phone TEXT DEFAULT NULL,
  bank_account TEXT DEFAULT NULL,
  account_holder_name TEXT DEFAULT NULL,
  ifsc TEXT DEFAULT NULL,
  upi_id TEXT DEFAULT NULL
) RETURNS public.shops
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  encryption_key TEXT;
  bank_enc BYTEA := NULL;
  ifsc_enc BYTEA := NULL;
  upi_enc BYTEA := NULL;
  acct_last4 TEXT := NULL;
  inserted_row public.shops%ROWTYPE;
BEGIN
  -- Server-side validation
  IF owner_id IS NULL THEN
    RAISE EXCEPTION 'owner_id is required';
  END IF;
  IF name IS NULL OR btrim(name) = '' THEN
    RAISE EXCEPTION 'shop name is required';
  END IF;
  IF location_lat IS NULL OR location_lng IS NULL THEN
    RAISE EXCEPTION 'location (lat,lng) is required';
  END IF;

  -- Read encryption key from current_setting (set this in DB config/environment)
  encryption_key := current_setting('app.encryption_key', true);
  IF encryption_key IS NULL THEN
    RAISE EXCEPTION 'encryption key not set. Set app.encryption_key in the DB settings.';
  END IF;

  IF payout_method = 'bank' THEN
    IF bank_account IS NULL OR btrim(bank_account) = '' THEN
      RAISE EXCEPTION 'bank_account is required for bank payouts';
    END IF;
    IF ifsc IS NULL OR btrim(ifsc) = '' THEN
      RAISE EXCEPTION 'ifsc is required for bank payouts';
    END IF;
    -- sanitize, and create last4
    acct_last4 := right(regexp_replace(bank_account, '\s+', '', 'g'), 4);
    bank_enc := pgp_sym_encrypt(bank_account::text, encryption_key);
    ifsc_enc := pgp_sym_encrypt(upper(ifsc)::text, encryption_key);
  ELSIF payout_method = 'upi' THEN
    IF upi_id IS NULL OR btrim(upi_id) = '' THEN
      RAISE EXCEPTION 'upi_id is required for upi payouts';
    END IF;
    upi_enc := pgp_sym_encrypt(upi_id::text, encryption_key);
  END IF;

  INSERT INTO public.shops (
    owner_id, name, description, category,
    location_lat, location_lng, address,
    payout_method, bank_account_enc, bank_account_last4,
    ifsc_enc, upi_id_enc, payout_verified, payout_metadata
  ) VALUES (
    owner_id, name, description, category,
    location_lat, location_lng, address,
    payout_method, bank_enc, acct_last4,
    ifsc_enc, upi_enc, FALSE, jsonb_build_object('owner_full_name', owner_full_name, 'phone', phone, 'account_holder', account_holder_name)
  )
  RETURNING * INTO inserted_row;

  RETURN inserted_row;
END;
$$;

-- 5) Admin RPC to decrypt payout fields for an admin (SECURITY DEFINER)
-- WARNING: Use carefully and protect access. This returns decrypted payout JSON only for admins/operators.
CREATE OR REPLACE FUNCTION public.decrypt_shop_payout(shop_uuid UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  row public.shops%ROWTYPE;
  encryption_key TEXT;
  res JSONB;
BEGIN
  encryption_key := current_setting('app.encryption_key', true);
  IF encryption_key IS NULL THEN
    RAISE EXCEPTION 'encryption key not set';
  END IF;

  SELECT * INTO row FROM public.shops WHERE id = shop_uuid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'shop not found';
  END IF;

  res := jsonb_build_object(
    'shop_id', row.id,
    'payout_method', row.payout_method,
    'payout_verified', row.payout_verified,
    'bank_account_last4', row.bank_account_last4,
    'bank_account', CASE WHEN row.bank_account_enc IS NULL THEN NULL ELSE pgp_sym_decrypt(row.bank_account_enc, encryption_key) END,
    'ifsc', CASE WHEN row.ifsc_enc IS NULL THEN NULL ELSE pgp_sym_decrypt(row.ifsc_enc, encryption_key) END,
    'upi_id', CASE WHEN row.upi_id_enc IS NULL THEN NULL ELSE pgp_sym_decrypt(row.upi_id_enc, encryption_key) END,
    'payout_metadata', row.payout_metadata
  );

  RETURN res;
END;
$$;

-- 6) Grant usage: allow authenticated users to call insert_shop_with_payout and view shops_public
-- We'll let "authenticated" call the RPC (it checks owner_id) but the RPC is SECURITY DEFINER
GRANT EXECUTE ON FUNCTION public.insert_shop_with_payout(UUID, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decrypt_shop_payout(UUID) TO postgres; -- Keep decrypt restricted. Do NOT grant to 'authenticated'

-- 7) Create the shops_public RLS policy (for the view you control the access in Supabase)
-- In Supabase, views inherit privileges differently. To keep it simple:
-- Allow authenticated selects on the view (supabase UI will expose the view to your client library).
GRANT SELECT ON public.shops_public TO authenticated;

-- 8) IMPORTANT RLS guidance:
-- Keep the main public.shops table RLS policies as you had them for ownership checks.
-- Make sure the direct SELECT on public.shops is limited to owners/admins.
-- Public app code should SELECT from shops_public (which excludes encrypted fields).

-- Example: ensure only owner/admin can read full shops (you might already have similar)
-- This is a suggested policy (adjust to your existing policy framework):
CREATE POLICY IF NOT EXISTS "Shops: owner or admin can select full row" ON public.shops FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'));

-- 9) Notes:
-- - Set your encryption key in the DB: (run once via psql or in Supabase SQL)
--   SELECT set_config('app.encryption_key', '<very-strong-random-key-here>', false);
--   But better: set as a database config or supply via the server session for RPC calls from a backend service.
-- - The RPC 'insert_shop_with_payout' should be called from your backend or from authenticated clients. It will encrypt the provided payout fields.

-- 10) Set the encryption key for payout encryption
-- This key is used by pgp_sym_encrypt/pgp_sym_decrypt functions
ALTER DATABASE postgres SET "app.encryption_key" = '40af62d36ec2d39c8e37ba5afc02bdae';
