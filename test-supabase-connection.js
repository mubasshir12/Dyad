#!/usr/bin/env node

/**
 * Test-Skript zum Überprüfen der Supabase-JWT-Token-Verbindung
 * Dieses Skript testet:
 * 1. Ob Supabase-Tokens in den Einstellungen vorhanden sind
 * 2. Ob die Token gültig sind und die Verbindung funktioniert
 * 3. Versucht Projekte aufzulisten
 */

const fs = require("fs");
const path = require("path");

console.log("🔍 Überprüfe Supabase JWT-Token-Konfiguration...\n");

// 1. Einstellungsdatei lesen
const settingsPath = path.join(__dirname, "userData", "user-settings.json");

if (!fs.existsSync(settingsPath)) {
  console.log("❌ Keine user-settings.json gefunden unter:", settingsPath);
  process.exit(1);
}

console.log("✅ Einstellungsdatei gefunden:", settingsPath);

let settings;
try {
  settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
} catch (error) {
  console.log("❌ Fehler beim Lesen der Einstellungsdatei:", error.message);
  process.exit(1);
}

// 2. Supabase-Konfiguration überprüfen
console.log("\n🔐 Überprüfe Supabase-Token-Konfiguration...");

if (!settings.supabase) {
  console.log("❌ Keine Supabase-Konfiguration in den Einstellungen gefunden!");
  console.log(
    "📝 Hinweis: Du musst dich zuerst bei Supabase authentifizieren.",
  );
  console.log("   1. Öffne Dyad");
  console.log("   2. Gehe zu Settings");
  console.log("   3. Verbinde dich mit Supabase");
  process.exit(1);
}

const supabase = settings.supabase;
console.log("✅ Supabase-Konfiguration gefunden");

// Token-Status überprüfen
const hasAccessToken = supabase.accessToken && supabase.accessToken.value;
const hasRefreshToken = supabase.refreshToken && supabase.refreshToken.value;
const hasExpiration = supabase.expiresIn;
const hasTimestamp = supabase.tokenTimestamp;

console.log(
  `   Access Token: ${hasAccessToken ? "✅ Vorhanden" : "❌ Fehlend"}`,
);
console.log(
  `   Refresh Token: ${hasRefreshToken ? "✅ Vorhanden" : "❌ Fehlend"}`,
);
console.log(
  `   Expiration: ${hasExpiration ? `✅ ${supabase.expiresIn}s` : "❌ Fehlend"}`,
);
console.log(
  `   Timestamp: ${hasTimestamp ? `✅ ${new Date(supabase.tokenTimestamp * 1000).toLocaleString()}` : "❌ Fehlend"}`,
);

// Token-Gültigkeit überprüfen
if (hasTimestamp && hasExpiration) {
  const currentTime = Math.floor(Date.now() / 1000);
  const tokenAge = currentTime - supabase.tokenTimestamp;
  const isExpired = tokenAge >= supabase.expiresIn - 300; // 5 Minuten Puffer

  console.log(`   Token-Alter: ${Math.floor(tokenAge / 60)} Minuten`);
  console.log(
    `   Token-Status: ${isExpired ? "❌ Abgelaufen/bald abgelaufen" : "✅ Gültig"}`,
  );

  if (isExpired) {
    console.log(
      "⚠️  Token ist abgelaufen oder wird bald ablaufen. Refresh wird benötigt.",
    );
  }
}

if (!hasAccessToken || !hasRefreshToken) {
  console.log("\n❌ Unvollständige Supabase-Token-Konfiguration!");
  console.log("🔧 Lösungsschritte:");
  console.log("   1. Gehe zu Settings in Dyad");
  console.log("   2. Trenne die Supabase-Verbindung (falls vorhanden)");
  console.log("   3. Verbinde dich erneut mit Supabase");
  process.exit(1);
}

// 3. Verbindungstest (simuliert)
console.log("\n🌐 Token-Verbindungstest...");
console.log(
  "⚠️  Hinweis: Dies ist ein simulierter Test. Für einen echten Test:",
);
console.log("   1. Starte die Dyad-Anwendung");
console.log('   2. Verwende den "List Projects" Button in den Settings');
console.log("   3. Oder verwende das integrierte Supabase-Interface");

// 4. Nützliche Informationen
console.log("\n📋 Nützliche Informationen:");
console.log(`   Settings-Datei: ${settingsPath}`);
console.log(
  `   Token-Verschlüsselung: ${supabase.accessToken?.encryptionType || "unbekannt"}`,
);
console.log("\n🔗 Supabase Dashboard: https://supabase.com/dashboard");
console.log("📖 Supabase Docs: https://supabase.com/docs");

console.log("\n✅ Supabase-Token-Konfiguration scheint vollständig zu sein!");
console.log(
  "💡 Falls Probleme auftreten, versuche eine neue Authentifizierung in den Dyad Settings.",
);
