const gallery = document.getElementById("gallery");
const statusEl = document.getElementById("status");

async function detectWebGPU() {
  if (!navigator.gpu) return { ok: false, reason: "this browser does not expose WebGPU" };
  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) return { ok: false, reason: "no graphics adapter was available (the GPU may be blocklisted, or hardware acceleration is off)" };
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: error.message };
  }
}

function el(tag, props = {}, ...children) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

function setStatus(support) {
  if (support.ok) {
    statusEl.textContent = "WebGPU is available in this browser. The examples below are running live.";
    statusEl.className = "status ok";
  } else {
    statusEl.textContent =
      `WebGPU is not available here: ${support.reason}. ` +
      "The live previews are off, but every Source tab still works. To see them run, open this page in a current Chrome or Edge on a desktop computer (Safari 26 and recent Firefox also work).";
    statusEl.className = "status bad";
  }
}

const sourceCache = new Map();
async function fetchSource(id, file) {
  const key = `${id}/${file}`;
  if (!sourceCache.has(key)) {
    sourceCache.set(key, fetch(`examples/${id}/${file}`).then((r) => (r.ok ? r.text() : Promise.reject(new Error(`${r.status}`)))));
  }
  return sourceCache.get(key);
}

function buildCard(example, support) {
  const stage = el("div", { className: "stage" });
  const card = el("article", { className: "card glass" });
  let instance = null;
  let starting = false;
  let visible = false;

  const showNote = (message) => {
    stage.replaceChildren(el("div", { className: "note" }, message));
  };

  async function start() {
    if (instance || starting) return;
    starting = true;
    const canvas = el("canvas", { ariaLabel: `${example.title} running live` });
    stage.replaceChildren(canvas);
    try {
      const module = await import(`./examples/${example.id}/main.js`);
      const handle = await module.default(canvas);
      instance = handle;
      if (!visible) handle.pause();
    } catch (error) {
      console.error(example.id, error);
      showNote(`This example could not start: ${error.message}`);
    } finally {
      starting = false;
    }
  }

  if (support.ok) {
    showNote("Loading...");
    new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) (instance ? instance.resume() : start());
        else instance?.pause();
      },
      { rootMargin: "80px" },
    ).observe(card);
  } else {
    showNote("WebGPU is not available in this browser, so there is no live preview. Open the Source tab to read the code.");
  }

  // Source tab
  const fileButtons = el("div", { className: "files", role: "tablist" });
  const code = el("code");
  const pre = el("pre", {}, code);
  const copy = el("button", { className: "tab", type: "button" }, "Copy");
  let currentFile = example.files[0];

  async function showFile(file) {
    currentFile = file;
    for (const b of fileButtons.children) b.setAttribute("aria-selected", String(b.dataset.file === file));
    code.textContent = "Loading...";
    try {
      code.textContent = await fetchSource(example.id, file);
    } catch (error) {
      code.textContent = `Could not load ${file} (${error.message}).`;
    }
  }
  for (const file of example.files) {
    const b = el("button", { className: "tab", type: "button", role: "tab" }, file);
    b.dataset.file = file;
    b.addEventListener("click", () => showFile(file));
    fileButtons.append(b);
  }
  copy.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(await fetchSource(example.id, currentFile));
      copy.textContent = "Copied";
    } catch {
      copy.textContent = "Copy failed";
    }
    setTimeout(() => (copy.textContent = "Copy"), 1500);
  });

  const pull = el("span", { className: "pull" }, `npx github:chasebuilds/webgpu-agent-kit examples pull ${example.id} ./${example.id}`);
  const source = el("div", { className: "source" }, fileButtons, pre, el("div", { className: "copyrow" }, pull, copy));

  const liveTab = el("button", { className: "tab", type: "button", role: "tab" }, "Live");
  const sourceTab = el("button", { className: "tab", type: "button", role: "tab" }, "Source");
  const select = (name) => {
    const isSource = name === "source";
    card.classList.toggle("show-source", isSource);
    liveTab.setAttribute("aria-selected", String(!isSource));
    sourceTab.setAttribute("aria-selected", String(isSource));
    if (isSource) {
      instance?.pause();
      if (!code.textContent) showFile(currentFile);
    } else if (visible) {
      instance?.resume();
    }
  };
  liveTab.addEventListener("click", () => select("live"));
  sourceTab.addEventListener("click", () => select("source"));

  card.append(
    stage,
    el(
      "div",
      { className: "card-body" },
      el("h3", {}, example.title),
      el("p", {}, example.summary),
      el("div", { className: "tabs", role: "tablist" }, liveTab, sourceTab),
      source,
    ),
  );
  select("live");
  return card;
}

async function main() {
  const [support, index] = await Promise.all([detectWebGPU(), fetch("examples/index.json").then((r) => r.json())]);
  setStatus(support);
  gallery.replaceChildren(...index.map((example) => buildCard(example, support)));
  window.__demoReady = true;
}

fetch("AGENTS.snippet.md")
  .then((r) => r.text())
  .then((text) => (document.getElementById("snippet").textContent = text.trim()))
  .catch(() => (document.getElementById("snippet").textContent = "See AGENTS.snippet.md in the repository."));

main().catch((error) => {
  statusEl.textContent = `The demo could not start: ${error.message}`;
  statusEl.className = "status bad";
});
