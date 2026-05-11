const canvas = document.querySelector("#globeCanvas");
const ctx = canvas.getContext("2d", { alpha: true });
const stage = document.querySelector(".globe-stage");
const regionCoverLayer = document.querySelector("#regionCoverLayer");
const globeFocusBack = document.querySelector("#globeFocusBack");

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const TILT_DEFAULT = -Math.PI / 6;

const REGION_FOCUS = {
  amazon: {
    id: "amazon",
    label: "泛亚马逊",
    centerLon: -64,
    centerLat: -4,
    radiusMul: 1.65,
    contains(lon, lat) {
      return lat >= -38 && lat <= 18 && lon >= -82 && lon <= -34;
    },
    bookIds: new Set([
      "ethnography-12",
      "ethnography-30",
      "ethnography-31",
      "ethnography-32",
      "ethnography-33",
      "ethnography-35",
    ]),
  },
  zomia: {
    id: "zomia",
    label: "赞米亚",
    centerLon: 99,
    centerLat: 24,
    radiusMul: 1.75,
    contains(lon, lat) {
      return lat >= 7 && lat <= 36 && lon >= 89 && lon <= 106;
    },
    bookIds: new Set([
      "ethnography-59",
      "ethnography-60",
      "ethnography-61",
      "ethnography-62",
      "ethnography-63",
      "ethnography-64",
    ]),
  },
  pacific: {
    id: "pacific",
    label: "美拉尼西亚",
    centerLon: 144,
    centerLat: -5,
    radiusMul: 2.05,
    contains(lon, lat) {
      return lat >= -12 && lat <= 1 && lon >= 129 && lon <= 156;
    },
    bookIds: new Set([
      "ethnography-13",
      "ethnography-21",
      "ethnography-65",
      "ethnography-67",
      "ethnography-69",
      "ethnography-70",
      "ethnography-71",
    ]),
  },
};

const COVER_SLUG_BY_BOOK_ID = {
  "ethnography-12": "how-forests-think",
  "ethnography-30": "the-falling-sky",
  "ethnography-31": "earth-beings",
  "ethnography-32": "beyond-nature-and-culture",
  "ethnography-33": "cannibal-metaphysics",
  "ethnography-35": "designs-for-the-pluriverse",
  "ethnography-59": "age-of-wild-ghosts",
  "ethnography-60": "the-paper-road",
  "ethnography-61": "songs-for-dead-parents",
  "ethnography-62": "passage-to-manhood",
  "ethnography-63": "being-and-becoming-kachin",
  "ethnography-64": "mien-relations",
  "ethnography-13": "in-the-shadow-of-the-palms",
  "ethnography-21": "becoming-sinners",
  "ethnography-65": "society-of-others",
  "ethnography-67": "reverse-anthropology",
  "ethnography-68": "on-the-edge-of-the-global",
  "ethnography-69": "leviathans-at-the-gold-mine",
  "ethnography-70": "the-gender-of-the-gift",
  "ethnography-71": "cheap-meat",
};

const state = {
  width: 0,
  height: 0,
  dpr: 1,
  radius: 0,
  centerX: 0,
  centerY: 0,
  layoutCenterXDefault: 0,
  layoutCenterYDefault: 0,
  layoutRadiusDefault: 0,
  yaw: -0.48,
  pitch: -0.14,
  targetYaw: -0.48,
  targetPitch: -0.14,
  velocityX: 0,
  velocityY: 0,
  isDragging: false,
  pointerX: 0,
  pointerY: 0,
  intro: 0,
  dragDistance: 0,
  selectedBookId: null,
  selectedSiteIndex: 0,
  selectedGroupKey: null,
  selectedBookIndex: 0,
  tilt: TILT_DEFAULT,
  focusMode: null,
  focusBlend: 0,
  focusBlendTarget: 0,
  focusRegionId: null,
  focusYawTarget: null,
  focusPitchTarget: null,
  focusRadiusMul: 1,
  preFocusYaw: null,
  preFocusPitch: null,
  coverLayerBuiltFor: null,
  coverLayoutReady: false,
  cardSuppressionBlend: 0,
  coverSplitBlend: 0,
  activeGlobePointerId: null,
};
let landRings = [];
let landReady = false;

const SUPPLEMENTAL_LAND_RINGS = [
  makeOvalLandRing(-175.2, -21.18, 0.42, 0.2),
  makeOvalLandRing(-173.98, -18.65, 0.34, 0.24),
  makeOvalLandRing(-174.35, -19.8, 0.28, 0.18),
];

const CITY_PIN_GROUPS = [
  {
    key: "city:tokyo",
    lat: 35.6762,
    lon: 139.6503,
    bounds: { minLat: 35.5, maxLat: 35.85, minLon: 139.45, maxLon: 139.9 },
  },
  {
    key: "city:beijing",
    lat: 39.9042,
    lon: 116.4074,
    bounds: { minLat: 39.75, maxLat: 40.05, minLon: 116.2, maxLon: 116.6 },
  },
];

function makeOvalLandRing(centerLon, centerLat, lonRadius, latRadius, segments = 14) {
  const ring = [];

  for (let i = 0; i < segments; i += 1) {
    const angle = (i / segments) * Math.PI * 2;
    ring.push(
      sphericalToVector(
        centerLon + Math.cos(angle) * lonRadius,
        centerLat + Math.sin(angle) * latRadius
      )
    );
  }

  return ring;
}

function buildPinPoints(book) {
  if (book.sites && book.sites.length > 0) {
    return book.sites.map((site, siteIndex) => ({
      siteIndex,
      lat: site.lat,
      lon: site.lon,
      vector: sphericalToVector(site.lon, site.lat),
    }));
  }

  return [{ siteIndex: 0, lat: book.lat, lon: book.lon, vector: sphericalToVector(book.lon, book.lat) }];
}

function pinGroupKey(lat, lon) {
  return `${Number(lat).toFixed(3)},${Number(lon).toFixed(3)}`;
}

function resolvePinGroup(pinPoint) {
  const lat = Number(pinPoint.lat);
  const lon = Number(pinPoint.lon);
  const cityGroup = CITY_PIN_GROUPS.find(({ bounds }) => {
    return lat >= bounds.minLat && lat <= bounds.maxLat && lon >= bounds.minLon && lon <= bounds.maxLon;
  });

  if (cityGroup) {
    return {
      key: cityGroup.key,
      lat: cityGroup.lat,
      lon: cityGroup.lon,
      vector: sphericalToVector(cityGroup.lon, cityGroup.lat),
    };
  }

  return {
    key: pinGroupKey(lat, lon),
    lat,
    lon,
    vector: pinPoint.vector,
  };
}

function buildPinGroups(sourceBooks) {
  const groups = new Map();

  for (const book of sourceBooks) {
    for (const pinPoint of book.pinPoints) {
      const pinGroup = resolvePinGroup(pinPoint);
      const key = pinGroup.key;
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          lat: pinGroup.lat,
          lon: pinGroup.lon,
          vector: pinGroup.vector,
          items: [],
        });
      }

      groups.get(key).items.push({
        book,
        siteIndex: pinPoint.siteIndex,
      });
    }
  }

  return Array.from(groups.values());
}

const books = (window.ETHNOGRAPHY_BOOKS || []).map((book) => ({
  ...book,
  vector: sphericalToVector(book.lon, book.lat),
  pinPoints: buildPinPoints(book),
}));
const pinGroups = buildPinGroups(books);
let projectedPins = [];
let hoveredPinId = null;
const bookCard = document.querySelector("#bookCard");
const bookCardClose = document.querySelector("#bookCardClose");
const bookCardNav = document.querySelector("#bookCardNav");
const bookCardPrev = document.querySelector("#bookCardPrev");
const bookCardNext = document.querySelector("#bookCardNext");
const bookCardCount = document.querySelector("#bookCardCount");
const bookLocationZh = document.querySelector("#bookLocationZh");
const bookLocationEn = document.querySelector("#bookLocationEn");
const bookTitleZh = document.querySelector("#bookTitleZh");
const bookTitleEn = document.querySelector("#bookTitleEn");
const bookMeta = document.querySelector("#bookMeta");
const bookSummary = document.querySelector("#bookSummary");

const OFFICIAL_PUBLISHER_NAMES = {
  Princeton: "Princeton University Press",
  Duke: "Duke University Press",
  "UC Press": "University of California Press",
  Chicago: "The University of Chicago Press",
  Stanford: "Stanford University Press",
  Cornell: "Cornell University Press",
  Columbia: "Columbia University Press",
  Cambridge: "Cambridge University Press",
  Harvard: "Harvard University Press",
  Amsterdam: "Amsterdam University Press",
  Oxford: "Oxford University Press",
  Pennsylvania: "University of Pennsylvania Press",
  Univocal: "Univocal Publishing",
  Athlone: "The Athlone Press",
};

function resolvePublisherLabel(raw) {
  if (!raw) return "";
  return OFFICIAL_PUBLISHER_NAMES[raw] ?? raw;
}

function splitTranslatedTitle(displayTitle) {
  const trimmed = String(displayTitle || "").trim();
  const match = /^([\s\S]+?)\s*\(([\s\S]+)\)\s*$/.exec(trimmed);
  const stripBookQuotes = (value) => String(value || "").replace(/[《》]/g, "").trim();
  if (!match) return { zh: stripBookQuotes(trimmed), en: "" };
  return { zh: stripBookQuotes(match[1]), en: match[2].trim() };
}

function fallbackEnglishLocation(book) {
  const loc = book.location || "";
  const region = book.countryOrRegion || "";
  if (!region) return loc;
  if (!loc) return region;
  return `${region} · ${loc}`;
}

function formatSummaryForCard(summary) {
  const text = String(summary || "").trim();
  if (!text) return "";

  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]*\n+[ \t]*/g, "\n")
    .replace(/([。！？])\s*/g, "$1\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function setScaleVar(name, value) {
  const safe = Number.isFinite(value) ? value : 1;
  document.documentElement.style.setProperty(name, String(safe));
}

function applyLockedTypeScales() {
  const saved = JSON.parse(localStorage.getItem("ethnoTypeScales") || "{}");
  const eyebrow = Number(saved.eyebrow) || 1;
  const title = Number(saved.title) || 1;
  const lede = Number(saved.lede) || 1;

  setScaleVar("--scale-eyebrow", eyebrow);
  setScaleVar("--scale-title", title);
  setScaleVar("--scale-lede", lede);
}

