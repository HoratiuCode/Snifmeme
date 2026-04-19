import {
  composeFeatures,
  createSeedExamples,
  describePrediction,
  extractChartFeatures,
  extractDataFeatures,
  predictFromFeatures,
  trainLogisticModel
} from "./model.js";

const chartInput = document.getElementById("chartInput");
const dataInput = document.getElementById("dataInput");
const chartDropzone = document.getElementById("chartDropzone");
const dataDropzone = document.getElementById("dataDropzone");
const chartFileName = document.getElementById("chartFileName");
const dataFileName = document.getElementById("dataFileName");
const chartImageState = { imageData: null, fileName: null };
const dataState = { text: "", fileName: null };
const modelStatus = document.getElementById("modelStatus");
const verdict = document.getElementById("verdict");
const confidenceChip = document.getElementById("confidenceChip");
const confidenceFill = document.getElementById("confidenceFill");
const analysisMeta = document.getElementById("analysisMeta");
const reasonList = document.getElementById("reasonList");
const dataText = document.getElementById("dataText");
const dexAddressInput = document.getElementById("dexAddressInput");
const dexTypeSelect = document.getElementById("dexTypeSelect");
const dexChainInput = document.getElementById("dexChainInput");
const liveSummaryTitle = document.getElementById("liveSummaryTitle");
const liveSummaryBadge = document.getElementById("liveSummaryBadge");
const liveStatPrice = document.getElementById("liveStatPrice");
const liveStatChange = document.getElementById("liveStatChange");
const liveStatLiquidity = document.getElementById("liveStatLiquidity");
const liveStatVolume = document.getElementById("liveStatVolume");
const liveStatFdv = document.getElementById("liveStatFdv");
const liveStatTxns = document.getElementById("liveStatTxns");
const liveStatPair = document.getElementById("liveStatPair");
const liveSummaryNote = document.getElementById("liveSummaryNote");
const analyzeButton = document.getElementById("analyzeButton");
const clearButton = document.getElementById("clearButton");
const fetchDexButton = document.getElementById("fetchDexButton");
const learnButton = document.getElementById("learnButton");
const resetButton = document.getElementById("resetButton");
const captureButton = document.getElementById("captureButton");
const loadSampleButton = document.getElementById("loadSampleButton");

const EXAMPLES_KEY = "sipermeme.userExamples.v1";
const LAST_ANALYSIS_KEY = "sipermeme.lastAnalysis.v1";
const ICON_SIZE = 32;

const sampleData = `time,open,high,low,close,volume,liquidity,top_holder_percent
1,1.00,1.10,0.92,1.06,1200,120000,18
2,1.06,1.14,1.00,1.12,1500,123000,18
3,1.12,1.18,1.05,1.16,1650,124500,17
4,1.16,1.24,1.10,1.21,1900,126000,17
5,1.21,1.30,1.15,1.27,2100,127500,16
6,1.27,1.36,1.22,1.34,2300,129000,16`;

let currentModel = null;
let currentAnalysis = null;
let userExamples = [];
let liveDexState = {
  snapshot: null,
  summaryText: "",
  sourceLabel: null,
  fetchedAt: null
};

function setStatus(text) {
  modelStatus.textContent = text;
}

function setLiveSummaryText(text) {
  liveSummaryNote.textContent = text;
}

function createIconImageData(fillColor, accentColor) {
  const canvas = document.createElement("canvas");
  canvas.width = ICON_SIZE;
  canvas.height = ICON_SIZE;
  const context = canvas.getContext("2d");

  context.clearRect(0, 0, ICON_SIZE, ICON_SIZE);

  const gradient = context.createLinearGradient(0, 0, ICON_SIZE, ICON_SIZE);
  gradient.addColorStop(0, fillColor);
  gradient.addColorStop(1, accentColor);

  context.fillStyle = gradient;
  context.beginPath();
  context.arc(ICON_SIZE / 2, ICON_SIZE / 2, 14, 0, Math.PI * 2);
  context.fill();

  context.strokeStyle = "rgba(255, 255, 255, 0.36)";
  context.lineWidth = 2;
  context.stroke();

  context.fillStyle = "rgba(255, 255, 255, 0.95)";
  context.font = "bold 18px Arial, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("S", ICON_SIZE / 2, ICON_SIZE / 2 + 0.5);

  return context.getImageData(0, 0, ICON_SIZE, ICON_SIZE);
}

