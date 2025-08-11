# Dependency Management Analyse - dyad-v2

## Problem Diagnose

Das Projekt hat ein gemischtes Package Manager Setup, das zu CI-Problemen führt:

### 1. **Gemischte Package Manager**

- **Hauptprojekt**: npm (package-lock.json)
- **scaffold/**: pnpm (pnpm-lock.yaml)
- **CI**: versucht sowohl npm als auch pnpm zu verwenden
- **Veralteter bun.lockb** wurde bereits entfernt

### 2. **CI-Konfiguration Analyse**

Die CI (.github/workflows/ci.yml) macht folgendes:

- Zeile 42: `cache-dependency-path: package-lock.json` (npm)
- Zeile 44: `npm ci --no-audit --no-fund --progress=false`
- Zeile 57-60: Setup pnpm
- Zeile 77: `cd scaffold && pnpm install`
- Zeile 79: `cd nextjs-template && pnpm install`

### 3. **Getestete Installationen**

✅ **Funktioniert lokal:**

- `npm install --force` im Hauptverzeichnis
- `pnpm install` in scaffold/
- `pnpm install` in nextjs-template (geklont)

### 4. **CI Hash-Probleme**

Die CI verwendet:

```yaml
key: ${{ matrix.os.name }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}
```

Dies könnte Probleme verursachen, da mehrere pnpm-lock.yaml Dateien existieren:

- scaffold/pnpm-lock.yaml
- e2e-tests/fixtures/.../pnpm-lock.yaml

## Lösungsschritte

### Schritt 1: Lockfile-Konsistenz sicherstellen ✅

```bash
# Bereits durchgeführt:
rm bun.lockb
rm scaffold/package-lock.json  # pnpm hat Vorrang in diesem Verzeichnis
```

### Schritt 2: pnpm-lock.yaml Aktualisierung

```bash
cd scaffold
pnpm install --frozen-lockfile=false  # Neuauflösung erzwingen
```

### Schritt 3: CI-Caching verbessern

Spezifischere Cache-Schlüssel für verschiedene Projektteile.

## Empfohlene CI-Verbesserungen

### Option A: Verbessertes Caching (empfohlen)

```yaml
- name: Setup pnpm cache (scaffold)
  uses: actions/cache@v4
  with:
    path: ${{ steps.pnpm-cache.outputs.STORE_PATH }}
    key: ${{ matrix.os.name }}-pnpm-scaffold-${{ hashFiles('scaffold/pnpm-lock.yaml') }}

- name: Setup pnpm cache (nextjs-template)
  uses: actions/cache@v4
  with:
    path: ${{ steps.pnpm-cache.outputs.STORE_PATH }}
    key: ${{ matrix.os.name }}-pnpm-nextjs-${{ hashFiles('nextjs-template/pnpm-lock.yaml') }}
```

### Option B: Vereinheitlichtes Package Management

Alles auf npm umstellen (größere Änderung, nicht empfohlen für aktuelles Problem).

## Sofortige Fixes

1. **Frozen Lockfile für CI erzwingen**:

   ```bash
   cd scaffold && pnpm install --frozen-lockfile
   cd nextjs-template && pnpm install --frozen-lockfile
   ```

2. **Cache-Invalidierung bei Problemen**:
   CI-Cache bei persistenten Problemen manuell löschen.

## Getestete Versionen

- pnpm: v10.12.1
- Node: >=20 (aus package.json engines)
- npm: funktioniert mit --force flag

## Status

- ✅ Lokale Installationen funktionieren
- ✅ bun.lockb entfernt
- ✅ Gemischte npm/pnpm lockfiles bereinigt
- ⏳ CI-Tests ausstehend
