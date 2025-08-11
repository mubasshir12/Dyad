# Supabase JWT-Authentifizierungsprobleme lösen

## 🔍 Problem identifiziert

Die Analyse hat gezeigt, dass **keine Supabase-JWT-Token in der Konfiguration** vorhanden sind. Dies ist die Hauptursache für alle Supabase-Verbindungsprobleme.

### Aktuelle Situation:

- ✅ **Neon-Token vorhanden** (funktioniert korrekt)
- ❌ **Supabase-Token fehlen komplett** (Hauptproblem)
- ✅ **Keine .env-Konflikte gefunden**
- ✅ **Backup der Einstellungen erstellt**

## 🔧 Lösungsschritte

### Schritt 1: Supabase-Authentifizierung in Dyad

1. **Dyad-Anwendung öffnen**

   ```bash
   npm run dev
   # oder falls gebaut:
   npm start
   ```

---

2. **Zu den Einstellungen navigieren**

   - Klicke auf das ⚙️ Settings-Symbol
   - Scrolle zum Bereich "Integrations"

3. **Supabase verbinden**

   - Klicke auf "Connect to Supabase"
   - Folge dem OAuth-Flow
   - **Wichtig:** Authentifiziere dich mit deinen Supabase-Dashboard-Zugangsdaten

4. **Projekte auswählen**
   - Wähle die Projekte aus, die du in Dyad verwenden möchtest
   - Bestätige die Auswahl

### Schritt 2: Token-Gültigkeit überprüfen

Nach der Authentifizierung führe den Test aus:

```bash
node test-supabase-connection.js
```

**Erwartete Ausgabe nach erfolgreicher Authentifizierung:**

```
✅ Supabase-Konfiguration gefunden
   Access Token: ✅ Vorhanden
   Refresh Token: ✅ Vorhanden
   Expiration: ✅ 3600s
   Timestamp: ✅ [aktuelles Datum]
   Token-Status: ✅ Gültig
```

### Schritt 3: Projekte auflisten testen

In der Dyad-Anwendung:

1. Gehe zu den Einstellungen
2. Klicke auf "List Projects" im Supabase-Bereich
3. Überprüfe, ob deine Projekte angezeigt werden

## 🔄 Alternative Lösung: Manueller Token-Reset

Falls die OAuth-Authentifizierung nicht funktioniert:

### 1. Bestehende Verbindung trennen

```bash
# Dyad öffnen → Settings → Supabase → "Disconnect"
```

### 2. Cache leeren (optional)

```bash
# Anwendung schließen und Neustart
```

### 3. Erneut verbinden

- Folge wieder dem OAuth-Flow
- Stelle sicher, dass du im Supabase Dashboard angemeldet bist

## 📋 Troubleshooting

### Problem: OAuth-Flow schlägt fehl

**Lösung:**

1. Öffne https://supabase.com/dashboard in deinem Browser
2. Stelle sicher, dass du angemeldet bist
3. Überprüfe, ob du mindestens ein Projekt hast
4. Versuche die Verbindung erneut

### Problem: "Token expired" Fehler

**Lösung:**

- Token werden automatisch erneuert
- Bei persistenten Problemen: Verbindung trennen und neu aufbauen

### Problem: Keine Projekte sichtbar

**Lösung:**

1. Überprüfe deine Berechtigung in Supabase
2. Stelle sicher, dass die Projekte nicht archiviert sind
3. Prüfe den Account im Dashboard

## 🔍 Diagnose-Tools

### Konfiguration überprüfen:

```bash
node test-supabase-connection.js
```

### Vollständige Analyse:

```bash
node fix-supabase-auth.js
```

## 📁 Wichtige Dateien

- **Konfiguration:** `userData/user-settings.json`
- **Backup:** `userData/user-settings.json.backup.[timestamp]`
- **Supabase-Client:** `src/supabase_admin/supabase_management_client.ts`
- **Token-Handler:** `src/ipc/handlers/supabase_handlers.ts`

## 🌐 Nützliche Links

- **Supabase Dashboard:** https://supabase.com/dashboard
- **Dyad Dokumentation:** https://docs.dyad.sh
- **Support/Issues:** https://github.com/dyad-sh/dyad/issues

## ✅ Erfolgreiche Authentifizierung testen

Nach der Konfiguration sollten folgende Funktionen arbeiten:

1. **Projekte auflisten:** Settings → Supabase → "List Projects"
2. **SQL-Queries ausführen:** Über das integrierte Interface
3. **Tabellen-Schema abrufen:** Automatisch in Prompts verfügbar
4. **Migrations erstellen:** SQL-Dateien generieren

## 🚨 Wichtige Hinweise

- **Backup:** Ein Backup wurde automatisch erstellt: `userData/user-settings.json.backup.[timestamp]`
- **Tokens verschlüsselt:** Alle Tokens werden mit Electron's safeStorage verschlüsselt gespeichert
- **Auto-Refresh:** Token werden automatisch erneuert vor Ablauf
- **Keine .env nötig:** Dyad verwendet die internen Settings, keine .env-Dateien erforderlich

---

**Status:** ✅ **Problem identifiziert und Lösungsschritte bereitgestellt**

Nach Befolgung dieser Schritte sollte die Supabase-Integration vollständig funktionieren.
