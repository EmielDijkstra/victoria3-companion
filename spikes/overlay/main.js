// Spike S3 (#3): overlay window above Victoria 3, built with Electron.
// Transparent, frameless, always on top, with global shortcuts and click-through
// everywhere except over the panels.
const { app, BrowserWindow, globalShortcut, ipcMain, screen } = require("electron");
const { createServer } = require("node:http");
const { readFile } = require("node:fs/promises");
const path = require("node:path");

const MOCKUP_DIR = path.join(__dirname, "..", "overlay-mockup");
const WIDTH = 412;
const LOCALHOST_PORT = 5179;

let win;
let side = "right"; // "right" | "left"
let fullyClickThrough = false; // Alt+C: also click through the panels

function place() {
  const area = screen.getPrimaryDisplay().workArea;
  const x = side === "right" ? area.x + area.width - WIDTH : area.x;
  win.setBounds({ x, y: area.y, width: WIDTH, height: area.height });
}

function setInteractive(interactive) {
  if (!win) return;
  // forward: true keeps mousemove events coming, so the page can tell us when
  // the cursor enters a panel again.
  if (interactive && !fullyClickThrough) win.setIgnoreMouseEvents(false);
  else win.setIgnoreMouseEvents(true, { forward: true });
}

function createWindow() {
  win = new BrowserWindow({
    width: WIDTH,
    height: 800,
    transparent: true,
    frame: false,
    resizable: false,
    skipTaskbar: true,
    hasShadow: false,
    alwaysOnTop: true,
    focusable: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  // "screen-saver" is the highest level; keeps the window above a borderless game.
  win.setAlwaysOnTop(true, "screen-saver");
  place();
  setInteractive(false);
  win.loadFile(path.join(MOCKUP_DIR, "index.html"), { query: { overlay: "1" } });
  // showInactive: do not steal focus from the game.
  win.once("ready-to-show", () => win.showInactive());
  // For checking the rendering without a screen grab: OVERLAY_CAPTURE=path.png
  if (process.env.OVERLAY_CAPTURE) {
    win.webContents.once("did-finish-load", () =>
      setTimeout(async () => {
        const image = await win.capturePage();
        await require("node:fs/promises").writeFile(process.env.OVERLAY_CAPTURE, image.toPNG());
        console.log("capture opgeslagen:", process.env.OVERLAY_CAPTURE, image.getSize());
      }, 1500),
    );
  }
}

function registerShortcuts() {
  const shortcuts = {
    // Show / hide the overlay
    "Alt+V": () => (win.isVisible() ? win.hide() : win.showInactive()),
    // Toggle full click-through (also through the panels)
    "Alt+C": () => {
      fullyClickThrough = !fullyClickThrough;
      setInteractive(false);
      win.webContents.send("state", { fullyClickThrough, side });
    },
    // Move the overlay to the other side of the screen
    "Alt+P": () => {
      side = side === "right" ? "left" : "right";
      place();
      win.webContents.send("state", { fullyClickThrough, side });
    },
  };
  for (const [accelerator, handler] of Object.entries(shortcuts)) {
    if (!globalShortcut.register(accelerator, handler)) {
      console.warn(`Sneltoets ${accelerator} kon niet worden geregistreerd (al in gebruik?)`);
    }
  }
}

// Same UI on localhost, to test the Steam overlay browser (Shift+Tab) or a tablet.
function startLocalhost() {
  const types = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript" };
  createServer(async (req, res) => {
    const name = path.basename(new URL(req.url, "http://x").pathname) || "index.html";
    try {
      const data = await readFile(path.join(MOCKUP_DIR, name));
      res.writeHead(200, { "content-type": types[path.extname(name)] ?? "application/octet-stream" }).end(data);
    } catch {
      res.writeHead(404).end("niet gevonden");
    }
  }).listen(LOCALHOST_PORT, "127.0.0.1", () =>
    console.log(`Overlay ook op http://localhost:${LOCALHOST_PORT}/`),
  );
}

ipcMain.on("set-interactive", (_event, interactive) => setInteractive(Boolean(interactive)));

app.whenReady().then(() => {
  createWindow();
  registerShortcuts();
  startLocalhost();
  console.log("Overlay draait. Alt+V tonen/verbergen · Alt+C klik-door · Alt+P links/rechts");
});

app.on("will-quit", () => globalShortcut.unregisterAll());
app.on("window-all-closed", () => app.quit());
