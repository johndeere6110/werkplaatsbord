/**
 * Werkplaatsbord – storingen, machines, onderhoud en keuringen delen met de groep via een Google Sheet.
 * Plak dit in de sheet via Uitbreidingen (of Extensies) > Apps Script (vervang wat er staat) en volg groep/HANDLEIDING.md.
 * Het script kan bij deze ene sheet (zie @OnlyCurrentDoc) en bij de Drive van dit account (voor de foto's).
 * Gebruik daarom een apart Google-account voor de groep.
 *
 * Blad "data", één regel per storing, machine, onderhoudsbeurt of keuring:
 *   id | soort | omschrijving | van | gewijzigd | bijgewerkt | weg | data
 *   soort = storing, machine, onderhoud of keuring; omschrijving is om te lezen; data is voor de app.
 *   gewijzigd = tijdstip van de wijziging op de telefoon (getal); de nieuwste wijziging wint.
 * Moet iets bij iedereen weg? Zet in kolom "weg" iets (bv. "ja"): bij het volgende bijwerken is het bij iedereen weg.
 *
 * Foto's: als losse bestanden in de map "Werkplaatsbord foto's" in de Drive van dit account (naam = <id>.jpg).
 *   Een telefoon haalt een foto pas op als iemand hem bekijkt. Daarom vraagt Google bij het publiceren ook om Drive.
 *
 * Blad "open storingen": overzicht om te lezen, wordt na elke keer bijwerken opnieuw gemaakt.
 *
 * Pushmeldingen: blad "telefoons" (wie meldingen wil), elke ochtend de functie dagelijks (keuringen en onderhoud),
 *   en meteen bij een nieuwe dringende storing. Aanzetten: kies de functie meldingenInstellen en klik op Uitvoeren.
 *   De melding zelf is leeg (geen versleuteling nodig); de telefoon haalt de tekst op met ?berichten=.
 * Eerste keer meteen zien: kies hierboven de functie overzichtNu en klik op Uitvoeren.
 *
 * @OnlyCurrentDoc
 */
const BLAD = 'data';
const KOP = ['id', 'soort', 'omschrijving', 'van', 'gewijzigd', 'bijgewerkt', 'weg', 'data'];
const FOTOMAP = "Werkplaatsbord foto's";
const SOORTEN = ['storing', 'machine', 'onderhoud', 'keuring']; // de app vraagt dit op: wat hier niet in staat, houdt hij zelf vast

function blad_(naam, kop) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(naam);
  if (!sh) { sh = ss.insertSheet(naam); sh.appendRow(kop); sh.setFrozenRows(1); }
  return sh;
}
function codeOk_(c) {
  const g = PropertiesService.getScriptProperties().getProperty('GROEPSCODE');
  return !!g && String(c || '').trim() === g.trim();
}
function antwoord_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

// Ophalen: alle regels (ook weggehaalde, zodat de telefoons ze ook weghalen), of één foto (?foto=<id>)
function doGet(e) {
  const p = (e && e.parameter) || {};
  if (!codeOk_(p.code)) return antwoord_({ ok: false, fout: 'code' });
  if (p.foto) return antwoord_(fotoLees_(String(p.foto)));
  if (p.berichten != null) return antwoord_(berichtenVoor_(String(p.apparaat || ''), Number(p.berichten) || 0));
  const v = blad_(BLAD, KOP).getDataRange().getValues(), rijen = [];
  for (let i = 1; i < v.length; i++) {
    const r = v[i];
    if (!r[0]) continue;
    const weg = !!String(r[6]).trim();
    rijen.push({ id: String(r[0]), soort: String(r[1]), van: String(r[3]), gewijzigd: Number(r[4]) || 0, weg: weg, data: weg ? '' : String(r[7]) });
  }
  const uit = { ok: true, rijen: rijen, soorten: SOORTEN, vapid: vapid_().pub, nu: Date.now() };
  if (p.apparaat) uit.aangemeld = !!telefoon_(String(p.apparaat)); // telefoon staat (nog) in blad "telefoons"
  return antwoord_(uit);
}

