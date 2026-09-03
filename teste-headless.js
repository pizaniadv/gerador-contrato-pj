// Verificacao headless do gerador de contratos PJ v2 (Node + vm + DOM stub).
// Tecnica registrada no log da sessao 041 (Vault/95-Learning); sem navegador.
// Cobre: (1) vigencia calculada, (2) quarentena arts. 5.o-C/5.o-D, (3) conselho de
// classe condicional, (4) motor de clausulas unico da v2, (5) semaforo de pejotizacao,
// (6) geracao integral do .docx, (7) ausencia de erro de console.
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const ALVO = process.env.ALVO || 'D:/PIZANI-OS/repos/gerador-contrato-pj/index.html';
const OUT = path.join(__dirname, 'saida');
fs.mkdirSync(OUT, { recursive: true });

const html = fs.readFileSync(ALVO, 'utf8');
const scripts = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
console.log('alvo:', ALVO);
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

  obj_desc: 'Prestação de serviços técnicos de manutenção preventiva de equipamentos',
  obj_entregaveis: 'Relatório mensal de manutenção preventiva; plano trimestral de substituição de peças; laudo anual de conformidade',
  obj_period: 'mensal, com fechamento até o 5º dia útil',
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

  hab_conselho: 'Conselho Regional de Engenharia e Agronomia (CREA)',
  quarentena_data: '',
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
const el = id => documentStub.getElementById(id);
const setV = (id, v) => { el(id).value = v; };
const setC = (id, v) => { el(id).checked = !!v; };

let blobCapturado = null;
const alerts = [];
const errosConsole = [];

const documentStub = {
  getElementById(id) { return elementos.get(id) || novoEl(id); },
  createElement(tag) { return novoEl('__criado_' + tag + '_' + Math.random()); },
  querySelector() { return null; },
  querySelectorAll() { return []; },
  addEventListener() {},
  body: { appendChild() {}, removeChild() {}, classList: { add() {}, remove() {}, toggle() {} } },
};

const consoleEspiao = {
  log: (...a) => console.log(...a),
  warn: (...a) => console.log('[warn]', ...a),
  info: (...a) => console.log('[info]', ...a),
  debug: () => {},
  error: (...a) => { errosConsole.push(a.map(String).join(' ')); console.log('[console.error]', ...a); },
};

