import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

const root = new URL('../', import.meta.url);
const source = readFileSync(new URL('Module.bsl',root),'utf8');
const names = [...source.matchAll(/ДобавитьИнструмент\(Инструменты,\s*"([a-z0-9_]+)"/g)].map(m=>m[1]);
assert.equal(names.length,94); assert.equal(new Set(names).size,94);
assert(names.includes('check_object_fill'));
for (const dispatcher of ['ОбработатьВызовИнструмента','ВыполнитьИнструментПоИмени']) {
  const body=source.match(new RegExp('Функция '+dispatcher+'\\([^]*?КонецФункции'))?.[0];
  assert(body,dispatcher);
  for(const name of names.filter(n => dispatcher !== 'ВыполнитьИнструментПоИмени' || n !== 'execute_batch')) assert(body.includes('ИмяИнструмента = "'+name+'"'),dispatcher+': '+name);
}
const pkg=JSON.parse(readFileSync(new URL('package.json',root),'utf8'));
assert.equal(pkg.version,'6.2.5');
assert(source.includes('Инфо.Вставить("version", "6.2.5")'));
assert(source.includes('Инфо.Вставить("mcp_server_version", "6.2.5")'));

async function rpc(messages,config={}) {
  const env={...process.env};
  for(const key of Object.keys(env)) if(key.startsWith('ONEC_') || key==='NODE_OPTIONS')delete env[key];
  const child=spawn(process.execPath,[new URL('index.mjs',root).pathname],{env:{...env,...config},stdio:['pipe','pipe','pipe']});
  let out='',err='';child.stdout.on('data',d=>out+=d);child.stderr.on('data',d=>err+=d);
  const ended=once(child,'close');
  const timer=setTimeout(()=>child.kill(),20000);
  child.stdin.end(messages.map(m=>JSON.stringify({jsonrpc:'2.0',...m})).join('\n')+'\n');
  const [code]=await ended;clearTimeout(timer);assert.equal(code,0,err);
  return out.trim().split('\n').filter(Boolean).map(l=>JSON.parse(l));
}
const offline=await rpc([{id:1,method:'initialize'},{id:2,method:'tools/list'},{id:3,method:'tools/call',params:{name:'get_list'}}]);
assert.equal(offline.find(x=>x.id===1).result.serverInfo.version,'6.2.5');
assert.equal(offline.find(x=>x.id===2).result.tools.length,51);
assert.equal(offline.find(x=>x.id===3).result.isError,true);
const requests=[];
const server=createServer(async(req,res)=>{
  let raw='';for await(const chunk of req)raw+=chunk;
  const m=JSON.parse(raw);requests.push({method:m.method,params:m.params,auth:req.headers.authorization});
  res.setHeader('Content-Type','application/json');
  if(req.url==='/fail'){res.statusCode=503;res.end('{}');return;}
  if(req.url==='/invalid'){res.end(JSON.stringify({result:{tools:'not a catalog'}}));return;}
  if(req.url==='/rpc-error'){res.end(JSON.stringify({error:{code:-32000,message:'fixture'}}));return;}
  const result=m.method==='tools/list'?{tools:names.map(name=>({name,description:'fixture',inputSchema:{type:'object',properties:{}}}))}:{content:[{type:'text',text:JSON.stringify(m.params.arguments)}]};
  res.end(JSON.stringify({jsonrpc:'2.0',id:m.id,result}));
});
server.listen(0,'127.0.0.1');await once(server,'listening');
const url='http://127.0.0.1:'+server.address().port;
try{
  const auth={ONEC_URL:url,ONEC_USER:'fixture-user',ONEC_PASSWORD:'fixture-password'};
  const [live]=await rpc([{id:4,method:'tools/list'}],auth);
  assert.equal(live.result.tools.length,94);assert(live.result.tools.some(t=>t.name==='check_object_fill'));
  assert.equal(requests[0].auth,'Basic '+Buffer.from('fixture-user:fixture-password').toString('base64'));
  const restricted=await rpc([
    {id:5,method:'tools/list'},
    {id:6,method:'tools/call',params:{name:'check_object_fill',arguments:{full_name:'Документ.Тест'}}},
    {id:7,method:'tools/call',params:{name:'execute_code',arguments:{}}}
  ],{...auth,ONEC_ALLOWED_TOOLS:'get_list, check_object_fill'});
  assert.deepEqual(restricted.find(x=>x.id===5).result.tools.map(t=>t.name).sort(),['check_object_fill','get_list']);
  assert.deepEqual(JSON.parse(restricted.find(x=>x.id===6).result.content[0].text),{full_name:'Документ.Тест'});
  assert.equal(restricted.find(x=>x.id===7).result.isError,true);
  assert(!requests.some(x=>x.params?.name==='execute_code'));
  for(const path of ['/fail','/invalid','/rpc-error']){
    const [r]=await rpc([{id:8,method:'tools/list'}],{ONEC_URL:url+path});
    assert.equal(r.error.code,-32000);assert.equal(r.result,undefined);
  }
}finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
console.log('PASS: 94 unique BSL registrations; dispatch coverage with nested batch excluded; 6.2.5 versions; offline mode; live catalog; filter; blocked calls; proxy arguments; discovery failure without fallback. BSL runtime not tested.');