function applyLockedCardTypeScales() {
  const saved = JSON.parse(localStorage.getItem("ethnoCardTypeScales") || "{}");
  const values = {
    locZh: Number(saved.locZh) || 1,
    locEn: Number(saved.locEn) || 1,
    titleZh: Number(saved.titleZh) || 1,
    titleEn: Number(saved.titleEn) || 1,
    meta: Number(saved.meta) || 1,
    summary: Number(saved.summary) || 1,
  };

  setScaleVar("--scale-card-loc-zh", values.locZh);
  setScaleVar("--scale-card-loc-en", values.locEn);
  setScaleVar("--scale-card-title-zh", values.titleZh);
  setScaleVar("--scale-card-title-en", values.titleEn);
  setScaleVar("--scale-card-meta", values.meta);
  setScaleVar("--scale-card-summary", values.summary);
  syncBookCardLayout();
}

function introVarName(key, axis) {
  return `--intro-${key}-${axis}`;
}

function applyIntroOffsets(offsets) {
  for (const key of ["eyebrow", "title", "lede"]) {
    const item = offsets[key] || { x: 0, y: 0 };
    const x = Number(item.x) || 0;
    const y = Number(item.y) || 0;
    document.documentElement.style.setProperty(introVarName(key, "x"), `${x}px`);
    document.documentElement.style.setProperty(introVarName(key, "y"), `${y}px`);
  }
}

function applyLockedIntroOffsets() {
  const stored = JSON.parse(localStorage.getItem("ethnoIntroOffsets") || "{}");
  const offsets = {
    eyebrow: { x: Number(stored?.eyebrow?.x) || 0, y: Number(stored?.eyebrow?.y) || 0 },
    title: { x: Number(stored?.title?.x) || 0, y: Number(stored?.title?.y) || 0 },
    lede: { x: Number(stored?.lede?.x) || 0, y: Number(stored?.lede?.y) || 0 },
  };
  applyIntroOffsets(offsets);
}

function nowrapRowsOverflow(panel) {
  const margin = 44;
  const inner = panel.clientWidth - margin;
  if (!bookLocationEn || !bookMeta) return false;

  const enNeeds = inner > 0 ? bookLocationEn.scrollWidth > inner : false;
  const metaNeeds = inner > 0 ? bookMeta.scrollWidth > inner : false;
  return enNeeds || metaNeeds;
}

function syncBookCardLayout() {
  if (bookCard.classList.contains("is-hidden")) return;

  let fixedPx;
  if (bookCard.classList.contains("book-card--focus-split")) {
    fixedPx = Math.min(520, Math.max(300, Math.round(window.innerWidth * 0.54 - 40)));
  } else {
    fixedPx = Math.min(420, Math.max(300, window.innerWidth - 48));
  }
  bookCard.style.maxWidth = `${fixedPx}px`;
  bookCard.style.minWidth = `${fixedPx}px`;
  bookCard.classList.remove("book-card--tight", "book-card--tighter");
  bookCard.style.width = `${fixedPx}px`;

  requestAnimationFrame(() => {
    if (nowrapRowsOverflow(bookCard)) bookCard.classList.add("book-card--tight");
    requestAnimationFrame(() => {
      if (nowrapRowsOverflow(bookCard)) bookCard.classList.add("book-card--tighter");
    });
  });
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function sphericalToVector(lonDeg, latDeg) {
  const lon = toRadians(lonDeg);
  const lat = toRadians(latDeg);
  const cosLat = Math.cos(lat);

  return {
    x: cosLat * Math.sin(lon),
    y: Math.sin(lat),
    z: cosLat * Math.cos(lon),
  };
}

const REGION_FOCUS_LABEL_TEXT = {
  amazon: "亚马逊",
};

const REGION_FOCUS_LABELS = Object.values(REGION_FOCUS).map((region) => ({
  id: region.id,
  text: REGION_FOCUS_LABEL_TEXT[region.id] || region.label,
  vector: sphericalToVector(region.centerLon, region.centerLat),
}));

const REGION_FOCUS_LABEL_OFFSETS = {
  amazon: { x: 0, y: 0 },
  // Nudge label up-left so the pill does not sit on the region-center pin.
  zomia: { x: -42, y: -28 },
  pacific: { x: 0, y: 0 },
};

function simplifyRing(ring, step = 2) {
  if (ring.length <= 10) return ring;
  const simplified = [];

  for (let i = 0; i < ring.length; i += step) {
    simplified.push(ring[i]);
  }

  if (simplified[simplified.length - 1] !== ring[ring.length - 1]) {
    simplified.push(ring[ring.length - 1]);
  }

  return simplified;
}

function buildRingsFromGeometry(geometry) {
  const rings = [];
  const pushRing = (ring) => {
    if (!ring || ring.length < 3) return;
    const simplified = simplifyRing(ring, 2);
    const vectors = simplified.map(([lon, lat]) => sphericalToVector(lon, lat));
    rings.push(vectors);
  };

  if (geometry.type === "Polygon") {
    const [outer] = geometry.coordinates;
    // Interior rings (holes) are water cut-outs; omit them so inland seas aren’t shaded as land.
    pushRing(outer);
    return rings;
  }

  if (geometry.type === "MultiPolygon") {
    for (const polygon of geometry.coordinates) {
      const [outer] = polygon;
      pushRing(outer);
    }
  }

  return rings;
}

async function loadLandData() {
  try {
    const response = await fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const topology = await response.json();

    if (!window.topojson || typeof window.topojson.feature !== "function") {
      throw new Error("topojson-client is not available");
    }

    const featureLike = window.topojson.feature(topology, topology.objects.land);
    landRings = extractRings(featureLike).concat(SUPPLEMENTAL_LAND_RINGS);
    landReady = landRings.length > 0;
  } catch (error) {
    console.error("Failed to load land topology:", error);
    landRings = SUPPLEMENTAL_LAND_RINGS;
    landReady = landRings.length > 0;
  }
}

function extractRings(featureLike) {
  if (!featureLike) return [];

  if (featureLike.type === "FeatureCollection") {
    return featureLike.features.flatMap((feature) => buildRingsFromGeometry(feature.geometry));
  }

  if (featureLike.type === "Feature") {
    return buildRingsFromGeometry(featureLike.geometry);
  }

  return buildRingsFromGeometry(featureLike);
}

function resize() {
  state.width = window.innerWidth;
  state.height = window.innerHeight;
  state.dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(state.width * state.dpr);
  canvas.height = Math.floor(state.height * state.dpr);
  canvas.style.width = `${state.width}px`;
  canvas.style.height = `${state.height}px`;
  ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);

  const shortSide = Math.min(state.width, state.height);
  state.layoutRadiusDefault = shortSide * (state.width < 760 ? 0.82 : 0.86);
  state.layoutCenterXDefault = state.width * (state.width < 760 ? 0.74 : 0.73);
  state.layoutCenterYDefault = state.height * (state.width < 760 ? 0.86 : 0.87);
  if (state.focusRegionId && state.focusYawTarget != null && state.focusPitchTarget != null) {
    state.focusRadiusMul = computeFocusRadiusMul(
      REGION_FOCUS[state.focusRegionId],
      state.focusYawTarget,
      state.focusPitchTarget
    );
  }
  state.coverLayoutReady = false;
  applyLayoutFromFocusBlend();
}

