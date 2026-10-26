import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { BASE_URL, LOCAL_PASSWORD, ORGS, resetAndSeed, rows, sql } from './local-env.mjs';

// This test deliberately authenticates through the browser and operates ONLY on a disposable local Supabase.
// The dedicated runner sets the QA flag ON and the global transactions flag OFF.
test.describe.serial('Homologação: transações habilitadas exclusivamente para as três empresas QA', () => {
  const pages = {}, contexts = {};
  let fixture, cfg;

  const post = (name, payload) => pages[name].evaluate(async body => {
    const r = await fetch('/api/marketplace/transactions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin', body: JSON.stringify(body),
    });
    return { status: r.status, ...(await r.json()) };
  }, payload);
  const get = (name, mode) => pages[name].evaluate(async m => {
    const r = await fetch('/api/marketplace/transactions?mode=' + m, {
      credentials: 'same-origin', cache: 'no-store',
    });
    return { status: r.status, ...(await r.json()) };
  }, mode);

  async function login(page, email) {
    await page.goto('/entrar', { waitUntil: 'domcontentloaded' });
    // Wait for React hydration before editing controlled fields on a cold Next.js build.
    // The default browser suite uses the same interactive tab verification.
    await expect(async () => {
      await page.getByRole('button', { name: 'Link por e-mail', exact: true }).click();
      await expect(page.getByLabel('Senha', { exact: true })).toHaveCount(0, { timeout: 1000 });
    }).toPass({ timeout: 20000 });
    await page.getByRole('button', { name: 'E-mail e senha', exact: true }).click();
    await expect(page.getByLabel('Senha', { exact: true })).toBeVisible();
    await page.getByLabel('E-mail empresarial').fill(email);
    const password = page.getByLabel('Senha', { exact: true });
    await password.fill(LOCAL_PASSWORD);
    await expect(password).toHaveValue(LOCAL_PASSWORD);
    await page.getByRole('button', { name: 'Entrar com segurança', exact: true }).click();
    await page.waitForURL(u => !['/entrar', '/app'].includes(u.pathname),
      { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.goto('/robots.txt');
  }

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(220_000);
    cfg = await resetAndSeed();
    for (const name of ['admin', 'supplierA', 'supplierB', 'buyerA', 'buyerB', 'dual']) {
      contexts[name] = await browser.newContext({
        baseURL: BASE_URL, viewport: { width: 1170, height: 820 }, locale: 'pt-BR',
      });
      await contexts[name].route('**/*', route => {
        const u = new URL(route.request().url());
        return u.hostname === '127.0.0.1' || u.protocol === 'data:'
          ? route.continue() : route.abort();
      });
      pages[name] = await contexts[name].newPage();
      await login(pages[name], cfg.users[name].email);
    }

    fixture = {
      product: randomUUID(), sku: randomUUID(), offer: randomUUID(),
      realOrg: randomUUID(), realProduct: randomUUID(),
      realSku: randomUUID(), realOffer: randomUUID(),
    };
    const f = fixture;
    sql(`begin;
      update public.organizations set qa_only=true
        where id in ('${ORGS.supplierA}','${ORGS.supplierB}','${ORGS.buyerA}');
      insert into public.buyer_delivery_regions(buyer_org_id,region_code)
        values ('${ORGS.buyerB}','BR-SP') on conflict do nothing;
      insert into public.products(id,slug,name,base_unit,status) values
        ('${f.product}','qa-isolated-offer','QA local commodity','un','active'),
        ('${f.realProduct}','non-qa-commercial-offer','Non QA test offer','un','active');
      insert into public.organizations(id,legal_name,trade_name,kind,is_platform_owned,status)
        values ('${f.realOrg}','TEST ONLY DIFFERENT SUPPLIER','TEST ONLY NON QA','SUPPLIER',false,'approved');
      insert into public.organization_capabilities(organization_id,capability,status)
        values ('${f.realOrg}','SUPPLIER','approved');
      insert into public.supplier_products(id,supplier_org_id,product_id,supplier_sku,pack_quantity,pack_unit,status)
        values
        ('${f.sku}','${ORGS.supplierA}','${f.product}','QA-ISOLATED-1',1,'un','approved'),
        ('${f.realSku}','${f.realOrg}','${f.realProduct}','NON-QA-1',1,'un','approved');
      insert into public.inventory_positions(supplier_product_id,supplier_org_id,available_quantity,reserved_quantity)
        values ('${f.sku}','${ORGS.supplierA}',50,0),('${f.realSku}','${f.realOrg}',50,0);
      insert into public.offers(id,supplier_product_id,supplier_org_id,source_type,base_price_minor,min_quantity,status,valid_from)
        values
        ('${f.offer}','${f.sku}','${ORGS.supplierA}','MANUAL_AUTHORIZED',1250,1,'approved',now()-interval '1 day'),
        ('${f.realOffer}','${f.realSku}','${f.realOrg}','MANUAL_AUTHORIZED',1250,1,'approved',now()-interval '1 day');
      insert into public.offer_regions(offer_id,region_code)
        values ('${f.offer}','BR-SP'),('${f.realOffer}','BR-SP');
      commit;`);
  });

  test.afterAll(async () => {
    await Promise.allSettled(Object.values(contexts).map(c => c.close()));
  });

  test('01 — modo QA libera comprador e dois fornecedores, mas bloqueia ADM, perfil misto e outra empresa', async () => {
    await pages.buyerA.goto('/app/comprador');
    await expect(pages.buyerA.getByText('Homologação QA habilitada', { exact: false })).toHaveCount(0);
    await expect(pages.buyerA.getByRole('link', { name: /Minha cesta/ })).toBeVisible();
    await expect(pages.buyerA.getByRole('link', { name: /Minhas solicitações/ })).toBeVisible();
    await pages.supplierA.goto('/app/fornecedor');
    await expect(pages.supplierA.getByText('Homologação QA habilitada', { exact: false })).toHaveCount(0);
    await pages.supplierB.goto('/app/fornecedor');
    await expect(pages.supplierB.getByText('Homologação QA habilitada', { exact: false })).toHaveCount(0);
    await pages.buyerB.goto('/app/comprador');
    await expect(pages.buyerB.getByText('Homologação QA habilitada', { exact: false })).toHaveCount(0);

    await pages.buyerA.goto('/app/comprador/cotacoes');
    await expect(pages.buyerA.getByRole('heading', { name: 'Solicitações de cotação' })).toBeVisible();
    await expect(pages.buyerA.getByRole('button', { name: 'Solicitar cotação' })).toBeVisible();

    await pages.buyerB.goto('/app/comprador/cotacoes');
    await expect(pages.buyerB.getByText('Operação transacional ainda desativada neste ambiente.')).toBeVisible();

    await pages.supplierA.goto('/app/fornecedor/cotacoes');
    await expect(pages.supplierA.getByRole('heading', { name: 'Cotações para seu fornecimento' })).toBeVisible();
    await pages.supplierB.goto('/app/fornecedor/cotacoes');
    await expect(pages.supplierB.getByRole('heading', { name: 'Cotações para seu fornecimento' })).toBeVisible();
    await pages.buyerA.goto('/robots.txt');
    await pages.buyerB.goto('/robots.txt');
    await pages.supplierA.goto('/robots.txt');
    await pages.supplierB.goto('/robots.txt');

    expect((await get('buyerA', 'quotes')).status).toBe(200);
    expect((await get('supplierA', 'supplier_quotes')).status).toBe(200);
    expect((await get('supplierB', 'supplier_quotes')).status).toBe(200);
    expect((await get('buyerB', 'quotes')).status).toBe(503);
    expect((await get('dual', 'quotes')).status).toBe(503);
    expect((await get('admin', 'quotes')).status).toBe(503);

    const anonymous = await fetch(BASE_URL + '/api/marketplace/transactions?mode=quotes');
    expect(anonymous.status).toBe(503);
  });

  test('02 — oferta real externa não pode ser cotada, Fornecedor B não pode responder ao A', async () => {
    // Direct Supabase HTTP requests prove the QA realm cannot be bypassed by
    // skipping the Next.js transaction API (RLS and private RPCs enforce it).
    const buyerAClient=createClient(cfg.url,cfg.key,{auth:{persistSession:false,autoRefreshToken:false}});
    const buyerBClient=createClient(cfg.url,cfg.key,{auth:{persistSession:false,autoRefreshToken:false}});
    const aAuth=await buyerAClient.auth.signInWithPassword({email:cfg.users.buyerA.email,password:LOCAL_PASSWORD});
    const bAuth=await buyerBClient.auth.signInWithPassword({email:cfg.users.buyerB.email,password:LOCAL_PASSWORD});
    expect(aAuth.error).toBeNull();
    expect(bAuth.error).toBeNull();
    const aOffers=await buyerAClient.from('offers').select('id').in('id',[fixture.offer,fixture.realOffer]);
    const bOffers=await buyerBClient.from('offers').select('id').in('id',[fixture.offer,fixture.realOffer]);
    expect(aOffers.error).toBeNull();
    expect(bOffers.error).toBeNull();
    expect(aOffers.data.map(o=>o.id)).toEqual([fixture.offer]);
    expect(bOffers.data.map(o=>o.id)).toEqual([fixture.realOffer]);
    const bypassA=await buyerAClient.rpc('marketplace_create_quote',{
      buyer_org_id:ORGS.buyerA,offer_id:fixture.realOffer,quantity:2,
      region_code:'BR-SP',notes:'QA must not trade with real supplier',request_key:randomUUID(),
    });
    const bypassB=await buyerBClient.rpc('marketplace_create_quote',{
      buyer_org_id:ORGS.buyerB,offer_id:fixture.offer,quantity:2,
      region_code:'BR-SP',notes:'Real buyer must not trade with QA supplier',request_key:randomUUID(),
    });
    expect(bypassA.error?.code).toBe('22023');
    expect(bypassB.error?.code).toBe('22023');

    // Regression: a real signed buyer JWT linked to QA and commercial BUYER
    // organizations must not quote a QA offer for the commercial company.
    // The trigger in 0027 closes the multi-membership cross-realm bypass.
    sql(`insert into public.organization_members(organization_id,user_id,role,status)
      values ('${ORGS.buyerB}','${cfg.users.buyerA.id}','BUYER','active')`);
    const crossOrg = await buyerAClient.rpc('marketplace_create_quote',{
      buyer_org_id:ORGS.buyerB,offer_id:fixture.offer,quantity:2,
      region_code:'BR-SP',notes:'QA cross buyer realm must be blocked',
      request_key:randomUUID(),
    });
    expect(crossOrg.error?.code).toBe('22023');
    sql(`delete from public.organization_members
      where organization_id='${ORGS.buyerB}' and user_id='${cfg.users.buyerA.id}'`);
    // Global sign-out would revoke the separate Playwright browser sessions.
    await Promise.all([buyerAClient.auth.signOut({scope:'local'}),buyerBClient.auth.signOut({scope:'local'})]);

    const other = await post('buyerA', {
      action: 'quote', buyerOrgId: ORGS.buyerA, offerId: fixture.realOffer,
      quantity: 2, region: 'BR-SP', notes: 'should be denied', idempotencyKey: randomUUID(),
    });
    expect(other.status).toBe(403);
    const unapprovedBuyer = await post('buyerB', {
      action: 'quote', buyerOrgId: ORGS.buyerB, offerId: fixture.offer,
      quantity: 2, region: 'BR-RJ', idempotencyKey: randomUUID(),
    });
    expect(unapprovedBuyer.status).toBe(503);
    const admin = await post('admin', {
      action: 'quote', buyerOrgId: ORGS.buyerA, offerId: fixture.offer,
      quantity: 2, region: 'BR-SP', idempotencyKey: randomUUID(),
    });
    expect(admin.status).toBe(503);
    expect(rows('select count(*) as n from public.quote_requests')[0].n).toBe(0);
  });

  test('03 — cotação, proposta, pedido, reserva, expedição e entrega por sessões independentes', async () => {
    const key = randomUUID();
    const body = { action: 'quote', buyerOrgId: ORGS.buyerA,
      offerId: fixture.offer, quantity: 3, region: 'BR-SP', notes: 'LOCAL QA ONLY',
      idempotencyKey: key };
    const q = await post('buyerA', body);
    expect(q.status).toBe(201);
    const duplicateQuote = await post('buyerA', body);
    expect(duplicateQuote.status).toBe(201);
    expect(duplicateQuote.id).toBe(q.id);

    const cross = await post('supplierB', {
      action: 'proposal', quoteRequestId: q.id, priceMinor: 1250,
      expiresAt: new Date(Date.now() + 3 * 86400000).toISOString(),
    });
    expect(cross.status).toBe(403);
    const proposal = await post('supplierA', {
      action: 'proposal', quoteRequestId: q.id, priceMinor: 1250,
      expiresAt: new Date(Date.now() + 3 * 86400000).toISOString(),
    });
    expect(proposal.status).toBe(201);

    const o = await post('buyerA', { action: 'checkout',
      buyerOrgId: ORGS.buyerA, quoteRequestId: q.id, proposalId: proposal.id,
      idempotencyKey: q.id });
    expect(o.status).toBe(201);
    const before = rows(`select available_quantity,reserved_quantity from public.inventory_positions where supplier_product_id='${fixture.sku}'`)[0];
    expect(before).toEqual({ available_quantity: 50, reserved_quantity: 0 });

    expect((await post('supplierB', {
      action: 'order_transition', orderId: o.id, transition: 'supplier_confirm',
    })).status).toBe(403);
    expect((await post('supplierA', {
      action: 'order_transition', orderId: o.id, transition: 'supplier_confirm',
    })).status).toBe(201);
    const reserved = rows(`select available_quantity,reserved_quantity from public.inventory_positions where supplier_product_id='${fixture.sku}'`)[0];
    expect(reserved).toEqual({ available_quantity: 50, reserved_quantity: 3 });
    expect((await post('supplierA', {
      action: 'order_transition', orderId: o.id, transition: 'supplier_confirm',
    })).status).toBe(201);
    const afterDuplicate = rows(`select available_quantity,reserved_quantity from public.inventory_positions where supplier_product_id='${fixture.sku}'`)[0];
    expect(afterDuplicate).toEqual({ available_quantity: 50, reserved_quantity: 3 });

    for (const transition of ['start_separation', 'mark_ready', 'dispatch', 'deliver']) {
      const response = await post('supplierA', {
        action: 'fulfillment', orderId: o.id, transition,
        ...(transition === 'start_separation' ? { freightMinor: 500 } : {}),
        ...(transition === 'dispatch' ? { trackingReference: 'QA-LOCAL-ONLY' } : {}),
      });
      expect(response.status, transition + ': ' + response.reason).toBe(201);
    }
    const after = rows(`select available_quantity,reserved_quantity from public.inventory_positions where supplier_product_id='${fixture.sku}'`)[0];
    expect(after).toEqual({ available_quantity: 47, reserved_quantity: 0 });
    expect(rows(`select status from public.order_fulfillments where order_id='${o.id}'`)[0].status).toBe('delivered');
    expect(rows(`select count(*) as n from marketplace_private.fulfillment_audit where order_id='${o.id}'`)[0].n).toBe(4);
    expect((await get('buyerA', 'orders')).items.some(item => item.id === o.id)).toBe(true);
    expect((await get('supplierA', 'supplier_orders')).items.some(item => item.id === o.id)).toBe(true);
    expect((await get('supplierB', 'supplier_orders')).items).toEqual([]);
    expect((await get('buyerB', 'orders')).status).toBe(503);
  });
  test('04 — cesta multi-fornecedor registra uma cotação agrupada e impede confirmação sem pagamento', async () => {
    const id={product:randomUUID(),sku:randomUUID(),offer:randomUUID()};
    sql(`begin;
      insert into public.products(id,slug,name,base_unit,status)
      values ('${id.product}','qa-segundo-item','QA segundo produto','un','active');
      insert into public.supplier_products(id,supplier_org_id,product_id,supplier_sku,pack_quantity,pack_unit,status)
      values ('${id.sku}','${ORGS.supplierB}','${id.product}','QA-B-2',1,'un','approved');
      insert into public.inventory_positions(supplier_product_id,supplier_org_id,available_quantity,reserved_quantity)
      values ('${id.sku}','${ORGS.supplierB}',40,0);
      insert into public.offers(id,supplier_product_id,supplier_org_id,source_type,base_price_minor,min_quantity,status,valid_from)
      values ('${id.offer}','${id.sku}','${ORGS.supplierB}','MANUAL_AUTHORIZED',2300,1,'approved',now()-interval '1 day');
      insert into public.offer_regions(offer_id,region_code) values ('${id.offer}','BR-SP');
      commit;`);
    await pages.buyerA.goto('/app/comprador/catalogo?regiao=SP');
    await expect(pages.buyerA.getByRole('button',{name:'Adicionar QA local commodity à cesta'})).toBeVisible();
    await expect(pages.buyerA.getByRole('button',{name:'Adicionar QA segundo produto à cesta'})).toBeVisible();
    await pages.buyerA.getByRole('button',{name:'Adicionar QA local commodity à cesta'}).click();
    await pages.buyerA.getByRole('button',{name:'Adicionar QA segundo produto à cesta'}).click();
    await pages.buyerA.getByRole('link',{name:/Minha cesta/}).first().click();
    await expect(pages.buyerA.getByRole('heading',{name:'Minha cesta'}).last()).toBeVisible();
    await expect(pages.buyerA.getByText('QA segundo produto')).toBeVisible();
    await pages.buyerA.getByRole('link',{name:/Revisar solicitação/}).click();
    await expect(pages.buyerA.getByRole('button',{name:/Solicitar cotação/})).toBeEnabled();
    await pages.buyerA.getByLabel('Retirada na Provisio').check();
    await pages.buyerA.getByRole('button',{name:/Solicitar cotação/}).click();
    await pages.buyerA.waitForURL(/\/app\/comprador\/solicitacoes\?enviada=/);
    await expect(pages.buyerA.getByText('Solicitação registrada.',{exact:false})).toBeVisible();
    const baskets=rows(`select b.id,b.payment_status,b.fulfillment_method,
      (select count(*) from public.quote_requests q where q.basket_id=b.id) as lines
      from public.quote_baskets b where b.buyer_org_id='${ORGS.buyerA}'`);
    expect(baskets).toHaveLength(1);
    expect(baskets[0].lines).toBe(2);
    expect(baskets[0].payment_status).toBe('unpaid');
    expect(baskets[0].fulfillment_method).toBe('pickup');
    const lines=rows(`select id,supplier_org_id from public.quote_requests
      where basket_id='${baskets[0].id}'`);
    const a=lines.find(l=>l.supplier_org_id===ORGS.supplierA);
    const b=lines.find(l=>l.supplier_org_id===ORGS.supplierB);
    expect(a).toBeTruthy();expect(b).toBeTruthy();
    const proposed=await post('supplierA',{action:'proposal',quoteRequestId:a.id,priceMinor:1250,
      expiresAt:new Date(Date.now()+3*86400000).toISOString()});
    expect(proposed.status).toBe(201);
    const checkout=await post('buyerA',{action:'checkout',buyerOrgId:ORGS.buyerA,
      quoteRequestId:a.id,proposalId:proposed.id,idempotencyKey:randomUUID()});
    expect(checkout.status).toBe(201);
    const unpaid=await post('supplierA',{action:'order_transition',
      orderId:checkout.id,transition:'supplier_confirm'});
    expect(unpaid.status).toBe(422);
    expect(rows(`select count(*) as n from public.order_fulfillments
      where order_id='${checkout.id}'`)[0].n).toBe(0);
    expect(rows(`select status from public.purchase_orders where id='${checkout.id}'`)[0].status)
      .toBe('awaiting_supplier_confirmation');
    const buyerB=await pages.buyerB.evaluate(async ()=>{
      const r=await fetch('/api/marketplace/baskets');
      return r.status;
    });
    expect(buyerB).toBe(503);
  });

});
