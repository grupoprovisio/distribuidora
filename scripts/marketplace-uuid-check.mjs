import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const files=[
 'app/app/fornecedor/catalogo/commercial-actions.ts','app/app/fornecedor/catalogo/submit-actions.ts',
 'app/admin/marketplace/solicitacoes/actions.ts','app/admin/marketplace/importar/actions.ts',
 'app/admin/marketplace/cadastro/category-actions.ts','app/admin/marketplace/cadastro/actions.ts',
 'app/admin/marketplace/cadastro/edit-actions.ts','app/admin/acessos/actions.ts',
];
for(const path of files)test(`RFC UUID acceptance and rejection: ${path}`,()=>{
 const source=readFileSync(path,'utf8');
 const literal=source.match(/\/(\^\[[^\n]+?\[89ab\][^\n]+?\$)\/i/);
 assert.ok(literal,'Expected the role-sensitive ID validator');
 const regex=new RegExp(literal[1],'i');
 for(const id of ['8e2e2026-1022-4000-a000-000000000002','a1b3d959-5e59-4b5c-b36c-4420d142b2b9','0199ab12-0000-7000-8000-000000000001'])assert.ok(regex.test(id),`valid UUID rejected in ${path}`);
 for(const id of ['', '8e2e2026-1022-4000-a000000000000','8e2e2026-1022-4000-c000-000000000001',"' OR 1=1 --"] )assert.equal(regex.test(id),false);
});
