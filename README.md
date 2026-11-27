# Werkplaatsbord

Storingen melden in de werkplaats: foto, welke machine, wat er aan de hand is en of het dringend is. Per machine zie
je de geschiedenis, de urenstand en wanneer het onderhoud weer aan de beurt is. Werkt op je telefoon. Tik op een foto om hem schermvullend te zien.

**Openen:** https://johndeere6110.github.io/werkplaatsbord/
**Installeren of doorsturen:** https://johndeere6110.github.io/werkplaatsbord/installeren.html

## Storingen
- **+ Storing**: foto's (camera of galerij, max. 4), machine kiezen (laatst gemelde bovenaan, tabjes per categorie,
  zoeken, of **Overig**), wat er aan de hand is, **Dringend** of **Als er tijd is**, en je naam.
- Tabbladen **Dringend**, **Als er tijd is** en **Klaar**. Heeft een machine meer storingen, dan staan ze onder één
  kop die je openklapt. Wat langer dan 14 dagen openstaat krijgt een label.
- **Klaar** vinkt een storing af (met jouw naam). Tik op een storing voor de foto's, **Weer openzetten**,
  verplaatsen naar het andere tabblad of **Verwijderen** (twee keer tikken).

## Machines
- De machinelijst van de werkplaats (248 machines, met machinenummer, kenteken, merk/type en bouwjaar) staat erin.
  Machines die er al in stonden hielden hun naam, storingen en beurten.
- Tabjes per categorie: Trekkers, Kranen, Shovels, Auto's, Wagens, Werktuigen, Aanbouwdelen, Winterdienst, Klein
  materieel, Overig. Binnen een categorie op machinenummer.
- **Zoeken** (bovenaan in Machines en bij storing melden): op nummer, naam, soort, merk/type of kenteken (met of zonder
  streepjes), meerdere woorden mag ("valtra t214"). Enter bij één resultaat opent hem, Esc maakt het veld leeg.
- Per machine: urenstand, open storingen, hoe vaak gemeld dit jaar, onderhoud en de geschiedenis (storingen en
  onderhoud door elkaar; tik een storing aan om hem te openen).
- **Onderhoud gedaan** (datum, urenstand, wat er gedaan is). Een beurt in de geschiedenis aantikken = bewerken of verwijderen. Met een interval (elke … uur en/of elke … maanden, wat
  het eerst komt) rekent de app uit wanneer de volgende beurt is; bovenaan staat **Onderhoud aan de beurt**.
- **Bewerken**: naam, machinenummer, bouwjaar, merk en type, chassisnummer, info, categorie, soort, kenteken, urenteller, interval, of de machine verwijderen.
- **Laatste beurt invullen** (bovenaan in Machines, of bij een machine): urenstand nu, de laatste beurt (datum,
  urenstand toen) en het interval in één venster. Met **Opslaan, volgende** loop je alle machines achter elkaar door,
  **Overslaan** slaat er een over. Zolang de laatste beurt niet is ingevuld staat er "Laatste beurt?" (niet
  "Binnenkort"). Alleen machines met een urenteller of een interval komen in dat rijtje.
- **Exporteren naar Excel** (onderaan bij een machine) of **Alles naar Excel** (onderaan in Machines): een csv met
  alle onderhoud en storingen, met of een storing op dat moment opgelost was of nog open (en wanneer en door wie).
  Op de pc komt hij in Downloads, op de telefoon via Delen (mail, WhatsApp, Drive). Het is een momentopname.
- **PDF / afdrukken** (bij een machine) of **Alles als PDF** (onderaan in Machines): opent het printvenster van de
  browser; kies daar **Opslaan als PDF** of print hem. Per machine de gegevens, alle beurten en alle storingen (open of
  opgelost). Bij alles eerst **Onderhoud aan de beurt** (te laat, dan binnenkort) en een overzicht van alle machines, een invullijst **Laatste beurt invullen** (lege vakken, zelfde volgorde als in de app) voor machines
  zonder vastgelegde beurt, dan een pagina per machine waar iets bij staat.

## Keuringen
- Bij een machine: **+ Keuring** (APK, kraankeuring, hijsmiddelen, NEN 3140 … of zelf typen), geldig tot, elke …
  maanden, hoeveel dagen van tevoren waarschuwen (standaard 30) en een notitie. Weet je alleen wanneer hij gekeurd is,
  dan rekent de app "geldig tot" uit.
- **Gekeurd**: datum, nieuwe "geldig tot" (voorgesteld met het interval), opmerking. Eerdere keuringen blijven staan.
  Tik een eerdere keuring aan om hem te bewerken of te verwijderen; de nieuwste bepaalt "geldig tot".
- **Keuringsrapport**: bij Gekeurd (of bij het bewerken van een eerdere keuring) **+ Rapport toevoegen**: een PDF of een
  foto (max. 10 MB, tot 5 stuks). In de keuring staat het onder **Rapporten**: tikken = openen (pc: nieuw tabblad,
  telefoon: downloaden en openen). Ze gaan naar de groep, in de Drive-map met de foto's.
- Op de pc kun je een PDF (uit de mail of de verkenner) ook **slepen**: op een keuring = nieuwe keuring met dat rapport,
  in het venster Gekeurd = rapport erbij.
- Bovenaan in Machines staat **Keuringen** met wat verlopen is of binnenkort verloopt; op de tegel een label.
- Losse dingen (brandblussers, ladders, stellingen): maak er een machine van in de categorie Overig.
- Keuringen staan ook in de PDF en de Excel-export.

## Meldingen
- Instellingen → **Meldingen aanzetten**: een melding op de telefoon bij een nieuwe **dringende storing** (meteen,
  niet voor wie hem meldt) en 's ochtends tussen 7 en 8 uur bij **keuringen** die gaan verlopen en **onderhoud** dat te laat
  of binnenkort is. Per keuring komt een melding bij de eerste waarschuwing, 14 en 7 dagen van tevoren, de dag ervoor, op de
  dag zelf en als hij verlopen is; niet elke dag opnieuw.
- **Testmelding** om te kijken of het werkt. Werkt op Android; op iPhone alleen vanaf het beginscherm (iOS 16.4+).
- Moet één keer aangezet worden in het Google-script: zie [groep/HANDLEIDING.md](groep/HANDLEIDING.md).

## Groep
Zonder groep blijft alles op je eigen telefoon. Met de groep ziet iedereen hetzelfde, via een Google Sheet met een
groepscode: zie [groep/HANDLEIDING.md](groep/HANDLEIDING.md).
