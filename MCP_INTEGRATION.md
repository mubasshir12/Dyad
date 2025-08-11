# MCP (Model Context Protocol) Integration

Diese Dokumentation beschreibt die Integration von MCP (Model Context Protocol) in Dyad, die es ermöglicht, externe Tools und Services über MCP-Server zu verwenden.

## Übersicht

Die MCP-Integration besteht aus mehreren Komponenten:

1. **MCPExtensionManager** - Verwaltet MCP-Extension-Konfigurationen
2. **MCPServerManager** - Verwaltet Verbindungen zu MCP-Servern
3. **AI SDK Integration** - Integriert MCP-Tools in die AI-Pipeline
4. **UI-Komponenten** - Benutzeroberfläche für Extension- und Tool-Verwaltung

## Architektur

### MCPExtensionManager

- Speichert Extension-Konfigurationen in `mcp-extensions.json`
- Verwaltet CRUD-Operationen für Extensions
- Unterstützt Custom- und NPM-Extensions

### MCPServerManager

- Verwaltet STDIO-Verbindungen zu MCP-Servern
- Implementiert Tool-Discovery über MCP-Protokoll
- Bietet Tool-Ausführung für AI SDK

### AI SDK Integration

- Konvertiert MCP-Tools in AI SDK ToolSet
- Integriert Tools in `streamText` Aufrufe
- Ermöglicht Tool-Ausführung während Chat-Streams

## Verwendung

### 1. Extension hinzufügen

Über die UI:

1. Gehe zu Extensions → "Custom Extension hinzufügen"
2. Fülle die Konfiguration aus:
   - **Name**: Name der Extension
   - **Beschreibung**: Beschreibung der Funktionalität
   - **Command**: Befehl zum Starten des MCP-Servers
   - **Args**: Argumente für den Befehl
   - **Env**: Umgebungsvariablen
   - **Timeout**: Timeout in Sekunden

### 2. Extension aktivieren

1. Gehe zu Extensions → Tab "MCP Tools"
2. Klicke "Verbinden" für die gewünschte Extension
3. Die verfügbaren Tools werden automatisch entdeckt

### 3. Tools verwenden

Die MCP-Tools sind automatisch in der AI verfügbar und können in Chat-Nachrichten verwendet werden.

## Test-Extension

Eine einfache Test-Extension ist in `test-mcp-server.js` verfügbar:

```bash
# Extension-Konfiguration:
{
  "name": "Test MCP Server",
  "description": "Simple test server for MCP integration",
  "command": "node",
  "args": ["test-mcp-server.js"],
  "env": {},
  "timeout": 30
}
```

## MCP-Protokoll

Die Integration unterstützt das MCP-Protokoll (Version 2024-11-05):

### Unterstützte Methoden

- `initialize` - Server-Initialisierung
- `tools/list` - Tool-Discovery
- `tools/call` - Tool-Ausführung

### Tool-Schema

```json
{
  "name": "tool_name",
  "description": "Tool description",
  "inputSchema": {
    "type": "object",
    "properties": {
      "param1": {
        "type": "string",
        "description": "Parameter description"
      }
    },
    "required": ["param1"]
  }
}
```

## Fehlerbehebung

### Häufige Probleme

1. **Server startet nicht**

   - Überprüfe Command und Args
   - Stelle sicher, dass der Befehl verfügbar ist
   - Prüfe Umgebungsvariablen

2. **Tools werden nicht entdeckt**

   - Überprüfe Server-Logs
   - Stelle sicher, dass der Server MCP-Protokoll implementiert
   - Prüfe `tools/list` Response

3. **Tool-Ausführung schlägt fehl**
   - Überprüfe Tool-Schema
   - Stelle sicher, dass Parameter korrekt übergeben werden
   - Prüfe Server-Logs für Fehlerdetails

### Logs

MCP-bezogene Logs findest du unter:

- `mcp-extension-manager` - Extension-Management
- `mcp-server-manager` - Server-Verbindungen
- `mcp-handlers` - IPC-Handler

## Entwicklung

### Neue MCP-Server hinzufügen

1. Implementiere das MCP-Protokoll in deinem Server
2. Erstelle eine Extension-Konfiguration
3. Teste die Integration über die UI

### Erweiterte Features

Mögliche Erweiterungen:

- HTTP-basierte MCP-Server
- Tool-Caching
- Erweiterte Fehlerbehandlung
- Tool-Parameter-Validierung

## Sicherheit

- MCP-Server laufen im Main-Prozess
- Überprüfe Commands und Args vor der Ausführung
- Validiere Tool-Parameter
- Implementiere Timeouts für Tool-Ausführung
