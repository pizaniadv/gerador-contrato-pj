// Verificacao headless do gerador de contratos PJ (Node + vm + DOM stub).
// Tecnica registrada no log da sessao 041 (Vault/95-Learning).
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const ALVO = 'D:/PIZANI-OS/repos/gerador-contrato-pj/index.html';
const OUT = path.join(__dirname, 'saida');
fs.mkdirSync(OUT, { recursive: true });

const html = fs.readFileSync(ALVO, 'utf8');
const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
console.log('blocos <script> extraidos:', scripts.length);

// ── dados ficticios do teste ──
const dados = {
  cont_cnpj: '11.222.333/0001-44',
  cont_nome: 'DELTA COMERCIO FICTICIO LTDA',
  cont_rep: 'Joana Fictícia de Souza',
  cont_rep_cpf: '111.222.333-44',
  cont_rep_cargo: 'Administradora',
  cont_rua: 'Rua das Acácias', cont_num: '100', cont_bairro: 'Centro',
  cont_cidade: 'Salvador', cont_uf: 'BA', cont_cep: '40000-000',

  ctda_cnpj: '55.666.777/0001-88',
  ctda_nome: '55.666.777 MARCOS TESTE DA SILVA',
  ctda_qual: 'Microempreendedor Individual',
  ctda_rep: 'Marcos Teste da Silva',
  ctda_rep_cpf: '555.666.777-88',
  ctda_rep_cargo: 'Administrador',
  ctda_rua: 'Travessa do Exemplo', ctda_num: '25', ctda_bairro: 'Barra',
  ctda_cidade: 'Salvador', ctda_uf: 'BA', ctda_cep: '40140-000',

  obj_desc: 'Prestação de serviços de manutenção preventiva de equipamentos',
  obj_local: 'unidade da CONTRATANTE em Salvador/BA',

  vig_inicio: '2026-09-01',
  vig_tipo: 'determinado',
  vig_meses: '12',
  vig_fim: '',            // deve ser calculado pelo gerador
  vig_aviso: '30',

  foro_cidade: 'Salvador', foro_uf: 'BA',

  rem_valor: '4.000,00',
  rem_extenso: 'quatro mil reais',
  rem_dia: '10',
};

// ── DOM stub ──
const elementos = new Map();
function novoEl(id) {
  const el = {
    id,
    value: Object.prototype.hasOwnProperty.call(dados, id) ? dados[id] : '',
    checked: false,
    textContent: '',
    innerHTML: '',
    style: {},
    files: [],
    children: [],
    classList: { toggle() {}, add() {}, remove() {}, contains() { return false; } },
    appendChild(c) { this.children.push(c); return c; },
    removeChild() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener() {},
    click() { this.clicked = true; },
    focus() {}, scrollIntoView() {},
  };
  elementos.set(id, el);
  return el;
}

let blobCapturado = null;
const alerts = [];

const documentStub = {
  getElementById(id) { return elementos.get(id) || novoEl(id); },
  createElement(tag) { return novoEl('__criado_' + tag + '_' + Math.random()); },
  querySelector() { return null; },
  querySelectorAll() { return []; },
  addEventListener() {},
  body: { appendChild() {}, removeChild() {}, classList: { add() {}, remove() {}, toggle() {} } },
};

const store = new Map();
const sandbox = {
  document: documentStub,
  window: {},
  console,
  alert: m => { alerts.push(String(m)); },
  confirm: () => true,
  prompt: () => '',
  setTimeout, clearTimeout, setInterval, clearInterval,
  TextEncoder, TextDecoder, Blob, atob, btoa, fetch,
  Date, Math, JSON, Number, String, Array, Object, Uint8Array, Uint32Array, DataView, ArrayBuffer, Promise, RegExp, Error, isNaN, isFinite, parseInt, parseFloat, Intl,
  localStorage: {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k),
  },
  URL: {
    createObjectURL(b) { blobCapturado = b; return 'blob:stub'; },
    revokeObjectURL() {},
  },
  location: { href: '', reload() {} },
  navigator: { userAgent: 'node-harness' },
  FileReader: function () {},
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

for (const [i, src] of scripts.entries()) {
  try { vm.runInContext(src, sandbox, { filename: `bloco${i}.js` }); }
  catch (e) { console.log(`bloco ${i}: ${e.message}`); }
}

// ═══════════════ TESTE 1 — vigencia ═══════════════
console.log('\n=== TESTE 1 — VIGÊNCIA (início + 12 meses − 1 dia) ===');
sandbox.toggleVigFim();
sandbox.calcularVigFim();
const fimEl = documentStub.getElementById('vig_fim');
console.log('vig_inicio          :', documentStub.getElementById('vig_inicio').value);
console.log('vig_meses           :', documentStub.getElementById('vig_meses').value);
console.log('vig_fim (calculado) :', fimEl.value);
console.log('hint                :', documentStub.getElementById('hint-vig-fim').textContent);
const T1 = fimEl.value === '2027-08-31';
console.log(T1 ? 'OK   termino = 31/08/2027' : 'NOK  esperado 2027-08-31');