async function updateBadgeAndIcon(state) {
  const palette = {
    safe: {
      badgeText: "S",
      badgeColor: "#ffd84d",
      iconFill: "#fff7da",
      iconAccent: "#ffd84d"
    },
    rug: {
      badgeText: "R",
      badgeColor: "#ff9f1a",
      iconFill: "#ff9f1a",
      iconAccent: "#ffd84d"
    },
    warn: {
      badgeText: "!",
      badgeColor: "#ffd84d",
      iconFill: "#ffd84d",
      iconAccent: "#ff9f1a"
    },
    idle: {
      badgeText: "",
      badgeColor: "#64748b",
      iconFill: "#fff7da",
      iconAccent: "#ff9f1a"
    }
  };

  const tone = palette[state] || palette.idle;
  await chrome.action.setBadgeText({ text: tone.badgeText });
  await chrome.action.setBadgeBackgroundColor({ color: tone.badgeColor });
  await chrome.action.setIcon({
    imageData: {
      16: createIconImageData(tone.iconFill, tone.iconAccent),
      32: createIconImageData(tone.iconFill, tone.iconAccent)
    }
  });
}

function getAlertState(prediction) {
  if (!prediction) {
    return "idle";
  }

  if (prediction.label === "rug") {
    return "rug";
  }

  return prediction.confidence < 0.35 ? "warn" : "safe";
}

function normalizeDexAddressInput(rawValue) {
  const trimmed = String(rawValue || "").trim();
  if (!trimmed) {
    return { address: "", chainId: "" };
  }

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      const segments = url.pathname.split("/").filter(Boolean);
      if (segments.length >= 2) {
        return {
          chainId: decodeURIComponent(segments[segments.length - 2]).trim(),
          address: decodeURIComponent(segments[segments.length - 1]).trim()
        };
      }
      return {
        chainId: "",
        address: decodeURIComponent(segments[segments.length - 1] || "").trim()
      };
    } catch {
      return { address: trimmed, chainId: "" };
    }
  }

  return { address: trimmed, chainId: "" };
}

