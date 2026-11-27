// Werkplaatsbord service worker: nodig om als app te installeren, en de app zelf opent ook zonder bereik.
// Verkeer naar de groep (script.google.com) gaat er niet doorheen.
const CACHE = "werkplaatsbord-v41";
const SHELL = ["./", "./index.html", "./installeren.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png",
  "./fonts/barlow-latin-400-normal.woff2", "./fonts/barlow-latin-500-normal.woff2", "./fonts/barlow-latin-600-normal.woff2"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  // Alleen eigen oude caches opruimen: de Perceelkaart en de Zaaihulp staan op hetzelfde domein
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith("werkplaatsbord-") && k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

// Eigen bestanden: eerst netwerk (altijd de nieuwste versie), anders uit de cache
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  if (!new URL(e.request.url).pathname.startsWith(new URL(self.registration.scope).pathname)) return;
  e.respondWith(
    fetch(e.request.url, { cache: "no-cache", redirect: e.request.mode === "navigate" ? "manual" : "follow" })
      .then(res => { const copy = res.clone(); if (res.ok) caches.open(CACHE).then(c => c.put(e.request, copy)); return res; })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then(m => m || caches.match("./index.html")))
  );
});

// Pushmeldingen: de push zelf is leeg. Haal de tekst op bij het groepsscript (adres, code en apparaat staan in de cache
// "wpb-push", gezet door de app) en laat de nieuwe berichten zien. Lukt dat niet, dan een algemene melding.
self.addEventListener("push", e => e.waitUntil(toonBerichten()));
async function toonBerichten() {
  let getoond = 0;
  try {
    const c = await caches.open("wpb-push"), r = await c.match("config"), cfg = r && await r.json();
    if (cfg && cfg.url && cfg.code) {
      const res = await fetch(cfg.url + "?code=" + encodeURIComponent(cfg.code) + "&apparaat=" + encodeURIComponent(cfg.apparaat || "") + "&berichten=" + (cfg.laatst || 0), { cache: "no-store" });
      const j = await res.json();
      for (const b of (j && j.berichten || []).slice(-4)) {
        await self.registration.showNotification(b.titel || "Werkplaatsbord", { body: b.tekst || "", tag: b.id, icon: "icon-192.png", badge: "icon-192.png", data: { url: "./" } });
        getoond++; cfg.laatst = Math.max(cfg.laatst || 0, b.t || 0);
      }
      if (getoond) await c.put("config", new Response(JSON.stringify(cfg), { headers: { "Content-Type": "application/json" } }));
    }
  } catch (err) {}
  if (!getoond) await self.registration.showNotification("Werkplaatsbord", { body: "Er is iets nieuws. Tik om te kijken.", tag: "wpb-algemeen", icon: "icon-192.png", badge: "icon-192.png" });
}
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(lijst => {
    const w = lijst.find(c => c.url.startsWith(self.registration.scope));
    return w ? w.focus() : self.clients.openWindow(self.registration.scope);
  }));
});
