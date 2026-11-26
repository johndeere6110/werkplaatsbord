/**
 * Werkplaatsbord – storingen, machines en onderhoud delen met de groep via een Google Sheet.
 * Plak dit in de sheet via Uitbreidingen (of Extensies) > Apps Script (vervang wat er staat) en volg groep/HANDLEIDING.md.
 * Het script kan bij deze ene sheet (zie @OnlyCurrentDoc) en bij de Drive van dit account (voor de foto's).
 * Gebruik daarom een apart Google-account voor de groep.
 *
 * Blad "data", één regel per storing, machine of onderhoudsbeurt:
 *   id | soort | omschrijving | van | gewijzigd | bijgewerkt | weg | data
 *   soort = storing, machine of onderhoud; omschrijving is om te lezen; data is voor de app.
 *   gewijzigd = tijdstip van de wijziging op de telefoon (getal); de nieuwste wijziging wint.
 * Moet iets bij iedereen weg? Zet in kolom "weg" iets (bv. "ja"): bij het volgende bijwerken is het bij iedereen weg.
 *
 * Foto's: als losse bestanden in de map "Werkplaatsbord foto's" in de Drive van dit account (naam = <id>.jpg).
 *   Een telefoon haalt een foto pas op als iemand hem bekijkt. Daarom vraagt Google bij het publiceren ook om Drive.
 *
 * Blad "open storingen": overzicht om te lezen, wordt na elke keer bijwerken opnieuw gemaakt.
 * Eerste keer meteen zien: kies hierboven de functie overzichtNu en klik op Uitvoeren.
 *
 * @OnlyCurrentDoc
 */
const BLAD = 'data';
const KOP = ['id', 'soort', 'omschrijving', 'van', 'gewijzigd', 'bijgewerkt', 'weg', 'data'];
const FOTOMAP = "Werkplaatsbord foto's";
const SOORTEN = ['storing', 'machine', 'onderhoud'];

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
  const v = blad_(BLAD, KOP).getDataRange().getValues(), rijen = [];
  for (let i = 1; i < v.length; i++) {
    const r = v[i];
    if (!r[0]) continue;
    const weg = !!String(r[6]).trim();
    rijen.push({ id: String(r[0]), soort: String(r[1]), van: String(r[3]), gewijzigd: Number(r[4]) || 0, weg: weg, data: weg ? '' : String(r[7]) });
  }
  return antwoord_({ ok: true, rijen: rijen, nu: Date.now() });
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
    const sh = blad_(BLAD, KOP), v = sh.getDataRange().getValues(), waar = {};
    for (let i = 1; i < v.length; i++) if (v[i][0]) waar[String(v[i][0])] = i + 1;
    (Array.isArray(b.rijen) ? b.rijen : []).slice(0, 500).forEach(function (r) {
      if (!r || !r.id || SOORTEN.indexOf(String(r.soort)) < 0) return;
      const id = String(r.id).slice(0, 100), n = waar[id];
      const oudG = n ? Number(sh.getRange(n, 5).getValue()) || 0 : 0;
      const oudWeg = n ? String(sh.getRange(n, 7).getValue()).trim() : '';
      const g = Number(r.gewijzigd) || Date.now();
      if (n && g < oudG) return;                          // er staat al iets nieuwers
      if (oudWeg && oudWeg !== 'verwijderd') return;      // door jou weggehaald in de sheet: blijft weg
      if (r.weg) {
        if (n) sh.getRange(n, 5, 1, 3).setValues([[g, new Date(), 'verwijderd']]);
        else { sh.appendRow([id, String(r.soort), '', String(r.van || '').slice(0, 40), g, new Date(), 'verwijderd', '']); waar[id] = sh.getLastRow(); }
        return;
      }
      const rij = [id, String(r.soort), String(r.omschrijving || '').slice(0, 300), String(r.van || '').slice(0, 40),
        g, new Date(), '', JSON.stringify(r.data || {}).slice(0, 49000)];
      if (n) sh.getRange(n, 1, 1, KOP.length).setValues([rij]);
      else { sh.appendRow(rij); waar[id] = sh.getLastRow(); }
    });
    overzicht_();
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
