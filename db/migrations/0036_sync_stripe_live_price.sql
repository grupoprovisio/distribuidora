-- Keep the single production offer aligned with the Live Stripe Price.
update public.offers
set base_price_minor=100,
    min_quantity=1
where id='9c09731e-23d3-4fa2-b976-39bdaf76a8ce';
