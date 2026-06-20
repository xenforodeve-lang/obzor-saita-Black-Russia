const menuBtn = document.getElementById("menuBtn");
const navMenu = document.getElementById("navMenu");
const liveOnline = document.getElementById("liveOnline");
const heroOnline = document.getElementById("heroOnline");
const serverOnline = document.getElementById("serverOnline");
const serverStatus = document.getElementById("serverStatus");
const serverUpdated = document.getElementById("serverUpdated");

const lawBtn = document.getElementById("lawBtn");
const outlawBtn = document.getElementById("outlawBtn");
const pathImage = document.getElementById("pathImage");
const pathTitle = document.getElementById("pathTitle");
const pathText = document.getElementById("pathText");

if (menuBtn && navMenu) {
  menuBtn.addEventListener("click", () => {
    navMenu.classList.toggle("open");
  });

  navMenu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => navMenu.classList.remove("open"));
  });
}

const animateCounter = (el, target, duration = 1200) => {
  let start = null;
  const tick = (ts) => {
    if (!start) start = ts;
    const progress = Math.min((ts - start) / duration, 1);
    const value = Math.floor(target * progress);
    el.textContent = value.toLocaleString("ru-RU");
    if (progress < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

document.querySelectorAll("[data-counter]").forEach((counter) => {
  const value = Number(counter.dataset.counter || 0);
  animateCounter(counter, value);
});

const SERVER_IP = "87.228.5.10:7777";
const SERVER_MAX_ONLINE = 70;
const ONLINE_API_ENDPOINTS = [
  "https://api.open.mp/servers",
  `https://api.open.mp/v2/server/${encodeURIComponent(SERVER_IP)}`,
  `https://api.open.mp/v2/servers?filters[core.ip]=${encodeURIComponent(SERVER_IP)}`,
];
let triedIndexRegistration = false;

const applyOnline = (onlineValue) => {
  const safeOnline = Math.max(0, Math.min(SERVER_MAX_ONLINE, Number(onlineValue) || 0));
  const formatted = safeOnline.toLocaleString("ru-RU");

  if (liveOnline) liveOnline.textContent = formatted;
  if (heroOnline) heroOnline.textContent = formatted;
  if (serverOnline) serverOnline.textContent = `${formatted} / ${SERVER_MAX_ONLINE}`;
};

const setServerState = (text, ok) => {
  if (!serverStatus) return;
  serverStatus.textContent = text;
  serverStatus.style.color = ok ? "#7fe167" : "#ff8b8b";
};

const setUpdatedTime = () => {
  if (!serverUpdated) return;
  const now = new Date();
  serverUpdated.textContent = now.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const findServerInList = (list) => {
  if (!Array.isArray(list)) return null;

  return list.find((item) => {
    const ip = String(item?.ip || item?.core?.ip || "").trim();
    const port = String(item?.port || "").trim();
    const address = String(item?.address || item?.core?.ip || "").trim();
    return `${ip}:${port}` === SERVER_IP || ip === SERVER_IP || address === SERVER_IP;
  });
};

const normalizeServerList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.servers)) return payload.servers;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

const parseOnlineValue = (entry) => {
  if (!entry) return null;
  const candidate = Number(
    entry.players ??
    entry.pc ??
    entry.online ??
    entry.numplayers ??
    entry.core?.pc ??
    entry.PlayerCount ??
    0
  );
  return Number.isFinite(candidate) ? candidate : null;
};

const getOnlineFromEndpoint = async (url) => {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const payload = await response.json();
  const list = normalizeServerList(payload);

  if (Array.isArray(list) && list.length > 0) {
    const server = findServerInList(list);
    if (!server) return null;
    const onlineValue = parseOnlineValue(server);
    return onlineValue === null ? null : onlineValue;
  }

  const directOnline = parseOnlineValue(payload);
  return directOnline === null ? null : directOnline;
};

const tryRegisterServerInApi = async () => {
  if (triedIndexRegistration) return;
  triedIndexRegistration = true;

  try {
    await fetch(`https://api.open.mp/v2/server/${encodeURIComponent(SERVER_IP)}`, {
      method: "POST",
    });
  } catch (error) {
    // Registration is best-effort only.
  }
};

const updateOnlineFromApi = async () => {
  try {
    let resolvedOnline = null;

    for (const endpoint of ONLINE_API_ENDPOINTS) {
      try {
        resolvedOnline = await getOnlineFromEndpoint(endpoint);
        if (resolvedOnline !== null) break;
      } catch (error) {
        // Try the next endpoint.
      }
    }

    if (resolvedOnline === null) {
      await tryRegisterServerInApi();

      for (const endpoint of ONLINE_API_ENDPOINTS) {
        try {
          resolvedOnline = await getOnlineFromEndpoint(endpoint);
          if (resolvedOnline !== null) break;
        } catch (error) {
          // Try the next endpoint.
        }
      }
    }

    if (resolvedOnline === null) {
      setServerState("Server not found in API", false);
      return;
    }

    applyOnline(resolvedOnline);
    setServerState("Online", true);
    setUpdatedTime();
  } catch (error) {
    setServerState("API unavailable", false);
  }
};

applyOnline(0);
setServerState("Connecting...", false);
updateOnlineFromApi();
setInterval(updateOnlineFromApi, 15000);

const setPathMode = (mode) => {
  if (!lawBtn || !outlawBtn || !pathImage || !pathTitle || !pathText) return;

  const isLaw = mode === "law";
  lawBtn.classList.toggle("active", isLaw);
  outlawBtn.classList.toggle("active", !isLaw);

  if (isLaw) {
    pathImage.src = "assets/cop.png";
    pathImage.alt = "Путь закона";
    pathTitle.textContent = "Путь закона";
    pathText.textContent =
      "Служба в госструктурах, патрули, контроль порядка, стабильный доход и командный геймплей.";
  } else {
    pathImage.src = "assets/gang.png";
    pathImage.alt = "Путь улиц";
    pathTitle.textContent = "Путь улиц";
    pathText.textContent =
      "Криминальные контракты, влияние на районы и быстрый рост через рискованные решения.";
  }
};

if (lawBtn && outlawBtn) {
  lawBtn.addEventListener("click", () => setPathMode("law"));
  outlawBtn.addEventListener("click", () => setPathMode("outlaw"));
}

setPathMode("law");

if (window.lucide) {
  window.lucide.createIcons();
}