function smoothstep(t) {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

function computeYawPitchFacing(lonDeg, latDeg) {
  const vx = Math.cos(toRadians(latDeg)) * Math.sin(toRadians(lonDeg));
  const vy = Math.sin(toRadians(latDeg));
  const vz = Math.cos(toRadians(latDeg)) * Math.cos(toRadians(lonDeg));

  if (Math.hypot(vx, vz) < 1e-8) {
    const psi = 0;
    const z1 = -vx * Math.sin(psi) + vz * Math.cos(psi);
    const phi = Math.atan2(vy, z1);
    return { yaw: psi, pitch: phi };
  }

  const psi = Math.atan2(-vx, vz);
  const z1 = -vx * Math.sin(psi) + vz * Math.cos(psi);
  const y1 = vy;
  const phi = Math.atan2(y1, z1);
  return { yaw: psi, pitch: phi };
}

function nearestEquivalentAngle(from, to) {
  return from + Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

function rotateVectorForView(point, yaw, pitch, tilt = 0) {
  let x = point.x;
  let y = point.y;
  let z = point.z;

  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  [x, z] = [x * cy + z * sy, -x * sy + z * cy];

  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  [y, z] = [y * cp - z * sp, y * sp + z * cp];

  const ct = Math.cos(tilt);
  const st = Math.sin(tilt);
  [x, y] = [x * ct - y * st, x * st + y * ct];

  return { x, y, z };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function focusGroupsForRegion(region) {
  if (!region) return [];
  return pinGroups.filter((group) => {
    return region.contains(group.lon, group.lat) && group.items.some((item) => region.bookIds.has(item.book.id));
  });
}

function computeFocusRadiusMul(region, yaw, pitch) {
  const groups = focusGroupsForRegion(region);
  if (!region || groups.length === 0 || state.layoutRadiusDefault <= 0) return region?.radiusMul || 1;

  const isZomiaPrototype = region.id === "zomia";
  const projected = groups.map((group) => rotateVectorForView(group.vector, yaw, pitch, 0));
  const xs = projected.map((point) => point.x);
  const ys = projected.map((point) => point.y);
  const spanX = Math.max(0.16, Math.max(...xs) - Math.min(...xs));
  const spanY = Math.max(0.16, Math.max(...ys) - Math.min(...ys));
  const fillX = isZomiaPrototype ? 0.9 : 0.78;
  const fillY = isZomiaPrototype ? 0.82 : 0.68;
  const fitRadius = Math.min((state.width * fillX) / spanX, (state.height * fillY) / spanY);
  const minRadius = state.layoutRadiusDefault * region.radiusMul;
  const maxBand = isZomiaPrototype ? (state.width < 760 ? 2.08 : 2.58) : state.width < 760 ? 1.72 : 2.18;
  const maxRadius = Math.min(state.width, state.height) * maxBand;
  const radius = clamp(fitRadius, minRadius, maxRadius);

  return radius / state.layoutRadiusDefault;
}

function screenToLonLat(screenX, screenY) {
  const drawRadius = state.radius * (0.94 + state.intro * 0.06);
  const dx = (screenX - state.centerX) / drawRadius;
  const dy = (state.centerY - screenY) / drawRadius;
  const r2 = dx * dx + dy * dy;
  if (r2 > 1.0001) return null;
  const rz = Math.sqrt(Math.max(0, 1 - r2));

  const ct = Math.cos(state.tilt);
  const st = Math.sin(state.tilt);
  const x2 = dx * ct + dy * st;
  const y2 = -dx * st + dy * ct;
  const z2 = rz;

  const cp = Math.cos(state.pitch);
  const sp = Math.sin(state.pitch);
  const y1 = y2 * cp + z2 * sp;
  const z1 = -y2 * sp + z2 * cp;
  const x1 = x2;

  const cy = Math.cos(state.yaw);
  const sy = Math.sin(state.yaw);
  const vx = x1 * cy - z1 * sy;
  const vz = x1 * sy + z1 * cy;
  const vy = y1;

  const lat = Math.asin(Math.max(-1, Math.min(1, vy))) * (180 / Math.PI);
  let lon = Math.atan2(vx, vz) * (180 / Math.PI);
  if (lon > 180) lon -= 360;
  if (lon < -180) lon += 360;
  return { lon, lat };
}

function pickRegionAtLonLat(lon, lat) {
  const order = ["zomia", "amazon", "pacific"];
  for (const id of order) {
    if (REGION_FOCUS[id].contains(lon, lat)) return REGION_FOCUS[id];
  }
  return null;
}

function applyLayoutFromFocusBlend() {
  const t = smoothstep(state.focusBlend);
  const cx0 = state.layoutCenterXDefault;
  const cy0 = state.layoutCenterYDefault;
  const r0 = state.layoutRadiusDefault;
  const mul = state.focusRadiusMul;
  state.centerX = cx0 + (state.width * 0.5 - cx0) * t;
  state.centerY = cy0 + (state.height * 0.5 - cy0) * t;
  state.radius = r0 * (1 + (mul - 1) * t);
  state.tilt = TILT_DEFAULT + (0 - TILT_DEFAULT) * t;
}

function syncBodyFocusClass() {
  const on = state.focusBlend > 0.06 || state.focusMode;
  document.body.classList.toggle("is-region-focus", Boolean(on));
  if (regionCoverLayer) {
    regionCoverLayer.classList.toggle("is-active", state.focusBlend > 0.35 && state.focusRegionId);
    regionCoverLayer.setAttribute("aria-hidden", state.focusBlend > 0.35 ? "false" : "true");
  }
}

function beginRegionFocus(regionId) {
  const region = REGION_FOCUS[regionId];
  if (!region) return;

  closeBookCard();
  state.selectedBookId = null;
  state.selectedSiteIndex = 0;
  state.selectedGroupKey = null;
  state.selectedBookIndex = 0;

  state.preFocusYaw = state.targetYaw;
  state.preFocusPitch = state.targetPitch;
  state.focusMode = regionId;
  state.focusRegionId = regionId;
  state.focusRadiusMul = region.radiusMul;
  state.focusBlendTarget = 1;
  state.coverLayerBuiltFor = null;
  state.coverLayoutReady = false;
  if (regionCoverLayer) regionCoverLayer.innerHTML = "";

  const { yaw, pitch } = computeYawPitchFacing(region.centerLon, region.centerLat);
  const focusYaw = nearestEquivalentAngle(state.targetYaw, yaw);
  state.focusRadiusMul = computeFocusRadiusMul(region, focusYaw, pitch);
  state.focusYawTarget = focusYaw;
  state.focusPitchTarget = pitch;

  if (prefersReducedMotion) {
    state.focusBlend = 1;
    state.targetYaw = focusYaw;
    state.targetPitch = pitch;
    state.yaw = focusYaw;
    state.pitch = pitch;
    applyLayoutFromFocusBlend();
    syncBodyFocusClass();
    buildRegionCoverLayer();
  }
}

function exitRegionFocus() {
  resetGlobePointerState();

  closeBookCard();
  state.selectedBookId = null;
  state.selectedSiteIndex = 0;
  state.selectedGroupKey = null;
  state.selectedBookIndex = 0;

  state.focusMode = null;
  state.focusBlendTarget = 0;

  if (state.preFocusYaw != null && state.preFocusPitch != null) {
    state.focusYawTarget = state.preFocusYaw;
    state.focusPitchTarget = state.preFocusPitch;
  }

  if (prefersReducedMotion) {
    state.focusBlend = 0;
    state.focusRegionId = null;
    state.coverLayerBuiltFor = null;
    state.coverLayoutReady = false;
    if (regionCoverLayer) regionCoverLayer.innerHTML = "";
    if (state.preFocusYaw != null) {
      state.targetYaw = state.preFocusYaw;
      state.targetPitch = state.preFocusPitch;
      state.yaw = state.preFocusYaw;
      state.pitch = state.preFocusPitch;
    }
    clearFocusCameraTarget();
    applyLayoutFromFocusBlend();
    syncBodyFocusClass();
  }
}

function clearFocusCameraTarget() {
  state.focusYawTarget = null;
  state.focusPitchTarget = null;
  state.preFocusYaw = null;
  state.preFocusPitch = null;
}

function groupMatchesFocusRegion(group) {
  const id = state.focusRegionId;
  if (!id) return false;
  const region = REGION_FOCUS[id];
  return region.contains(group.lon, group.lat) && group.items.some((item) => region.bookIds.has(item.book.id));
}

function groupMatchesAnyFocusRegion(group) {
  return Object.values(REGION_FOCUS).some((region) => {
    return region.contains(group.lon, group.lat) && group.items.some((item) => region.bookIds.has(item.book.id));
  });
}

function buildRegionCoverLayer() {
  if (!regionCoverLayer || !state.focusRegionId) return;
  if (state.coverLayerBuiltFor === state.focusRegionId && regionCoverLayer.childElementCount > 0) return;

  regionCoverLayer.innerHTML = "";
  state.coverLayerBuiltFor = state.focusRegionId;
  state.coverLayoutReady = false;

  for (const group of pinGroups) {
    if (!groupMatchesFocusRegion(group)) continue;
    for (const [itemIndex, item] of group.items.entries()) {
      if (!REGION_FOCUS[state.focusRegionId].bookIds.has(item.book.id)) continue;
      const slug = COVER_SLUG_BY_BOOK_ID[item.book.id];

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "region-cover-hit";
      btn.dataset.groupKey = group.key;
      btn.dataset.bookId = item.book.id;
      btn.dataset.bookIndex = String(itemIndex);
      btn.dataset.slotJitterX = String((Math.random() - 0.5).toFixed(4));
      btn.dataset.slotJitterY = String((Math.random() - 0.5).toFixed(4));
      const coverScale = (0.95 + Math.random() * 0.32).toFixed(3);
      btn.dataset.baseCoverScale = coverScale;
      btn.style.setProperty("--cover-scale", coverScale);
      btn.setAttribute("aria-label", `${item.book.title}，查看详情`);

      const inner = document.createElement("span");
      inner.className = "region-cover-hit-inner";
      const { zh, en } = splitTranslatedTitle(item.book.title);
      if (slug) {
        const img = document.createElement("img");
        img.src = `./assets/covers/${slug}.jpg`;
        img.alt = "";
        img.loading = "lazy";
        inner.appendChild(img);
      } else {
        inner.classList.add("region-cover-hit-inner--placeholder");
        inner.textContent = en || zh;
      }
      btn.appendChild(inner);

      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const g = pinGroups.find((p) => p.key === group.key);
        if (!g) return;
        state.selectedGroupKey = g.key;
        state.selectedBookIndex = itemIndex;
        const x = Number(btn.dataset.coverX) || state.width * 0.5;
        const y = Number(btn.dataset.coverY) || state.height * 0.5;
        openBookCard(g, x, y, state.selectedBookIndex);
        bookCard.dataset.anchorMode = "cover";
      });

      regionCoverLayer.appendChild(btn);
    }
  }
}

function isFocusSplitCardOpen() {
  return (
    state.focusMode &&
    bookCard &&
    !bookCard.classList.contains("is-hidden") &&
    bookCard.classList.contains("book-card--focus-split")
  );
}

function syncRegionCoverPositions() {
  if (!regionCoverLayer || regionCoverLayer.childElementCount === 0) return;

  const suppressFade = 1 - state.cardSuppressionBlend;
  const positionFade = Math.max(0, Math.min(1, (state.focusBlend - 0.28) / 0.55));
  regionCoverLayer.style.opacity = "1";

  const buttons = Array.from(regionCoverLayer.querySelectorAll(".region-cover-hit"));
  const entries = buttons.map((btn) => {
    const pin = projectedPins.find((p) => p.groupKey === btn.dataset.groupKey);
    return { btn, pin };
  });

  // Compute a stable layout (cache offset relative to pin) once the camera has
  // mostly settled into the region. Re-solving every frame causes the "best"
  // candidate offset to swap as the pin eases, which manifests as flicker/jitter.
  const needsLayout =
    !state.coverLayoutReady &&
    state.focusBlend > 0.62 &&
    entries.some((entry) => entry.pin && entry.pin.z > 0.04);

  if (needsLayout) {
    const sorted = entries.slice().sort((a, b) => {
      const ay = a.pin?.y ?? state.height * 0.5;
      const by = b.pin?.y ?? state.height * 0.5;
      if (Math.abs(ay - by) > 24) return ay - by;
      const ax = a.pin?.x ?? state.width * 0.5;
      const bx = b.pin?.x ?? state.width * 0.5;
      return ax - bx || Number(a.btn.dataset.bookIndex || 0) - Number(b.btn.dataset.bookIndex || 0);
    });

    solveNonOverlappingCoverLayout(sorted);
    state.coverLayoutReady = true;
  }

  for (const [index, entry] of entries.entries()) {
    const { btn, pin } = entry;
    if (!pin || pin.z <= 0.04) {
      btn.style.opacity = "0";
      btn.style.pointerEvents = "none";
      continue;
    }

    const size = coverVisualSize(btn);
    const margin = 18;
    const hasCachedOffset =
      btn.dataset.offsetX !== undefined &&
      btn.dataset.offsetY !== undefined &&
      Number.isFinite(Number(btn.dataset.offsetX)) &&
      Number.isFinite(Number(btn.dataset.offsetY));
    const offsetX = hasCachedOffset ? Number(btn.dataset.offsetX) : 0;
    const offsetY = hasCachedOffset ? Number(btn.dataset.offsetY) : 0;
    // Pin + offset keeps the cover fixed relative to its site while the focus
    // camera eases; frozen layoutX/Y would let markers drift under the card.
    const coverX = clamp(pin.x + offsetX, size.width / 2 + margin, state.width - size.width / 2 - margin);
    const coverY = clamp(pin.y + offsetY, size.height / 2 + margin, state.height - size.height / 2 - margin);
    if (state.coverLayoutReady && hasCachedOffset) {
      btn.dataset.layoutX = String(coverX);
      btn.dataset.layoutY = String(coverY);
    }

    const baseX = state.coverLayoutReady ? coverX : pin.x + (coverX - pin.x) * positionFade;
    const baseY = state.coverLayoutReady ? coverY : pin.y + (coverY - pin.y) * positionFade;

    const splitOpen = isFocusSplitCardOpen();
    const activeBookId = bookCard.dataset.bookId;
    const isSplitActive = splitOpen && activeBookId && btn.dataset.bookId === activeBookId;

    const split = state.coverSplitBlend;
    const activeRenderSize = syncSplitActiveCoverMetrics(btn, isSplitActive);
    const targetSize = isSplitActive ? activeRenderSize : size;
    const minCx = targetSize.width / 2 + 16;
    const maxCx = Math.max(minCx, state.width * 0.4 - targetSize.width / 2);
    const splitTargetX = clamp(state.width * 0.24, minCx, maxCx);
    const splitTargetY = state.height * 0.5;

    let placeX = baseX;
    let placeY = baseY;
    if (isSplitActive) {
      placeX = baseX + (splitTargetX - baseX) * split;
      placeY = baseY + (splitTargetY - baseY) * split;
    }

    const baseOpacity = 0.18 + pin.z * 0.82 * positionFade;
    let opacityMul = 1;
    if (splitOpen) {
      opacityMul = isSplitActive ? 1 : suppressFade;
    } else {
      opacityMul = suppressFade;
    }

    btn.dataset.pinX = String(pin.x);
    btn.dataset.pinY = String(pin.y);
    btn.dataset.coverX = String(coverX);
    btn.dataset.coverY = String(coverY);
    btn.style.left = `${placeX}px`;
    btn.style.top = `${placeY}px`;
    btn.style.opacity = state.coverLayoutReady ? String(baseOpacity * opacityMul) : "0";
    const allowHit =
      positionFade > 0.45 &&
      state.focusMode &&
      state.cardSuppressionBlend < 0.05 &&
      bookCard.classList.contains("is-hidden");
    btn.style.pointerEvents = allowHit ? "auto" : "none";
    const zBoost = isSplitActive && split > 0.2 ? 220 : 0;
    btn.style.zIndex = String(Math.round(100 + index + zBoost));
    btn.classList.toggle("region-cover-hit--split-active", isSplitActive && split > 0.15);
  }
}

function coverVisualSize(btn) {
  const imageSize = coverImageSize(btn);
  return {
    width: Math.max(140, imageSize.width + 24),
    height: imageSize.height + 32,
  };
}

function coverImageSize(btn) {
  const scale = Number(btn.style.getPropertyValue("--cover-scale")) || 1;
  return {
    width: 116 * scale,
    height: 174 * scale,
  };
}

function syncSplitActiveCoverMetrics(btn, isSplitActive) {
  const base = coverImageSize(btn);
  if (!isSplitActive) {
    btn.style.removeProperty("--cover-render-width");
    btn.style.removeProperty("--cover-render-height");
    return base;
  }

  const cardRect = bookCard.getBoundingClientRect();
  const minHeight = Math.max(base.height, 260);
  const targetHeight = clamp(cardRect.height || state.height * 0.58, minHeight, state.height - 56);
  const targetWidth = targetHeight * (base.width / base.height);

  btn.style.setProperty("--cover-render-width", `${targetWidth}px`);
  btn.style.setProperty("--cover-render-height", `${targetHeight}px`);

  return {
    width: targetWidth,
    height: targetHeight,
  };
}

function solveNonOverlappingCoverLayout(entries) {
  const visibleEntries = entries.filter((entry) => entry.pin && entry.pin.z > 0.04);
  if (visibleEntries.length === 0) return;

  fitCoverScalesToViewport(visibleEntries);
  const protectedPins = coverLayoutPinObstacles();

  const items = visibleEntries.map((entry, index) => {
    const size = coverVisualSize(entry.btn);
    return {
      entry,
      index,
      size,
      area: size.width * size.height,
      pin: entry.pin,
    };
  });

  if (items.length === 1) {
    const item = items[0];
    const candidates = coverLayoutCandidates(item);
    const free = candidates.find((candidate) => !rectOverlapsPinObstacles(candidate.rect, protectedPins));
    let cx;
    let cy;
    if (free) {
      cx = free.x;
      cy = free.y;
    } else if (candidates.length > 0) {
      candidates.sort(
        (a, b) =>
          pinObstacleOverlapAmount(a.rect, protectedPins) - pinObstacleOverlapAmount(b.rect, protectedPins) ||
          a.score - b.score
      );
      cx = candidates[0].x;
      cy = candidates[0].y;
      const margin = 18;
      for (let step = 0; step < 28; step += 1) {
        const rect = coverRectAt(cx, cy, item.size);
        if (!rectOverlapsPinObstacles(rect, protectedPins)) break;
        let nudged = false;
        for (const ob of protectedPins) {
          const push = coverPinRepulsion(rect, { x: ob.x, y: ob.y }, ob.radius);
          if (!push) continue;
          cx += push.x;
          cy += push.y;
          nudged = true;
        }
        cx = clamp(cx, item.size.width / 2 + margin, state.width - item.size.width / 2 - margin);
        cy = clamp(cy, item.size.height / 2 + margin, state.height - item.size.height / 2 - margin);
        if (!nudged) break;
      }
    } else {
      const c = clampCoverCenter(item.pin.x, item.pin.y, item.size);
      cx = c.x;
      cy = c.y;
    }
    applyCoverLayoutPosition(item, cx, cy);
    refineCoverLayoutAgainstPinsAndOverlaps(visibleEntries);
    return;
  }

  for (const item of items) {
    item.candidates = coverLayoutCandidates(item);
  }

  const searchOrder = items.slice().sort((a, b) => {
    const candidateDiff = a.candidates.length - b.candidates.length;
    if (candidateDiff) return candidateDiff;
    return b.area - a.area || a.index - b.index;
  });
  const placed = [];
  const chosen = new Map();
  const maxNodes = 18000;
  let visited = 0;

  function placeNext(depth) {
    if (depth >= searchOrder.length) return true;
    if (visited > maxNodes) return false;
    visited += 1;

    const item = searchOrder[depth];
    for (const candidate of item.candidates) {
      if (rectOverlapsPinObstacles(candidate.rect, protectedPins)) continue;
      if (placed.some((placedRect) => rectsOverlapWithGap(candidate.rect, placedRect, 12))) continue;
      placed.push(candidate.rect);
      chosen.set(item, candidate);
      if (placeNext(depth + 1)) return true;
      chosen.delete(item);
      placed.pop();
    }
    return false;
  }

  if (!placeNext(0)) {
    chosen.clear();
    const fallback = gridFallbackCoverLayout(items, protectedPins);
    for (const [item, candidate] of fallback) {
      chosen.set(item, candidate);
    }
  }

  for (const item of items) {
    const candidate = chosen.get(item);
    if (!candidate) continue;
    applyCoverLayoutPosition(item, candidate.x, candidate.y);
  }

  refineCoverLayoutAgainstPinsAndOverlaps(visibleEntries);
}

function coverLayoutPinObstacles() {
  return projectedPins
    .filter((pin) => pin.z > 0.04)
    .map((pin) => ({
      x: pin.x,
      y: pin.y,
      // Include faint halo / stroke so the visible marker stays outside the cover rect.
      radius: pin.radius + 22,
    }));
}

function fitCoverScalesToViewport(entries) {
  const margin = 18;
  const gap = 12;
  const count = entries.length;
  const availableWidth = Math.max(140, state.width - margin * 2);
  const availableHeight = Math.max(180, state.height - margin * 2);
  let bestScale = 0.58;
  let bestScore = -Infinity;

  for (let columns = 1; columns <= count; columns += 1) {
    const rows = Math.ceil(count / columns);
    const slotWidth = (availableWidth - gap * (columns - 1)) / columns;
    const slotHeight = (availableHeight - gap * (rows - 1)) / rows;
    const widthScale = (slotWidth - 24) / 116;
    const heightScale = (slotHeight - 32) / 174;
    const scale = Math.min(widthScale, heightScale);
    const score = scale * 100 - rows * 4 - Math.abs(columns - rows) * 0.8;
    if (slotWidth >= 128 && slotHeight >= 150 && score > bestScore) {
      bestScore = score;
      bestScale = scale;
    }
  }

  const maxScale = clamp(bestScale, 0.58, 1.16);
  for (const entry of entries) {
    const baseScale = Number(entry.btn.dataset.baseCoverScale || entry.btn.style.getPropertyValue("--cover-scale")) || 1;
    entry.btn.style.setProperty("--cover-scale", Math.min(baseScale, maxScale).toFixed(3));
  }
}

function coverLayoutCandidates(item) {
  const { entry, pin, size } = item;
  const btn = entry.btn;
  const protectedPins = coverLayoutPinObstacles();
  const candidates = [];
  const addCandidate = (rawX, rawY, kind = "near") => {
    const { x, y, shift } = clampCoverCenterWithShift(rawX, rawY, size);
    const key = `${Math.round(x)}:${Math.round(y)}`;
    if (candidates.some((candidate) => candidate.key === key)) return;

    const rect = coverRectAt(x, y, size);
    const distance = Math.hypot(x - pin.x, y - pin.y);
    const pinOverlap = pinObstacleOverlapAmount(rect, protectedPins);
    const jitter =
      (Number(btn.dataset.slotJitterX || 0) * (x - state.centerX) +
        Number(btn.dataset.slotJitterY || 0) * (y - state.centerY)) *
      0.002;
    const kindPenalty = kind === "grid" ? 70 : kind === "ring" ? 22 : 0;

    candidates.push({
      key,
      x,
      y,
      rect,
      score: distance + shift * 760 + pinOverlap * 420 + kindPenalty + jitter,
    });
  };

  for (const offset of coverOffsetCandidates(btn, pin, size)) {
    addCandidate(pin.x + offset.x, pin.y + offset.y, "near");
  }

  const baseDistance = Math.max(size.width, size.height) * 0.58 + pin.radius + 18;
  const angleOffset = Number(btn.dataset.bookIndex || 0) * 0.47;
  for (const distance of [baseDistance, baseDistance + 54, baseDistance + 110, baseDistance + 172]) {
    for (let step = 0; step < 16; step += 1) {
      const angle = angleOffset + (Math.PI * 2 * step) / 16;
      addCandidate(pin.x + Math.cos(angle) * distance, pin.y + Math.sin(angle) * distance, "ring");
    }
  }

  for (const slot of gridSlotsForSize(size, 5)) {
    addCandidate(slot.x, slot.y, "grid");
  }

  return candidates.sort((a, b) => a.score - b.score).slice(0, 96);
}

function gridFallbackCoverLayout(items, protectedPins = []) {
  const margin = 18;
  const gap = 12;
  const maxWidth = Math.max(...items.map((item) => item.size.width));
  const maxHeight = Math.max(...items.map((item) => item.size.height));
  const count = items.length;
  let best = null;

  for (let columns = 1; columns <= count; columns += 1) {
    const rows = Math.ceil(count / columns);
    const usedWidth = columns * maxWidth + (columns - 1) * gap;
    const usedHeight = rows * maxHeight + (rows - 1) * gap;
    if (usedWidth > state.width - margin * 2 || usedHeight > state.height - margin * 2) continue;

    const startX = (state.width - usedWidth) / 2 + maxWidth / 2;
    const startY = (state.height - usedHeight) / 2 + maxHeight / 2;
    const slots = [];
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        slots.push({
          x: startX + column * (maxWidth + gap),
          y: startY + row * (maxHeight + gap),
        });
      }
    }

    const orderedItems = items.slice().sort((a, b) => {
      if (Math.abs(a.pin.y - b.pin.y) > 24) return a.pin.y - b.pin.y;
      return a.pin.x - b.pin.x || a.index - b.index;
    });
    const score = orderedItems.reduce((sum, item, index) => {
      const slot = slots[index];
      const rect = coverRectAt(slot.x, slot.y, item.size);
      return sum + Math.hypot(slot.x - item.pin.x, slot.y - item.pin.y) + pinObstacleOverlapAmount(rect, protectedPins) * 900;
    }, 0);

    if (!best || score < best.score) best = { score, slots, orderedItems };
  }

  const chosen = new Map();
  if (best) {
    best.orderedItems.forEach((item, index) => {
      const slot = best.slots[index];
      chosen.set(item, { x: slot.x, y: slot.y, rect: coverRectAt(slot.x, slot.y, item.size) });
    });
    return chosen;
  }

  // Last resort for extremely narrow viewports: stack into non-overlapping
  // shelves with the current sizes, clamped to the visible page.
  const shelves = gridSlotsForSize({ width: maxWidth, height: maxHeight }, Math.ceil(Math.sqrt(count)) + 2);
  items.forEach((item, index) => {
    const slot =
      shelves
        .map((candidate) => ({
          ...candidate,
          score:
            Math.hypot(candidate.x - item.pin.x, candidate.y - item.pin.y) +
            pinObstacleOverlapAmount(coverRectAt(candidate.x, candidate.y, item.size), protectedPins) * 900,
        }))
        .sort((a, b) => a.score - b.score)[index % shelves.length] ||
      clampCoverCenter(item.pin.x, item.pin.y, item.size);
    chosen.set(item, { x: slot.x, y: slot.y, rect: coverRectAt(slot.x, slot.y, item.size) });
  });
  return chosen;
}