function firstFiniteNumber(...values) {
  for (const value of values) {
    const parsed = Number(String(value).replace(/[^0-9eE.+\-]/g, ""));
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

function scoreDexPair(pair) {
  const liquidity = firstFiniteNumber(pair?.liquidity?.usd, pair?.liquidityUsd, pair?.liquidityUSD) || 0;
  const volume = firstFiniteNumber(pair?.volume?.h24, pair?.volume24h, pair?.volumeUsd24h) || 0;
  const priceChange = firstFiniteNumber(pair?.priceChange?.h24, pair?.priceChangeH24, pair?.priceChange24h) || 0;
  const txns = pair?.txns?.h24 || pair?.txns24h || {};
  const buys = firstFiniteNumber(txns.buys, pair?.buys24h) || 0;
  const sells = firstFiniteNumber(txns.sells, pair?.sells24h) || 0;
  return liquidity * 4 + volume * 1.5 + Math.abs(priceChange) * 25 + (buys + sells) * 75;
}

function pickBestDexPair(pairs) {
  return pairs
    .filter((pair) => pair && typeof pair === "object")
    .slice()
    .sort((left, right) => scoreDexPair(right) - scoreDexPair(left))[0] || null;
}

function formatAmount(value) {
  const amount = firstFiniteNumber(value);
  if (amount === null) {
    return "n/a";
  }
  if (Math.abs(amount) >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(2)}m`;
  }
  if (Math.abs(amount) >= 1_000) {
    return `$${(amount / 1_000).toFixed(1)}k`;
  }
  return `$${amount.toFixed(2)}`;
}

function formatPrice(value) {
  const amount = firstFiniteNumber(value);
  if (amount === null) {
    return "n/a";
  }
  if (amount === 0) {
    return "$0";
  }
  if (Math.abs(amount) < 0.0001) {
    return `$${amount.toExponential(2)}`;
  }
  if (Math.abs(amount) < 1) {
    return `$${amount.toFixed(6)}`;
  }
  return `$${amount.toFixed(4)}`;
}

function formatPercent(value) {
  const amount = firstFiniteNumber(value);
  if (amount === null) {
    return "n/a";
  }
  const prefix = amount > 0 ? "+" : "";
  return `${prefix}${amount.toFixed(2)}%`;
}

function formatDateOrAge(pairCreatedAt) {
  const createdAt = firstFiniteNumber(pairCreatedAt);
  if (createdAt === null) {
    return "n/a";
  }
  const ageHours = Math.max(0, (Date.now() - createdAt) / 3600000);
  if (ageHours < 24) {
    return `${ageHours.toFixed(1)}h old`;
  }
  const ageDays = ageHours / 24;
  return `${ageDays.toFixed(1)}d old`;
}

function setLiveStat(element, value) {
  element.textContent = value;
}

function setLiveSnapshot(snapshot, sourceLabel = "Dexscreener") {
  liveDexState = {
    snapshot,
    summaryText: buildLiveSummaryText(snapshot),
    sourceLabel,
    fetchedAt: Date.now()
  };

  if (!snapshot) {
    liveSummaryTitle.textContent = "No live DEX data loaded.";
    liveSummaryBadge.textContent = "Idle";
    setLiveStat(liveStatPrice, "n/a");
    setLiveStat(liveStatChange, "n/a");
    setLiveStat(liveStatLiquidity, "n/a");
    setLiveStat(liveStatVolume, "n/a");
    setLiveStat(liveStatFdv, "n/a");
    setLiveStat(liveStatTxns, "n/a");
    setLiveStat(liveStatPair, "n/a");
    setLiveSummaryText("No live DEX data loaded.");
    currentAnalysis = null;
    return;
  }

  liveSummaryTitle.textContent = `${snapshot.baseTokenSymbol || "Token"} / ${snapshot.quoteTokenSymbol || "Quote"} on ${snapshot.chainId || "unknown chain"}`;
  liveSummaryBadge.textContent = sourceLabel;
  setLiveStat(liveStatPrice, formatPrice(snapshot.priceUsd));
  setLiveStat(liveStatChange, formatPercent(snapshot.priceChangeH24));
  setLiveStat(liveStatLiquidity, formatAmount(snapshot.liquidityUsd));
  setLiveStat(liveStatVolume, formatAmount(snapshot.volume24h));
  setLiveStat(liveStatFdv, formatAmount(snapshot.fdvUsd));
  setLiveStat(liveStatTxns, `${snapshot.buys24h ?? "n/a"} buys / ${snapshot.sells24h ?? "n/a"} sells`);
  setLiveStat(liveStatPair, snapshot.pairAddress || "n/a");
  setLiveSummaryText(
    `Age: ${formatDateOrAge(snapshot.pairCreatedAt)}\nDex: ${snapshot.dexId || "n/a"} | Pair: ${snapshot.pairAddress || "n/a"}`
  );
  currentAnalysis = null;
}

function clearLiveSnapshot() {
  setLiveSnapshot(null);
}

function buildLiveSummaryText(snapshot) {
  if (!snapshot) {
    return "No live DEX data loaded.";
  }

  return [
    `Age: ${formatDateOrAge(snapshot.pairCreatedAt)}`,
    `Dex: ${snapshot.dexId || "n/a"}`,
    `Pair: ${snapshot.pairAddress || "n/a"}`
  ].join("\n");
}

function buildDexscreenerUrl(mode, address, chainId) {
  if (mode === "pair") {
    if (!chainId) {
      throw new Error("Pair lookups need a chain id, such as base or ethereum.");
    }
    return `https://api.dexscreener.com/latest/dex/pairs/${encodeURIComponent(chainId)}/${encodeURIComponent(address)}`;
  }

  return `https://api.dexscreener.com/latest/dex/tokens/${encodeURIComponent(address)}`;
}

async function fetchDexscreenerData() {
  const mode = dexTypeSelect.value;
  const { address: parsedAddress, chainId: parsedChainId } = normalizeDexAddressInput(dexAddressInput.value);
  const address = parsedAddress;
  const chainId = (dexChainInput.value || parsedChainId || "").trim().toLowerCase();

  if (!address) {
    throw new Error("Enter a token contract, pair address, or Dexscreener URL.");
  }

  const endpoint = buildDexscreenerUrl(mode, address, chainId);
  const response = await fetch(endpoint, {
    headers: {
      accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`Dexscreener request failed (${response.status}).`);
  }

  const payload = await response.json();
  const pairs = Array.isArray(payload?.pairs)
    ? payload.pairs
    : Array.isArray(payload?.data?.pairs)
      ? payload.data.pairs
      : Array.isArray(payload?.pairs?.pairs)
        ? payload.pairs.pairs
        : [];
  const pair = payload?.pair && typeof payload.pair === "object"
    ? payload.pair
    : Array.isArray(pairs) && pairs.length
      ? pickBestDexPair(pairs)
      : null;

  if (!pair) {
    throw new Error("Dexscreener returned no usable pair data for that address.");
  }

  const snapshot = {
    source: "dexscreener",
    chainId: pair.chainId || chainId || payload?.chainId || null,
    dexId: pair.dexId || payload?.dexId || null,
    pairAddress: pair.pairAddress || pair.address || address,
    baseTokenSymbol: pair.baseToken?.symbol || pair.baseToken?.name || null,
    baseTokenName: pair.baseToken?.name || null,
    quoteTokenSymbol: pair.quoteToken?.symbol || pair.quoteToken?.name || null,
    quoteTokenName: pair.quoteToken?.name || null,
    priceUsd: firstFiniteNumber(pair.priceUsd, pair.price?.usd, pair.price),
    liquidityUsd: firstFiniteNumber(pair.liquidity?.usd, pair.liquidityUsd, pair.liquidityUSD),
    fdvUsd: firstFiniteNumber(pair.fdv, pair.marketCap, pair.fullyDilutedValuation),
    volume24h: firstFiniteNumber(pair.volume?.h24, pair.volume24h, pair.volumeUsd24h),
    buys24h: firstFiniteNumber(pair.txns?.h24?.buys, pair.txns24h?.buys, pair.buys24h),
    sells24h: firstFiniteNumber(pair.txns?.h24?.sells, pair.txns24h?.sells, pair.sells24h),
    pairCreatedAt: firstFiniteNumber(pair.pairCreatedAt),
    priceChangeM5: firstFiniteNumber(pair.priceChange?.m5, pair.priceChangeM5, pair.priceChange5m),
    priceChangeH1: firstFiniteNumber(pair.priceChange?.h1, pair.priceChangeH1, pair.priceChange1h),
    priceChangeH6: firstFiniteNumber(pair.priceChange?.h6, pair.priceChangeH6, pair.priceChange6h),
    priceChangeH24: firstFiniteNumber(pair.priceChange?.h24, pair.priceChangeH24, pair.priceChange24h),
    labels: Array.isArray(pair.labels) ? pair.labels : [],
    url: pair.url || payload?.url || null,
    raw: pair
  };

  return snapshot;
}

function setFileLabel(element, fileName, filled) {
  element.textContent = fileName;
  element.parentElement.classList.toggle("is-filled", Boolean(filled));
}

function setReasonList(items) {
  reasonList.innerHTML = "";
  if (!items.length) {
    const empty = document.createElement("li");
    empty.textContent = "No strong signals found yet.";
    reasonList.appendChild(empty);
    return;
  }

  for (const item of items.slice(0, 5)) {
    const li = document.createElement("li");
    const label = document.createElement("div");
    label.className = "reason-label";
    label.textContent = `${item.label}`;

    const score = document.createElement("div");
    score.className = "reason-score";
    const direction = item.impact >= 0 ? "pushes toward rug" : "pushes toward safe";
    score.textContent = `${direction} · contribution ${item.impact.toFixed(3)}`;

    li.append(label, score);
    reasonList.appendChild(li);
  }
}

function renderPrediction(prediction, featureCount = 0) {
  const labelText = prediction.label === "rug" ? "Rug" : "Safe";
  const confidence = Math.round(prediction.confidence * 100);
  verdict.textContent = labelText;
  verdict.style.color = prediction.label === "rug" ? "var(--danger)" : "var(--safe)";
  confidenceChip.textContent = `${confidence}%`;
  confidenceFill.style.width = `${Math.max(10, confidence)}%`;
  confidenceFill.style.background =
    prediction.label === "rug"
      ? "linear-gradient(90deg, #ffd84d 0%, #ff9f1a 100%)"
      : "linear-gradient(90deg, #fff7da 0%, #ffd84d 45%, #ff9f1a 100%)";

  analysisMeta.textContent = `${describePrediction(prediction)} Scanned ${featureCount} features.`;
  setReasonList(prediction.contributions);
}

function updateModelStatus() {
  if (!currentModel) {
    setStatus("Model unavailable");
    return;
  }

  const examples = userExamples.length;
  const trainedAt = currentModel.trainedAt
    ? new Date(currentModel.trainedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "seeded";
  setStatus(`Ready · ${examples} learned examples · updated ${trainedAt}`);
}

async function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read data file."));
    reader.readAsText(file);
  });
}

