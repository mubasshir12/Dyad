#!/usr/bin/env node

/**
 * Skript zur Reparatur der Supabase-JWT-Token-Konfiguration
 * Dieses Skript hilft dabei, die Supabase-Authentifizierung zu reparieren.
 */

const fs = require("fs");
const path = require("path");

console.log("🔧 Supabase JWT-Token-Konfiguration Reparatur-Tool\n");

const settingsPath = path.join(__dirname, "userData", "user-settings.json");

// Backup der aktuellen Einstellungen erstellen
function createBackup() {
  if (fs.existsSync(settingsPath)) {
    const backupPath = settingsPath + ".backup." + Date.now();
    fs.copyFileSync(settingsPath, backupPath);
    console.log("✅ Backup erstellt:", backupPath);
    return backupPath;
  }
  return null;
}

// Hauptfunktion
function main() {
  console.log("🔍 Analysiere aktuelle Konfiguration...\n");

  if (!fs.existsSync(settingsPath)) {
    console.log("❌ Keine user-settings.json gefunden unter:", settingsPath);
    console.log(
      "💡 Die Anwendung muss mindestens einmal gestartet worden sein.",
    );
    return;
  }

  // Backup erstellen
  const backupPath = createBackup();

  // Aktuelle Einstellungen lesen
  let settings;
  try {
    settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
  } catch (error) {
    console.log("❌ Fehler beim Lesen der Einstellungsdatei:", error.message);
    return;
  }

  console.log("📊 Aktuelle Konfiguration:");
  console.log(
    `   Supabase: ${settings.supabase ? "✅ Vorhanden (aber möglicherweise ungültig)" : "❌ Nicht konfiguriert"}`,
  );
  console.log(
    `   Neon: ${settings.neon ? "✅ Vorhanden" : "❌ Nicht konfiguriert"}`,
  );

  // Problem-Diagnose
  console.log("\n🔬 Problem-Diagnose:");

  if (!settings.supabase) {
    console.log("❌ HAUPTPROBLEM: Keine Supabase-Konfiguration gefunden");
    console.log("\n🔧 LÖSUNGSSCHRITTE:");
    console.log("   1. Öffne die Dyad-Anwendung");
    console.log("   2. Gehe zu Settings (⚙️ Symbol)");
    console.log('   3. Scrolle zum Bereich "Integrations"');
    console.log('   4. Klicke auf "Connect to Supabase"');
    console.log("   5. Folge dem OAuth-Flow zur Authentifizierung");
    console.log("   6. Wähle die gewünschten Projekte aus");

    console.log("\n🌐 Supabase Dashboard öffnen:");
    console.log("   - Gehe zu: https://supabase.com/dashboard");
    console.log("   - Stelle sicher, dass du angemeldet bist");
    console.log("   - Überprüfe deine Projekte");
  } else {
    const supabase = settings.supabase;
    const hasAccessToken = supabase.accessToken?.value;
    const hasRefreshToken = supabase.refreshToken?.value;

    console.log(
      "⚠️  Supabase-Konfiguration vorhanden, aber möglicherweise fehlerhaft:",
    );
    console.log(`   Access Token: ${hasAccessToken ? "✅" : "❌"}`);
    console.log(`   Refresh Token: ${hasRefreshToken ? "✅" : "❌"}`);
    console.log(`   Expires In: ${supabase.expiresIn || "Nicht gesetzt"}`);
    console.log(
      `   Token Timestamp: ${supabase.tokenTimestamp ? new Date(supabase.tokenTimestamp * 1000).toLocaleString() : "Nicht gesetzt"}`,
    );

    if (supabase.tokenTimestamp && supabase.expiresIn) {
      const currentTime = Math.floor(Date.now() / 1000);
      const isExpired =
        currentTime >= supabase.tokenTimestamp + supabase.expiresIn - 300;
      console.log(
        `   Token-Status: ${isExpired ? "❌ Abgelaufen" : "✅ Gültig"}`,
      );
    }

    console.log("\n🔧 LÖSUNGSSCHRITTE für fehlerhafte Token:");
    console.log("   1. Öffne die Dyad-Anwendung");
    console.log("   2. Gehe zu Settings");
    console.log('   3. Klicke auf "Disconnect" bei Supabase (falls vorhanden)');
    console.log('   4. Klicke erneut auf "Connect to Supabase"');
    console.log("   5. Durchlaufe den OAuth-Flow erneut");
  }

  // Zusätzliche Checks
  console.log("\n🔍 Zusätzliche Checks:");

  // Check für .env Dateien
  const possibleEnvFiles = [
    ".env",
    ".env.local",
    ".env.production",
    ".env.development",
  ];
  const foundEnvFiles = possibleEnvFiles.filter((file) =>
    fs.existsSync(path.join(__dirname, file)),
  );

  if (foundEnvFiles.length > 0) {
    console.log("📁 Gefundene .env Dateien:");
    foundEnvFiles.forEach((file) => {
      console.log(`   - ${file}`);
      // Check für Supabase-relevante Variablen
      const content = fs.readFileSync(path.join(__dirname, file), "utf8");
      const hasSupabaseVars =
        content.includes("SUPABASE") || content.includes("JWT");
      console.log(
        `     ${hasSupabaseVars ? "⚠️  Enthält möglicherweise Supabase-Variablen" : "✅ Keine Supabase-Variablen"}`,
      );
    });
  } else {
    console.log("✅ Keine .env Dateien gefunden (das ist normal für Dyad)");
  }

  console.log("\n📖 Nützliche Links:");
  console.log("   🔗 Supabase Dashboard: https://supabase.com/dashboard");
  console.log("   📚 Dyad Docs: https://docs.dyad.sh");
  console.log("   🆘 Support: https://github.com/dyad-sh/dyad/issues");

  console.log(
    `\n💾 Backup der Einstellungen: ${backupPath || "Nicht erstellt"}`,
  );
  console.log("\n✅ Analyse abgeschlossen!");
  console.log(
    '🔄 Nach der Reparatur führe "node test-supabase-connection.js" aus, um zu testen.',
  );
}

main();
