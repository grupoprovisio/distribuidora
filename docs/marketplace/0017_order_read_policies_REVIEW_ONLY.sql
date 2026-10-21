-- Phase 4: scoped read-only access for orders. Not applied automatically.
-- All mutation remains denied pending audited atomic checkout / payment contracts.
BEGIN;
CREATE INDEX IF NOT EXISTS quote_requests_buyer_created_idx ON public.quote_requests(buyer_org_id,created_at DESC);
CREATE INDEX IF NOT EXISTS quote_responses_supplier_created_idx ON public.quote_responses(supplier_org_id,created_at DESC);
CREATE INDEX IF NOT EXISTS quote_request_items_quote_idx ON public.quote_request_items(quote_id);
CREATE INDEX IF NOT EXISTS buyer_cart_items_cart_idx ON public.buyer_cart_items(cart_id);
CREATE OR REPLACE FUNCTION marketplace_private.is_buyer_org_member(target_org uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
 SELECT EXISTS (
  SELECT 1 FROM public.organization_members m JOIN public.organizations o ON o.id=m.organization_id
  JOIN public.organization_capabilities c ON c.organization_id=o.id
  WHERE m.user_id=(select auth.uid()) AND m.organization_id=target_org
    AND m.status='active' AND m.role IN ('ORG_ADMIN','BUYER','REQUESTER','APPROVER','FINANCE','READER')
    AND o.status='approved' AND c.capability='BUYER' AND c.status='approved'
 );
$$;
CREATE OR REPLACE FUNCTION marketplace_private.is_supplier_org_member(target_org uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
 SELECT EXISTS (
  SELECT 1 FROM public.organization_members m JOIN public.organizations o ON o.id=m.organization_id
  JOIN public.organization_capabilities c ON c.organization_id=o.id
  WHERE m.user_id=(select auth.uid()) AND m.organization_id=target_org
    AND m.status='active' AND m.role IN ('ORG_ADMIN','SUPPLIER_ADMIN')
    AND o.status='approved' AND c.capability='SUPPLIER' AND c.status='approved'
 );
$$;
-- Reads use org-scoped policies; do not grant SELECT for items without parent scoping.
CREATE POLICY buyer_read_orders ON public.marketplace_orders FOR SELECT TO authenticated USING (marketplace_private.is_buyer_org_member(buyer_org_id));
CREATE POLICY supplier_read_suborders ON public.marketplace_supplier_orders FOR SELECT TO authenticated USING (marketplace_private.is_supplier_org_member(supplier_org_id));
CREATE POLICY buyer_read_suborders ON public.marketplace_supplier_orders FOR SELECT TO authenticated USING (
 EXISTS(SELECT 1 FROM public.marketplace_orders o WHERE o.id=order_id AND marketplace_private.is_buyer_org_member(o.buyer_org_id))
);
CREATE POLICY buyer_read_carts ON public.buyer_carts FOR SELECT TO authenticated USING (marketplace_private.is_buyer_org_member(buyer_org_id));
CREATE POLICY buyer_read_cart_items ON public.buyer_cart_items FOR SELECT TO authenticated USING (
 EXISTS(SELECT 1 FROM public.buyer_carts c WHERE c.id=cart_id AND marketplace_private.is_buyer_org_member(c.buyer_org_id))
);
CREATE POLICY buyer_read_quotes ON public.quote_requests FOR SELECT TO authenticated USING (marketplace_private.is_buyer_org_member(buyer_org_id));
CREATE POLICY buyer_read_quote_items ON public.quote_request_items FOR SELECT TO authenticated USING (
 EXISTS(SELECT 1 FROM public.quote_requests q WHERE q.id=quote_id AND marketplace_private.is_buyer_org_member(q.buyer_org_id))
);
CREATE POLICY buyer_read_quote_responses ON public.quote_responses FOR SELECT TO authenticated USING (
 EXISTS(SELECT 1 FROM public.quote_requests q WHERE q.id=quote_id AND marketplace_private.is_buyer_org_member(q.buyer_org_id))
);
CREATE POLICY supplier_read_quote_responses ON public.quote_responses FOR SELECT TO authenticated USING (marketplace_private.is_supplier_org_member(supplier_org_id));
CREATE POLICY scoped_read_order_items ON public.marketplace_order_items FOR SELECT TO authenticated USING (
 EXISTS(SELECT 1 FROM public.marketplace_supplier_orders so WHERE so.id=supplier_order_id)
);
CREATE POLICY scoped_read_order_events ON public.marketplace_order_events FOR SELECT TO authenticated USING (
 EXISTS(SELECT 1 FROM public.marketplace_orders o WHERE o.id=order_id AND marketplace_private.is_buyer_org_member(o.buyer_org_id))
 OR EXISTS(SELECT 1 FROM public.marketplace_supplier_orders so WHERE so.id=supplier_order_id AND marketplace_private.is_supplier_org_member(so.supplier_org_id))
);
GRANT SELECT ON public.marketplace_orders,public.marketplace_supplier_orders,public.marketplace_order_items,
 public.marketplace_order_events,public.buyer_carts,public.buyer_cart_items,public.quote_requests,
 public.quote_request_items,public.quote_responses TO authenticated;
COMMIT;