async function readImageFile(file) {
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read image file."));
    reader.readAsDataURL(file);
  });

  return loadImageDataFromUrl(dataUrl);
}

function createCanvas(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

async function loadImageDataFromUrl(dataUrl) {
  const image = new Image();
  image.src = dataUrl;
  await image.decode();

  const maxSide = 1200;
  const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = createCanvas(width, height);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(image, 0, 0, width, height);
  const imageData = context.getImageData(0, 0, width, height);
  return { imageData, width, height };
}

async function loadModelFromStorage() {
  const stored = await chrome.storage.local.get([EXAMPLES_KEY]);
  userExamples = Array.isArray(stored[EXAMPLES_KEY]) ? stored[EXAMPLES_KEY] : [];
  const seeded = createSeedExamples();
  currentModel = trainLogisticModel([...seeded, ...userExamples]);
  updateModelStatus();
  await updateBadgeAndIcon("idle");
}

async function persistExamples() {
  await chrome.storage.local.set({
    [EXAMPLES_KEY]: userExamples
  });
}

async function analyzeCurrentInput() {
  if (!chartImageState.imageData) {
    throw new Error("Add a chart screenshot first.");
  }

  const chartFeatures = extractChartFeatures(chartImageState.imageData);
  const dataTextValue = dataText.value || dataState.text || "";
  const combinedText = [dataTextValue, liveDexState.summaryText].filter(Boolean).join("\n");
  const dataFeatures = extractDataFeatures(combinedText, liveDexState.snapshot);
  const features = composeFeatures(chartFeatures, dataFeatures);
  const prediction = predictFromFeatures(features, currentModel);

  currentAnalysis = {
    ...prediction,
    features,
    chartFeatures,
    dataFeatures,
    liveSnapshot: liveDexState.snapshot,
    liveSummary: liveDexState.summaryText,
    chartFile: chartImageState.fileName,
    dataFile: dataState.fileName
  };

  await chrome.storage.local.set({
    [LAST_ANALYSIS_KEY]: currentAnalysis
  });

  renderPrediction(prediction, features.length);
  await updateBadgeAndIcon(getAlertState(prediction));
}

async function saveTrainingExample(label) {
  if (!currentAnalysis?.features) {
    await analyzeCurrentInput();
  }

  if (!currentAnalysis?.features) {
    return;
  }

  userExamples.push({
    features: currentAnalysis.features,
    label
  });

  if (userExamples.length > 220) {
    userExamples = userExamples.slice(-220);
  }

  await persistExamples();
  currentModel = trainLogisticModel([...createSeedExamples(), ...userExamples]);
  updateModelStatus();
  setStatus(`Learned from ${label} example · ${userExamples.length} saved examples`);
}

function clearInputs() {
  chartInput.value = "";
  dataInput.value = "";
  chartImageState.imageData = null;
  chartImageState.fileName = null;
  dataState.text = "";
  dataState.fileName = null;
  clearLiveSnapshot();
  currentAnalysis = null;
  dataText.value = "";
  dexAddressInput.value = "";
  dexChainInput.value = "";
  dexTypeSelect.value = "token";
  setFileLabel(chartFileName, "No image selected", false);
  setFileLabel(dataFileName, "No data selected", false);
  verdict.textContent = "Waiting for input";
  verdict.style.color = "var(--text)";
  confidenceChip.textContent = "0%";
  confidenceFill.style.width = "0%";
  confidenceFill.style.background = "linear-gradient(90deg, var(--safe), var(--warning), var(--danger))";
  analysisMeta.textContent = "Add a chart and data, then run the scan.";
  reasonList.innerHTML = "";
}

async function handleChartFile(file) {
  if (!file) {
    return;
  }

  const { imageData } = await readImageFile(file);
  chartImageState.imageData = imageData;
  chartImageState.fileName = file.name;
  currentAnalysis = null;
  setFileLabel(chartFileName, file.name, true);
}

async function handleDataFile(file) {
  if (!file) {
    return;
  }

  const text = await readFileAsText(file);
  dataState.text = text;
  dataState.fileName = file.name;
  currentAnalysis = null;
  dataText.value = text;
  setFileLabel(dataFileName, file.name, true);
}

async function captureVisibleTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) {
    throw new Error("Could not find an active tab.");
  }

  const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: "png" });
  const { imageData } = await loadImageDataFromUrl(dataUrl);
  chartImageState.imageData = imageData;
  chartImageState.fileName = tab.title || "Current tab screenshot";
  currentAnalysis = null;
  setFileLabel(chartFileName, chartImageState.fileName, true);
}

