// Service worker mínimo: no cachea nada, sólo existe porque Chrome exige uno
// registrado (con un handler de `fetch`) para considerar la página
// instalable y disparar `beforeinstallprompt`. Cachear el catálogo para uso
// sin conexión queda para más adelante.
self.addEventListener('fetch', () => {});
