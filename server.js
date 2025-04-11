const express = require("express");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const multer = require("multer");
const AdmZip = require("adm-zip");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const upload = multer({ dest: "uploads/" });

app.post("/generate", (req, res) => {
  const serverDir = path.join(__dirname, "server");
  if (!fs.existsSync(serverDir)) fs.mkdirSync(serverDir, { recursive: true });

  fs.copyFileSync("./files/spigot.jar", path.join(serverDir, "spigot.jar"));
  fs.mkdirSync(path.join(serverDir, "plugins"), { recursive: true });
  fs.copyFileSync("./files/Geyser-Spigot.jar", path.join(serverDir, "plugins/Geyser-Spigot.jar"));

  fs.writeFileSync(path.join(serverDir, "eula.txt"), "eula=true");

  const properties = \`
enable-command-block=true
gamemode=survival
online-mode=false
motd=Railway Minecraft Server
\`;
  fs.writeFileSync(path.join(serverDir, "server.properties"), properties.trim());

  const mc = spawn("java", ["-Xmx1G", "-Xms1G", "-jar", "spigot.jar", "nogui"], {
    cwd: serverDir,
    shell: true,
  });

  mc.stdout.on("data", data => console.log("[MC]", data.toString()));
  mc.stderr.on("data", data => console.error("[ERR]", data.toString()));
  mc.on("close", code => console.log("Exited with code", code));

  res.send("Server generated and started!");
});

app.post("/download-settings", (req, res) => {
  const zip = new AdmZip();
  zip.addLocalFolder("./server", "server");
  const zipPath = "./server-settings.zip";
  zip.writeZip(zipPath);
  res.download(zipPath);
});

app.post("/upload-settings", upload.single("settingsZip"), (req, res) => {
  const zip = new AdmZip(req.file.path);
  zip.extractAllTo("./server", true);
  res.send("Settings uploaded and extracted.");
});

app.listen(port, () => {
  console.log("Server listening on port", port);
});