function gridSlotsForSize(size, maxRows) {
  const margin = 18;
  const gap = 12;
  const minX = size.width / 2 + margin;
  const maxX = state.width - size.width / 2 - margin;
  const minY = size.height / 2 + margin;
  const maxY = state.height - size.height / 2 - margin;
  const columns = Math.max(1, Math.floor((maxX - minX + gap) / Math.max(1, size.width + gap)) + 1);
  const rows = Math.max(1, Math.min(maxRows, Math.floor((maxY - minY + gap) / Math.max(1, size.height + gap)) + 1));
  const slots = [];

  for (let row = 0; row < rows; row += 1) {
    const y = rows === 1 ? (minY + maxY) / 2 : minY + ((maxY - minY) * row) / (rows - 1);
    for (let column = 0; column < columns; column += 1) {
      const x = columns === 1 ? (minX + maxX) / 2 : minX + ((maxX - minX) * column) / (columns - 1);
      slots.push({ x, y });
    }
  }

  return slots.sort((a, b) => Math.hypot(a.x - state.centerX, a.y - state.centerY) - Math.hypot(b.x - state.centerX, b.y - state.centerY));
}

function clampCoverCenter(x, y, size) {
  return {
    x: clamp(x, size.width / 2 + 18, state.width - size.width / 2 - 18),
    y: clamp(y, size.height / 2 + 18, state.height - size.height / 2 - 18),
  };
}

