# Groep instellen (Google Sheet)

Met de groep ziet iedereen in de werkplaats dezelfde storingen, machines en onderhoud, met de foto's erbij.
Alles komt in één Google Sheet; de app stuurt en haalt op via een klein script in die sheet.
Eenmalig instellen, daarna gaat het vanzelf. Dit is een eigen groep, los van de Perceelkaart en de Zaaihulp.

## 1. Sheet maken
1. Log in bij Google (het mag hetzelfde account als voor de groep van de Perceelkaart).
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
   (Google waarschuwt omdat het een eigen script is; het script kan alleen bij deze ene sheet.)
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
- Foto's worden verkleind (ongeveer 100 kB per foto) en staan in het blad **fotos**. Een telefoon haalt een foto pas
  op als iemand hem bekijkt, en bewaart hem daarna zelf.

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
- **Foto's opruimen:** in de Apps Script-editor de functie `fotosOpruimen` kiezen en *Uitvoeren*. Dat haalt foto's
  weg van storingen die verwijderd zijn. Afgevinkte storingen houden hun foto's.
- **Script aangepast?** Implementeren → *Implementaties beheren* → potloodje → Versie: *Nieuwe versie* →
  Implementeren. Zo blijft de URL hetzelfde.
- **Code veranderen:** pas `GROEPSCODE` aan bij de scripteigenschappen. Iedereen moet dan de nieuwe code invullen
  (of een nieuwe link met groep krijgen).