// casos de borda
console.log('\n-- casos de borda de calcVigFim --');
const bordas = [
  ['2026-09-01', 12, '2027-08-31'],
  ['2026-01-01', 12, '2026-12-31'],
  ['2026-01-31', 1, '2026-02-28'],
  ['2026-03-15', 6, '2026-09-14'],
  ['2026-09-01', 24, '2028-08-31'],
  ['2027-03-01', 12, '2028-02-29'], // 2028 bissexto
];
let bordasOk = true;
for (const [ini, m, esp] of bordas) {
  const got = sandbox.calcVigFim(ini, m);
  const ok = got === esp;
  if (!ok) bordasOk = false;
  console.log(`${ok ? 'OK  ' : 'NOK '} ${ini} + ${m}m − 1d = ${got} (esperado ${esp})`);
}

// validacao rejeita termino anterior ao inicio
console.log('\n-- validação de coerência --');
fimEl.value = '2026-08-31';
const rejeitou = sandbox.validarEtapa(3) === false;
console.log(rejeitou ? 'OK   validarEtapa(3) REJEITOU término 31/08/2026 anterior ao início' : 'NOK  validação passou com término inválido');
console.log('alerta:', alerts[alerts.length - 1]);
sandbox.calcularVigFim(); // volta ao valor correto
const T1b = rejeitou && bordasOk;

// ═══════════════ TESTE 2 — gerar DOCX ═══════════════
console.log('\n=== TESTE 2 — GERAÇÃO DO .DOCX ===');
(async () => {
  await sandbox.exportarDocx();
  if (!blobCapturado) { console.log('NOK  nenhum blob gerado'); process.exit(1); }
  const buf = Buffer.from(await blobCapturado.arrayBuffer());
  const docx = path.join(OUT, 'Contrato_PJ_TESTE_FICTICIO_2026-09-02.docx');
  fs.writeFileSync(docx, buf);
  console.log('docx gravado:', docx, buf.length, 'bytes');
  console.log('assinatura ZIP (PK\\x03\\x04):', buf.slice(0, 4).toString('hex') === '504b0304' ? 'OK' : 'NOK');

  // extrai o texto do document.xml sem dependencia externa (zip STORE, sem compressao)
  const raw = buf.toString('latin1');
  const alvo = 'word/document.xml';
  const i = raw.indexOf(alvo);
  if (i < 0) { console.log('NOK  word/document.xml ausente'); process.exit(1); }
  const ini = raw.indexOf('<?xml', i);
  const fim = raw.indexOf('</w:document>', ini) + '</w:document>'.length;
  const xml = Buffer.from(raw.slice(ini, fim), 'latin1').toString('utf8');
  const texto = xml.replace(/<w:p\b[^>]*>/g, '\n')
                   .replace(/<[^>]+>/g, '')
                   .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
                   .replace(/\n{3,}/g, '\n\n');
  const txtPath = path.join(OUT, 'contrato-teste-extraido.txt');
  fs.writeFileSync(txtPath, texto, 'utf8');
  console.log('texto extraído:', txtPath);

  const linha = re => (texto.split('\n').find(l => re.test(l)) || '').trim();
  console.log('\n--- CLÁUSULA DA VIGÊNCIA ---');
  const lVig = linha(/tem início em/);
  console.log(lVig);
  const T2 = /início em 01\/09\/2026 e término em 31\/08\/2027/.test(lVig);
  console.log(T2 ? 'OK   01/09/2026 → 31/08/2027' : 'NOK');

  console.log('\n--- CLÁUSULA 5.1 (quarentena) ---');
  const l51 = linha(/A CONTRATADA declara, sob as penas da lei/);
  console.log(l51);
  const T3 = /empregado ou de trabalhador sem vínculo empregatício/.test(l51)
          && /art\. 5\.º-C da Lei nº 6\.019\/1974/.test(l51)
          && /art\. 5\.º-D da Lei nº 6\.019\/1974/.test(l51)
          && /aposentado/.test(l51)
          && !/celetista/.test(l51);
  console.log(T3 ? 'OK   art. 5º-C (empregado OU sem vínculo, exceto aposentado) + art. 5º-D; "celetista" removido' : 'NOK');

  console.log('\n--- CLÁUSULA 5.3 (conselho de classe) ---');
  const l53 = linha(/exigirá mensalmente, antes do pagamento/);
  console.log(l53);
  const T4 = /quando a atividade contratada estiver sujeita a conselho profissional/.test(l53);
  console.log(T4 ? 'OK   conselho de classe agora é CONDICIONAL' : 'NOK');

  console.log('\n=== PLACAR ===');
  const placar = [['1 vigência', T1 && T1b], ['2 cláusula 5.1(b)', T3], ['3 cláusula 5.3', T4], ['docx íntegro', T2]];
  for (const [n, ok] of placar) console.log((ok ? 'OK  ' : 'NOK ') + n);
  process.exit(placar.every(p => p[1]) ? 0 : 1);
})();