function clampCoverCenterWithShift(x, y, size) {
  const clamped = clampCoverCenter(x, y, size);
  return {
    ...clamped,
    shift: Math.hypot(clamped.x - x, clamped.y - y),
  };
}

function rectsOverlapWithGap(a, b, gap) {
  return a.left < b.right + gap && a.right > b.left - gap && a.top < b.bottom + gap && a.bottom > b.top - gap;
}

function rectOverlapsPinObstacles(rect, pinObstacles) {
  return pinObstacles.some((pin) => rectCircleOverlapAmount(rect, pin.x, pin.y, pin.radius) > 0);
}

function pinObstacleOverlapAmount(rect, pinObstacles) {
  return pinObstacles.reduce((sum, pin) => sum + rectCircleOverlapAmount(rect, pin.x, pin.y, pin.radius), 0);
}

function applyCoverLayoutPosition(item, x, y) {
  item.entry.btn.dataset.layoutX = String(x);
  item.entry.btn.dataset.layoutY = String(y);
  item.entry.btn.dataset.offsetX = String(x - item.pin.x);
  item.entry.btn.dataset.offsetY = String(y - item.pin.y);
}

// Greedy + backtracking can leave pin overlaps in fallback paths, and pair
// separation alone can push a cover onto a marker. Alternate cover–cover
// separation with pin repulsion until stable, then sync layout datasets.
function refineCoverLayoutAgainstPinsAndOverlaps(entries) {
  const obstacles = coverLayoutPinObstacles();
  const margin = 18;
  const pad = 10;
  const items = entries
    .filter((e) => e.pin && e.pin.z > 0.04)
    .map((e) => {
      const size = coverVisualSize(e.btn);
      const lx = Number(e.btn.dataset.layoutX);
      const ly = Number(e.btn.dataset.layoutY);
      const cx = Number.isFinite(lx) ? lx : e.pin.x + Number(e.btn.dataset.offsetX || 0);
      const cy = Number.isFinite(ly) ? ly : e.pin.y + Number(e.btn.dataset.offsetY || 0);
      return { entry: e, pin: e.pin, size, cx, cy };
    });

  if (items.length === 0) return;

  const maxIterations = 48;
  for (let iter = 0; iter < maxIterations; iter += 1) {
    let moved = 0;

    for (let i = 0; i < items.length; i += 1) {
      for (let j = i + 1; j < items.length; j += 1) {
        const a = items[i];
        const b = items[j];
        const minDx = (a.size.width + b.size.width) / 2 + pad;
        const minDy = (a.size.height + b.size.height) / 2 + pad;
        const dx = a.cx - b.cx;
        const dy = a.cy - b.cy;
        const overlapX = minDx - Math.abs(dx);
        const overlapY = minDy - Math.abs(dy);
        if (overlapX <= 0 || overlapY <= 0) continue;

        if (overlapX < overlapY) {
          const sign = dx === 0 ? (i % 2 === 0 ? 1 : -1) : Math.sign(dx);
          const push = overlapX * 0.55;
          a.cx += sign * push;
          b.cx -= sign * push;
        } else {
          const sign = dy === 0 ? (i % 2 === 0 ? 1 : -1) : Math.sign(dy);
          const push = overlapY * 0.55;
          a.cy += sign * push;
          b.cy -= sign * push;
        }
        moved += 1;
      }
    }

    for (const item of items) {
      const rect = coverRectAt(item.cx, item.cy, item.size);
      for (const ob of obstacles) {
        const push = coverPinRepulsion(rect, { x: ob.x, y: ob.y }, ob.radius);
        if (!push) continue;
        item.cx += push.x;
        item.cy += push.y;
        moved += 1;
      }

      item.cx = clamp(item.cx, item.size.width / 2 + margin, state.width - item.size.width / 2 - margin);
      item.cy = clamp(item.cy, item.size.height / 2 + margin, state.height - item.size.height / 2 - margin);
    }

    if (moved === 0) break;
  }

  for (const item of items) {
    applyCoverLayoutPosition({ entry: item.entry, pin: item.pin }, item.cx, item.cy);
  }
}

// After the greedy placement we still see overlapping cards when pins are
// crowded. Run a few rounds of pairwise separation that pushes overlapping
// covers apart along the axis of smallest overlap, then clamp to the viewport.
// This converges quickly for small N and produces a non-overlapping layout.
function relaxCoverOverlaps(entries) {
  const items = entries
    .filter((e) => e.pin && e.pin.z > 0.04)
    .map((e) => {
      const size = coverVisualSize(e.btn);
      const offX = Number(e.btn.dataset.offsetX || 0);
      const offY = Number(e.btn.dataset.offsetY || 0);
      return {
        entry: e,
        size,
        cx: e.pin.x + offX,
        cy: e.pin.y + offY,
      };
    });

  if (items.length < 2) return;

  const margin = 18;
  const pad = 10;
  const maxIterations = 48;

  for (let iter = 0; iter < maxIterations; iter += 1) {
    let moved = 0;
    for (let i = 0; i < items.length; i += 1) {
      for (let j = i + 1; j < items.length; j += 1) {
        const a = items[i];
        const b = items[j];
        const minDx = (a.size.width + b.size.width) / 2 + pad;
        const minDy = (a.size.height + b.size.height) / 2 + pad;
        const dx = a.cx - b.cx;
        const dy = a.cy - b.cy;
        const overlapX = minDx - Math.abs(dx);
        const overlapY = minDy - Math.abs(dy);
        if (overlapX <= 0 || overlapY <= 0) continue;

        if (overlapX < overlapY) {
          const sign = dx === 0 ? (i % 2 === 0 ? 1 : -1) : Math.sign(dx);
          const push = overlapX * 0.55;
          a.cx += sign * push;
          b.cx -= sign * push;
        } else {
          const sign = dy === 0 ? (i % 2 === 0 ? 1 : -1) : Math.sign(dy);
          const push = overlapY * 0.55;
          a.cy += sign * push;
          b.cy -= sign * push;
        }
        moved += 1;
      }
    }

    for (const item of items) {
      item.cx = clamp(item.cx, item.size.width / 2 + margin, state.width - item.size.width / 2 - margin);
      item.cy = clamp(item.cy, item.size.height / 2 + margin, state.height - item.size.height / 2 - margin);
    }

    if (moved === 0) break;
  }

  for (const item of items) {
    applyCoverLayoutPosition({ entry: item.entry, pin: item.entry.pin }, item.cx, item.cy);
  }
}