function bindDropzone(zone, input, handler) {
  zone.addEventListener("dragover", (event) => {
    event.preventDefault();
    zone.classList.add("is-filled");
  });

  zone.addEventListener("dragleave", () => {
    if (input.files.length === 0) {
      zone.classList.remove("is-filled");
    }
  });

  zone.addEventListener("drop", async (event) => {
    event.preventDefault();
    zone.classList.remove("is-filled");
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      await handler(file);
    }
  });
}

chartInput.addEventListener("change", async () => {
  const file = chartInput.files?.[0];
  if (file) {
    try {
      await handleChartFile(file);
    } catch (error) {
      setStatus(error.message || "Could not load chart image");
    }
  }
});

dataInput.addEventListener("change", async () => {
  const file = dataInput.files?.[0];
  if (file) {
    try {
      await handleDataFile(file);
    } catch (error) {
      setStatus(error.message || "Could not load data file");
    }
  }
});

dataText.addEventListener("input", () => {
  dataState.text = dataText.value;
  dataState.fileName = dataState.fileName || null;
  currentAnalysis = null;
});

analyzeButton.addEventListener("click", async () => {
  try {
    setStatus("Scanning...");
    await analyzeCurrentInput();
    setStatus("Scan complete");
  } catch (error) {
    setStatus(error.message || "Scan failed");
    analysisMeta.textContent = error.message || "Unable to analyze input.";
    reasonList.innerHTML = "";
    verdict.textContent = "No result";
    verdict.style.color = "var(--danger)";
  }
});

