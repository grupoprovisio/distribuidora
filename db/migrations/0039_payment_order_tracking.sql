alter table public.marketplace_payment_orders
  add column if not exists fulfillment_status text not null default 'paid'
  check (fulfillment_status in (
    'paid','processing','ready_for_delivery','out_for_delivery','delivered',
    'ready_for_pickup','picked_up','cancelled'
  ));

comment on column public.marketplace_payment_orders.fulfillment_status is
  'Status operacional visível ao comprador; começa em paid após confirmação do webhook Stripe.';
