export const FEATURE_NAMES = [
  "chart_trend",
  "chart_momentum",
  "chart_volatility",
  "chart_drawdown",
  "chart_fragmentation",
  "chart_color_bias",
  "chart_wickiness",
  "chart_reversal_rate",
  "chart_late_drop",
  "data_price_return",
  "data_max_drawdown",
  "data_volatility",
  "data_volume_spike",
  "data_volume_collapse",
  "data_liquidity_drop",
  "data_bearish_candles",
  "data_close_near_low",
  "data_holder_concentration",
  "data_risk_keywords",
  "data_safety_keywords",
  "data_completeness"
];

export const FEATURE_LABELS = {
  chart_trend: "Chart trend",
  chart_momentum: "Late momentum",
  chart_volatility: "Chart volatility",
  chart_drawdown: "Drawdown depth",
  chart_fragmentation: "Chart fragmentation",
  chart_color_bias: "Red candle bias",
  chart_wickiness: "Wickiness",
  chart_reversal_rate: "Reversal rate",
  chart_late_drop: "Late drop",
  data_price_return: "Price return",
  data_max_drawdown: "Max drawdown",
  data_volatility: "Price volatility",
  data_volume_spike: "Volume spike",
  data_volume_collapse: "Volume collapse",
  data_liquidity_drop: "Liquidity drop",
  data_bearish_candles: "Bearish candles",
  data_close_near_low: "Closes near low",
  data_holder_concentration: "Holder concentration",
  data_risk_keywords: "Risk keywords",
  data_safety_keywords: "Safety keywords",
  data_completeness: "Data completeness"
};

const FEATURE_COUNT = FEATURE_NAMES.length;

