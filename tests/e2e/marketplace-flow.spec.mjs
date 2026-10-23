import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { BASE_URL, LOCAL_PASSWORD, ORGS, CATEGORY, resetAndSeed, rows, sql } from './local-env.mjs';
import { totp } from './totp.mjs';

let cfg;
const pages = {}, contexts = {}, clients = {};
const A = { name: 'TESTE E2E Arroz A', sku: 'E2E-ARROZ-A', slug: 'e2e-arroz-a', actor: 'supplierA', region: 'SP', stock: 100 };
const B = { name: 'TESTE E2E Feijao B', sku: 'E2E-FEIJAO-B', slug: 'e2e-feijao-b', actor: 'supplierB', region: 'RJ', stock: 50 };
let mainQuote, mainProposal, mainOrder;
const day = n => new Date(Date.now() + n * 86400000).toISOString().slice(0,10);
const section = (page, title) => page.locator('section').filter({ has: page.getByRole('heading', { name: title, exact: true }) });
const stock = () => rows(`select available_quantity,reserved_quantity from public.inventory_positions where supplier_product_id='${A.skuId}'`)[0];
const order = id => rows(`select * from public.purchase_orders where id='${id}'`)[0];
async function passwordFormReady(page) {
  // Exercise an actual UI state change before typing into controlled inputs.
  // This avoids filling SSR markup before React hydrates on a cold build.
  await expect(async()=>{
    await page.getByRole('button',{name:'Link por e-mail',exact:true}).click();
    await expect(page.getByLabel('Senha',{exact:true})).toHaveCount(0,{timeout:1000});
  }).toPass({timeout:15000});
  await page.getByRole('button',{name:'E-mail e senha',exact:true}).click();
  await expect(page.getByLabel('Senha',{exact:true})).toBeVisible();
}
async function login(name) {
  const page=pages[name];await page.goto('/entrar');
  await passwordFormReady(page);
  await page.getByLabel('E-mail empresarial').fill(cfg.users[name].email);
  await page.getByLabel('Senha',{exact:true}).fill(LOCAL_PASSWORD);
  await page.getByRole('button',{name:'Entrar com segurança',exact:true}).click();
  await page.waitForURL(url=>!['/entrar','/app'].includes(url.pathname),{timeout:30000});
  console.log('Authenticated local fixture:',name);
  await page.goto('/robots.txt');
}
async function api(name, body) {
  return pages[name].evaluate(async payload=>{
    const r=await fetch('/api/marketplace/transactions',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
    return {status:r.status,...await r.json()};
  },body);
}
async function apiGet(name, mode) {
  return pages[name].evaluate(async m=>{
    const r=await fetch('/api/marketplace/transactions?mode='+m,{cache:'no-store'});
    return {status:r.status,...await r.json()};
  },mode);
}
async function confirmUI(page, button) {
  await button.click();
  const group=page.getByRole('group',{name:'Confirmar operação comercial'});
  await expect(group).toBeVisible();
  const confirm=group.getByRole('button').first();
  await expect(confirm).toHaveText(/Confirmar/);
  await confirm.click();
}
async function submitProduct(item) {
  const page=pages[item.actor];await page.goto('/app/fornecedor/catalogo');
  const form=page.locator('form').filter({has:page.getByRole('button',{name:'Enviar para homologacao',exact:true})});
  await form.locator('[name="supplier_org_id"]').selectOption(ORGS[item.actor]);
  await form.locator('[name="supplier_sku"]').fill(item.sku);
  await form.locator('[name="product_name"]').fill(item.name);
  await form.locator('[name="category_id"]').selectOption(CATEGORY);
  await form.locator('[name="region"]').selectOption(item.region);
  await form.locator('[name="base_price_minor"]').fill('1250');
  await form.locator('[name="available_quantity"]').fill(String(item.stock));
  await form.locator('[name="base_unit"]').selectOption('un');
  await form.locator('[name="pack_unit"]').selectOption('un');
  await form.locator('[name="pack_quantity"]').fill('1');
  const entered=await form.evaluate(el=>Object.fromEntries(new FormData(el)));
  expect(entered).toMatchObject({supplier_org_id:ORGS[item.actor],supplier_sku:item.sku,product_name:item.name,category_id:CATEGORY,region:item.region,base_unit:'un',pack_unit:'un',pack_quantity:'1',base_price_minor:'1250',available_quantity:String(item.stock)});
  await form.getByRole('button',{name:'Enviar para homologacao',exact:true}).click();
  await expect.poll(()=>rows(`select id from public.supplier_product_submissions where supplier_sku='${item.sku}'`).length).toBe(1);
  item.submissionId=rows(`select id from public.supplier_product_submissions where supplier_sku='${item.sku}'`)[0].id;
}
async function prepareProduct(item) {
  const page=pages.admin;await page.goto('/admin/marketplace/solicitacoes');
  const card=page.locator('article').filter({has:page.getByRole('heading',{name:item.name,exact:true})});
  await card.locator('[name="slug"]').fill(item.slug);
  await card.getByRole('button',{name:'Aceitar solicitação e preparar cadastro',exact:true}).click();
  await expect.poll(()=>rows(`select id from public.products where slug='${item.slug}'`).length).toBe(1);
  item.productId=rows(`select id from public.products where slug='${item.slug}'`)[0].id;
  item.skuId=rows(`select id from public.supplier_products where product_id='${item.productId}'`)[0].id;
  item.offerId=rows(`select id from public.offers where supplier_product_id='${item.skuId}'`)[0].id;
  await page.goto('/admin/marketplace/cadastro');
  const active=section(page,'2. Ativar produto mestre');
  await active.locator('[name="product_id"]').selectOption(item.productId);
  await active.getByRole('button',{name:'Ativar produto',exact:true}).click();
  await expect.poll(()=>rows(`select status from public.products where id='${item.productId}'`)[0].status).toBe('active');
  await page.reload();
  const sku=section(page,'4. Homologar SKU');
  await sku.locator('[name="sku_id"]').selectOption(item.skuId);
  await sku.getByRole('button',{name:'Homologar SKU',exact:true}).click();
  await expect.poll(()=>rows(`select status from public.supplier_products where id='${item.skuId}'`)[0].status).toBe('approved');
}
async function saveStock(item, amount) {
  const page=pages[item.actor];await page.goto('/app/fornecedor/catalogo');
  const form=page.locator('form').filter({has:page.getByRole('heading',{name:'Atualizar disponibilidade',exact:true})});
  await form.locator('[name="sku_id"]').selectOption(item.skuId);
  await form.locator('[name="available"]').fill(String(amount));
  await form.getByRole('button',{name:'Salvar estoque',exact:true}).click();
  await expect.poll(()=>rows(`select available_quantity from public.inventory_positions where supplier_product_id='${item.skuId}'`)[0]?.available_quantity).toBe(amount);
}
async function approveOffer(id) {
  const page=pages.admin;await page.goto('/admin/marketplace/cadastro');
  const s=section(page,'7. Aprovar oferta para catálogo');
  await s.locator('[name="offer_id"]').selectOption(id);
  await s.getByRole('button',{name:'Aprovar oferta',exact:true}).click();
  await expect.poll(()=>rows(`select status from public.offers where id='${id}'`)[0].status).toBe('approved');
}
async function newOrder(quantity=2) {
  const key=randomUUID();
  const q=await api('buyerA',{action:'quote',buyerOrgId:ORGS.buyerA,offerId:A.offerId,quantity,region:'BR-SP',notes:'TESTE E2E '+key,idempotencyKey:key});
  expect(q.status).toBe(201);
  const p=await api('supplierA',{action:'proposal',quoteRequestId:q.id,priceMinor:1250,expiresAt:new Date(Date.now()+3*86400000).toISOString()});
  expect(p.status).toBe(201);
  const payload={action:'checkout',buyerOrgId:ORGS.buyerA,quoteRequestId:q.id,proposalId:p.id,idempotencyKey:q.id};
  const o=await api('buyerA',payload);
  return {q,p,o,payload};
}

test.describe.serial('Provisio: navegador + Auth + PostgreSQL + Storage reais, exclusivamente locais',()=>{
  test.beforeAll(async({browser})=>{
    test.setTimeout(240_000);
    cfg=await resetAndSeed();
    for(const name of Object.keys(cfg.users)) {
      contexts[name]=await browser.newContext({baseURL:BASE_URL,viewport:{width:1280,height:900},locale:'pt-BR',reducedMotion:'reduce'});
      await contexts[name].route('**/*',route=>{
        const url=new URL(route.request().url());
        return url.hostname==='127.0.0.1'||url.protocol==='data:' ? route.continue() : route.abort();
      });
      pages[name]=await contexts[name].newPage();
      clients[name]=createClient(cfg.url,cfg.key,{auth:{persistSession:false,autoRefreshToken:false}});
      const signed=await clients[name].auth.signInWithPassword({email:cfg.users[name].email,password:LOCAL_PASSWORD});
      expect(signed.error).toBeNull();
    }
  });
  test.afterEach(async()=>{
    // Keep cookies and independent identities, but release idle animated portal pages.
    await Promise.allSettled(Object.values(pages).map(page=>page.goto('/robots.txt')));
  });
  test.afterAll(async()=>{
    await Promise.allSettled(Object.values(clients).map(c=>c.auth.signOut()));
    await Promise.allSettled(Object.values(contexts).map(c=>c.close()));
  });

  test('01 - oito sessões independentes, senha incorreta e autorização por perfil',async()=>{
    const page=pages.supplierA;await page.goto('/entrar');
    await passwordFormReady(page);
    await page.getByLabel('E-mail empresarial').fill(cfg.users.supplierA.email);
    await page.getByLabel('Senha',{exact:true}).fill('Incorrect-local-test-password!');
    await page.getByRole('button',{name:'Entrar com segurança',exact:true}).click();
    await expect(page.locator('form').getByRole('alert')).toContainText('Não foi possível entrar');
    for(const name of Object.keys(pages)) await login(name);
    await pages.supplierA.goto('/app/comprador');await expect(pages.supplierA).toHaveURL(/acesso-restrito/);
    await pages.buyerA.goto('/app/fornecedor');await expect(pages.buyerA).toHaveURL(/acesso-restrito/);
    await pages.pending.goto('/app/comprador');await expect(pages.pending).toHaveURL(/acesso-pendente/);
    await pages.supplierA.goto('/app/fornecedor');await expect(pages.supplierA).toHaveURL(/app\/fornecedor/);
    await pages.buyerA.goto('/app/comprador');await expect(pages.buyerA).toHaveURL(/app\/comprador/);
  });

  test('02 - administração exige MFA real; autenticação AAL1 não aprova produto',async()=>{
    const denied=await clients.admin.rpc('promote_supplier_submission',{p_submission:randomUUID(),p_slug:'teste-negado'});
    expect(denied.error?.code).toBe('42501');
    const page=pages.admin;await page.goto('/admin/marketplace');
    await expect(page).toHaveURL(/seguranca\/mfa/);
    await page.getByRole('button',{name:'Configurar aplicativo autenticador',exact:true}).click();
    const qr=page.getByRole('img',{name:'QR Code para cadastrar autenticação em duas etapas'});
    await expect(qr).toBeVisible();
    await expect.poll(()=>qr.evaluate(e=>e.complete&&e.naturalWidth>0)).toBe(true);
    const secret=await page.locator('code').textContent();
    expect(secret).toMatch(/^[A-Z2-7]+$/);
    await page.getByLabel('Código do autenticador').fill(totp(secret));
    await page.getByRole('button',{name:'Confirmar verificação',exact:true}).click();
    await expect(page).toHaveURL(/admin\/marketplace/);
  });

  test('03 - fornecedores A e B cadastram produtos; pendências não aparecem ao comprador',async()=>{
    await submitProduct(A);await submitProduct(B);
    const own=await clients.supplierA.from('supplier_product_submissions').select('id');
    expect(own.error).toBeNull();expect(own.data.map(x=>x.id)).toEqual([A.submissionId]);
    const other=await clients.supplierB.from('supplier_product_submissions').select('id').eq('id',A.submissionId);
    expect(other.data).toEqual([]);
    const buyer=await clients.buyerA.from('products').select('id');expect(buyer.data).toEqual([]);
  });

  test('04 - administrador promove e homologa produtos; oferta sem estoque é recusada',async()=>{
    await prepareProduct(A);await prepareProduct(B);
    const page=pages.admin;await page.goto('/admin/marketplace/cadastro');
    const s=section(page,'7. Aprovar oferta para catálogo');
    await s.locator('[name="offer_id"]').selectOption(A.offerId);
    await s.getByRole('button',{name:'Aprovar oferta',exact:true}).click();
    await expect(s.getByRole('alert')).toBeVisible();
    expect(rows(`select status from public.offers where id='${A.offerId}'`)[0].status).toBe('pending');
  });

  test('05 - estoque gravado pelos fornecedores e ofertas aprovadas pelo administrador',async()=>{
    await saveStock(A,100);await saveStock(B,50);
    await approveOffer(A.offerId);await approveOffer(B.offerId);
    expect(stock()).toEqual({available_quantity:100,reserved_quantity:0});
  });

  test('06 - catálogo do comprador respeita região e catálogo do fornecedor respeita empresa',async()=>{
    await pages.buyerA.goto('/app/comprador/catalogo');
    await expect(pages.buyerA.getByText(A.name,{exact:true}).first()).toBeVisible();
    await expect(pages.buyerA.getByText(B.name,{exact:true})).toHaveCount(0);
    await pages.buyerB.goto('/app/comprador/catalogo');
    await expect(pages.buyerB.getByRole('heading',{name:'Região ainda não autorizada para sua empresa'})).toBeVisible();
    await pages.buyerB.getByLabel('Região de atendimento',{exact:true}).fill('RJ');
    await pages.buyerB.getByRole('button',{name:'Consultar região',exact:true}).click();
    await expect(pages.buyerB.getByText(B.name,{exact:true}).first()).toBeVisible();
    await expect(pages.buyerB.getByText(A.name,{exact:true})).toHaveCount(0);
    await pages.supplierB.goto('/app/fornecedor/catalogo');
    expect((await clients.supplierB.from('supplier_products').select('id').eq('id',A.skuId)).data).toEqual([]);
    const otherRegion=await clients.buyerB.from('offers').select('id').eq('id',A.offerId);expect(otherRegion.data).toEqual([]);
  });

  test('07 - upload real no Storage privado, conversão WebP e bloqueio de outra empresa',async()=>{
    const page=pages.admin;await page.goto('/admin/marketplace/cadastro');
    const s=section(page,'Editar produtos e fotos');
    await s.locator('select').first().selectOption(A.productId);
    const data=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=100;c.height=100;const g=c.getContext('2d');g.fillStyle='#d9e9d0';g.fillRect(0,0,100,100);return c.toDataURL('image/png').split(',')[1];});
    await s.locator('input[type=file]').setInputFiles({name:'produto-teste-local.png',mimeType:'image/png',buffer:Buffer.from(data,'base64')});
    await expect(s.getByRole('status').filter({hasText:'convertida e salva em WebP'})).toBeVisible();
    const image=rows(`select storage_path,mime_type,size_bytes from public.product_images where product_id='${A.productId}'`)[0];
    expect(image.mime_type).toBe('image/webp');expect(image.size_bytes).toBeGreaterThan(0);
    A.imagePath=image.storage_path;
    const preview=s.locator('img').first();await expect(preview).toBeVisible();
    await preview.scrollIntoViewIfNeeded();
    await expect.poll(()=>preview.evaluate(e=>e.complete&&e.naturalWidth>0)).toBe(true);
    const anonymous=await fetch(`${cfg.url}/storage/v1/object/public/provisio-produtos/${image.storage_path}`);
    expect(anonymous.ok).toBe(false);
    const foreign=await clients.supplierB.storage.from('provisio-produtos').createSignedUrl(image.storage_path,60);
    expect(foreign.error).toBeTruthy();
    const foreignMeta=await clients.supplierB.from('product_images').select('id').eq('product_id',A.productId);
    expect(foreignMeta.data).toEqual([]);
    await page.screenshot({path:test.info().outputPath('produto-webp-privado.png'),fullPage:true});
  });

  test('08 - alteração de preço fica pendente e só aparece após aprovação',async()=>{
    const page=pages.supplierA;await page.goto('/app/fornecedor/catalogo');
    const form=page.locator('form').filter({has:page.getByRole('heading',{name:'Solicitar alteração de preço',exact:true})});
    await form.locator('[name="sku_id"]').selectOption(A.skuId);
    await form.locator('[name="price_minor"]').fill('1450');
    await form.locator('[name="valid_to"]').fill(day(10));
    await form.getByRole('button',{name:'Enviar preço para aprovação',exact:true}).click();
    await expect.poll(()=>rows(`select id from public.offers where supplier_product_id='${A.skuId}' and base_price_minor=1450`).length).toBe(1);
    const pending=rows(`select id,status from public.offers where supplier_product_id='${A.skuId}' and base_price_minor=1450`)[0];
    expect(pending.status).toBe('pending');
    expect((await clients.buyerA.from('offers').select('id').eq('id',pending.id)).data).toEqual([]);
    await approveOffer(pending.id);A.offerId=pending.id;
    expect((await clients.buyerA.from('offers').select('base_price_minor').eq('id',A.offerId)).data).toEqual([{base_price_minor:1450}]);
  });

  test('09 - comprador envia cotação pela tela e fornecedor correto recebe',async()=>{
    const page=pages.buyerA;await page.goto('/app/comprador/catalogo');
    await page.locator(`a[href*="oferta=${A.offerId}"]`).first().click();
    await expect(page).toHaveURL(new RegExp('oferta='+A.offerId));
    await page.getByLabel('Quantidade',{exact:true}).fill('10');
    await page.getByLabel('Observações (opcional)',{exact:true}).fill('TESTE E2E FLUXO PRINCIPAL');
    const created=page.waitForResponse(r=>r.url().endsWith('/api/marketplace/transactions')&&r.request().method()==='POST');
    await page.getByRole('button',{name:'Solicitar cotação',exact:true}).click();
    const result=await created;const feedback=await result.json();
    expect({status:result.status(),...feedback}).toMatchObject({status:201,ok:true});
    await expect.poll(()=>rows("select id from public.quote_requests where notes='TESTE E2E FLUXO PRINCIPAL'").length).toBe(1);
    mainQuote=rows("select * from public.quote_requests where notes='TESTE E2E FLUXO PRINCIPAL'")[0];
    expect(mainQuote.supplier_org_id).toBe(ORGS.supplierA);expect(mainQuote.quantity).toBe(10);
    await pages.supplierA.goto('/app/fornecedor/cotacoes');
    await expect(pages.supplierA.getByText(`Cotação #${mainQuote.id.slice(0,8)}`,{exact:true})).toBeVisible();
    expect((await apiGet('supplierB','supplier_quotes')).items).toEqual([]);
    expect((await apiGet('buyerB','quotes')).items).toEqual([]);
  });

  test('10 - proposta, confirmação explícita e pedido sem reserva antecipada',async()=>{
    const supplier=pages.supplierA;await supplier.goto('/app/fornecedor/cotacoes');
    const card=supplier.locator('li').filter({hasText:`Cotação #${mainQuote.id.slice(0,8)}`});
    await card.getByLabel('Preço unitário (R$)',{exact:true}).fill('12,50');
    await card.getByLabel('Proposta válida até',{exact:true}).fill(day(3));
    await card.getByRole('button',{name:'Enviar proposta',exact:true}).click();
    await expect.poll(()=>rows(`select id from public.quote_proposals where quote_request_id='${mainQuote.id}'`).length).toBe(1);
    mainProposal=rows(`select * from public.quote_proposals where quote_request_id='${mainQuote.id}'`)[0];
    expect(mainProposal.unit_price_minor).toBe(1250);
    const buyer=pages.buyerA;await buyer.goto('/app/comprador/cotacoes');
    const quote=buyer.locator('li').filter({hasText:`Cotação #${mainQuote.id.slice(0,8)}`});
    await quote.getByRole('button',{name:'Solicitar pedido sem pagamento',exact:true}).click();
    expect(rows('select id from public.purchase_orders')).toEqual([]);
    const group=buyer.getByRole('group',{name:'Confirmar operação comercial'});
    await expect(group).toBeVisible();await group.getByRole('button').first().click();
    await expect.poll(()=>rows(`select id from public.purchase_orders where quote_request_id='${mainQuote.id}'`).length).toBe(1);
    mainOrder=rows(`select * from public.purchase_orders where quote_request_id='${mainQuote.id}'`)[0];
    expect(mainOrder.status).toBe('awaiting_supplier_confirmation');expect(mainOrder.total_price_minor).toBe(12500);
    expect(stock()).toEqual({available_quantity:100,reserved_quantity:0});
  });

  test('11 - confirmação reserva exatamente uma vez e estoque reservado não pode ser reduzido',async()=>{
    const page=pages.supplierA;await page.goto('/app/fornecedor/pedidos');
    const card=page.locator('li').filter({hasText:`Pedido #${mainOrder.id.slice(0,8)}`});
    await confirmUI(page,card.getByRole('button',{name:'Confirmar e reservar',exact:true}));
    await expect.poll(()=>order(mainOrder.id).status).toBe('confirmed');
    expect(stock()).toEqual({available_quantity:100,reserved_quantity:10});
    const duplicate=await api('supplierA',{action:'order_transition',transition:'supplier_confirm',orderId:mainOrder.id});
    expect(duplicate.status).toBe(201);expect(stock().reserved_quantity).toBe(10);
    const tooLow=await clients.supplierA.rpc('set_supplier_available_stock',{p_org:ORGS.supplierA,p_sku:A.skuId,p_available:5});
    expect(tooLow.error).toBeTruthy();expect(stock()).toEqual({available_quantity:100,reserved_quantity:10});
  });

  test('12 - separação, expedição, baixa única e entrega pelas telas',async()=>{
    const page=pages.supplierA;await page.goto('/app/fornecedor/pedidos');
    let card=page.locator('li').filter({hasText:`Pedido #${mainOrder.id.slice(0,8)}`});
    await card.getByLabel('Frete estimado em R$ (opcional)',{exact:true}).fill('12,90');
    await card.getByLabel('Previsão de entrega (opcional)',{exact:true}).fill(day(2));
    await confirmUI(page,card.getByRole('button',{name:'Iniciar separação',exact:true}));
    await expect.poll(()=>rows(`select status from public.order_fulfillments where order_id='${mainOrder.id}'`)[0]?.status).toBe('separating');
    const premature=await api('supplierA',{action:'fulfillment',transition:'deliver',orderId:mainOrder.id});expect(premature.status).toBe(422);
    card=page.locator('li').filter({hasText:`Pedido #${mainOrder.id.slice(0,8)}`});
    await confirmUI(page,card.getByRole('button',{name:'Finalizar separação',exact:true}));
    await expect.poll(()=>rows(`select status from public.order_fulfillments where order_id='${mainOrder.id}'`)[0]?.status).toBe('ready_to_dispatch');
    await card.getByLabel('Referência de transporte (opcional)',{exact:true}).fill('E2E-LOCAL-ENTREGA-001');
    await confirmUI(page,card.getByRole('button',{name:'Confirmar expedição',exact:true}));
    await expect.poll(()=>rows(`select status from public.order_fulfillments where order_id='${mainOrder.id}'`)[0]?.status).toBe('in_transit');
    expect(stock()).toEqual({available_quantity:90,reserved_quantity:0});
    const duplicate=await api('supplierA',{action:'fulfillment',transition:'dispatch',orderId:mainOrder.id,trackingReference:'E2E-LOCAL-ENTREGA-001'});
    expect(duplicate.status).toBe(201);expect(stock()).toEqual({available_quantity:90,reserved_quantity:0});
    const cancelled=await api('supplierA',{action:'order_transition',transition:'supplier_cancel',orderId:mainOrder.id});expect(cancelled.status).toBe(422);
    await confirmUI(page,card.getByRole('button',{name:'Registrar entrega',exact:true}));
    await expect.poll(()=>rows(`select status from public.order_fulfillments where order_id='${mainOrder.id}'`)[0]?.status).toBe('delivered');
    await pages.buyerA.goto('/app/comprador/pedidos');
    await expect(pages.buyerA.getByText('Entregue (registro manual)',{exact:true})).toBeVisible();
    await expect(pages.buyerA.getByText('Entrega registrada',{exact:true})).toBeVisible();
    await expect(pages.buyerA.getByText('Confirmado pelo fornecedor · estoque reservado',{exact:true})).toHaveCount(0);
    await expect(pages.buyerA.getByText('Referência informada pelo fornecedor: E2E-LOCAL-ENTREGA-001')).toBeVisible();
    await pages.buyerA.screenshot({path:test.info().outputPath('comprador-entrega-concluida.png'),fullPage:true});
  });

  test('13 - isolamento real em tabelas, RPCs e API para fornecedor B, comprador B e leitor',async()=>{
    for(const who of ['supplierB','buyerB']) {
      for(const table of ['quote_requests','quote_proposals','purchase_orders','order_fulfillments']) {
        const data=await clients[who].from(table).select('id');expect(data.error).toBeNull();expect(data.data).toEqual([]);
      }
    }
    const foreignStock=await clients.supplierB.rpc('set_supplier_available_stock',{p_org:ORGS.supplierA,p_sku:A.skuId,p_available:999});
    expect(foreignStock.error?.code).toBe('42501');expect(stock().available_quantity).toBe(90);
    const foreignOrder=await api('supplierB',{action:'order_transition',transition:'supplier_cancel',orderId:mainOrder.id});expect(foreignOrder.status).toBe(422);
    const buyerActingSupplier=await api('buyerA',{action:'fulfillment',transition:'deliver',orderId:mainOrder.id});expect(buyerActingSupplier.status).toBe(403);
    const impersonation=await api('buyerB',{action:'quote',buyerOrgId:ORGS.buyerA,offerId:A.offerId,quantity:1,region:'BR-SP',notes:'invalid',idempotencyKey:randomUUID()});expect(impersonation.status).toBe(422);
    const readOnly=await api('reader',{action:'quote',buyerOrgId:ORGS.buyerA,offerId:A.offerId,quantity:1,region:'BR-SP',notes:'invalid',idempotencyKey:randomUUID()});expect(readOnly.status).toBe(422);
    const escalated=await clients.supplierB.auth.updateUser({data:{role:'PLATFORM_ADMIN',organization_id:ORGS.supplierA}});expect(escalated.error).toBeNull();
    const denied=await clients.supplierB.rpc('promote_supplier_submission',{p_submission:A.submissionId,p_slug:'invalid-escalation'});expect(denied.error?.code).toBe('42501');
    await pages.supplierB.goto('/admin/marketplace');await expect(pages.supplierB).toHaveURL(/acesso-restrito/);
  });

  test('14 - usuário com dois perfis não mistura seus painéis de compra e fornecimento',async()=>{
    const buyer=await apiGet('dual','orders');expect(buyer.status).toBe(200);expect(buyer.items.map(x=>x.id)).toContain(mainOrder.id);
    const supplier=await apiGet('dual','supplier_orders');expect(supplier.status).toBe(200);expect(supplier.items).toEqual([]);
    const quotes=await apiGet('dual','supplier_quotes');expect(quotes.status).toBe(200);expect(quotes.items).toEqual([]);
  });

  test('15 - CSRF, JSON inválido, dados excessivos e sessão ausente são rejeitados',async({request})=>{
    const badOrigin=await contexts.buyerA.request.post(BASE_URL+'/api/marketplace/transactions',{headers:{origin:'https://untrusted.example'},data:{action:'quote'}});expect(badOrigin.status()).toBe(403);
    const noOrigin=await contexts.buyerA.request.post(BASE_URL+'/api/marketplace/transactions',{data:{action:'quote'}});expect(noOrigin.status()).toBe(403);
    const text=await contexts.buyerA.request.post(BASE_URL+'/api/marketplace/transactions',{headers:{origin:BASE_URL,'content-type':'text/plain'},data:'x'});expect(text.status()).toBe(400);
    const large=await api('buyerA',{action:'quote',notes:'x'.repeat(9000)});expect(large.status).toBe(400);
    const absent=await request.get(BASE_URL+'/api/marketplace/transactions?mode=orders');expect(absent.status()).toBe(401);
  });

  test('16 - idempotência, cancelamento do comprador, recusa e liberação de reserva',async()=>{
    const one=await newOrder();expect(one.o.status).toBe(201);
    const same=await api('buyerA',one.payload);expect(same.status).toBe(201);expect(same.id).toBe(one.o.id);
    const cancel=await api('buyerA',{action:'order_transition',transition:'buyer_cancel',orderId:one.o.id});expect(cancel.status).toBe(201);
    expect(order(one.o.id).status).toBe('cancelled');expect(stock().reserved_quantity).toBe(0);
    const two=await newOrder();expect(two.o.status).toBe(201);
    expect((await api('supplierA',{action:'order_transition',transition:'supplier_reject',orderId:two.o.id})).status).toBe(201);
    expect(order(two.o.id).status).toBe('rejected');expect(stock().reserved_quantity).toBe(0);
    const three=await newOrder(3);expect(three.o.status).toBe(201);
    expect((await api('supplierA',{action:'order_transition',transition:'supplier_confirm',orderId:three.o.id})).status).toBe(201);
    expect(stock().reserved_quantity).toBe(3);
    await pages.supplierA.goto('/app/fornecedor/pedidos');
    const thirdCard=pages.supplierA.locator('li').filter({hasText:`Pedido #${three.o.id.slice(0,8)}`});
    await thirdCard.getByLabel('Frete estimado em R$ (opcional)',{exact:true}).fill('0,00');
    await confirmUI(pages.supplierA,thirdCard.getByRole('button',{name:'Iniciar separação',exact:true}));
    await expect.poll(()=>rows(`select freight_estimate_minor from public.order_fulfillments where order_id='${three.o.id}'`)[0]?.freight_estimate_minor).toBe(0);
    expect((await api('supplierA',{action:'order_transition',transition:'supplier_cancel',orderId:three.o.id})).status).toBe(201);
    expect(stock()).toEqual({available_quantity:90,reserved_quantity:0});
    expect(rows(`select status from public.order_fulfillments where order_id='${three.o.id}'`)[0].status).toBe('cancelled');
    expect((await api('supplierA',{action:'fulfillment',transition:'dispatch',orderId:three.o.id})).status).toBe(422);
    const impossible=await newOrder(91);expect(impossible.o.status).toBe(422);
  });

  test('17 - duas confirmações concorrentes não vendem estoque acima do disponível',async()=>{
    expect((await clients.supplierA.rpc('set_supplier_available_stock',{p_org:ORGS.supplierA,p_sku:A.skuId,p_available:5})).error).toBeNull();
    const one=await newOrder(4),two=await newOrder(4);expect(one.o.status).toBe(201);expect(two.o.status).toBe(201);
    const results=await Promise.all([one,two].map(x=>api('supplierA',{action:'order_transition',transition:'supplier_confirm',orderId:x.o.id})));
    expect(results.map(x=>x.status).sort()).toEqual([201,422]);
    expect(stock()).toEqual({available_quantity:5,reserved_quantity:4});
    const winner=results[0].status===201?one:two;
    expect((await api('supplierA',{action:'order_transition',transition:'supplier_cancel',orderId:winner.o.id})).status).toBe(201);
    expect(stock().reserved_quantity).toBe(0);
    expect((await clients.supplierA.rpc('set_supplier_available_stock',{p_org:ORGS.supplierA,p_sku:A.skuId,p_available:90})).error).toBeNull();
  });

  test('18 - layouts mobile e acompanhamento do comprador sem rolagem horizontal',async()=>{
    for(const who of ['buyerA','supplierA']) {
      const page=pages[who];await page.setViewportSize({width:390,height:844});
      await page.goto(who==='buyerA'?'/app/comprador/pedidos':'/app/fornecedor/pedidos');
      await expect(page.getByText(`Pedido #${mainOrder.id.slice(0,8)}`,{exact:true})).toBeVisible();
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
      await page.screenshot({path:test.info().outputPath(`${who}-pedidos-mobile.png`),fullPage:true});
    }
  });

  test('19 - bloqueio do perfil e encerramento da sessão retiram acesso imediatamente',async()=>{
    sql(`update public.profiles set status='blocked' where id='${cfg.users.buyerB.id}';`);
    expect((await apiGet('buyerB','orders')).status).toBe(401);
    expect((await clients.buyerB.from('offers').select('id')).data).toEqual([]);
    const token=(await clients.supplierA.auth.getSession()).data.session.access_token;
    expect((await clients.supplierA.auth.signOut({scope:'local'})).error).toBeNull();
    const stale=await fetch(cfg.url+'/rest/v1/supplier_products?select=id',{headers:{apikey:cfg.key,authorization:`Bearer ${token}`}});
    if(stale.ok) expect(await stale.json()).toEqual([]); else expect([401,403]).toContain(stale.status);
    // The separate browser session for this supplier must remain independent.
    expect((await apiGet('supplierA','supplier_orders')).status).toBe(200);
  });
});