function repelCoversFromPins(entries) {
  const items = entries
    .filter((e) => e.pin && e.pin.z > 0.04)
    .map((e) => {
      const size = coverVisualSize(e.btn);
      return {
        entry: e,
        size,
        cx: e.pin.x + Number(e.btn.dataset.offsetX || 0),
        cy: e.pin.y + Number(e.btn.dataset.offsetY || 0),
      };
    });

  if (items.length === 0 || projectedPins.length === 0) return;

  const margin = 18;
  const visiblePins = projectedPins.filter((pin) => pin.z > 0.04);
  const maxIterations = 36;

  for (let iter = 0; iter < maxIterations; iter += 1) {
    let moved = 0;
    for (const item of items) {
      for (const pin of visiblePins) {
        const rect = coverRectAt(item.cx, item.cy, item.size);
        const push = coverPinRepulsion(rect, pin, pin.radius + 16);
        if (!push) continue;

        item.cx += push.x;
        item.cy += push.y;
        moved += 1;
      }

      item.cx = clamp(item.cx, item.size.width / 2 + margin, state.width - item.size.width / 2 - margin);
      item.cy = clamp(item.cy, item.size.height / 2 + margin, state.height - item.size.height / 2 - margin);
    }

    if (moved === 0) break;
  }

  for (const item of items) {
    applyCoverLayoutPosition({ entry: item.entry, pin: item.entry.pin }, item.cx, item.cy);
  }
}

function coverPinRepulsion(rect, pin, radius) {
  const nearestX = clamp(pin.x, rect.left, rect.right);
  const nearestY = clamp(pin.y, rect.top, rect.bottom);
  const dx = nearestX - pin.x;
  const dy = nearestY - pin.y;
  const distance = Math.hypot(dx, dy);

  if (distance >= radius) return null;

  if (distance > 0.001) {
    const push = radius - distance + 2;
    return {
      x: (dx / distance) * push,
      y: (dy / distance) * push,
    };
  }

  const distances = [
    { axis: "x", sign: 1, value: pin.x - rect.left },
    { axis: "x", sign: -1, value: rect.right - pin.x },
    { axis: "y", sign: 1, value: pin.y - rect.top },
    { axis: "y", sign: -1, value: rect.bottom - pin.y },
  ].sort((a, b) => a.value - b.value);
  const closest = distances[0];
  const push = closest.value + radius + 2;

  return closest.axis === "x"
    ? { x: closest.sign * push, y: 0 }
    : { x: 0, y: closest.sign * push };
}

function coverRectAt(x, y, size) {
  return {
    left: x - size.width / 2,
    right: x + size.width / 2,
    top: y - size.height / 2,
    bottom: y + size.height / 2,
  };
}

function rectOverlapAmount(a, b) {
  const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left);
  const overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  if (overlapX <= 0 || overlapY <= 0) return 0;
  return Math.min(overlapX, overlapY);
}

function rectCircleOverlapAmount(rect, cx, cy, radius) {
  const nearestX = clamp(cx, rect.left, rect.right);
  const nearestY = clamp(cy, rect.top, rect.bottom);
  return Math.max(0, radius - Math.hypot(cx - nearestX, cy - nearestY));
}

function coverOffsetCandidates(btn, pin, size) {
  const bookIndex = Number(btn.dataset.bookIndex || 0);
  const outwardX = pin.x >= state.centerX ? 1 : -1;
  const outwardY = pin.y >= state.centerY ? 1 : -1;
  const nearX = size.width * 0.58 + pin.radius + 10;
  const nearY = size.height * 0.46 + pin.radius + 8;
  const mediumX = nearX + 38;
  const mediumY = nearY + 34;
  const farX = nearX + 82;
  const farY = nearY + 70;
  const base = [
    { x: outwardX * nearX, y: 0 },
    { x: outwardX * nearX, y: outwardY * nearY * 0.45 },
    { x: 0, y: outwardY * nearY },
    { x: -outwardX * nearX, y: 0 },
    { x: outwardX * mediumX, y: -outwardY * mediumY * 0.55 },
    { x: -outwardX * mediumX, y: outwardY * mediumY * 0.55 },
    { x: outwardX * farX, y: outwardY * farY * 0.35 },
    { x: -outwardX * farX, y: -outwardY * farY * 0.35 },
  ];

  const shift = bookIndex % base.length;
  return base.slice(shift).concat(base.slice(0, shift));
}

function resolveCoverPositionNearPin(btn, pin, placedRects) {
  const size = coverVisualSize(btn);
  const margin = 18;
  const candidates = coverOffsetCandidates(btn, pin, size);
  let best = null;

  for (const offset of candidates) {
    const x = clamp(pin.x + offset.x, size.width / 2 + margin, state.width - size.width / 2 - margin);
    const y = clamp(pin.y + offset.y, size.height / 2 + margin, state.height - size.height / 2 - margin);
    const rect = coverRectAt(x, y, size);
    const coverOverlap = placedRects.reduce((sum, placed) => sum + rectOverlapAmount(rect, placed) * 8, 0);
    const pinOverlap = projectedPins.reduce((sum, otherPin) => {
      if (otherPin.z <= 0.04) return sum;
      return sum + rectCircleOverlapAmount(rect, otherPin.x, otherPin.y, otherPin.radius + 16);
    }, 0);
    const distance = Math.hypot(x - pin.x, y - pin.y);
    const score = distance + coverOverlap + pinOverlap * 420;
    if (!best || score < best.score) best = { x, y, rect, score };
  }

  return best || {
    x: pin.x,
    y: pin.y,
    rect: coverRectAt(pin.x, pin.y, size),
  };
}

