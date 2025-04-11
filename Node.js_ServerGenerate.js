// ExpressベースのNode.jsサーバー（Railway対応 & Minecraft設定反映付きZIP生成）
const express = require("express");
const fs = require("fs");
const path = require("path");
const archiver = require("archiver");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static("public")); // フロントエンド用のHTML, CSS, JS配置ディレクトリ

// サーバーZIP生成API（設定付き）
app.post("/create-server", (req, res) => {
  const settings = req.body;

  const outputPath = path.join(__dirname, "server_output.zip");
  const output = fs.createWriteStream(outputPath);
  const archive = archiver("zip", { zlib: { level: 9 } });

  output.on("close", () => {
    res.download(outputPath);
  });

  archive.on("error", (err) => {
    res.status(500).send("ZIP作成中にエラー: " + err.message);
  });

  archive.pipe(output);

  // --- サーバー設定ファイル作成 ---
  const serverProperties = [
    `server-port=25565`,
    `gamemode=${settings.gamemode || "survival"}`,
    `enable-command-block=${settings.commandBlock ? "true" : "false"}`,
    `send-command-feedback=${settings.sendCommandFeedback ? "true" : "false"}`,
    `command-block-output=${settings.commandBlockOutput ? "true" : "false"}`,
    `log-deaths=${settings.logDeaths ? "true" : "false"}`,
    `fall-damage=${settings.fallDamage ? "true" : "false"}`,
    `fire-damage=${settings.fireDamage ? "true" : "false"}`,
    `freeze-damage=${settings.freezeDamage ? "true" : "false"}`
  ].join("\n");
  archive.append(serverProperties, { name: "server.properties" });

  // 起動スクリプト
  archive.append("#!/bin/bash\njava -Xmx2G -jar spigot.jar nogui\n", { name: "start.sh" });

  // Geyser・Spigotファイル
  archive.append("SPIGOT PLACEHOLDER", { name: "spigot.jar" });
  archive.append("GEYSER PLACEHOLDER", { name: "plugins/Geyser-Spigot.jar" });
  archive.append(`bedrock:\n  address: 0.0.0.0\n  port: 19132\n`, { name: "plugins/Geyser-Spigot/config.yml" });

  // 管理者追加処理（統合版UUIDまたはIP対応）
  if (Array.isArray(settings.admins)) {
    const adminList = settings.admins.map((a) => `${a.name || a.uuid || a.ip}`).join("\n");
    archive.append(adminList, { name: "ops.txt" });
  }

  // コマンド実行ログ用（オプション）
  if (settings.commands && Array.isArray(settings.commands)) {
    const commandsText = settings.commands.join("\n");
    archive.append(commandsText, { name: "init_commands.txt" });
  }

  archive.finalize();
});

// スリープ防止用
app.get("/ping", (req, res) => {
  res.send("OK");
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
