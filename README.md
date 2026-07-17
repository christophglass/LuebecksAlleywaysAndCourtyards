# Luebecks Gaenge und Hoefe

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