// Versturen: { code, rijen: [...] } of { code, foto: { id, data } }
function doPost(e) {
  let b;
  try { b = JSON.parse(e.postData.contents); } catch (x) { return antwoord_({ ok: false, fout: 'json' }); }
  if (!codeOk_(b && b.code)) return antwoord_({ ok: false, fout: 'code' });
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    if (b.foto) return antwoord_(fotoSchrijf_(b.foto));
    if (b.abonnement) return antwoord_(abonneer_(String(b.apparaat || ''), b.abonnement));
    if (b.afmelden) return antwoord_(afmelden_(String(b.apparaat || '')));
    if (b.testmelding) return antwoord_(testmelding_(String(b.apparaat || '')));
    const dringend = [];
    const sh = blad_(BLAD, KOP), v = sh.getDataRange().getValues(), waar = {};
    for (let i = 1; i < v.length; i++) if (v[i][0]) waar[String(v[i][0])] = i + 1;
    // Bestaande regels meteen bijwerken; nieuwe regels verzamelen en in één keer onderaan zetten (veel sneller dan appendRow)
    const nieuw = [], inNieuw = {};
    const zet = function (n, id, rij) {
      if (n) { sh.getRange(n, 1, 1, KOP.length).setValues([rij]); v[n - 1] = rij; }
      else if (inNieuw[id] != null) nieuw[inNieuw[id]] = rij;
      else { inNieuw[id] = nieuw.length; nieuw.push(rij); }
    };
    (Array.isArray(b.rijen) ? b.rijen : []).slice(0, 500).forEach(function (r) {
      if (!r || !r.id || SOORTEN.indexOf(String(r.soort)) < 0) return;
      const id = String(r.id).slice(0, 100), n = waar[id];
      const oud = n ? v[n - 1] : (inNieuw[id] != null ? nieuw[inNieuw[id]] : null);
      const oudG = oud ? Number(oud[4]) || 0 : 0;
      const oudWeg = oud ? String(oud[6]).trim() : '';
      const g = Number(r.gewijzigd) || Date.now();
      if (oud && g < oudG) return;                        // er staat al iets nieuwers
      const d = r.data || {};
      if (!oud && !r.weg && r.soort === 'storing' && d.prio === 'dringend' && d.status !== 'klaar' && Number(d.t) > Date.now() - DAG) dringend.push(d);
      if (oudWeg && oudWeg !== 'verwijderd') return;      // door jou weggehaald in de sheet: blijft weg
      if (r.weg) {
        zet(n, id, oud ? [oud[0], oud[1], oud[2], oud[3], g, new Date(), 'verwijderd', oud[7]]
          : [id, String(r.soort), '', String(r.van || '').slice(0, 40), g, new Date(), 'verwijderd', '']);
        return;
      }
      zet(n, id, [id, String(r.soort), String(r.omschrijving || '').slice(0, 300), String(r.van || '').slice(0, 40),
        g, new Date(), '', JSON.stringify(r.data || {}).slice(0, 49000)]);
    });
    if (nieuw.length) sh.getRange(sh.getLastRow() + 1, 1, nieuw.length, KOP.length).setValues(nieuw);
    overzicht_();
    if (dringend.length) { try { meldDringend_(dringend, String(b.apparaat || ''), v); } catch (x) { /* melding mag het bijwerken nooit tegenhouden */ } }
  } finally { lock.releaseLock(); }
  return antwoord_({ ok: true });
}

