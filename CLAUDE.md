# Werkplaatsbord
Web-app (PWA) voor de werkplaats: storingen melden met foto per machine, en onderhoud bijhouden. Zelfde opzet als de
Perceelkaart en de Zaaihulp (johndeere6110.github.io), maar een losse app.
- index.html bevat de pagina (HTML, CSS en JS in één bestand). Geen build-stap, geen frameworks, niets van een CDN of
  Google laden: het lettertype (Barlow, OFL) staat in fonts/.
- Taal in de app: Nederlands, komma als decimaalteken, informeel en kort.
- Opslag: localStorage wordt gedeeld met de Perceelkaart en de Zaaihulp (zelfde github.io-domein). Alleen sleutels die
  met "wpb" beginnen: wpbData ({machines, meldingen, onderhoud, keuringen, meta, dirty}), wpbNaam, wpbGroep ({code, aan}),
  wpbGroepUrl, wpbLaatst, wpbFotoWacht (foto- en bestand-id's die nog naar de groep moeten), wpbGroepUitnodiging, wpbTipWeg (installatietip weggetikt), wpbApparaat (vast id a_... per apparaat), wpbLijst (machinelijst ingelezen), wpbPush
  ({aan, dringend, keuring, dagen ("1234567", 1 = ma), endpoint, vapid, t}). Verander bestaande
  sleutels niet. Foto's (1600 px, jpeg 0,8, data-URL) staan in IndexedDB: database "werkplaatsbord", store "fotos", sleutel = foto-id (f_...).
  Een storing heeft ook thumb: mini-voorbeeld (200 px) van de eerste foto, voor de lijst; alleen tonen als isBeeld().
- Records: storing {id s_..., machineId of machineVrij, tekst, prio dringend|tijd, status open|klaar, door, fotos [id],
  uren, t, tKlaar, klaarDoor, thumb}; machine {id, nr (machinenummer, bv. "0700"), naam, type (soort), model (merk en type), bouwjaar, chassis, info (vrije tekst), archief (ingeruild: datum of tekst; leeg = in gebruik), kenteken, cat, urenteller, uren, urenT (tijdstip van de urenstand; leeg = afleiden uit de nieuwste beurt/storing met die stand),
  interval {uren, maanden}}; onderhoud
  {id o_... (uit Excel: ox...), machineId, t, uren, wat, door, soort (leeg = beurt, "controle", "reparatie"; reparatie telt niet
  als laatste beurt)}; keuring {id k_..., machineId, soort, tot (geldig tot), maanden, vooraf
  (dagen waarschuwen, standaard 30), notitie, hist [{t, tot, door, opm, bestanden [{id d_..., naam}]}]}; de nieuwste hist bepaalt tot. De startmachines hebben vaste id's v1..v17. De machinelijst van de werkplaats (MACHINELIJST in index.html, 246 stuks; LIJST_VERVALLEN = weggehaalde nummers; LIJST_TERUG = per ongeluk weggehaald, terugzetten als dat vóór het tijdstip was; LIJST_AANVUL = lege velden aanvullen; LIJST_VERBETER = [veld, oud, nieuw] als er nog precies oud staat; LIJST_ARCHIEF = naar het archief, ook terugzetten als weggehaald).
  Onderhoudsschema's uit Excel: excel-import.json, één keer per apparaat ingelezen (excelInlezen, wpbExcel = EXCEL_VERSIE),
  na de machinelijst; ingeruilde machines zonder nummer krijgen id x_.... Machines met archief staan alleen in het tabje Ingeruild (niet in Alles, zoeken, melden, aan de beurt, PDF, ochtendmelding
  wordt één keer per apparaat ingelezen (lijstInlezen, sleutel wpbLijst = LIJST_VERSIE): bestaande machines krijgen via
  kenteken/LIJST_KOPPEL/naam alleen nr, model, bouwjaar en lege kentekens; nieuwe krijgen id n<nr> met g = 1. Met groep pas
  na een geslaagde sync. Categorieën: CATS; UREN_CATS krijgen standaard een urenteller. meta[id] = {s: soort, g:
  tijdstip laatste wijziging, weg: 1}. Elke wijziging gaat via wijzig(soort, obj) of verwijder(soort, id).
- Groep: groep/apps-script.gs in een eigen Google Sheet (zie groep/HANDLEIDING.md), web-app-URL in GROEP_URL_VAST in
  index.html (zolang die leeg is staat er een veld Web-app-URL in Instellingen). Per record wint de nieuwste g;
  weggehaald = rij met weg "verwijderd". Foto's als bestand <id>.jpg in de Drive-map "Werkplaatsbord foto's" (id in scripteigenschap FOTOMAP_ID); versturen
  als {foto: {id, data, omschrijving}}, ophalen met ?foto=<id> (data-URL terug).
  Keuringsrapporten (PDF of foto) als d_... in dezelfde IndexedDB-store en als <id>.pdf/.jpg in dezelfde Drive-map;
  versturen als {bestand: {id, data, omschrijving}}, ophalen met ?bestand=<id>. Alleen als GET bestanden: true geeft
  (ouder script: bestanden blijven in wpbFotoWacht staan). fotosOpruimen raakt alleen f_-bestanden aan.
  POST met Content-Type text/plain (geen preflight). GET geeft ook soorten (SOORTEN uit het script): soorten die het
  script niet kent (ouder script: alleen storing, machine, onderhoud) houdt de app vast tot het script is bijgewerkt.
- Pushmeldingen (Web Push, VAPID): het script ondertekent zelf (ECDSA P-256 met BigInt, k volgens RFC 6979) en stuurt een
  lege push (dus geen versleuteling). De service worker haalt de tekst op met ?berichten=<sinds>&apparaat=<id>; adres,
  code, apparaat en laatst staan in de cache "wpb-push" (sleutel "config", gezet door de app). Abonnementen in blad
  "telefoons"; POST {abonnement}, {afmelden}, {testmelding}; GET met &apparaat= geeft aangemeld (false = opnieuw
  aanvragen). Elke POST stuurt apparaat mee (geen push naar jezelf). Trigger dagelijks() via meldingenInstellen().
  Blad telefoons heeft ook dagen, laatste push en uur (tijd van de dagelijkse melding; trigger elk uur, scripteigenschap
  ELK_UUR = 1 gezet door meldingenInstellen, anders krijgt iedereen hem bij de oude 7-uur-trigger): geen push op een vrije dag; dagelijks() pusht elke telefoon die vandaag aan
  staat en nog berichten heeft van na zijn laatste push (dus ook wat er op zijn vrije dagen gebeurde).
- Uitnodiging: installeren.html?groep=<code> zet wpbGroepUitnodiging; de app pakt die op bij starten,
  visibilitychange en het storage-event. De app zelf met ?groep=<code> werkt ook.
- Gebruik geen alert(), confirm() of prompt(); bevestigen met armed() (twee keer tikken) en foutteksten in het venster.
- Bij elke wijziging: verhoog VERSIE in index.html én CACHE in sw.js (werkplaatsbord-v1 -> v2), anders krijgen
  geïnstalleerde apps de update niet. Cachenamen beginnen met "werkplaatsbord-": de service worker ruimt alleen die op.
- Eigen app-identiteit: manifest.webmanifest met "id": "/werkplaatsbord/". Niet veranderen.
- Icoon: icon.svg is de bron (dakje met gekruiste steeksleutels); icon-192/512.png en apple-touch-icon.png (180) zijn
  daaruit gemaakt.
- Push direct naar main, zonder pull request (GitHub Pages draait vanaf main).