clearButton.addEventListener("click", () => {
  clearInputs();
  updateBadgeAndIcon("idle");
  setStatus("Inputs cleared");
});

fetchDexButton.addEventListener("click", async () => {
  try {
    setStatus("Fetching live DEX data...");
    const snapshot = await fetchDexscreenerData();
    setLiveSnapshot(snapshot, "Dexscreener");
    setStatus(`Loaded live data for ${snapshot.baseTokenSymbol || "token"}`);
  } catch (error) {
    setStatus(error.message || "Could not fetch live DEX data");
    setLiveSummaryText(error.message || "Could not fetch live DEX data.");
  }
});

learnButton.addEventListener("click", async () => {
  try {
    const label = document.getElementById("labelSelect").value;
    await saveTrainingExample(label);
    setStatus(`Saved ${label} example`);
  } catch (error) {
    setStatus(error.message || "Could not save example");
  }
});

resetButton.addEventListener("click", async () => {
  userExamples = [];
  await chrome.storage.local.remove([EXAMPLES_KEY, LAST_ANALYSIS_KEY]);
  currentModel = trainLogisticModel(createSeedExamples());
  updateModelStatus();
  setStatus("Model reset to seed examples");
  await updateBadgeAndIcon("idle");
});

captureButton.addEventListener("click", async () => {
  try {
    setStatus("Capturing current tab...");
    await captureVisibleTab();
    setStatus("Chart captured");
  } catch (error) {
    setStatus(error.message || "Could not capture current tab");
  }
});

loadSampleButton.addEventListener("click", async () => {
  dataText.value = sampleData;
  dataState.text = sampleData;
  dataState.fileName = "sample.csv";
  currentAnalysis = null;
  setFileLabel(dataFileName, "sample.csv", true);
});

bindDropzone(chartDropzone, chartInput, handleChartFile);
bindDropzone(dataDropzone, dataInput, handleDataFile);

document.addEventListener("DOMContentLoaded", async () => {
  await loadModelFromStorage();
  currentModel = currentModel || trainLogisticModel(createSeedExamples());
  updateModelStatus();
  setReasonList([]);
  const stored = await chrome.storage.local.get([LAST_ANALYSIS_KEY]);
  const lastAnalysis = stored[LAST_ANALYSIS_KEY];
  if (lastAnalysis?.label && typeof lastAnalysis.confidence === "number") {
    if (lastAnalysis.liveSnapshot) {
      setLiveSnapshot(lastAnalysis.liveSnapshot, "Dexscreener");
      setLiveSummaryText(lastAnalysis.liveSummary || liveDexState.summaryText || "No live DEX data loaded.");
    } else if (lastAnalysis.liveSummary) {
      setLiveSummaryText(lastAnalysis.liveSummary);
    }
    renderPrediction(lastAnalysis, Array.isArray(lastAnalysis.features) ? lastAnalysis.features.length : 21);
    await updateBadgeAndIcon(getAlertState(lastAnalysis));
  }
  setStatus("Model ready");
});
