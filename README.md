# Google Reviews Auto-Updater für Webflow

Automatisiere die Aktualisierung deiner Google-Bewertungen auf deiner Webflow-Website. Täglich werden deine Google Reviews gescraped und automatisch in Webflow aktualisiert — keine manuelle Arbeit, keine veralteten Zahlen.


## Dateien

```
google-reviews-updater/
├── README.md                                    # Diese Datei
├── QUICK-START.md                               # 15-Min Setup-Anleitung
├── SETUP-ANLEITUNG.md                           # Ausführliche Dokumentation
├── package.json                                 # NPM Dependencies
├── google-reviews-updater.js                    # Basis-Script (mit Regex)
├── google-reviews-updater-advanced.js           # Erweitert (mit Cheerio + Retries)
└── .github/
    └── workflows/
        └── update-google-reviews.yml            # GitHub Actions Workflow
```

### Script-Versionen

**`google-reviews-updater.js`** (Empfohlen für Start)
- Einfach & zuverlässig
- Regex-basiertes HTML-Parsing
- Keine Dependencies
- ~100 Zeilen Code

**`google-reviews-updater-advanced.js`** (Für mehr Robustheit)
- Besseres HTML-Parsing (mit Cheerio optional)
- Automatische Retries bei Rate Limits
- Mehrere Fallback-Strategien
- Detailliertes Logging

---

## 🚀 Quick Start

**1. IDs sammeln:**
```bash
# Gehe zu Webflow → Settings und kopiere deine IDs
export WEBFLOW_API_KEY="xxx"
export WEBFLOW_SITE_ID="xxx"
export WEBFLOW_PAGE_ID="xxx"
export WEBFLOW_VAR_COLLECTION_ID="xxx"
```

**2. Script testen:**
```bash
node google-reviews-updater.js
```

**3. GitHub Actions aktivieren:**
- Repository erstellen
- Secrets in GitHub hinzufügen
- `.github/workflows/update-google-reviews.yml` hochladen

** Siehe `QUICK-START.md` für vollständige Anleitung**

---

##  Konfiguration

### Environment-Variablen

| Variable | Beschreibung | Pflicht? |
|----------|-------------|---------|
| `WEBFLOW_API_KEY` | Dein Webflow API Token | ✅ Ja |
| `WEBFLOW_SITE_ID` | Deine Webflow Site ID | ✅ Ja |
| `WEBFLOW_PAGE_ID` | Seiten-ID für JSON-LD Update | ⚠️ Optional |
| `WEBFLOW_VAR_COLLECTION_ID` | Variable Collection ID | ✅ Ja |
| `FALLBACK_REVIEW_COUNT` | Fallback-Wert bei Fehler (Advanced nur) | ⚠️ Optional |
| `RATING_VALUE` | Durchschnittliche Bewertung für JSON-LD | ⚠️ Optional |

### Schedule anpassen

In `.github/workflows/update-google-reviews.yml`:

```yaml
schedule:
  # Jeden Tag um 08:00 UTC
  - cron: '0 8 * * *'
  
  # Beispiele:
  # Montag-Freitag: '0 8 * * 1-5'
  # Jede Stunde: '0 * * * *'
  # Alle 6 Std: '0 */6 * * *'
```

---

## Wie es funktioniert

```
1. GitHub Actions triggert täglich
2. Node.js Script startet
3. Google Store Page wird gescraped
4. Review-Zahl extrahiert (Regex oder Cheerio)
5. Webflow API aufgerufen
6. Variable aktualisiert
7. JSON-LD Schema erneuert
8. Logs an GitHub Actions Report
```



---

##  Sicherheit

- **API Keys sind sicher:** GitHub Secrets sind verschlüsselt
- **Keine sensiblen Daten in Code:** Nur Environment-Variablen
- **Rate Limits beachtet:** Script mit Retries & Backoff
- **Fehlerverfolgung:** Alle Fehler werden geloggt

---

##  Troubleshooting

### "Konnte Review-Zahl nicht extrahieren"
Google aktualisiert regelmäßig sein HTML. Die Regex in `google-reviews-updater.js` (Zeile ~75) muss angepasst werden:

1. Besuche: https://www.google.com/storepages?q=hopkins.law&c=DE
2. Öffne DevTools (F12) → Elements
3. Suche nach der Review-Zahl im HTML
4. Update die Regex im Script

### "WEBFLOW_API_KEY nicht gesetzt"
Stelle sicher, dass alle Secrets in GitHub konfiguriert sind:
1. Repo → Settings → Secrets and variables → Actions
2. Alle 4 Required Secrets sollten dort sein

### "Rate Limited (HTTP 429)"
Google blockiert dich kurzzeitig. Das Script hat automatische Retries:
1. Warte 1-2 Minuten
2. Script versucht es automatisch wieder
3. Bei persistentem Problem: Proxy-Service nutzen

---

##  Erweiterungen

Diese Varianten sind möglich:

### Rating extrahieren (nicht nur Zahl)
```javascript
const ratingMatch = html.match(/rating["\s:]*(\d\.?\d?)/i);
const rating = parseFloat(ratingMatch[1]);
```

### Mehrsprachige Reviews
```javascript
const urls = {
  de: 'https://www.google.com/storepages?q=hopkins.law&c=DE',
  en: 'https://www.google.com/storepages?q=hopkins.law&c=US'
};
// Beide URLs scrapen → durchschnittliche Review-Zahl nutzen
```

### Slack/E-Mail Benachrichtigungen
```javascript
// Nach erfolgreichem Update:
await fetch(process.env.SLACK_WEBHOOK, {
  method: 'POST',
  body: JSON.stringify({ text: ` Reviews aktualisiert: ${reviewCount}` })
});
```

### Dashboard mit Historischen Daten
```javascript
// Reviews in Webflow CMS speichern (zeitbasiert)
// Nachher: Graph der Review-Entwicklung anzeigen
```

---
