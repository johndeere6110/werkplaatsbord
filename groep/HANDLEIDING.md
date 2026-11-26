# Groep instellen (Google Sheet)

Met de groep ziet iedereen in de werkplaats dezelfde storingen, machines en onderhoud, met de foto's erbij.
Alles komt in één Google Sheet, de foto's in een map in Google Drive. De app stuurt en haalt op via een klein script
in die sheet. Gebruik een **apart Google-account** voor de groep: het script kan bij de Drive van dat account.
Eenmalig instellen, daarna gaat het vanzelf. Dit is een eigen groep, los van de Perceelkaart en de Zaaihulp.

## 1. Sheet maken
1. Log in bij Google met het aparte account voor de werkplaats (niet je eigen account). Zet bij dat account een
   herstel-telefoonnummer en herstel-e-mail, en tweestapsverificatie.
2. Ga naar [sheets.new](https://sheets.new). Geef de sheet een naam, bv. **Werkplaatsbord groep**.

## 2. Script erin zetten
1. In de sheet: **Uitbreidingen → Apps Script** (in sommige versies heet het menu **Extensies**).
2. Haal de voorbeeldtekst weg en plak de inhoud van [`apps-script.gs`](apps-script.gs). Klik op opslaan (schijfje).
3. Links: **Projectinstellingen** (tandwiel) → onderaan **Scripteigenschappen** → **Scripteigenschap toevoegen**:
   - Eigenschap: `GROEPSCODE`
   - Waarde: een code die je zelf verzint, bv. `werkplaats-2026-sleutel`. Niet te kort: wie de code kent, kan alles
     lezen en aanpassen. Gebruik een andere code dan bij de Perceelkaart.

## 3. Publiceren als web-app
1. Rechtsboven **Implementeren → Nieuwe implementatie**.
2. Type (tandwiel): **Web-app**.
3. Uitvoeren als: **Ik**. Wie heeft toegang: **Iedereen**.
4. **Implementeren**. Google vraagt toestemming: kies je account → *Geavanceerd* → *Ga naar … (onveilig)* → *Toestaan*.
   (Google waarschuwt omdat het een eigen script is. Het vraagt om de sheet en om Google Drive: daar zet het script
   de foto's in de map **Werkplaatsbord foto's**.)
5. Kopieer de **URL van de web-app** (eindigt op `/exec`).
   - Stuur hem naar de ontwikkelaar: die zet hem vast in de app, daarna hoeft niemand er meer iets mee.
   - Wil je meteen testen: in de app, tandwiel rechtsboven → **Web-app-URL** plakken. Dat veld verdwijnt zodra de URL
     vast in de app staat.

## 4. Meedoen
- In de app: tandwiel rechtsboven (bij je naam) → vinkje **Meedoen met de groep**, groepscode invullen, **Opslaan**.
- Of: iemand die al in de groep zit tikt bij Instellingen op **Link met groep** en stuurt die (bv. via WhatsApp).
  Wie die link opent, installeert de app en doet meteen mee; de app vraagt alleen nog de naam.
- De eerste telefoon die meedoet zet de machinelijst in de sheet. Storingen die je al op je telefoon had, gaan mee.

## Hoe het samenvoegen werkt
- Per storing, machine en onderhoudsbeurt: de nieuwste wijziging wint.
- Haalt iemand iets weg, dan verdwijnt het bij iedereen.
- De app werkt vanzelf bij als je hem opent of terughaalt van de achtergrond, elke 2 minuten zolang hij openstaat,
  en een paar seconden na een wijziging. Zonder bereik bewaart de telefoon het en stuurt hij het later.
- Foto's worden verkleind tot 1600 pixels (zo'n 300–500 kB, scherp genoeg voor een typeplaatje) en komen als losse
  bestanden in de map **Werkplaatsbord foto's** in Drive (naam = foto-id, met in de beschrijving de machine en de
  storing). Een telefoon haalt een grote foto pas op als iemand de storing opent, en bewaart hem daarna zelf.
  In de lijst staat een mini-voorbeeld dat in de storing zelf zit. 15 GB is ruim voor tienduizenden foto's.

