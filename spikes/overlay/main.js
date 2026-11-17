// Spike S3 (#3): overlay window above Victoria 3, built with Electron.
// Small, transparent, frameless, always on top. Starts as a collapsed "tip",
// can be dragged anywhere (position is remembered), collapsed or hidden.
const { app, BrowserWindow, globalShortcut, ipcMain, screen } = require("electron");
const { createServer } = require("node:http");
const { readFile, writeFile } = require("node:fs/promises");
const { readFileSync } = require("node:fs");
const path = require("node:path");

const MOCKUP_DIR = path.join(__dirname, "..", "overlay-mockup");
const LOCALHOST_PORT = 5179;
const MARGIN = 16;

let win;
let fullyClickThrough = false; // Alt+C: also click through the overlay itself
const positionFile = () => path.join(app.getPath("userData"), "overlay-position.json");

function loadPosition() {
  try {
    return JSON.parse(readFileSync(positionFile(), "utf8"));
  } catch {
    return null;
  }
}

function savePosition() {
  const [x, y] = win.getPosition();
  writeFile(positionFile(), JSON.stringify({ x, y })).catch(() => {});
}

// Keep the window fully on a screen.
function clampToScreen(x, y, width, height) {
  const area = screen.getDisplayNearestPoint({ x, y }).workArea;
  return {
    x: Math.min(Math.max(x, area.x), area.x + area.width - width),
    y: Math.min(Math.max(y, area.y), area.y + area.height - height),
  };
}

function setInteractive(interactive) {
  if (!win) return;
  // forward: true keeps mousemove events coming, so the page notices when the
  // cursor enters the overlay again.
  if (interactive && !fullyClickThrough) win.setIgnoreMouseEvents(false);
  else win.setIgnoreMouseEvents(true, { forward: true });
}

function sendState(extra = {}) {
  win.webContents.send("state", { fullyClickThrough, ...extra });
}

function createWindow() {
  const area = screen.getPrimaryDisplay().workArea;
  const start = loadPosition() ?? { x: area.x + area.width - 340 - MARGIN, y: area.y + MARGIN };
  win = new BrowserWindow({
    x: start.x,
    y: start.y,
    width: 340,
    height: 60,
    transparent: true,
    frame: false,
    resizable: false,
    skipTaskbar: true,
    hasShadow: false,
    alwaysOnTop: true,
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
  setInteractive(false);
  win.loadFile(path.join(MOCKUP_DIR, "index.html"), { query: { overlay: "1" } });
  // showInactive: do not steal focus from the game.
  win.once("ready-to-show", () => win.showInactive());

  // For checking the rendering without a screen grab: OVERLAY_CAPTURE=path.png
  if (process.env.OVERLAY_CAPTURE) {
    win.webContents.once("did-finish-load", () =>
      setTimeout(async () => {
        if (process.env.OVERLAY_EXPAND) {
          await win.webContents.executeJavaScript('document.querySelector(".overlay").dataset.state="expanded"');
          await new Promise((r) => setTimeout(r, 800));
        }
        const image = await win.capturePage();
        await writeFile(process.env.OVERLAY_CAPTURE, image.toPNG());
        console.log("capture opgeslagen:", process.env.OVERLAY_CAPTURE, image.getSize());
      }, 1500),
    );
  }
}

ipcMain.on("set-interactive", (_e, interactive) => setInteractive(Boolean(interactive)));

// The page reports its size; grow/shrink while keeping the top-left corner,
// unless that would push the window off screen.
ipcMain.on("resize", (_e, { width, height }) => {
  const [x, y] = win.getPosition();
  const pos = clampToScreen(x, y, width, height);
  win.setBounds({ ...pos, width, height });
});

ipcMain.on("move-by", (_e, { dx, dy }) => {
  const [x, y] = win.getPosition();
  const [width, height] = win.getSize();
  const pos = clampToScreen(x + dx, y + dy, width, height);
  win.setPosition(pos.x, pos.y);
});

ipcMain.on("drag-end", savePosition);

ipcMain.on("hide", () => {
  win.hide();
  setInteractive(false);
});

function registerShortcuts() {
  const shortcuts = {
    // Show / hide the overlay
    "Alt+V": () => {
      if (win.isVisible()) win.hide();
      else {
        win.showInactive();
        sendState({ shown: true });
      }
    },
    // Toggle full click-through (also through the overlay)
    "Alt+C": () => {
      fullyClickThrough = !fullyClickThrough;
      setInteractive(false);
      sendState();
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
  const server = createServer(async (req, res) => {
    const name = path.basename(new URL(req.url, "http://x").pathname) || "index.html";
    try {
      const data = await readFile(path.join(MOCKUP_DIR, name));
      res.writeHead(200, { "content-type": types[path.extname(name)] ?? "application/octet-stream" }).end(data);
    } catch {
      res.writeHead(404).end("niet gevonden");
    }
  });
  server.on("error", (err) =>
    console.warn(`Localhost-server niet gestart (${err.code}); de overlay werkt gewoon door.`),
  );
  server.listen(LOCALHOST_PORT, "127.0.0.1", () =>
    console.log(`Overlay ook op http://localhost:${LOCALHOST_PORT}/`),
  );
}

// Only one overlay at a time: a second start just quits.
if (!app.requestSingleInstanceLock()) app.quit();

app.whenReady().then(() => {
  createWindow();
  registerShortcuts();
  startLocalhost();
  console.log("Overlay draait. Sleep aan ⠿ · klik het tipje open · × wegklikken · Alt+V terughalen · Alt+C klik-door");
});

app.on("will-quit", () => globalShortcut.unregisterAll());
app.on("window-all-closed", () => app.quit());
