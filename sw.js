// Werkplaatsbord service worker: nodig om als app te installeren, en de app zelf opent ook zonder bereik.
// Verkeer naar de groep (script.google.com) gaat er niet doorheen.
const CACHE = "werkplaatsbord-v13";
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
