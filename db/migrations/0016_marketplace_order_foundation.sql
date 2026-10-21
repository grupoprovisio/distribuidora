-- Provisio Phase 4: isolated order persistence foundation. REVIEW ONLY; do not apply to production.
-- No browser role receives mutation rights. All order writes require a reviewed transactional RPC.
BEGIN;
CREATE TABLE IF NOT EXISTS public.buyer_carts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), buyer_org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
 created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
 status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','abandoned')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS buyer_carts_buyer_status_idx ON public.buyer_carts(buyer_org_id,status);
CREATE TABLE IF NOT EXISTS public.buyer_cart_items (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), cart_id uuid NOT NULL REFERENCES public.buyer_carts(id) ON DELETE CASCADE,
 offer_id uuid NOT NULL REFERENCES public.offers(id) ON DELETE RESTRICT,
 quantity numeric(14,3) NOT NULL CHECK (quantity > 0), created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(cart_id,offer_id)
);
CREATE TABLE IF NOT EXISTS public.quote_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), buyer_org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
 requested_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','submitted','responded','accepted','expired','cancelled')),
 expires_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.quote_request_items (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), quote_id uuid NOT NULL REFERENCES public.quote_requests(id) ON DELETE CASCADE,
 product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
 quantity numeric(14,3) NOT NULL CHECK(quantity>0), notes text CHECK(notes IS NULL OR length(notes)<=500)
);
CREATE TABLE IF NOT EXISTS public.quote_responses (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), quote_id uuid NOT NULL REFERENCES public.quote_requests(id) ON DELETE RESTRICT,
 supplier_org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','submitted','accepted','rejected','expired')),
 valid_until timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(quote_id,supplier_org_id)
);
CREATE TABLE IF NOT EXISTS public.marketplace_orders (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), buyer_org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
 created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
 idempotency_key text NOT NULL CHECK(length(idempotency_key) BETWEEN 8 AND 128),
 request_fingerprint text NOT NULL CHECK(length(request_fingerprint)=64), currency char(3) NOT NULL DEFAULT 'BRL' CHECK(currency='BRL'),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','confirmed','cancelled','completed')),
 payment_status text NOT NULL DEFAULT 'not_started' CHECK(payment_status IN ('not_started','pending','paid','failed','refunded')),
 grand_total_minor bigint NOT NULL CHECK(grand_total_minor>=0),
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(buyer_org_id,idempotency_key), UNIQUE(id,buyer_org_id)
);
CREATE INDEX IF NOT EXISTS marketplace_orders_buyer_created_idx ON public.marketplace_orders(buyer_org_id,created_at DESC);
CREATE TABLE IF NOT EXISTS public.marketplace_supplier_orders (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL REFERENCES public.marketplace_orders(id) ON DELETE RESTRICT,
 supplier_org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','rejected','picking','shipped','partially_delivered','delivered','cancelled')),
 subtotal_minor bigint NOT NULL CHECK(subtotal_minor>=0), shipping_minor bigint NOT NULL DEFAULT 0 CHECK(shipping_minor>=0),
 tax_minor bigint NOT NULL DEFAULT 0 CHECK(tax_minor>=0),
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(order_id,supplier_org_id),UNIQUE(id,supplier_org_id)
);
CREATE INDEX IF NOT EXISTS marketplace_supplier_orders_supplier_created_idx ON public.marketplace_supplier_orders(supplier_org_id,created_at DESC);
CREATE TABLE IF NOT EXISTS public.marketplace_order_items (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), supplier_order_id uuid NOT NULL REFERENCES public.marketplace_supplier_orders(id) ON DELETE RESTRICT,
 offer_id uuid NOT NULL REFERENCES public.offers(id) ON DELETE RESTRICT,
 product_snapshot jsonb NOT NULL CHECK(jsonb_typeof(product_snapshot)='object'),
 quantity numeric(14,3) NOT NULL CHECK(quantity>0), unit_price_minor bigint NOT NULL CHECK(unit_price_minor>=0),
 total_minor bigint NOT NULL CHECK(total_minor>=0), UNIQUE(supplier_order_id,offer_id)
);
CREATE TABLE IF NOT EXISTS public.marketplace_order_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL REFERENCES public.marketplace_orders(id) ON DELETE RESTRICT,
 supplier_order_id uuid REFERENCES public.marketplace_supplier_orders(id) ON DELETE RESTRICT,
 actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 event_type text NOT NULL CHECK(length(event_type) BETWEEN 2 AND 80),
 payload jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(payload)='object'),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS marketplace_order_events_order_created_idx ON public.marketplace_order_events(order_id,created_at);
-- Fail closed until independently audited policies and atomic checkout RPC exist.
DO $$ DECLARE tab text; BEGIN
 FOREACH tab IN ARRAY ARRAY['buyer_carts','buyer_cart_items','quote_requests','quote_request_items','quote_responses','marketplace_orders','marketplace_supplier_orders','marketplace_order_items','marketplace_order_events'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',tab);
  EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY',tab);
  EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon,authenticated',tab);
 END LOOP;
END $$;
COMMIT;