function drawRegionLeaderLines() {
  if (!regionCoverLayer || regionCoverLayer.childElementCount === 0 || state.focusBlend < 0.34) return;
  if (state.cardSuppressionBlend > 0.08) return;

  const suppressFade = 1 - state.cardSuppressionBlend;
  const fade = Math.max(0, Math.min(1, (state.focusBlend - 0.34) / 0.5)) * suppressFade;
  if (fade <= 0.01) return;

  ctx.save();
  ctx.lineWidth = 1.25;
  ctx.strokeStyle = `rgba(214, 67, 47, ${0.42 * fade})`;
  ctx.fillStyle = `rgba(214, 67, 47, ${0.82 * fade})`;
  ctx.shadowColor = `rgba(244, 239, 229, ${0.72 * fade})`;
  ctx.shadowBlur = 4;

  const buttons = Array.from(regionCoverLayer.querySelectorAll(".region-cover-hit"));
  for (const [index, btn] of buttons.entries()) {
    if (btn.style.opacity === "0") continue;
    const pinX = Number(btn.dataset.pinX);
    const pinY = Number(btn.dataset.pinY);
    const coverX = Number(btn.dataset.coverX);
    const coverY = Number(btn.dataset.coverY);
    if (![pinX, pinY, coverX, coverY].every(Number.isFinite)) continue;

    const dx = coverX - pinX;
    const dy = coverY - pinY;
    const len = Math.max(1, Math.hypot(dx, dy));
    const endInset = Math.min(46, len * 0.18);
    const endX = coverX - (dx / len) * endInset;
    const endY = coverY - (dy / len) * endInset;
    const bend = (index % 2 === 0 ? 1 : -1) * Math.min(52, len * 0.16);
    const bendX = pinX + dx * 0.48 + (-dy / len) * bend;
    const bendY = pinY + dy * 0.48 + (dx / len) * bend;
    ctx.beginPath();
    ctx.moveTo(pinX, pinY);
    ctx.quadraticCurveTo(bendX, bendY, endX, endY);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(pinX, pinY, 3.1, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function rotateVector(point) {
  let x = point.x;
  let y = point.y;
  let z = point.z;

  const cy = Math.cos(state.yaw);
  const sy = Math.sin(state.yaw);
  [x, z] = [x * cy + z * sy, -x * sy + z * cy];

  const cp = Math.cos(state.pitch);
  const sp = Math.sin(state.pitch);
  [y, z] = [y * cp - z * sp, y * sp + z * cp];

  const ct = Math.cos(state.tilt);
  const st = Math.sin(state.tilt);
  [x, y] = [x * ct - y * st, x * st + y * ct];

  return { x, y, z };
}

function projectVector(vector, radius) {
  const rotated = rotateVector(vector);
  return {
    x: state.centerX + rotated.x * radius,
    y: state.centerY - rotated.y * radius,
    z: rotated.z,
  };
}

function drawGlobe(time) {
  state.intro += (1 - state.intro) * 0.035;

  const blendSpeed = prefersReducedMotion ? 1 : 0.045;
  state.focusBlend += (state.focusBlendTarget - state.focusBlend) * blendSpeed;
  if (state.focusBlendTarget === 0 && state.focusBlend < 0.02) {
    state.focusBlend = 0;
  }

  if (!state.focusMode && state.focusBlend === 0 && state.focusYawTarget != null) {
    clearFocusCameraTarget();
  }

  if (!state.focusMode && state.focusBlend < 0.14 && regionCoverLayer && regionCoverLayer.childElementCount > 0) {
    regionCoverLayer.innerHTML = "";
    state.coverLayerBuiltFor = null;
    state.coverLayoutReady = false;
    state.focusRegionId = null;
  }

  applyLayoutFromFocusBlend();
  syncBodyFocusClass();

  const camEase = prefersReducedMotion ? 1 : 0.078;
  if (state.focusYawTarget != null && state.focusPitchTarget != null) {
    state.targetYaw += (state.focusYawTarget - state.targetYaw) * camEase;
    state.targetPitch += (state.focusPitchTarget - state.targetPitch) * camEase;
  }

  const allowIdleSpin = state.focusBlend < 0.06 && !state.focusMode;
  if (!state.isDragging) {
    if (allowIdleSpin) state.targetYaw += 0.00025;
    state.targetYaw += state.velocityX;
    state.targetPitch += state.velocityY;
    state.velocityX *= 0.92;
    state.velocityY *= 0.9;
  }

  state.targetPitch = Math.max(-0.85, Math.min(0.65, state.targetPitch));
  state.yaw += (state.targetYaw - state.yaw) * 0.12;
  state.pitch += (state.targetPitch - state.pitch) * 0.12;

  if (state.focusBlend > 0.32 && state.focusMode && regionCoverLayer && regionCoverLayer.childElementCount === 0) {
    buildRegionCoverLayer();
  }

  const cardOpen = state.focusMode && !bookCard.classList.contains("is-hidden");
  const suppressionTarget = cardOpen ? 1 : 0;
  const suppressionEase = prefersReducedMotion ? 1 : 0.16;
  state.cardSuppressionBlend += (suppressionTarget - state.cardSuppressionBlend) * suppressionEase;
  if (Math.abs(suppressionTarget - state.cardSuppressionBlend) < 0.004) {
    state.cardSuppressionBlend = suppressionTarget;
  }

  const splitTarget =
    state.focusMode &&
    bookCard &&
    !bookCard.classList.contains("is-hidden") &&
    bookCard.classList.contains("book-card--focus-split")
      ? 1
      : 0;
  const splitEase = prefersReducedMotion ? 1 : 0.16;
  state.coverSplitBlend += (splitTarget - state.coverSplitBlend) * splitEase;
  if (Math.abs(splitTarget - state.coverSplitBlend) < 0.004) {
    state.coverSplitBlend = splitTarget;
  }

  ctx.clearRect(0, 0, state.width, state.height);
  drawAtmosphere(time);
  if (landReady) drawLand();
  drawPins(time);
  drawRegionFocusLabels();
  syncRegionCoverPositions();
  drawRegionLeaderLines();
  syncCardPosition();
  requestAnimationFrame(drawGlobe);
}

function drawAtmosphere(time) {
  const introScale = 0.94 + state.intro * 0.06;
  const radius = state.radius * introScale;
  const shimmer = Math.sin(time * 0.0007) * 0.035;

  const glow = ctx.createRadialGradient(
    state.centerX - radius * 0.18,
    state.centerY - radius * 0.3,
    radius * 0.12,
    state.centerX,
    state.centerY,
    radius * 1.06
  );
  glow.addColorStop(0, `rgba(255, 250, 236, ${0.26 + shimmer})`);
  glow.addColorStop(0.55, "rgba(126, 112, 96, 0.08)");
  glow.addColorStop(1, "rgba(42, 36, 36, 0.13)");

  ctx.save();
  ctx.globalAlpha = state.intro;
  ctx.beginPath();
  ctx.arc(state.centerX, state.centerY, radius, 0, Math.PI * 2);
  ctx.fillStyle = glow;
  ctx.fill();

  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(52, 44, 44, 0.16)";
  ctx.stroke();
  ctx.restore();
}

function drawLand() {
  const introEase = 1 - Math.pow(1 - state.intro, 3);
  const radius = state.radius * (0.94 + state.intro * 0.06);

  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  for (const ring of landRings) {
    const projected = ring.map((point) => {
      const rotated = rotateVector(point);
      return {
        x: state.centerX + rotated.x * radius,
        y: state.centerY - rotated.y * radius,
        z: rotated.z,
      };
    });

    drawLandShape(projected, introEase, radius, -0.02);
  }

  ctx.restore();
}

function drawPins(time) {
  projectedPins = [];

  const suppress = state.cardSuppressionBlend;
  const suppressAlpha = 1 - suppress;

  const radius = state.radius * (0.94 + state.intro * 0.06);
  const pulse = (Math.sin(time * 0.005) + 1) * 0.5;

  const filterRegion = state.focusMode && state.focusBlend > 0.08;
  const hideFocusRegionPins = !state.focusMode;

  for (const group of pinGroups) {
    if (filterRegion && !groupMatchesFocusRegion(group)) continue;
    if (hideFocusRegionPins && groupMatchesAnyFocusRegion(group)) continue;

    const point = projectVector(group.vector, radius);
    if (point.z <= 0.04) continue;

    const depth = Math.max(0, Math.min(1, point.z));
    const hasMultipleBooks = group.items.length > 1;
    const pinRadius = 3.8 + depth * 2.6 + (hasMultipleBooks ? 1.3 : 0);
    const isSelected = state.selectedGroupKey === group.key;
    const isHovered = hoveredPinId === group.key;

    ctx.save();
    ctx.globalAlpha = (0.5 + depth * 0.5) * suppressAlpha;
    ctx.beginPath();
    ctx.fillStyle = "rgba(214, 67, 47, 0.18)";
    ctx.arc(point.x, point.y, pinRadius + 4 + pulse * 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = suppressAlpha;

    if (hasMultipleBooks) {
      ctx.beginPath();
      ctx.strokeStyle = "rgba(214, 67, 47, 0.42)";
      ctx.lineWidth = 1.2;
      ctx.arc(point.x, point.y, pinRadius + 3.2, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.fillStyle = isSelected || isHovered ? "rgba(214, 67, 47, 0.96)" : "rgba(196, 58, 42, 0.9)";
    ctx.strokeStyle = "rgba(250, 245, 236, 0.9)";
    ctx.lineWidth = 1.2;
    ctx.arc(point.x, point.y, pinRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();

    projectedPins.push({
      groupKey: group.key,
      group,
      x: point.x,
      y: point.y,
      z: point.z,
      radius: pinRadius + 8,
    });
  }
}

function drawRegionFocusLabels() {
  if (state.focusBlend > 0.92) return;

  const radius = state.radius * (0.94 + state.intro * 0.06);
  const focusFade = 1 - smoothstep(Math.min(1, state.focusBlend / 0.46));
  const baseAlpha = state.intro * focusFade;
  if (baseAlpha <= 0.01) return;

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `700 ${state.width < 760 ? 14 : 16}px "Source Han Sans SC", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif`;

  for (const label of REGION_FOCUS_LABELS) {
    const point = projectVector(label.vector, radius);
    if (point.z <= -0.12) continue;

    const depth = clamp((point.z + 0.12) / 0.45, 0, 1);
    const alpha = baseAlpha * depth;
    if (alpha <= 0.01) continue;

    const textWidth = ctx.measureText(label.text).width;
    const padX = 13;
    const boxWidth = textWidth + padX * 2;
    const boxHeight = 30;
    const boxRadius = boxHeight / 2;
    const labelPosition = resolveRegionLabelPosition(label.id, point, boxWidth, boxHeight, depth);

    ctx.globalAlpha = alpha;
    ctx.beginPath();
    drawRoundedRectPath(
      labelPosition.x - boxWidth / 2,
      labelPosition.y - boxHeight / 2,
      boxWidth,
      boxHeight,
      boxRadius
    );
    ctx.fillStyle = "rgba(244, 239, 229, 0.82)";
    ctx.fill();
    ctx.strokeStyle = "rgba(214, 67, 47, 0.34)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = "rgba(214, 67, 47, 0.94)";
    ctx.fillText(label.text, labelPosition.x, labelPosition.y + 0.5);
  }

  ctx.restore();
}

function resolveRegionLabelPosition(labelId, point, width, height, depth) {
  const fallbackLift = 22 + 12 * depth;
  const offset = REGION_FOCUS_LABEL_OFFSETS[labelId] || { x: 0, y: -fallbackLift };
  return {
    x: clamp(point.x + offset.x, width / 2 + 10, state.width - width / 2 - 10),
    y: clamp(point.y + offset.y, height / 2 + 10, state.height - height / 2 - 10),
  };
}

function drawRoundedRectPath(x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawLandShape(projected, introEase, radius, threshold) {
  const clippedResult = clipToFrontHemisphere(projected, threshold);
  const visible = clippedResult.points;

  if (visible.length < 3) return;

  const depth = visible.reduce((sum, point) => sum + point.z, 0) / visible.length;
  const alpha = Math.max(0, Math.min(1, (depth + 0.2) / 1.2)) * introEase;
  const horizonRadius = radius * Math.sqrt(1 - threshold * threshold);

  ctx.beginPath();
  drawClosedPathWithHorizonArc(visible, threshold, horizonRadius);
  ctx.fillStyle = `rgba(76, 67, 58, ${0.08 + alpha * 0.16})`;
  ctx.fill();
  ctx.strokeStyle = `rgba(42, 36, 36, ${0.2 + alpha * 0.28})`;
  ctx.lineWidth = 0.85 + alpha * 0.65;
  ctx.stroke();
}

function drawClosedPath(points) {
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.closePath();
}

function drawClosedPathWithHorizonArc(points, threshold, horizonRadius) {
  ctx.moveTo(points[0].x, points[0].y);

  for (let i = 0; i < points.length; i += 1) {
    const current = points[i];
    const next = points[(i + 1) % points.length];
    const currentOnHorizon = Math.abs(current.z - threshold) < 1e-6;
    const nextOnHorizon = Math.abs(next.z - threshold) < 1e-6;

    if (currentOnHorizon && nextOnHorizon) {
      drawHorizonArc(current, next, horizonRadius);
    } else {
      ctx.lineTo(next.x, next.y);
    }
  }

  ctx.closePath();
}

function drawHorizonArc(from, to, radius) {
  const centerX = state.centerX;
  const centerY = state.centerY;
  const start = Math.atan2(from.y - centerY, from.x - centerX);
  const end = Math.atan2(to.y - centerY, to.x - centerX);
  let delta = end - start;

  while (delta <= -Math.PI) delta += Math.PI * 2;
  while (delta > Math.PI) delta -= Math.PI * 2;

  ctx.arc(centerX, centerY, radius, start, start + delta, delta < 0);
}

function clipToFrontHemisphere(points, threshold) {
  const clipped = [];
  let hasOutsidePoint = false;

  for (let i = 0; i < points.length; i += 1) {
    const current = points[i];
    const previous = points[(i + points.length - 1) % points.length];
    const currentInside = current.z >= threshold;
    const previousInside = previous.z >= threshold;
    if (!currentInside) hasOutsidePoint = true;

    if (currentInside !== previousInside) {
      clipped.push(intersectAtDepth(previous, current, threshold));
    }

    if (currentInside) {
      clipped.push(current);
    }
  }

  return {
    points: clipped,
    clipped: hasOutsidePoint,
  };
}

function intersectAtDepth(a, b, threshold) {
  const t = (threshold - a.z) / (b.z - a.z);

  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: threshold,
  };
}

function resetGlobePointerState() {
  const id = state.activeGlobePointerId;
  if (id != null) {
    try {
      if (canvas.hasPointerCapture(id)) {
        canvas.releasePointerCapture(id);
      } else if (stage.hasPointerCapture(id)) {
        stage.releasePointerCapture(id);
      }
    } catch (_) {
      /* ignore */
    }
  }
  state.activeGlobePointerId = null;
  state.isDragging = false;
}

function tryFinalizeGlobePointer(event) {
  if (!state.isDragging || state.activeGlobePointerId !== event.pointerId) return;

  const pointerX = event.clientX;
  const pointerY = event.clientY;
  const dragDistance = state.dragDistance;

  state.isDragging = false;
  state.activeGlobePointerId = null;

  try {
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    } else if (stage.hasPointerCapture(event.pointerId)) {
      stage.releasePointerCapture(event.pointerId);
    }
  } catch (_) {
    /* ignore */
  }

  if (dragDistance < 8) {
    const hit = getHitPin(pointerX, pointerY);
    if (hit) {
      state.selectedGroupKey = hit.groupKey;
      state.selectedBookIndex = 0;
      const selected = hit.group.items[0];
      state.selectedBookId = selected.book.id;
      state.selectedSiteIndex = selected.siteIndex;
      openBookCard(hit.group, hit.x, hit.y, 0);
      return;
    }

    if (!state.focusMode) {
      const ll = screenToLonLat(pointerX, pointerY);
      if (ll) {
        const region = pickRegionAtLonLat(ll.lon, ll.lat);
        if (region) {
          beginRegionFocus(region.id);
          return;
        }
      }
    }

    closeBookCard();
    state.selectedBookId = null;
    state.selectedSiteIndex = 0;
    state.selectedGroupKey = null;
    state.selectedBookIndex = 0;
  }
}

function onPointerDown(event) {
  if (event.target !== canvas) return;
  if (event.pointerType === "mouse" && event.button !== 0) return;

  if (!state.focusMode && state.focusYawTarget != null) {
    clearFocusCameraTarget();
  }

  if (state.isDragging || state.activeGlobePointerId != null) {
    resetGlobePointerState();
  }

  state.activeGlobePointerId = event.pointerId;
  state.isDragging = true;
  state.pointerX = event.clientX;
  state.pointerY = event.clientY;
  state.velocityX = 0;
  state.velocityY = 0;
  state.dragDistance = 0;
  try {
    canvas.setPointerCapture(event.pointerId);
  } catch (_) {
    /* ignore */
  }
}

function onPointerMove(event) {
  if (!state.isDragging) {
    updateHoverPin(event.clientX, event.clientY);
    return;
  }

  if (event.pointerId !== state.activeGlobePointerId) return;

  const dx = event.clientX - state.pointerX;
  const dy = event.clientY - state.pointerY;
  state.dragDistance += Math.abs(dx) + Math.abs(dy);
  state.pointerX = event.clientX;
  state.pointerY = event.clientY;

  state.velocityX = dx * 0.00075;
  state.velocityY = dy * 0.00055;
  state.targetYaw += dx * 0.004;
  state.targetPitch += dy * 0.003;
}

function getHitPin(x, y) {
  for (let i = projectedPins.length - 1; i >= 0; i -= 1) {
    const pin = projectedPins[i];
    const dx = x - pin.x;
    const dy = y - pin.y;
    if (dx * dx + dy * dy <= pin.radius * pin.radius) return pin;
  }
  return null;
}

function updateHoverPin(x, y) {
  const pin = getHitPin(x, y);
  hoveredPinId = pin ? pin.groupKey : null;
  stage.style.cursor = pin ? "pointer" : "grab";
}

function setCardBook(group, bookIndex) {
  const safeIndex = ((bookIndex % group.items.length) + group.items.length) % group.items.length;
  const item = group.items[safeIndex];
  const book = item.book;

  bookLocationZh.textContent =
    book.sourceField || [book.countryOrRegion, book.location].filter(Boolean).join(" - ");
  bookLocationEn.textContent = book.locationEn || fallbackEnglishLocation(book);

  const { zh, en } = splitTranslatedTitle(book.title);
  bookTitleZh.textContent = zh;
  bookTitleEn.textContent = en;
  bookTitleEn.classList.toggle("is-empty", !en);
  bookMeta.textContent = `${book.author} · ${book.year} · ${resolvePublisherLabel(book.publisher)}`;
  bookSummary.textContent = formatSummaryForCard(book.summary);
  bookCardNav.classList.toggle("is-hidden", group.items.length <= 1);
  bookCardCount.textContent = `${safeIndex + 1} / ${group.items.length}`;
  state.selectedBookId = book.id;
  state.selectedSiteIndex = item.siteIndex;
  state.selectedBookIndex = safeIndex;
  bookCard.dataset.bookIndex = String(safeIndex);
  bookCard.dataset.bookId = book.id;
  bookCard.dataset.siteIndex = String(item.siteIndex);
  return item;
}

function positionFocusSplitBookCard() {
  if (!bookCard.classList.contains("book-card--focus-split")) return;
  const margin = 16;
  const gutter = 20;
  const splitLine = state.width * 0.42;
  let leftPx = splitLine + gutter;
  bookCard.style.top = "50%";
  bookCard.style.left = `${leftPx}px`;

  requestAnimationFrame(() => {
    if (bookCard.classList.contains("is-hidden")) return;
    if (!bookCard.classList.contains("book-card--focus-split")) return;
    const rect = bookCard.getBoundingClientRect();
    const w = rect.width;
    if (w <= 0) return;
    if (rect.right > state.width - margin) {
      leftPx = Math.max(splitLine + gutter, state.width - margin - w);
      bookCard.style.left = `${leftPx}px`;
    }
  });
}

function openBookCard(group, x, y, bookIndex = 0) {
  setCardBook(group, bookIndex);
  bookCard.dataset.groupKey = group.key;
  delete bookCard.dataset.anchorMode;

  if (state.focusMode) {
    bookCard.classList.add("book-card--focus-split");
    bookCard.style.top = "50%";
    syncBookCardLayout();
    positionFocusSplitBookCard();
    requestAnimationFrame(() => {
      if (!bookCard.classList.contains("book-card--focus-split")) return;
      bookCard.classList.remove("is-hidden");
    });
  } else {
    bookCard.classList.remove("book-card--focus-split");
    bookCard.classList.remove("is-hidden");
    syncBookCardLayout();
    bookCard.style.left = `${x}px`;
    bookCard.style.top = `${y}px`;
    requestAnimationFrame(() => {
      if (bookCard.classList.contains("is-hidden")) return;
      if (bookCard.classList.contains("book-card--focus-split")) return;
      clampBookCardToViewport();
    });
  }
}

function closeBookCard() {
  const wasFocusSplit = bookCard.classList.contains("book-card--focus-split");
  bookCard.classList.add("is-hidden");
  if (wasFocusSplit) {
    window.setTimeout(() => {
      if (bookCard.classList.contains("is-hidden")) {
        bookCard.classList.remove("book-card--focus-split");
      }
    }, 400);
  } else {
    bookCard.classList.remove("book-card--focus-split");
  }
  delete bookCard.dataset.bookId;
  delete bookCard.dataset.siteIndex;
  delete bookCard.dataset.groupKey;
  delete bookCard.dataset.bookIndex;
  delete bookCard.dataset.anchorMode;
}

function clampBookCardToViewport() {
  const rect = bookCard.getBoundingClientRect();
  const w = rect.width;
  const h = rect.height;
  if (w <= 0 || h <= 0) return;
  const margin = 16;
  const currentLeft = parseFloat(bookCard.style.left) || 0;
  const currentTop = parseFloat(bookCard.style.top) || 0;
  const minX = w / 2 + margin;
  const maxX = state.width - w / 2 - margin;
  // Transform is translate(-50%, -112%): visual top = setTop - h*1.12,
  // visual bottom = setTop - h*0.12.
  const minY = h * 1.12 + margin;
  const maxY = state.height - margin + h * 0.12;
  const safeMinX = Math.min(minX, maxX);
  const safeMaxX = Math.max(minX, maxX);
  const safeMinY = Math.min(minY, maxY);
  const safeMaxY = Math.max(minY, maxY);
  bookCard.style.left = `${clamp(currentLeft, safeMinX, safeMaxX)}px`;
  bookCard.style.top = `${clamp(currentTop, safeMinY, safeMaxY)}px`;
}

function switchCardBook(delta) {
  if (bookCard.classList.contains("is-hidden")) return;

  const groupKey = bookCard.dataset.groupKey;
  const group = pinGroups.find((item) => item.key === groupKey);
  if (!group || group.items.length <= 1) return;

  const currentIndex = Number(bookCard.dataset.bookIndex || 0);
  setCardBook(group, currentIndex + delta);
  syncBookCardLayout();
  if (bookCard.classList.contains("book-card--focus-split")) positionFocusSplitBookCard();
}

function syncCardPosition() {
  if (bookCard.classList.contains("is-hidden")) return;

  if (bookCard.classList.contains("book-card--focus-split")) {
    positionFocusSplitBookCard();
    return;
  }

  const groupKey = bookCard.dataset.groupKey;
  const pin = projectedPins.find((item) => item.groupKey === groupKey);
  if (!pin || pin.z <= 0.03) {
    closeBookCard();
    state.selectedBookId = null;
    state.selectedSiteIndex = 0;
    state.selectedGroupKey = null;
    state.selectedBookIndex = 0;
    return;
  }

  bookCard.style.left = `${pin.x}px`;
  bookCard.style.top = `${pin.y}px`;
  clampBookCardToViewport();
}

window.addEventListener("resize", () => {
  resize();
  syncBookCardLayout();
  if (bookCard.classList.contains("book-card--focus-split")) positionFocusSplitBookCard();
});

canvas.addEventListener("pointerdown", onPointerDown);
canvas.addEventListener("pointermove", onPointerMove);

document.addEventListener("pointerup", tryFinalizeGlobePointer, true);
document.addEventListener(
  "pointercancel",
  (event) => {
    if (state.activeGlobePointerId !== event.pointerId) return;
    resetGlobePointerState();
  },
  true
);

canvas.addEventListener("lostpointercapture", (event) => {
  if (event.pointerId !== state.activeGlobePointerId) return;
  state.isDragging = false;
  state.activeGlobePointerId = null;
});

window.addEventListener("blur", () => {
  resetGlobePointerState();
});

bookCardClose.addEventListener("click", () => {
  closeBookCard();
  state.selectedBookId = null;
  state.selectedSiteIndex = 0;
  state.selectedGroupKey = null;
  state.selectedBookIndex = 0;
});
bookCardPrev.addEventListener("click", () => switchCardBook(-1));
bookCardNext.addEventListener("click", () => switchCardBook(1));

if (globeFocusBack) {
  globeFocusBack.addEventListener("click", () => exitRegionFocus());
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && state.focusMode) exitRegionFocus();
});

resize();
applyLockedTypeScales();
applyLockedCardTypeScales();
applyLockedIntroOffsets();
loadLandData();
requestAnimationFrame(drawGlobe);