// ---------- Foto's (Drive) ----------
function fotoMap_() {
  const props = PropertiesService.getScriptProperties(), id = props.getProperty('FOTOMAP_ID');
  if (id) { try { const m = DriveApp.getFolderById(id); if (!m.isTrashed()) return m; } catch (x) {} }
  const it = DriveApp.getFoldersByName(FOTOMAP), m = it.hasNext() ? it.next() : DriveApp.createFolder(FOTOMAP);
  props.setProperty('FOTOMAP_ID', m.getId());
  return m;
}
function fotoBestand_(map, id) {
  const it = map.getFilesByName(id + '.jpg');
  while (it.hasNext()) { const f = it.next(); if (!f.isTrashed()) return f; }
  return null;
}
function fotoLees_(id) {
  if (!/^f_[A-Za-z0-9_]+$/.test(id)) return { ok: false, fout: 'foto' };
  const f = fotoBestand_(fotoMap_(), id);
  if (!f) return { ok: false, fout: 'geen' };
  const blob = f.getBlob();
  return { ok: true, id: id, data: 'data:' + (blob.getContentType() || 'image/jpeg') + ';base64,' + Utilities.base64Encode(blob.getBytes()) };
}
function fotoSchrijf_(foto) {
  const id = String(foto.id || '').slice(0, 60), data = String(foto.data || '');
  const m = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(data);
  if (!/^f_[A-Za-z0-9_]+$/.test(id) || !m || data.length > 6000000) return { ok: false, fout: 'foto' };
  const map = fotoMap_(), oud = fotoBestand_(map, id);
  if (oud) return { ok: true };                      // staat er al (bv. opnieuw verstuurd na een storing in het bereik)
  const f = map.createFile(Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], id + '.jpg'));
  if (foto.omschrijving) f.setDescription(String(foto.omschrijving).slice(0, 500));
  return { ok: true };
}
// Met de hand starten vanuit de editor: foto's van verwijderde storingen naar de prullenbak van Drive
function fotosOpruimen() {
  const v = blad_(BLAD, KOP).getDataRange().getValues(), nodig = {};
  for (let i = 1; i < v.length; i++) {
    if (String(v[i][1]) !== 'storing' || String(v[i][6]).trim()) continue;
    try { (JSON.parse(String(v[i][7])).fotos || []).forEach(function (f) { nodig[f + '.jpg'] = true; }); } catch (x) {}
  }
  const it = fotoMap_().getFiles();
  while (it.hasNext()) { const f = it.next(); if (!nodig[f.getName()]) f.setTrashed(true); }
}

// ---------- Overzicht: blad "open storingen" ----------
function overzicht_() {
  try {
    const v = blad_(BLAD, KOP).getDataRange().getValues(), machines = {}, open = [];
    const leesData = function (r) { try { return JSON.parse(String(r[7])); } catch (x) { return null; } };
    for (let i = 1; i < v.length; i++) {
      const r = v[i];
      if (!r[0] || String(r[6]).trim() || String(r[1]) !== 'machine') continue;
      const d = leesData(r); if (d) machines[String(r[0])] = d.naam || '';
    }
    for (let i = 1; i < v.length; i++) {
      const r = v[i];
      if (!r[0] || String(r[6]).trim() || String(r[1]) !== 'storing') continue;
      const d = leesData(r); if (!d || d.status === 'klaar') continue;
      open.push([d.machineId ? (machines[d.machineId] || '?') : (d.machineVrij || 'Overig'), d.tekst || '', d.prio === 'dringend' ? 'dringend' : 'als er tijd is',
        d.door || '', d.t ? new Date(d.t) : '', (d.fotos || []).length]);
    }
    open.sort(function (a, b) { return (a[2] === 'dringend' ? 0 : 1) - (b[2] === 'dringend' ? 0 : 1) || String(a[0]).localeCompare(String(b[0])); });
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sh = ss.getSheetByName('open storingen');
    if (!sh) { sh = ss.insertSheet('open storingen'); sh.setFrozenRows(1); sh.setColumnWidth(1, 200); sh.setColumnWidth(2, 420); sh.setColumnWidth(3, 110); sh.setColumnWidth(4, 110); sh.setColumnWidth(5, 140); }
    sh.clearContents();
    const alles = [['machine', 'storing', 'hoe dringend', 'gemeld door', 'gemeld op', "foto's"]].concat(open.length ? open : [['(niks open)', '', '', '', '', '']]);
    sh.getRange(1, 1, alles.length, 6).setValues(alles);
  } catch (x) { /* het overzicht mag het bijwerken nooit tegenhouden */ }
}
// Met de hand starten vanuit de editor (eerste keer, of als je het blad kwijt bent)
function overzichtNu() { overzicht_(); }
// Jij past iets aan in blad "data" (bv. kolom weg): tijdstip bijwerken zodat de telefoons het overnemen, en overzicht vernieuwen.
function onEdit(e) {
  if (!e || !e.range || e.range.getSheet().getName() !== BLAD || e.range.getRow() < 2) return;
  if (e.range.getColumn() <= 7 && e.range.getLastColumn() >= 7) {
    for (let n = e.range.getRow(); n <= e.range.getLastRow(); n++) e.range.getSheet().getRange(n, 5).setValue(Date.now());
  }
  overzicht_();
}