function clamp(value, min = -1, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function clamp01(value) {
  return clamp(value, 0, 1);
}

function mean(values) {
  if (!values.length) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function variance(values) {
  if (values.length < 2) {
    return 0;
  }
  const avg = mean(values);
  return mean(values.map((value) => (value - avg) ** 2));
}

function stddev(values) {
  return Math.sqrt(variance(values));
}

function sigmoid(value) {
  return 1 / (1 + Math.exp(-value));
}

function tanhScale(value, scale = 1) {
  return Math.tanh(value / scale);
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = Number(String(value).replace(/[^0-9eE.+\-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function firstFiniteNumber(...values) {
  for (const value of values) {
    const parsed = toNumber(value);
    if (parsed !== null) {
      return parsed;
    }
  }
  return null;
}

function normalizeKey(key) {
  return String(key).toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function splitDelimitedLine(line, delimiter) {
  const cells = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (character === delimiter && !quoted) {
      cells.push(cell.trim());
      cell = "";
      continue;
    }

    cell += character;
  }

  cells.push(cell.trim());
  return cells;
}

function linearRegressionSlope(xs, ys) {
  const count = Math.min(xs.length, ys.length);
  if (count < 2) {
    return 0;
  }

  const xMean = mean(xs.slice(0, count));
  const yMean = mean(ys.slice(0, count));
  let numerator = 0;
  let denominator = 0;

  for (let index = 0; index < count; index += 1) {
    const xDiff = xs[index] - xMean;
    const yDiff = ys[index] - yMean;
    numerator += xDiff * yDiff;
    denominator += xDiff * xDiff;
  }

  return denominator === 0 ? 0 : numerator / denominator;
}

function makeFeatureVector(overrides = {}) {
  return FEATURE_NAMES.map((name) => {
    const value = overrides[name];
    return clamp(typeof value === "number" ? value : 0, -1, 1);
  });
}

function makeExample(label, overrides) {
  return {
    features: makeFeatureVector(overrides),
    label
  };
}

export function createSeedExamples() {
  return [
    makeExample(1, {
      chart_trend: 0.9,
      chart_momentum: 0.85,
      chart_volatility: 0.55,
      chart_drawdown: 0.4,
      chart_fragmentation: 0.1,
      chart_color_bias: 0.55,
      chart_wickiness: 0.2,
      chart_reversal_rate: 0.15,
      chart_late_drop: 0.15,
      data_price_return: 0.75,
      data_max_drawdown: 0.2,
      data_volatility: 0.25,
      data_volume_spike: 0.15,
      data_volume_collapse: -0.2,
      data_liquidity_drop: -0.35,
      data_bearish_candles: 0.2,
      data_close_near_low: -0.25,
      data_holder_concentration: -0.2,
      data_risk_keywords: -0.45,
      data_safety_keywords: 0.65,
      data_completeness: 1
    }),
    makeExample(1, {
      chart_trend: 0.75,
      chart_momentum: 0.78,
      chart_volatility: 0.35,
      chart_drawdown: 0.25,
      chart_fragmentation: 0.08,
      chart_color_bias: 0.35,
      chart_wickiness: 0.15,
      chart_reversal_rate: 0.1,
      chart_late_drop: 0.05,
      data_price_return: 0.68,
      data_max_drawdown: 0.18,
      data_volatility: 0.18,
      data_volume_spike: 0.1,
      data_volume_collapse: -0.12,
      data_liquidity_drop: -0.22,
      data_bearish_candles: 0.15,
      data_close_near_low: -0.2,
      data_holder_concentration: -0.15,
      data_risk_keywords: -0.3,
      data_safety_keywords: 0.45,
      data_completeness: 0.95
    }),
    makeExample(1, {
      chart_trend: 0.55,
      chart_momentum: 0.65,
      chart_volatility: 0.42,
      chart_drawdown: 0.32,
      chart_fragmentation: 0.12,
      chart_color_bias: 0.22,
      chart_wickiness: 0.2,
      chart_reversal_rate: 0.18,
      chart_late_drop: 0.22,
      data_price_return: 0.48,
      data_max_drawdown: 0.24,
      data_volatility: 0.22,
      data_volume_spike: 0.16,
      data_volume_collapse: -0.1,
      data_liquidity_drop: -0.18,
      data_bearish_candles: 0.22,
      data_close_near_low: -0.14,
      data_holder_concentration: -0.1,
      data_risk_keywords: -0.22,
      data_safety_keywords: 0.28,
      data_completeness: 0.9
    }),
    makeExample(1, {
      chart_trend: 0.82,
      chart_momentum: 0.88,
      chart_volatility: 0.62,
      chart_drawdown: 0.52,
      chart_fragmentation: 0.15,
      chart_color_bias: 0.4,
      chart_wickiness: 0.3,
      chart_reversal_rate: 0.2,
      chart_late_drop: 0.28,
      data_price_return: 0.82,
      data_max_drawdown: 0.4,
      data_volatility: 0.3,
      data_volume_spike: 0.2,
      data_volume_collapse: -0.05,
      data_liquidity_drop: -0.3,
      data_bearish_candles: 0.16,
      data_close_near_low: -0.18,
      data_holder_concentration: -0.08,
      data_risk_keywords: -0.18,
      data_safety_keywords: 0.34,
      data_completeness: 1
    }),
    makeExample(0, {
      chart_trend: -0.65,
      chart_momentum: -0.7,
      chart_volatility: 0.25,
      chart_drawdown: 0.18,
      chart_fragmentation: 0.08,
      chart_color_bias: -0.15,
      chart_wickiness: 0.1,
      chart_reversal_rate: 0.12,
      chart_late_drop: -0.18,
      data_price_return: -0.45,
      data_max_drawdown: 0.18,
      data_volatility: 0.16,
      data_volume_spike: -0.18,
      data_volume_collapse: 0.35,
      data_liquidity_drop: 0.42,
      data_bearish_candles: -0.2,
      data_close_near_low: 0.15,
      data_holder_concentration: 0.12,
      data_risk_keywords: 0.3,
      data_safety_keywords: -0.4,
      data_completeness: 1
    }),
    makeExample(0, {
      chart_trend: -0.82,
      chart_momentum: -0.88,
      chart_volatility: 0.65,
      chart_drawdown: 0.52,
      chart_fragmentation: 0.2,
      chart_color_bias: -0.3,
      chart_wickiness: 0.45,
      chart_reversal_rate: 0.3,
      chart_late_drop: -0.45,
      data_price_return: -0.72,
      data_max_drawdown: 0.58,
      data_volatility: 0.42,
      data_volume_spike: -0.1,
      data_volume_collapse: 0.8,
      data_liquidity_drop: 0.82,
      data_bearish_candles: 0.58,
      data_close_near_low: 0.48,
      data_holder_concentration: 0.46,
      data_risk_keywords: 0.56,
      data_safety_keywords: -0.58,
      data_completeness: 1
    }),
    makeExample(0, {
      chart_trend: -0.58,
      chart_momentum: -0.52,
      chart_volatility: 0.35,
      chart_drawdown: 0.22,
      chart_fragmentation: 0.18,
      chart_color_bias: -0.2,
      chart_wickiness: 0.25,
      chart_reversal_rate: 0.18,
      chart_late_drop: -0.35,
      data_price_return: -0.38,
      data_max_drawdown: 0.3,
      data_volatility: 0.28,
      data_volume_spike: 0.05,
      data_volume_collapse: 0.45,
      data_liquidity_drop: 0.36,
      data_bearish_candles: 0.25,
      data_close_near_low: 0.18,
      data_holder_concentration: 0.26,
      data_risk_keywords: 0.18,
      data_safety_keywords: -0.22,
      data_completeness: 0.95
    }),
    makeExample(0, {
      chart_trend: -0.9,
      chart_momentum: -0.8,
      chart_volatility: 0.42,
      chart_drawdown: 0.38,
      chart_fragmentation: 0.12,
      chart_color_bias: -0.22,
      chart_wickiness: 0.22,
      chart_reversal_rate: 0.16,
      chart_late_drop: -0.54,
      data_price_return: -0.82,
      data_max_drawdown: 0.48,
      data_volatility: 0.34,
      data_volume_spike: -0.12,
      data_volume_collapse: 0.74,
      data_liquidity_drop: 0.7,
      data_bearish_candles: 0.42,
      data_close_near_low: 0.34,
      data_holder_concentration: 0.38,
      data_risk_keywords: 0.42,
      data_safety_keywords: -0.3,
      data_completeness: 1
    })
  ];
}

export function createDefaultModel() {
  return {
    weights: Array.from({ length: FEATURE_COUNT }, () => 0),
    bias: 0,
    sampleCount: 0,
    trainedAt: null
  };
}

export function trainLogisticModel(examples, options = {}) {
  const dataset = examples.filter(
    (example) => Array.isArray(example.features) && example.features.length === FEATURE_COUNT
  );

  if (!dataset.length) {
    return createDefaultModel();
  }

  let weights = Array.from({ length: FEATURE_COUNT }, () => 0);
  let bias = 0;
  const learningRate = options.learningRate ?? 0.12;
  const epochs = options.epochs ?? 180;
  const l2 = options.l2 ?? 0.0009;

  for (let epoch = 0; epoch < epochs; epoch += 1) {
    for (const example of dataset) {
      const target = example.label === 1 || example.label === "rug" ? 1 : 0;
      const score = bias + weights.reduce((sum, weight, index) => sum + weight * example.features[index], 0);
      const prediction = sigmoid(score);
      const error = prediction - target;

      for (let index = 0; index < FEATURE_COUNT; index += 1) {
        weights[index] -= learningRate * (error * example.features[index] + l2 * weights[index]);
      }
      bias -= learningRate * error;
    }
  }

  return {
    weights,
    bias,
    sampleCount: dataset.length,
    trainedAt: Date.now()
  };
}

function buildTextKeywords(text) {
  const normalized = String(text || "").toLowerCase();
  const riskKeywords = [
    "honeypot",
    "mintable",
    "blacklist",
    "freeze",
    "owner",
    "tax",
    "dump",
    "rug",
    "unlock",
    "scam",
    "proxy",
    "mint",
    "whale"
  ];
  const safetyKeywords = [
    "renounced",
    "locked",
    "burned",
    "audited",
    "verified",
    "lp locked",
    "liquidity locked",
    "safe",
    "doxxed",
    "community"
  ];

  const countMatches = (keywords) =>
    keywords.reduce((sum, keyword) => sum + (normalized.includes(keyword) ? 1 : 0), 0);

  return {
    riskScore: countMatches(riskKeywords),
    safetyScore: countMatches(safetyKeywords)
  };
}

function normalizeLiveDexSnapshot(liveSnapshot) {
  if (!isObject(liveSnapshot)) {
    return null;
  }

  const pair = isObject(liveSnapshot.pair)
    ? liveSnapshot.pair
    : isObject(liveSnapshot.data?.pair)
      ? liveSnapshot.data.pair
      : liveSnapshot;
  const priceChange = isObject(pair.priceChange) ? pair.priceChange : {};
  const txns = isObject(pair.txns)
    ? pair.txns
    : isObject(pair.txns24h)
      ? pair.txns24h
      : {};
  const baseToken = isObject(pair.baseToken) ? pair.baseToken : {};
  const quoteToken = isObject(pair.quoteToken) ? pair.quoteToken : {};
  const liquidity = isObject(pair.liquidity) ? pair.liquidity : {};
  const volume = isObject(pair.volume) ? pair.volume : {};
  const labels = Array.isArray(pair.labels) ? pair.labels.filter(Boolean) : [];
  const address = pair.pairAddress || pair.address || liveSnapshot.pairAddress || null;
  const priceChangeValues = [
    firstFiniteNumber(priceChange.m5, pair.priceChangeM5, pair.priceChange5m),
    firstFiniteNumber(priceChange.h1, pair.priceChangeH1, pair.priceChange1h),
    firstFiniteNumber(priceChange.h6, pair.priceChangeH6, pair.priceChange6h),
    firstFiniteNumber(priceChange.h24, pair.priceChangeH24, pair.priceChange24h)
  ].filter((value) => value !== null);

  return {
    source: liveSnapshot.source || "dexscreener",
    chainId: pair.chainId || liveSnapshot.chainId || null,
    dexId: pair.dexId || liveSnapshot.dexId || null,
    pairAddress: address,
    baseTokenSymbol: baseToken.symbol || null,
    baseTokenName: baseToken.name || null,
    quoteTokenSymbol: quoteToken.symbol || null,
    quoteTokenName: quoteToken.name || null,
    priceUsd: firstFiniteNumber(pair.priceUsd, pair.price?.usd, pair.price),
    liquidityUsd: firstFiniteNumber(liquidity.usd, pair.liquidityUsd, pair.liquidityUSD),
    fdvUsd: firstFiniteNumber(pair.fdv, pair.fullyDilutedValuation, pair.marketCap, pair.marketcap),
    volume24h: firstFiniteNumber(volume.h24, pair.volume24h, pair.volumeUsd24h, pair.volume?.usd),
    buys24h: firstFiniteNumber(txns.h24?.buys, txns.buys, pair.buys24h, pair.buyCount24h),
    sells24h: firstFiniteNumber(txns.h24?.sells, txns.sells, pair.sells24h, pair.sellCount24h),
    pairCreatedAt: firstFiniteNumber(pair.pairCreatedAt, liveSnapshot.pairCreatedAt),
    priceChangeM5: firstFiniteNumber(priceChange.m5, pair.priceChangeM5, pair.priceChange5m),
    priceChangeH1: firstFiniteNumber(priceChange.h1, pair.priceChangeH1, pair.priceChange1h),
    priceChangeH6: firstFiniteNumber(priceChange.h6, pair.priceChangeH6, pair.priceChange6h),
    priceChangeH24: firstFiniteNumber(priceChange.h24, pair.priceChangeH24, pair.priceChange24h),
    priceChangeValues,
    labels,
    url: pair.url || liveSnapshot.url || null,
    text: [
      liveSnapshot.text,
      labels.join(" "),
      pair.chainId,
      pair.dexId,
      baseToken.name,
      baseToken.symbol,
      quoteToken.name,
      quoteToken.symbol,
      pair.url
    ]
      .filter(Boolean)
      .join(" ")
  };
}

function parseJsonPayload(text) {
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return parsed.filter(isObject);
    }
    if (isObject(parsed)) {
      if (Array.isArray(parsed.pairs)) {
        return parsed.pairs.filter(isObject);
      }
      if (isObject(parsed.pair)) {
        return [parsed.pair];
      }
      if (Array.isArray(parsed.data)) {
        return parsed.data.filter(isObject);
      }
      if (isObject(parsed.data) && Array.isArray(parsed.data.pairs)) {
        return parsed.data.pairs.filter(isObject);
      }
      if (isObject(parsed.result) && Array.isArray(parsed.result.pairs)) {
        return parsed.result.pairs.filter(isObject);
      }
      if (Array.isArray(parsed.rows)) {
        return parsed.rows.filter(isObject);
      }
      if (Array.isArray(parsed.candles)) {
        return parsed.candles.filter(isObject);
      }
    }
  } catch {
    return null;
  }
  return null;
}

function parseDelimitedPayload(text) {
  const lines = String(text || "")
    .trim()
    .split(/\r?\n/)
    .filter(Boolean);

  if (lines.length < 2) {
    return [];
  }

  const firstLine = lines[0];
  const delimiter = firstLine.includes("\t")
    ? "\t"
    : firstLine.split(";").length > firstLine.split(",").length
      ? ";"
      : ",";
  const headers = splitDelimitedLine(firstLine, delimiter).map(normalizeKey);

  return lines.slice(1).map((line) => {
    const cells = splitDelimitedLine(line, delimiter);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = cells[index];
    });
    return row;
  });
}

function readStructuredRows(text) {
  const trimmed = String(text || "").trim();
  if (!trimmed) {
    return [];
  }

  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    const jsonRows = parseJsonPayload(trimmed);
    if (jsonRows) {
      return jsonRows;
    }
  }

  return parseDelimitedPayload(trimmed);
}

function getNumericField(row, aliases) {
  for (const alias of aliases) {
    const normalizedAlias = normalizeKey(alias);
    for (const key of Object.keys(row)) {
      if (normalizeKey(key) === normalizedAlias) {
        const parsed = toNumber(row[key]);
        if (parsed !== null) {
          return parsed;
        }
      }
    }
  }
  return null;
}

function extractSeries(rows, aliases) {
  return rows
    .map((row) => getNumericField(row, aliases))
    .filter((value) => value !== null && Number.isFinite(value));
}

function blendFeature(baseValue, liveValue, liveWeight = 0.7) {
  if (!Number.isFinite(liveValue)) {
    return baseValue;
  }
  return baseValue * (1 - liveWeight) + liveValue * liveWeight;
}

function safeRatio(numerator, denominator) {
  return denominator === 0 ? 0 : numerator / denominator;
}

function normalizeSeries(values) {
  if (!values.length) {
    return [];
  }

  const base = values[0] || 1;
  return values.map((value) => safeRatio(value - base, Math.abs(base) || 1));
}

function maxDrawdown(values) {
  if (values.length < 2) {
    return 0;
  }

  let peak = values[0];
  let deepest = 0;

  for (const value of values) {
    if (value > peak) {
      peak = value;
    }
    const drawdown = safeRatio(peak - value, Math.abs(peak) || 1);
    if (drawdown > deepest) {
      deepest = drawdown;
    }
  }

  return deepest;
}

function extractChartCenterLine(imageData) {
  const { data, width, height } = imageData;
  if (!data || !width || !height) {
    return null;
  }

  const samplePoints = [
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1],
    [Math.floor(width * 0.1), Math.floor(height * 0.1)],
    [Math.floor(width * 0.9), Math.floor(height * 0.1)],
    [Math.floor(width * 0.1), Math.floor(height * 0.9)],
    [Math.floor(width * 0.9), Math.floor(height * 0.9)]
  ];

  const backgroundBrightness = mean(
    samplePoints.map(([x, y]) => {
      const index = (Math.max(0, Math.min(height - 1, y)) * width + Math.max(0, Math.min(width - 1, x))) * 4;
      return (data[index] + data[index + 1] + data[index + 2]) / 765;
    })
  );

  const columns = [];
  let foregroundPixels = 0;
  let redPixels = 0;
  let greenPixels = 0;

  for (let x = 0; x < width; x += 1) {
    let top = height;
    let bottom = -1;
    let count = 0;
    let sumY = 0;

    for (let y = 0; y < height; y += 1) {
      const index = (y * width + x) * 4;
      const r = data[index];
      const g = data[index + 1];
      const b = data[index + 2];
      const alpha = data[index + 3] / 255;
      if (alpha < 0.2) {
        continue;
      }

      const brightness = (r + g + b) / 765;
      const saturation = (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
      const contrast = Math.abs(brightness - backgroundBrightness);

      if (contrast > 0.08 || saturation > 0.14 || brightness < backgroundBrightness * 0.88) {
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
        count += 1;
        sumY += y;
        foregroundPixels += 1;

        if (r > g * 1.08 && r > b * 1.05) {
          redPixels += 1;
        } else if (g > r * 1.08 && g > b * 1.05) {
          greenPixels += 1;
        }
      }
    }

    if (count > 0) {
      columns.push({
        x,
        center: sumY / count,
        span: bottom - top + 1,
        count
      });
    }
  }

  if (columns.length < Math.max(12, width * 0.04)) {
    return null;
  }

  const xs = columns.map((column) => column.x / width);
  const ys = columns.map((column) => column.center / height);
  const spans = columns.map((column) => column.span / height);
  const deltas = [];

  for (let index = 1; index < ys.length; index += 1) {
    deltas.push(ys[index] - ys[index - 1]);
  }

  let reversalCount = 0;
  for (let index = 2; index < deltas.length; index += 1) {
    const previous = Math.sign(deltas[index - 1]);
    const current = Math.sign(deltas[index]);
    if (previous !== 0 && current !== 0 && previous !== current) {
      reversalCount += 1;
    }
  }

  const quarter = Math.max(1, Math.floor(columns.length / 4));
  const firstQuarter = mean(ys.slice(0, quarter));
  const lastQuarter = mean(ys.slice(-quarter));
  const midpoint = mean(ys.slice(Math.floor(columns.length / 3), Math.floor((columns.length * 2) / 3)));
  const trendSlope = linearRegressionSlope(xs, ys);
  const volatility = stddev(deltas);
  const lateDrop = lastQuarter - midpoint;
  const fragmentation = 1 - columns.length / width;
  const colorBias = safeRatio(redPixels - greenPixels, foregroundPixels || 1);
  const wickiness = mean(spans);
  const drawdown = maxDrawdown(ys);

  return [
    tanhScale(trendSlope, 0.06),
    tanhScale(lastQuarter - firstQuarter, 0.08),
    tanhScale(volatility, 0.04),
    tanhScale(drawdown, 0.12),
    tanhScale(fragmentation, 0.12),
    clamp(colorBias, -1, 1),
    tanhScale(wickiness, 0.12),
    tanhScale(reversalCount / Math.max(1, deltas.length), 0.12),
    tanhScale(lateDrop, 0.08)
  ];
}

export function extractDataFeatures(text, liveSnapshot = null) {
  const rows = readStructuredRows(text);
  const structured = rows.length > 0;
  const keywords = buildTextKeywords(text);
  const live = normalizeLiveDexSnapshot(liveSnapshot);
  const liveKeywords = live ? buildTextKeywords(live.text) : { riskScore: 0, safetyScore: 0 };

  const priceSeries = extractSeries(rows, [
    "close",
    "price",
    "last",
    "value",
    "markPrice",
    "marketcap",
    "fdv",
    "marketCap"
  ]);
  const openSeries = extractSeries(rows, ["open"]);
  const highSeries = extractSeries(rows, ["high"]);
  const lowSeries = extractSeries(rows, ["low"]);
  const volumeSeries = extractSeries(rows, [
    "volume",
    "vol",
    "quotevolume",
    "basevolume",
    "tradingvolume"
  ]);
  const liquiditySeries = extractSeries(rows, [
    "liquidity",
    "poolliquidity",
    "lp",
    "liquidityusd",
    "liquidityusdvalue"
  ]);
  const holderSeries = extractSeries(rows, [
    "topholderpercent",
    "top10percent",
    "top10",
    "holderconcentration",
    "holdershare"
  ]);

  const returns = [];
  for (let index = 1; index < priceSeries.length; index += 1) {
    const previous = priceSeries[index - 1];
    const current = priceSeries[index];
    if (previous && Number.isFinite(previous) && Number.isFinite(current)) {
      returns.push(safeRatio(current - previous, Math.abs(previous) || 1));
    }
  }

  const firstPrice = priceSeries[0] ?? 0;
  const lastPrice = priceSeries.at(-1) ?? firstPrice;
  const maxPriceDrawdown = maxDrawdown(priceSeries);
  const priceReturn = safeRatio(lastPrice - firstPrice, Math.abs(firstPrice) || 1);
  const priceVolatility = stddev(returns);
  const volumeSpike = volumeSeries.length > 1
    ? safeRatio(volumeSeries.at(-1) + 1, mean(volumeSeries.slice(0, Math.max(1, Math.floor(volumeSeries.length / 2)))) + 1)
    : 1;
  const volumeCollapse = volumeSeries.length > 1
    ? safeRatio(mean(volumeSeries.slice(0, Math.max(1, Math.floor(volumeSeries.length / 2)))) + 1, mean(volumeSeries.slice(-Math.max(1, Math.floor(volumeSeries.length / 2)))) + 1)
    : 1;
  const liquidityDrop = liquiditySeries.length > 1
    ? safeRatio(mean(liquiditySeries.slice(0, Math.max(1, Math.floor(liquiditySeries.length / 3)))) + 1, mean(liquiditySeries.slice(-Math.max(1, Math.floor(liquiditySeries.length / 3)))) + 1)
    : 1;

  let bearishCandles = 0;
  let closeNearLow = 0;
  let candleCount = 0;
  for (let index = 0; index < Math.min(openSeries.length, highSeries.length, lowSeries.length); index += 1) {
    const open = openSeries[index];
    const high = highSeries[index];
    const low = lowSeries[index];
    const close = priceSeries[index] ?? null;
    if (
      open === null ||
      high === null ||
      low === null ||
      close === null ||
      !Number.isFinite(high - low) ||
      high === low
    ) {
      continue;
    }

    candleCount += 1;
    if (close < open) {
      bearishCandles += 1;
    }

    closeNearLow += safeRatio(close - low, high - low);
  }

  const bearishRatio = candleCount ? bearishCandles / candleCount : 0.5;
  const averageClosePosition = candleCount ? closeNearLow / candleCount : 0.5;
  const holderConcentration = holderSeries.length
    ? mean(holderSeries.map((value) => (value > 1 ? value / 100 : value)))
    : 0;

  const livePriceChanges = live?.priceChangeValues || [];
  const livePriceAverage = livePriceChanges.length ? mean(livePriceChanges) : null;
  const livePriceWorst = livePriceChanges.length ? Math.min(...livePriceChanges) : null;
  const livePriceVolatility = livePriceChanges.length > 1 ? stddev(livePriceChanges) : null;
  const liveVolumePressure = live?.liquidityUsd && live.volume24h !== null
    ? safeRatio(live.volume24h, live.liquidityUsd)
    : null;
  const liveLiquidityPressure = live?.fdvUsd && live.liquidityUsd
    ? safeRatio(live.fdvUsd, live.liquidityUsd)
    : null;
  const liveSellPressure = live && Number.isFinite(live.buys24h) && Number.isFinite(live.sells24h)
    ? safeRatio(live.sells24h, live.buys24h + live.sells24h)
    : null;
  const liveBullishness = live && Number.isFinite(live.buys24h) && Number.isFinite(live.sells24h)
    ? safeRatio(live.buys24h, live.buys24h + live.sells24h)
    : null;

  const completeness = live ? Math.max(structured ? clamp01(rows.length / 20) : 0.15, 0.92) : structured ? clamp01(rows.length / 20) : 0.15;

  return [
    blendFeature(tanhScale(priceReturn, 0.7), livePriceAverage !== null ? tanhScale(livePriceAverage / 100, 0.45) : null, live ? 0.75 : 0),
    blendFeature(tanhScale(maxPriceDrawdown, 0.35), livePriceWorst !== null ? tanhScale(Math.max(0, -livePriceWorst) / 100, 0.35) : null, live ? 0.65 : 0),
    blendFeature(tanhScale(priceVolatility, 0.12), livePriceVolatility !== null ? tanhScale(livePriceVolatility / 100, 0.18) : null, live ? 0.7 : 0),
    blendFeature(tanhScale(volumeSpike - 1, 0.8), liveVolumePressure !== null ? tanhScale(liveVolumePressure, 1.2) : null, live ? 0.7 : 0),
    blendFeature(tanhScale(volumeCollapse - 1, 0.8), liveVolumePressure !== null ? tanhScale(1 / Math.max(liveVolumePressure, 0.05), 1.0) : null, live ? 0.6 : 0),
    blendFeature(tanhScale(liquidityDrop - 1, 0.8), liveLiquidityPressure !== null ? tanhScale(liveLiquidityPressure, 1.6) : null, live ? 0.7 : 0),
    blendFeature(tanhScale(bearishRatio - 0.5, 0.22), liveSellPressure !== null ? tanhScale(liveSellPressure - 0.5, 0.2) : null, live ? 0.55 : 0),
    blendFeature(tanhScale(0.5 - averageClosePosition, 0.18), liveBullishness !== null ? tanhScale(0.5 - liveBullishness, 0.2) : null, live ? 0.55 : 0),
    tanhScale(holderConcentration - 0.3, 0.18),
    tanhScale(keywords.riskScore + (liveKeywords.riskScore || 0), 1.6),
    tanhScale(keywords.safetyScore + (liveKeywords.safetyScore || 0), 1.6),
    completeness
  ];
}

export function composeFeatures(chartFeatures = [], dataFeatures = []) {
  const chart = Array.isArray(chartFeatures) && chartFeatures.length === 9
    ? chartFeatures
    : Array.from({ length: 9 }, () => 0);
  const data = Array.isArray(dataFeatures) && dataFeatures.length === 12
    ? dataFeatures
    : Array.from({ length: 12 }, () => 0);
  return [...chart, ...data];
}

export function extractFeaturesFromInputs(imageData, text, liveSnapshot = null) {
  return composeFeatures(
    extractChartFeatures(imageData),
    extractDataFeatures(text, liveSnapshot)
  );
}

export function extractChartFeatures(imageData) {
  const chartFeatures = extractChartCenterLine(imageData);
  return chartFeatures || Array.from({ length: 9 }, () => 0);
}

export function predictFromFeatures(features, model) {
  const normalizedFeatures = Array.isArray(features) && features.length === FEATURE_COUNT
    ? features.map((value) => (Number.isFinite(value) ? clamp(value, -1, 1) : 0))
    : Array.from({ length: FEATURE_COUNT }, () => 0);
  const weights = model?.weights?.length === FEATURE_COUNT ? model.weights : Array.from({ length: FEATURE_COUNT }, () => 0);
  const bias = Number.isFinite(model?.bias) ? model.bias : 0;
  const score = bias + weights.reduce((sum, weight, index) => sum + weight * normalizedFeatures[index], 0);
  const rugProbability = sigmoid(score);
  const label = rugProbability >= 0.53 ? "rug" : "safe";
  const confidence = clamp01(Math.abs(rugProbability - 0.5) * 2);

  const contributions = FEATURE_NAMES.map((name, index) => ({
    name,
    label: FEATURE_LABELS[name],
    value: normalizedFeatures[index],
    impact: weights[index] * normalizedFeatures[index]
  }))
    .filter((item) => Math.abs(item.impact) > 0.0001)
    .sort((left, right) => Math.abs(right.impact) - Math.abs(left.impact));

  return {
    label,
    rugProbability,
    safeProbability: 1 - rugProbability,
    confidence,
    score,
    contributions
  };
}

export function describePrediction(prediction) {
  if (!prediction) {
    return "No prediction available.";
  }

  const pct = Math.round(prediction.rugProbability * 100);
  if (prediction.label === "rug") {
    return `Rug signal ${pct}% with ${Math.round(prediction.confidence * 100)}% confidence.`;
  }
  return `Safe signal ${100 - pct}% with ${Math.round(prediction.confidence * 100)}% confidence.`;
}