## Beheer
- Blad **data**: één regel per storing, machine of onderhoudsbeurt. Kolom *omschrijving* is leesbaar, kolom *data*
  is voor de app, kolom *van* is wie het laatst iets aanpaste.
- Blad **open storingen**: overzicht om te lezen (machine, storing, hoe dringend, wie, wanneer). Wordt na elke keer
  bijwerken opnieuw gemaakt. Meteen zien: in de Apps Script-editor de functie `overzichtNu` kiezen en *Uitvoeren*.
- **Iets bij iedereen weghalen:** zet in kolom **weg** bijvoorbeeld `ja`. Bij het volgende bijwerken is het bij
  iedereen weg. Terugzetten: kolom *weg* weer leegmaken.
- **Definitief opruimen:** een regel met `verwijderd` mag je helemaal weghalen (rechtsklik op het rijnummer →
  *Rij verwijderen*), maar pas als alle telefoons daarna een keer bijgewerkt hebben. Anders kan een telefoon die lang
  uit stond hem terugzetten.
- **Foto's opruimen:** in de Apps Script-editor de functie `fotosOpruimen` kiezen en *Uitvoeren*. Dat zet foto's van
  verwijderde storingen in de prullenbak van Drive. Afgevinkte storingen houden hun foto's.
- **Zelf ook bij de sheet kunnen:** deel de sheet (knop **Delen** rechtsboven) met je eigen Google-account als
  **Bewerker**. Dan kun je er altijd bij, ook zonder het wachtwoord van het groepsaccount.
- **Script aangepast?** Plak de nieuwe [`apps-script.gs`](apps-script.gs) over de oude heen en sla op. Daarna
  Implementeren → *Implementaties beheren* → potloodje → Versie: *Nieuwe versie* → Implementeren. Zo blijft de URL
  hetzelfde. (Alleen opslaan is niet genoeg: de app praat met de geïmplementeerde versie.)
- **Pushmeldingen aanzetten** (vanaf app-versie 16), één keer:
  1. Plak de nieuwe `apps-script.gs` en sla op.
  2. Kies bovenin de functie **meldingenInstellen** en klik op **Uitvoeren**. Google vraagt opnieuw toestemming (nu ook
     voor "verbinding maken met een externe service": dat is het versturen van de meldingen, en voor triggers). Dit zet
     de ochtendcontrole aan (elke dag tussen 7 en 8 uur) en maakt het sleutelpaar voor de meldingen.
  3. Implementeer een nieuwe versie (zie hieronder).
  4. Op elke telefoon: Instellingen (tandwieltje) → **Meldingen aanzetten** → toestaan. Met **Testmelding** zie je meteen
     of het werkt. Op een iPhone alleen als de app op het beginscherm staat (iOS 16.4 of nieuwer).
  - Blad **telefoons**: wie meldingen krijgt (ja/nee per soort). Een regel weghalen = die telefoon krijgt niks meer
    (tot hij de app weer opent: dan meldt hij zich vanzelf opnieuw aan, als meldingen daar nog aan staan).
  - Scripteigenschappen **VAPID_D** en **VAPID_PUB** zijn het sleutelpaar. Niet aanpassen of weggooien: dan moet iedereen
    meldingen opnieuw aanzetten. **BERICHTEN** en **GEMELD** houdt het script zelf bij.
- **Keuringen** worden pas gedeeld als het script ze kent (vanaf app-versie 15). Met een ouder script blijven ze op de
  telefoon waar ze zijn ingevuld, met een melding in het machinevenster; na het bijwerken worden ze vanzelf verstuurd.
- **Code veranderen:** pas `GROEPSCODE` aan bij de scripteigenschappen. Iedereen moet dan de nieuwe code invullen
  (of een nieuwe link met groep krijgen).
