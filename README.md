# Luebecks Gaenge und Hoefe

Die Oberflaeche unterstuetzt Deutsch und Englisch. Die Uebersetzungen liegen in `src/assets/i18n/de.json` und `src/assets/i18n/en.json`.

Ionic-Angular-App fuer die Gänge, Höfe und Torwege der Lübecker Altstadt.

## Entwicklung

```bash
npm install
npm start
```

Die App ist danach unter `http://localhost:8100/` erreichbar.

## Capacitor

```bash
npx cap add android
npm run build
npx cap sync android
npx cap open android
```

Die Daten liegen in `src/assets/data/gaenge_und_hoefe_luebeck.json`. Die Kartenansicht nutzt zunächst OpenStreetMap als vorbereiteten Kartenbereich; Fußgängernavigation und verifizierte Kartenmarker werden darauf aufbauend ergänzt.