// ---------- Pushmeldingen ----------
const DAG = 86400000;
const TELBLAD = 'telefoons';
const TELKOP = ['apparaat', 'naam', 'endpoint', 'p256dh', 'auth', 'dringend', 'keuring', 'bijgewerkt'];
const SITE_URL = 'https://johndeere6110.github.io/werkplaatsbord/';

// Eén keer met de hand uitvoeren: geeft het script toestemming om meldingen te versturen en zet de ochtendcontrole aan.
function meldingenInstellen() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'dagelijks') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('dagelijks').timeBased().everyDays(1).atHour(7).inTimezone('Europe/Amsterdam').create();
  vapid_(); blad_(TELBLAD, TELKOP);
  Logger.log('Klaar: elke ochtend tussen 7 en 8 uur een controle. Implementeer nu een nieuwe versie (zie handleiding).');
}

function abonneer_(app, a) {
  if (!/^a_[A-Za-z0-9]{4,40}$/.test(app) || !a || !/^https:\/\/[^\s"]{10,800}$/.test(String(a.endpoint || ''))) return { ok: false, fout: 'abonnement' };
  const sh = blad_(TELBLAD, TELKOP), v = sh.getDataRange().getValues();
  const rij = [app, String(a.naam || '').slice(0, 40), String(a.endpoint), String(a.p256dh || '').slice(0, 200), String(a.auth || '').slice(0, 100),
    a.dringend ? 'ja' : 'nee', a.keuring ? 'ja' : 'nee', new Date()];
  for (let i = 1; i < v.length; i++) if (String(v[i][0]) === app) { sh.getRange(i + 1, 1, 1, TELKOP.length).setValues([rij]); return { ok: true }; }
  sh.appendRow(rij);
  return { ok: true };
}
function afmelden_(app) {
  const sh = blad_(TELBLAD, TELKOP), v = sh.getDataRange().getValues();
  for (let i = v.length - 1; i >= 1; i--) if (String(v[i][0]) === app) sh.deleteRow(i + 1);
  return { ok: true };
}
function telefoon_(app) {
  const v = blad_(TELBLAD, TELKOP).getDataRange().getValues();
  for (let i = 1; i < v.length; i++) if (String(v[i][0]) === app) return { dringend: String(v[i][5]) === 'ja', keuring: String(v[i][6]) === 'ja' };
  return null;
}
function testmelding_(app) {
  if (!telefoon_(app)) return { ok: false, fout: 'geen abonnement' };
  bericht_({ soort: 'test', voor: app, titel: 'Werkplaatsbord', tekst: 'Testmelding: meldingen werken op deze telefoon.' });
  const codes = pushNaar_(function (r) { return String(r[0]) === app; });
  return { ok: true, status: codes[0] || 0 };
}

// Berichten: de laatste paar, een week lang (scripteigenschap BERICHTEN). De telefoon haalt op wat voor hem is.
function bericht_(b) {
  const props = PropertiesService.getScriptProperties(), nu = Date.now();
  let l = []; try { l = JSON.parse(props.getProperty('BERICHTEN') || '[]'); } catch (x) {}
  b.id = 'b' + nu.toString(36) + Math.floor(Math.random() * 1e6).toString(36); b.t = nu;
  b.titel = String(b.titel || '').slice(0, 80); b.tekst = String(b.tekst || '').slice(0, 300);
  l.push(b);
  props.setProperty('BERICHTEN', JSON.stringify(l.filter(function (x) { return nu - x.t < 7 * DAG; }).slice(-15)));
  return b;
}
function berichtenVoor_(app, sinds) {
  const tel = telefoon_(app);
  let l = []; try { l = JSON.parse(PropertiesService.getScriptProperties().getProperty('BERICHTEN') || '[]'); } catch (x) {}
  l = l.filter(function (b) {
    if (b.t <= sinds) return false;
    if (b.voor) return b.voor === app;
    if (!tel) return false;
    return b.soort === 'dringend' ? tel.dringend && b.niet !== app : tel.keuring;
  });
  return { ok: true, berichten: l, nu: Date.now() };
}

function meldDringend_(lijst, app, v) {
  const machines = {};
  for (let i = 1; i < v.length; i++) if (String(v[i][1]) === 'machine') { try { machines[String(v[i][0])] = JSON.parse(String(v[i][7])).naam; } catch (x) {} }
  lijst.forEach(function (d) {
    const naam = d.machineId ? (machines[d.machineId] || 'Machine') : (d.machineVrij || 'Overig');
    bericht_({ soort: 'dringend', niet: app, titel: 'Dringend: ' + naam, tekst: (d.tekst || '') + (d.door ? ' (' + d.door + ')' : '') });
  });
  pushNaar_(function (r) { return String(r[5]) === 'ja' && String(r[0]) !== app; });
}

// Elke ochtend (trigger van meldingenInstellen): keuringen die gaan verlopen en onderhoud dat te laat is.
// Per keuring een melding bij de eerste waarschuwing, 14 en 7 dagen van tevoren, de dag ervoor, op de dag zelf en als hij verlopen is.
function dagelijks() {
  const v = blad_(BLAD, KOP).getDataRange().getValues(), machines = {}, onderhoud = {}, keuringen = [];
  for (let i = 1; i < v.length; i++) {
    const r = v[i]; if (!r[0] || String(r[6]).trim()) continue;
    let d; try { d = JSON.parse(String(r[7])); } catch (x) { continue; }
    const s = String(r[1]);
    if (s === 'machine') machines[d.id] = d;
    else if (s === 'onderhoud') (onderhoud[d.machineId] = onderhoud[d.machineId] || []).push(d);
    else if (s === 'keuring') keuringen.push(d);
  }
  const props = PropertiesService.getScriptProperties(), vandaag = dagNr_(Date.now()), nieuw = {}, regels = [];
  let oud = {}; try { oud = JSON.parse(props.getProperty('GEMELD') || '{}'); } catch (x) {}
  const melden = function (sleutel, stap, tekst) {
    const vorige = oud[sleutel];
    nieuw[sleutel] = vorige == null ? stap : Math.min(vorige, stap);
    if (vorige == null || stap < vorige) regels.push(tekst);
  };
  keuringen.sort(function (a, b) { return a.tot - b.tot; }).forEach(function (k) {
    const m = machines[k.machineId]; if (!m || !k.tot) return;
    const d = dagNr_(k.tot) - vandaag, voor = k.vooraf == null ? 30 : Number(k.vooraf);
    if (d > voor) return;
    const stap = d < 0 ? -1 : d === 0 ? 0 : d === 1 ? 1 : d <= 7 ? 7 : d <= 14 ? 14 : 99;
    melden(k.id + '|' + k.tot, stap, m.naam + ': ' + k.soort + ' ' + (d < 0 ? 'is verlopen' : d === 0 ? 'verloopt vandaag' : d === 1 ? 'verloopt morgen' : 'verloopt over ' + d + ' dagen') + ' (' + datum_(k.tot) + ')');
  });
  Object.keys(machines).forEach(function (id) {
    const m = machines[id], iv = m.interval || {};
    if (!iv.uren && !iv.maanden) return;
    const l = (onderhoud[id] || []).sort(function (a, b) { return b.t - a.t; })[0]; if (!l) return;
    let lvl = 2; const delen = [];
    if (iv.uren && m.uren != null && l.uren != null) {
      const rest = l.uren + iv.uren - m.uren;
      delen.push(rest >= 0 ? 'nog ' + rest + ' uur' : (-rest) + ' uur over tijd'); lvl = Math.min(lvl, rest < 0 ? 0 : rest <= 50 ? 1 : 2);
    }
    if (iv.maanden) {
      const dt = new Date(l.t); dt.setMonth(dt.getMonth() + Number(iv.maanden));
      const d = dagNr_(dt.getTime()) - vandaag;
      delen.push(d >= 0 ? 'over ' + d + ' dagen' : (-d) + ' dagen te laat'); lvl = Math.min(lvl, d < 0 ? 0 : d <= 30 ? 1 : 2);
    }
    if (lvl < 2) melden('o|' + id + '|' + l.id, lvl, m.naam + ': onderhoud ' + (lvl === 0 ? 'te laat' : 'binnenkort') + ' (' + delen.join(', ') + ')');
  });
  props.setProperty('GEMELD', JSON.stringify(nieuw));
  if (!regels.length) return;
  bericht_({ soort: 'keuring', titel: regels.length === 1 ? 'Werkplaats: let op' : 'Werkplaats: ' + regels.length + ' dingen', tekst: regels.join('\n') });
  pushNaar_(function (r) { return String(r[6]) === 'ja'; });
}
function dagNr_(ts) { return Math.round(Date.parse(Utilities.formatDate(new Date(ts), 'Europe/Amsterdam', 'yyyy-MM-dd') + 'T00:00:00Z') / DAG); }
function datum_(ts) { return Utilities.formatDate(new Date(ts), 'Europe/Amsterdam', 'd-M-yyyy'); }

// Lege push naar de telefoons waarvoor wie(rij) true geeft. Weg-abonnementen (404/410) worden opgeruimd.
function pushNaar_(wie) {
  const sh = blad_(TELBLAD, TELKOP), v = sh.getDataRange().getValues(), doelen = [];
  for (let i = v.length - 1; i >= 1; i--) if (v[i][0] && v[i][2] && wie(v[i])) doelen.push({ rij: i + 1, endpoint: String(v[i][2]) });
  if (!doelen.length) return [];
  const sl = vapid_(), jwt = {};
  const verzoeken = doelen.map(function (t) {
    const aud = t.endpoint.match(/^https:\/\/[^\/]+/)[0];
    jwt[aud] = jwt[aud] || vapidJwt_(aud, sl);
    return { url: t.endpoint, method: 'post', payload: '', muteHttpExceptions: true,
      headers: { Authorization: 'vapid t=' + jwt[aud] + ', k=' + sl.pub, TTL: '86400', Urgency: 'high' } };
  });
  const codes = UrlFetchApp.fetchAll(verzoeken).map(function (r) { return r.getResponseCode(); });
  doelen.forEach(function (t, i) { if (codes[i] === 404 || codes[i] === 410) sh.deleteRow(t.rij); }); // van onder naar boven
  return codes;
}

// ---------- VAPID: ECDSA P-256 (ES256) met BigInt; k volgens RFC 6979 (HMAC-SHA256), dus geen toevalsgetal nodig ----------
const B0 = BigInt(0), B1 = BigInt(1), B2 = BigInt(2), B3 = BigInt(3);
const EC_P = BigInt('0xffffffff00000001000000000000000000000000ffffffffffffffffffffffff');
const EC_N = BigInt('0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551');
const EC_A = EC_P - B3;
const EC_G = [BigInt('0x6b17d1f2e12c4247f8bce6e563a440f277037d812deb33a0f4a13945d898c296'), BigInt('0x4fe342e2fe1a7f9b8ee7eb4a7c0f9e162bce33576b315ececbb6406837bf51f5')];
function ecMod_(a, m) { const r = a % m; return r < B0 ? r + m : r; }
function ecInv_(a, m) {
  let lm = B1, hm = B0, low = ecMod_(a, m), high = m;
  while (low > B1) { const q = high / low, nm = hm - lm * q, nw = high - low * q; hm = lm; high = low; lm = nm; low = nw; }
  return ecMod_(lm, m);
}
function ecAdd_(p, q) {
  if (!p) return q; if (!q) return p;
  let l;
  if (p[0] === q[0]) {
    if (ecMod_(p[1] + q[1], EC_P) === B0) return null;
    l = ecMod_(B3 * p[0] * p[0] + EC_A, EC_P) * ecInv_(B2 * p[1], EC_P);
  } else l = ecMod_(q[1] - p[1], EC_P) * ecInv_(q[0] - p[0], EC_P);
  l = ecMod_(l, EC_P);
  const x = ecMod_(l * l - p[0] - q[0], EC_P);
  return [x, ecMod_(l * (p[0] - x) - p[1], EC_P)];
}
function ecMul_(k, p) { let r = null, a = p; while (k > B0) { if (k & B1) r = ecAdd_(r, a); a = ecAdd_(a, a); k >>= B1; } return r; }
function ub_(b) { return b.map(function (x) { return x & 255; }); }
function sb_(b) { return b.map(function (x) { return x > 127 ? x - 256 : x; }); }
function bigVan_(b) { let h = ''; b.forEach(function (x) { h += (x & 255).toString(16).padStart(2, '0'); }); return BigInt('0x' + (h || '0')); }
function bytesVan_(n, len) { const h = n.toString(16).padStart(len * 2, '0'), r = []; for (let i = 0; i < len; i++) r.push(parseInt(h.substr(i * 2, 2), 16)); return r; }
function sha256_(b) { return ub_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, sb_(b))); }
function hmac_(key, data) { return ub_(Utilities.computeHmacSha256Signature(sb_(data), sb_(key))); }
function utf8_(s) { return ub_(Utilities.newBlob(String(s)).getBytes()); }
function b64u_(b) { return Utilities.base64EncodeWebSafe(sb_(b)).replace(/=+$/, ''); }
function ecdsaTeken_(d, bericht) {
  const z = bigVan_(sha256_(bericht)), x = bytesVan_(d, 32), h = bytesVan_(ecMod_(z, EC_N), 32);
  let V = [], K = [];
  for (let i = 0; i < 32; i++) { V.push(1); K.push(0); }
  K = hmac_(K, V.concat([0], x, h)); V = hmac_(K, V);
  K = hmac_(K, V.concat([1], x, h)); V = hmac_(K, V);
  for (;;) {
    V = hmac_(K, V);
    const k = bigVan_(V);
    if (k > B0 && k < EC_N) {
      const r = ecMod_(ecMul_(k, EC_G)[0], EC_N);
      if (r !== B0) { const s = ecMod_(ecInv_(k, EC_N) * (z + r * d), EC_N); if (s !== B0) return bytesVan_(r, 32).concat(bytesVan_(s, 32)); }
    }
    K = hmac_(K, V.concat([0])); V = hmac_(K, V);
  }
}
// Sleutelpaar van deze groep, gemaakt bij het eerste gebruik (scripteigenschappen VAPID_D en VAPID_PUB). Niet veranderen:
// dan moeten alle telefoons meldingen opnieuw aanzetten.
function vapid_() {
  const props = PropertiesService.getScriptProperties();
  let d = props.getProperty('VAPID_D'), pub = props.getProperty('VAPID_PUB');
  if (!d || !pub) {
    const lock = LockService.getDocumentLock(); lock.waitLock(20000); // niet het scriptslot: dat kan doPost al hebben
    try {
      d = props.getProperty('VAPID_D'); pub = props.getProperty('VAPID_PUB');
      if (!d || !pub) {
        const zaad = utf8_([Utilities.getUuid(), Utilities.getUuid(), Utilities.getUuid(), Date.now(), Math.random(), Math.random()].join('|'));
        const dn = ecMod_(bigVan_(sha256_(zaad)), EC_N - B1) + B1, Q = ecMul_(dn, EC_G);
        d = dn.toString(16); pub = b64u_([4].concat(bytesVan_(Q[0], 32), bytesVan_(Q[1], 32)));
        props.setProperties({ VAPID_D: d, VAPID_PUB: pub });
      }
    } finally { lock.releaseLock(); }
  }
  return { d: BigInt('0x' + d), pub: pub };
}
function vapidJwt_(aud, sl) {
  const kop = b64u_(utf8_(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const inh = b64u_(utf8_(JSON.stringify({ aud: aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: SITE_URL })));
  return kop + '.' + inh + '.' + b64u_(ecdsaTeken_(sl.d, utf8_(kop + '.' + inh)));
}
