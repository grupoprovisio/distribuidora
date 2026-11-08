alter table public.marketplace_payment_orders drop constraint if exists marketplace_payment_orders_fulfillment_status_check;
alter table public.marketplace_payment_orders add constraint marketplace_payment_orders_fulfillment_status_check check (fulfillment_status in ('paid','processing','invoice_issued','ready_for_delivery','out_for_delivery','delivered','ready_for_pickup','picked_up','cancelled'));
comment on column public.marketplace_payment_orders.fulfillment_status is 'Status operacional do pedido: pagamento confirmado, preparação, nota fiscal emitida e logística.';