const store = new Map();
const sandbox = {
  document: documentStub,
  window: {},
  console: consoleEspiao,
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

// ═══════════════ TESTE 0 — carga sem erro de console ═══════════════
console.log('\n=== TESTE 0 — CARGA DOS SCRIPTS (sem erro de console) ===');
const errosCarga = [];
for (const [i, src] of scripts.entries()) {
  try { vm.runInContext(src, sandbox, { filename: `bloco${i}.js` }); }
  catch (e) { errosCarga.push(`bloco ${i}: ${e.message}`); console.log(`NOK  bloco ${i}: ${e.message}`); }
}
const T0 = errosCarga.length === 0;
console.log(T0 ? 'OK   os scripts carregaram sem lancar excecao' : 'NOK  excecao na carga');

// funcoes esperadas na v2 + correcoes
const esperadas = ['montarClausulas','calcularRisco','renderSemaforo','detectarCargo','quarentenaCumprida',
                   'gerarHTMLContrato','exportarDocx','gerarResumo','calcVigFim','calcularVigFim','validarEtapa','toggleVigFim'];
const faltando = esperadas.filter(f => typeof sandbox[f] !== 'function');
console.log('funcoes ausentes:', faltando.length ? faltando.join(', ') : '(nenhuma)');
const T0b = faltando.length === 0;
console.log(T0b ? 'OK   motor v2 + correcoes presentes' : 'NOK  funcao faltando');

// ═══════════════ TESTE 1 — vigencia ═══════════════
console.log('\n=== TESTE 1 — VIGÊNCIA (início + 12 meses − 1 dia) ===');
sandbox.toggleVigFim();
sandbox.calcularVigFim();
const fimEl = el('vig_fim');
console.log('vig_inicio          :', el('vig_inicio').value);
console.log('vig_meses           :', el('vig_meses').value);
console.log('vig_fim (calculado) :', fimEl.value);
console.log('hint                :', el('hint-vig-fim').textContent);
const T1 = fimEl.value === '2027-08-31';
console.log(T1 ? 'OK   termino = 31/08/2027' : 'NOK  esperado 2027-08-31');

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

console.log('\n-- validação de coerência --');
fimEl.value = '2026-08-31';
const rejeitou = sandbox.validarEtapa(3) === false;
console.log(rejeitou ? 'OK   validarEtapa(3) REJEITOU término 31/08/2026 anterior ao início' : 'NOK  validação passou com término inválido');
console.log('alerta:', alerts[alerts.length - 1]);
sandbox.calcularVigFim(); // volta ao valor correto
const aceitou = sandbox.validarEtapa(3) === true;
console.log(aceitou ? 'OK   validarEtapa(3) ACEITOU término 31/08/2027 calculado' : 'NOK  validação recusou termo correto');
const T1b = rejeitou && aceitou && bordasOk;

// ═══════════════ TESTE 2 — semáforo de pejotização (v2) ═══════════════
console.log('\n=== TESTE 2 — SEMÁFORO DE PEJOTIZAÇÃO (v2) ===');
const semaforo = () => { sandbox.renderSemaforo(); return el('semaforo-wrap').innerHTML; };
const classeDo = h => (h.match(/class="semaforo (\w+)"/) || [])[1];

const hVerde = semaforo();
console.log('sem risco declarado  ->', classeDo(hVerde));
const S1 = classeDo(hVerde) === 'verde';

setC('risk_exclusiv', true);
const hAmarelo = semaforo();
console.log('só exclusividade     ->', classeDo(hAmarelo));
const S2 = classeDo(hAmarelo) === 'amarelo';
setC('risk_exclusiv', false);

setC('risk_jornada', true);
const hVermelho = semaforo();
console.log('controle de jornada  ->', classeDo(hVermelho));
const S3 = classeDo(hVermelho) === 'vermelho' && /controle de horário\/jornada/.test(hVermelho);
setC('risk_jornada', false);

// detector de cargo no objeto
const objOriginal = el('obj_desc').value;
setV('obj_desc', 'Atuar como coordenador da equipe de estoque, com jornada de trabalho definida');
const cargoDetectado = sandbox.detectarCargo();
const hCargo = semaforo();
console.log('objeto com "cargo"   ->', classeDo(hCargo), '| detectarCargo():', cargoDetectado);
const S4 = cargoDetectado === true && /descreve um cargo\/função/.test(hCargo);
setV('obj_desc', objOriginal);
sandbox.detectarCargo();

// quarentena de 18 meses (art. 5.o-C) como sinal grave
const hoje = new Date();
const isoMenos = meses => {
  const d = new Date(hoje.getFullYear(), hoje.getMonth() - meses, hoje.getDate());
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const qCurta = isoMenos(6), qLonga = isoMenos(24);
const Q1 = sandbox.quarentenaCumprida(qCurta) === false;
const Q2 = sandbox.quarentenaCumprida(qLonga) === true;
const Q3 = sandbox.quarentenaCumprida('') === false;
console.log(`quarentenaCumprida('${qCurta}') = ${sandbox.quarentenaCumprida(qCurta)} (esperado false — 6 meses)`);
console.log(`quarentenaCumprida('${qLonga}') = ${sandbox.quarentenaCumprida(qLonga)} (esperado true — 24 meses)`);
setC('opt_quarentena', true);
setV('quarentena_data', qCurta);
const hQuar = semaforo();
console.log('ex-empregado sem 18m ->', classeDo(hQuar));
const S5 = classeDo(hQuar) === 'vermelho' && /18 meses de quarentena/.test(hQuar);
setC('opt_quarentena', false);
setV('quarentena_data', '');
const T2 = S1 && S2 && S3 && S4 && S5 && Q1 && Q2 && Q3;
console.log(T2 ? 'OK   semáforo verde/amarelo/vermelho, detector de cargo e quarentena de 18 meses'
               : `NOK  semáforo (verde=${S1} amarelo=${S2} vermelho=${S3} cargo=${S4} quarentena=${S5} calc=${Q1 && Q2 && Q3})`);

// ═══════════════ TESTE 3 — motor de cláusulas único (v2) ═══════════════
console.log('\n=== TESTE 3 — MOTOR DE CLÁUSULAS ÚNICO (v2) ===');
const gT = id => (documentStub.getElementById(id) || {}).value || '';
const cT = id => !!(documentStub.getElementById(id) || {}).checked;
const clBase = sandbox.montarClausulas(gT, cT);
console.log('cláusulas (sem opcionais):', clBase.length);
console.log(clBase.map((c, i) => `  ${i + 1}. ${c.titulo}`).join('\n'));
const titulos = clBase.map(c => c.titulo);
const T3 = clBase.length === 12
  && titulos.includes('DO OBJETO E DOS ENTREGÁVEIS')
  && titulos.includes('DA PROTEÇÃO DE DADOS PESSOAIS')
  && titulos.includes('DO COMPLIANCE, DA REGULARIDADE E DA QUARENTENA');
console.log(T3 ? 'OK   12 cláusulas base, com entregáveis e LGPD' : 'NOK  estrutura de cláusulas inesperada');

// opcionais entram no motor
['opt_risco','opt_subst','opt_sub','opt_var','opt_reemb','opt_vis','opt_hab'].forEach(k => setC(k, true));
const clOpt = sandbox.montarClausulas(gT, cT);
console.log('cláusulas (com opcionais):', clOpt.length);
const T3b = clOpt.length === 15 && clOpt.some(c => c.titulo === 'DA HABILITAÇÃO PROFISSIONAL');
console.log(T3b ? 'OK   opcionais acrescentam variável e habilitação' : 'NOK  opcionais não refletidos');

// ═══════════════ TESTE 4 — conselho de classe condicional ═══════════════
console.log('\n=== TESTE 4 — CONSELHO DE CLASSE (correção 3) ===');
const compl = arr => arr.find(c => /COMPLIANCE/.test(c.titulo)).itens[2];
const comHab = compl(clOpt);
console.log('opt_hab LIGADO  :', comHab);
setC('opt_hab', false);
const semHab = compl(sandbox.montarClausulas(gT, cT));
console.log('opt_hab DESLIGADO:', semHab);
const T4 = !/conselho/i.test(semHab)
        && /sujeita a conselho profissional/.test(comHab)
        && /Conselho Regional de Engenharia e Agronomia \(CREA\)/.test(comHab)
        && /culpa in vigilando — STF, ADPF 324/.test(semHab);
console.log(T4 ? 'OK   conselho só quando a atividade exige; dever de fiscalização mantido (ADPF 324)'
               : 'NOK  conselho de classe não está condicional');
['opt_risco','opt_subst','opt_sub','opt_var','opt_reemb','opt_vis','opt_hab'].forEach(k => setC(k, false));

// ═══════════════ TESTE 5 — resumo e HTML sem exceção ═══════════════
console.log('\n=== TESTE 5 — RESUMO E HTML DO CONTRATO ===');
let T5 = true;
try { sandbox.gerarResumo(); console.log('resumo len:', el('resumo-final').innerHTML.length); }
catch (e) { T5 = false; console.log('NOK  gerarResumo:', e.message); }
let htmlContrato = '';
try { htmlContrato = sandbox.gerarHTMLContrato(); console.log('html do contrato len:', htmlContrato.length); }
catch (e) { T5 = false; console.log('NOK  gerarHTMLContrato:', e.message); }
const T5b = T5 && /CLÁUSULA XII — DA MEDIAÇÃO PRÉVIA E DO FORO/.test(htmlContrato)
              && /início em 01\/09\/2026 e término em 31\/08\/2027/.test(htmlContrato);
console.log(T5b ? 'OK   resumo e HTML gerados; numeração romana até XII e vigência correta' : 'NOK  resumo/HTML');

// ═══════════════ TESTE 6 — contrato completo em .docx ═══════════════
console.log('\n=== TESTE 6 — GERAÇÃO DO CONTRATO COMPLETO (.docx) ===');
(async () => {
  await sandbox.exportarDocx();
  if (!blobCapturado) { console.log('NOK  nenhum blob gerado'); process.exit(1); }
  const buf = Buffer.from(await blobCapturado.arrayBuffer());
  const docx = path.join(OUT, 'Contrato_PJ_TESTE_FICTICIO_v2.docx');
  fs.writeFileSync(docx, buf);
  console.log('docx gravado:', docx, buf.length, 'bytes');
  const zipOk = buf.slice(0, 4).toString('hex') === '504b0304';
  console.log('assinatura ZIP (PK\\x03\\x04):', zipOk ? 'OK' : 'NOK');

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
  const txtPath = path.join(OUT, 'contrato-teste-v2-extraido.txt');
  fs.writeFileSync(txtPath, texto, 'utf8');
  console.log('texto extraído:', txtPath, texto.length, 'caracteres');

  const linha = re => (texto.split('\n').find(l => re.test(l)) || '').trim();
  const clausulasNoDocx = (texto.match(/^CLÁUSULA /gm) || []).length;
  console.log('cláusulas no .docx:', clausulasNoDocx);

  console.log('\n--- CLÁUSULA DA VIGÊNCIA (correção 1) ---');
  const lVig = linha(/tem início em/);
  console.log(lVig);
  const T6a = /início em 01\/09\/2026 e término em 31\/08\/2027/.test(lVig);
  console.log(T6a ? 'OK   01/09/2026 → 31/08/2027' : 'NOK');

  console.log('\n--- CLÁUSULA DA QUARENTENA (correção 2) ---');
  const l51 = linha(/A CONTRATADA declara, sob as penas da lei/);
  console.log(l51);
  const T6b = /empregado ou de trabalhador sem vínculo empregatício/.test(l51)
           && /art\. 5\.º-C da Lei nº 6\.019\/1974/.test(l51)
           && /art\. 5\.º-D da Lei nº 6\.019\/1974/.test(l51)
           && /aposentado/.test(l51)
           && !/celetista/.test(l51);
  console.log(T6b ? 'OK   art. 5º-C (empregado OU sem vínculo, exceto aposentado) + art. 5º-D; "celetista" removido' : 'NOK');

  console.log('\n--- CLÁUSULA DO CONSELHO DE CLASSE (correção 3) ---');
  const l53 = linha(/exigirá mensalmente, antes do pagamento/);
  console.log(l53);
  const T6c = !/conselho/i.test(l53) && /culpa in vigilando — STF, ADPF 324/.test(l53);
  console.log(T6c ? 'OK   sem opt_hab, nenhuma exigência de conselho de classe' : 'NOK   conselho de classe incondicional');

  console.log('\n--- CORREÇÕES PRÓPRIAS DA v2 ---');
  const lMulta = linha(/multa equivalente a 6 \(seis\) mensalidades/);
  console.log(lMulta);
  const T6d = !/mensalidade[s]? de honorários/.test(texto)
           && /mensalidades do valor contratual/.test(texto);
  console.log(T6d ? 'OK   "mensalidade de honorários" eliminada (era bug do v1)' : 'NOK   ainda fala em honorários');
  const T6e = /Lei nº 13\.709\/2018 \(LGPD\)/.test(texto)
           && /ADPF 324 e Tema 725/.test(texto)
           && /Anexo Técnico/.test(texto);
  console.log(T6e ? 'OK   LGPD, ADPF 324/Tema 725 e Anexo Técnico presentes no contrato gerado' : 'NOK   conteúdo da v2 ausente');
  const T6f = clausulasNoDocx === 12 && /CLÁUSULA XII —/.test(texto);
  console.log(T6f ? 'OK   12 cláusulas numeradas em romano no .docx' : 'NOK   numeração das cláusulas');

  const T6 = zipOk && T6a && T6b && T6c && T6d && T6e && T6f;

  console.log('\n=== ERROS DE CONSOLE ===');
  const erros = errosCarga.concat(errosConsole);
  console.log(erros.length ? erros.join('\n') : '(nenhum)');
  const TC = erros.length === 0;

  console.log('\n=== PLACAR ===');
  const placar = [
    ['0  carga sem erro de console', T0 && T0b && TC],
    ['1  vigência calculada + validação', T1 && T1b],
    ['2  semáforo de pejotização (v2)', T2],
    ['3  motor de cláusulas único (v2)', T3 && T3b],
    ['4  conselho de classe condicional', T4],
    ['5  resumo e HTML do contrato', T5b],
    ['6  contrato completo em .docx', T6],
  ];
  for (const [n, ok] of placar) console.log((ok ? 'OK  ' : 'NOK ') + n);
  const todos = placar.every(p => p[1]);
  console.log('\nRESULTADO: ' + (todos ? 'TODOS OS TESTES PASSARAM' : 'HOUVE FALHA'));
  process.exit(todos ? 0 : 1);
})();
