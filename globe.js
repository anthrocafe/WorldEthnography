const canvas = document.querySelector("#globeCanvas");
const ctx = canvas.getContext("2d", { alpha: true });
const stage = document.querySelector(".globe-stage");
const regionCoverLayer = document.querySelector("#regionCoverLayer");
const globeFocusBack = document.querySelector("#globeFocusBack");

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const TILT_DEFAULT = -Math.PI / 6;
const CLOSE_BOOK_SITE_DISTANCE_KM = 320;

const REGION_FOCUS = {
  amazon: {
    id: "amazon",
    label: "亚马逊-安第斯",
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
    label: "西南地区",
    centerLon: 99,
    centerLat: 24,
    /** Pill anchor (腾冲); focus camera still uses centerLon/centerLat. */
    labelLon: 98.49,
    labelLat: 25.02,
    radiusMul: 1.75,
    contains(lon, lat) {
      return lat >= 7 && lat <= 36 && lon >= 89 && lon <= 106;
    },
    bookIds: new Set([
      "ethnography-11",
      "ethnography-59",
      "ethnography-60",
      "ethnography-61",
      "ethnography-62",
      "ethnography-120",
    ]),
  },
  pacific: {
    id: "pacific",
    label: "美拉尼西亚",
    centerLon: 156,
    centerLat: -9,
    radiusMul: 1.85,
    contains(lon, lat) {
      return lat >= -21 && lat <= 1 && lon >= 129 && lon <= 181;
    },
    bookIds: new Set([
      "ethnography-13",
      "ethnography-21",
      "ethnography-65",
      "ethnography-67",
      "ethnography-68",
      "ethnography-69",
      "ethnography-70",
      "ethnography-71",
      "ethnography-119",
    ]),
  },
  crescent: {
    id: "crescent",
    label: "新月地带",
    centerLon: 37.5,
    centerLat: 32.2,
    /** Pill anchor (约旦内陆); focus camera still uses centerLon/centerLat. */
    labelLon: 36.5,
    labelLat: 31.2,
    radiusMul: 1.9,
    contains(lon, lat) {
      return lat >= 28 && lat <= 35.2 && lon >= 29 && lon <= 45.5;
    },
    bookIds: new Set([
      "ethnography-24",
      "ethnography-73",
      "ethnography-93",
      "ethnography-101",
      "ethnography-103",
      "ethnography-111",
      "ethnography-118",
    ]),
  },
};

const COVER_SLUG_BY_BOOK_ID = {
  "ethnography-11": "the-mushroom-at-the-end-of-the-world",
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
  "ethnography-64": "mien-relations",
  "ethnography-13": "in-the-shadow-of-the-palms",
  "ethnography-21": "becoming-sinners",
  "ethnography-65": "society-of-others",
  "ethnography-67": "reverse-anthropology",
  "ethnography-68": "on-the-edge-of-the-global",
  "ethnography-69": "leviathans-at-the-gold-mine",
  "ethnography-70": "the-gender-of-the-gift",
  "ethnography-71": "cheap-meat",
  "ethnography-119": "the-method-of-hope",
  "ethnography-24": "politics-of-piety",
  "ethnography-73": "dreams-that-matter",
  "ethnography-93": "an-enchanted-modern",
  "ethnography-101": "facts-on-the-ground",
  "ethnography-103": "ungovernable-life",
  "ethnography-111": "waste-siege",
  "ethnography-118": "veiled-sentiments",
  "ethnography-120": "gathering-medicines",
};

/** Focus-mode cover leader lines: skip these pin groups for a book so the cover anchors to another site (e.g. Iraq vs. Lebanon). */
const FOCUS_COVER_SKIP_GROUP_KEYS_BY_BOOK_ID = {
  "ethnography-103": new Set(["region:levant"]),
  "ethnography-71": new Set(["-9.444,147.180"]),
};

/** Keep Zh + En titles on one line; widen card beyond default focus-split max when needed. */
const BOOK_CARD_TITLE_SINGLE_LINE_IDS = new Set(["ethnography-72"]);

/** Default-view bookmark peek: slugs with a local JPEG in assets/covers/. */
const COVER_SLUGS_WITH_FILES = new Set([
  "a-disability-of-the-soul",
  "a-heart-for-the-work",
  "adopted-territory",
  "after-the-revolution",
  "age-of-wild-ghosts",
  "algeria-in-france",
  "alien-ocean",
  "an-enchanted-modern",
  "animal-intimacies",
  "at-home-in-the-world",
  "bazaar-politics",
  "becoming-sinners",
  "beyond-nature-and-culture",
  "border-capitalism-disrupted",
  "border-work",
  "cannibal-metaphysics",
  "cheap-meat",
  "cosmologies-of-credit",
  "creative-reckonings",
  "death-without-weeping",
  "decolonizing-extinction",
  "depression-in-japan",
  "designs-for-the-pluriverse",
  "dreams-that-matter",
  "earth-beings",
  "enforcing-order",
  "everyday-conversions",
  "everything-was-forever-until-it-was-no-more",
  "evicted-from-eternity",
  "facts-on-the-ground",
  "flight-ways",
  "fresh-fruit-broken-bodies",
  "friction",
  "gathering-medicines",
  "ghetto-at-the-center-of-the-world",
  "global-body-shopping",
  "global-cinderellas",
  "governing-educational-desire",
  "healing-labor",
  "how-forests-think",
  "hunters-pastoralists-and-ranchers",
  "hygiene-sociality-and-culture-in-contemporary-rural-china",
  "improvising-medicine",
  "in-the-shadow-of-the-palms",
  "in-the-time-of-oil",
  "intimate-disconnections",
  "islamic-modern",
  "kinshasa",
  "knot-of-the-soul",
  "laboratory-life",
  "leviathans-at-the-gold-mine",
  "life-and-death-on-mt-everest",
  "life-and-words",
  "life-beside-itself",
  "life-exposed",
  "life-in-debt",
  "living-with-herds",
  "lost-people-magic-and-the-legacy-of-slavery-in-madagascar",
  "love-s-uncertainty",
  "made-in-china",
  "marginal-gains",
  "memories-of-the-slave-trade",
  "mien-relations",
  "millennial-monsters",
  "moral-laboratories",
  "nostalgia-for-the-future",
  "on-the-edge-of-the-global",
  "on-the-move-for-love",
  "other-worldly",
  "passage-to-manhood",
  "passionate-uprisings",
  "pathologies-of-power",
  "peripheral-visions",
  "political-spiritualities",
  "politics-of-piety",
  "porkopolis",
  "private-life-under-socialism",
  "reverse-anthropology",
  "righteous-dopefiend",
  "rights-refused",
  "shaving-the-beasts",
  "society-of-others",
  "songs-for-dead-parents",
  "sonic-socialism",
  "soul-hunters",
  "south-koreans-in-the-debt-crisis",
  "spirits-of-modernity",
  "spirits-of-resistance-and-capitalist-discipline-factory-women-in-malaysia",
  "strangers-in-the-city",
  "the-anti-politics-machine",
  "the-anxieties-of-mobility",
  "the-biopolitics-of-beauty",
  "the-body-multiple",
  "the-falling-sky",
  "the-gender-of-the-gift",
  "the-intimate-economies-of-bangkok",
  "the-land-of-open-graves",
  "the-make-believe-space",
  "the-method-of-hope",
  "the-moral-neoliberal",
  "the-mushroom-at-the-end-of-the-world",
  "the-new-woman-in-uzbekistan",
  "the-paper-road",
  "the-pastoral-clinic",
  "the-perils-of-belonging",
  "the-performance-of-human-rights-in-morocco",
  "the-reckoning-of-pluralism",
  "the-reindeer-people",
  "the-republic-of-therapy",
  "the-subject-of-virtue",
  "the-traffic-in-hierarchy",
  "the-underneath-of-things",
  "the-vanishing-hectare",
  "the-war-machines",
  "the-will-to-improve",
  "the-will-to-live",
  "transcending-boundaries",
  "truth-in-motion",
  "tsukiji",
  "twice-dead",
  "ungovernable-life",
  "veiled-sentiments",
  "vita",
  "warring-souls",
  "waste-siege",
  "when-bodies-remember",
  "yearnings-in-the-meantime",
]);

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
  bookmarkExpandBlend: 0,
  bookmarkExpandTarget: 0,
  activeGlobePointerId: null,
  searchFocused: false,
  searchQuery: "",
  keywordFilterBlend: 0,
  keywordMatchReveal: 0,
  keywordRevealKey: "",
  distantSimilarityOpen: false,
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
  // Île-de-France: center Paris + eastern banlieues field sites map to one globe-scale pin
  // so overlapping hit targets do not hide books (e.g. Fassin vs. Silverstein).
  {
    key: "city:paris-metro",
    lat: 48.885,
    lon: 2.418,
    bounds: { minLat: 48.8, maxLat: 49.02, minLon: 2.28, maxLon: 2.52 },
  },
  // Greater Bay: Shenzhen + Hong Kong → one pin.
  {
    key: "megacity:hongkong-shenzhen",
    lat: 22.42,
    lon: 114.12,
    bounds: { minLat: 22.14, maxLat: 22.66, minLon: 113.91, maxLon: 114.44 },
  },
  // Seoul + Dongducheon camptowns and nearby.
  {
    key: "region:seoul-metro",
    lat: 37.5665,
    lon: 126.978,
    bounds: { minLat: 37.45, maxLat: 38.05, minLon: 126.82, maxLon: 127.18 },
  },
  // Jerusalem area + West Bank reads as one dot at globe scale.
  {
    key: "region:israel-palestine",
    lat: 31.7683,
    lon: 35.2137,
    bounds: { minLat: 31.2, maxLat: 32.7, minLon: 34.2, maxLon: 35.75 },
  },
  // Beirut + Damascus (and Beirut site of Iraq/Lebanon multisited work).
  {
    key: "region:levant",
    lat: 33.68,
    lon: 35.9,
    bounds: { minLat: 33.22, maxLat: 34.15, minLon: 35.15, maxLon: 36.52 },
  },
  // Lagos / Ibadan / Benin City corridor.
  {
    key: "region:nigeria-major",
    lat: 6.43,
    lon: 4.5,
    bounds: { minLat: 6.08, maxLat: 6.72, minLon: 3.18, maxLon: 5.82 },
  },
  // Bo / Northern Province / wartime SL–Liberia pin used on the globe.
  {
    key: "region:sierra-leone",
    lat: 8.4657,
    lon: -13.2317,
    bounds: { minLat: 7.65, maxLat: 9.35, minLon: -13.55, maxLon: -11.35 },
  },
  // Fergana valley + Kyrgyz–Tajik–Uzbek borderlands ethnography.
  {
    key: "region:uzbekistan-fergana",
    lat: 40.3,
    lon: 70.85,
    bounds: { minLat: 39.55, maxLat: 41.25, minLon: 69.35, maxLon: 72.35 },
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

function geoDistanceKm(a, b) {
  const toRad = (value) => (Number(value) * Math.PI) / 180;
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLat = lat2 - lat1;
  const dLon = toRad(b.lon) - toRad(a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}

function buildPinPoints(book) {
  const sourcePoints =
    book.sites && book.sites.length > 0
      ? book.sites.map((site, siteIndex) => ({ siteIndex, lat: site.lat, lon: site.lon }))
      : [{ siteIndex: 0, lat: book.lat, lon: book.lon }];
  const pinPoints = [];

  for (const point of sourcePoints) {
    const lat = Number(point.lat);
    const lon = Number(point.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    if (pinPoints.some((kept) => geoDistanceKm(kept, { lat, lon }) <= CLOSE_BOOK_SITE_DISTANCE_KM)) continue;
    pinPoints.push({
      siteIndex: point.siteIndex,
      lat,
      lon,
      vector: sphericalToVector(lon, lat),
    });
  }

  return pinPoints.length > 0
    ? pinPoints
    : [{ siteIndex: 0, lat: book.lat, lon: book.lon, vector: sphericalToVector(book.lon, book.lat) }];
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

      const group = groups.get(key);
      if (group.items.some((item) => item.book.id === book.id)) continue;

      group.items.push({
        book,
        siteIndex: pinPoint.siteIndex,
      });
    }
  }

  return Array.from(groups.values());
}

function buildBookSearchHaystack(book) {
  return [
    book.title,
    book.summary,
    book.author,
    book.location,
    book.countryOrRegion,
    book.sourceField,
    book.locationEn,
    book.publisher,
    book.year != null ? String(book.year) : "",
  ]
    .filter((s) => s != null && String(s).trim() !== "")
    .join("\n")
    .toLowerCase();
}

function normalizeKeywordQuery(raw) {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function bookMatchesSearchQuery(book, normalizedQuery) {
  if (!normalizedQuery) return true;
  const tokens = normalizedQuery.split(" ").filter(Boolean);
  if (!tokens.length) return true;
  const haystack = book.searchHaystack;
  return tokens.every((t) => haystack.includes(t));
}

function groupMatchesSearchQuery(group, normalizedQuery) {
  if (!normalizedQuery) return false;
  return group.items.some(({ book }) => bookMatchesSearchQuery(book, normalizedQuery));
}

function groupItemsForSearchUI(group) {
  const q = state.searchQuery;
  if (!searchPinsActive() || q.length === 0) return group.items;
  return group.items.filter(({ book }) => bookMatchesSearchQuery(book, q));
}

function searchPinsActive() {
  return state.searchFocused || state.searchQuery.length > 0;
}

function booksMatchingSearch() {
  const q = state.searchQuery;
  if (!q.length) return [];
  return books.filter((book) => bookMatchesSearchQuery(book, q));
}

function findFarthestBookPair(matchedBooks) {
  if (!matchedBooks || matchedBooks.length < 2) return null;

  let maxDist = -1;
  let bookA = null;
  let bookB = null;

  for (let i = 0; i < matchedBooks.length; i += 1) {
    for (let j = i + 1; j < matchedBooks.length; j += 1) {
      const dist = geoDistanceKm(
        { lat: matchedBooks[i].lat, lon: matchedBooks[i].lon },
        { lat: matchedBooks[j].lat, lon: matchedBooks[j].lon }
      );
      if (dist > maxDist) {
        maxDist = dist;
        bookA = matchedBooks[i];
        bookB = matchedBooks[j];
      }
    }
  }

  if (!bookA || !bookB) return null;
  return { books: [bookA, bookB], distanceKm: maxDist };
}

function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function highlightSearchTermsInText(text, normalizedQuery) {
  const raw = String(text ?? "");
  if (!normalizedQuery || !raw.trim()) return escapeHtml(raw);

  const tokens = normalizedQuery.split(" ").filter(Boolean);
  if (!tokens.length) return escapeHtml(raw);

  let result = escapeHtml(raw);
  for (const token of tokens) {
    const re = new RegExp(`(${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    result = result.replace(re, '<mark class="search-term-highlight">$1</mark>');
  }
  return result;
}

function formatDistanceKmLabel(km) {
  const rounded = Math.round(Number(km) || 0);
  return `${rounded.toLocaleString("zh-CN")} 公里`;
}

function bookCardLocationZh(book) {
  return book.sourceField || [book.countryOrRegion, book.location].filter(Boolean).join("·");
}

const DISTANT_SIMILARITY = {
  minLeftGap: 40,
  panelPad: 50,
  minCoverW: 148,
  maxCoverW: 228,
  panelMin: 154,
};

let distantSimilarityCardMeasureEl = null;

function computeDistantSimilarityMetrics(book, mobile = state.width <= 720) {
  const aspect = book ? coverAspectForBook(book) : BOOK_COVER_ASPECT_DEFAULT;
  const { zh } = splitTranslatedTitle(book?.title || "");
  const contentW = Math.ceil(measureFocusBookmarkTextWidth(focusBookmarkTitleFont(), zh));
  const panelMin = mobile ? 140 : DISTANT_SIMILARITY.panelMin;
  const minLeftGap = DISTANT_SIMILARITY.minLeftGap;
  const minCoverW = mobile ? 132 : DISTANT_SIMILARITY.minCoverW;
  const maxCoverW = mobile ? 168 : DISTANT_SIMILARITY.maxCoverW;
  const panelW = Math.max(panelMin, Math.ceil(contentW + DISTANT_SIMILARITY.panelPad));
  const panelH = book ? measureFocusBookmarkPanelHeight(book, panelW) : 90;
  let coverW = Math.max(panelW + minLeftGap, minCoverW);
  coverW = Math.min(coverW, maxCoverW);
  const finalPanelW = Math.min(panelW, coverW);
  const panelLeft = coverW - finalPanelW;
  const coverH = coverW / aspect;
  return {
    coverW,
    coverH,
    panelW: finalPanelW,
    panelLeft,
    tabH: panelH,
    shellH: coverH + panelH,
  };
}

function ensureDistantSimilarityCardMeasureEl() {
  if (distantSimilarityCardMeasureEl) return distantSimilarityCardMeasureEl;
  const el = document.createElement("div");
  el.className = "distant-similarity-panel distant-similarity-panel--measure";
  el.setAttribute("aria-hidden", "true");
  document.body.appendChild(el);
  distantSimilarityCardMeasureEl = el;
  return el;
}

function measureDistantSimilarityExpandedCardWidth(book, coverW, normalizedQuery) {
  const mobile = state.width <= 720;
  const margin = 28;
  const pairGap = 72;
  const maxOuter = mobile
    ? Math.max(240, state.width - margin * 2)
    : Math.min(380, Math.max(260, (Math.min(920, state.width) - pairGap) / 2 - margin));
  const minW = Math.max(coverW, mobile ? 220 : 260);

  const el = ensureDistantSimilarityCardMeasureEl();
  el.innerHTML = `<span class="distant-similarity-panel-body">${buildDistantSimilarityCardHtml(book, normalizedQuery)}</span>`;
  el.style.width = "auto";
  el.style.maxWidth = `${maxOuter}px`;
  const contentW = Math.ceil(el.getBoundingClientRect().width);
  return clamp(Math.max(minW, contentW + 12), minW, maxOuter);
}

function applyDistantSimilaritySlotLayout(slot, book, normalizedQuery = state.searchQuery) {
  if (isMobilePortrait()) {
    slot.classList.add("is-mobile-portrait");
    if (slot.classList.contains("is-expanded")) {
      applyDistantSimilarityMobileCardLayout(slot, book);
      return;
    }
  }
  const m = computeDistantSimilarityMetrics(book);
  const cardW = measureDistantSimilarityExpandedCardWidth(book, m.coverW, normalizedQuery);
  const expanded = slot.classList.contains("is-expanded");
  const slotW = expanded ? Math.max(m.coverW, cardW) : m.coverW;
  const coverOffset = (slotW - m.coverW) / 2;

  slot.style.setProperty("--ds-slot-w", `${slotW}px`);
  slot.style.setProperty("--ds-cover-w", `${m.coverW}px`);
  slot.style.setProperty("--ds-cover-h", `${m.coverH}px`);
  slot.style.setProperty("--ds-tab-h", `${m.tabH}px`);
  slot.style.setProperty("--ds-shell-h", `${m.shellH}px`);
  slot.style.setProperty("--ds-panel-w", `${m.panelW}px`);
  slot.style.setProperty("--ds-panel-left", `${coverOffset + m.panelLeft}px`);
  slot.style.setProperty("--ds-card-w", `${cardW}px`);
  slot.style.setProperty("--ds-card-left", `${(slotW - cardW) / 2}px`);
}

function applyDistantSimilarityMobileCardLayout(slot, book) {
  const margin = 14;
  const pairGap = 12;
  const captionReserve = 80;
  const topReserve = 52;
  const available = state.height - captionReserve - topReserve - margin * 2;
  const cardW = state.width - margin * 2;
  const cardH = clamp(Math.floor((available - pairGap) / 2), 148, 280);

  slot.style.setProperty("--ds-slot-w", `${cardW}px`);
  slot.style.setProperty("--ds-cover-w", "0px");
  slot.style.setProperty("--ds-cover-h", "0px");
  slot.style.setProperty("--ds-tab-h", "0px");
  slot.style.setProperty("--ds-shell-h", `${cardH}px`);
  slot.style.setProperty("--ds-panel-w", `${cardW}px`);
  slot.style.setProperty("--ds-panel-left", "0px");
  slot.style.setProperty("--ds-card-w", `${cardW}px`);
  slot.style.setProperty("--ds-card-left", "0px");
}

function buildDistantSimilarityCardHtml(book, normalizedQuery) {
  const { zh, en } = splitTranslatedTitle(book.title);
  const locZh = bookCardLocationZh(book);
  const locEn = book.locationEn || fallbackEnglishLocation(book);
  const meta = `${book.author} · ${book.year}\n${resolvePublisherLabel(book.publisher)}`;
  const summary = formatSummaryForCard(book.summary);

  return `
    <button class="distant-similarity-card-close" type="button" aria-label="收起卡片">×</button>
    <p class="distant-similarity-card-loc-zh">${highlightSearchTermsInText(locZh, normalizedQuery)}</p>
    <p class="distant-similarity-card-loc-en">${highlightSearchTermsInText(locEn, normalizedQuery)}</p>
    <p class="distant-similarity-card-title-zh">${highlightSearchTermsInText(zh, normalizedQuery)}</p>
    ${
      en
        ? `<p class="distant-similarity-card-title-en">${highlightSearchTermsInText(en, normalizedQuery)}</p>`
        : ""
    }
    <p class="distant-similarity-card-meta">${highlightSearchTermsInText(meta, normalizedQuery)}</p>
    <p class="distant-similarity-card-summary">${highlightSearchTermsInText(summary, normalizedQuery)}</p>
  `;
}

function createDistantSimilaritySlot(book, normalizedQuery) {
  const slot = document.createElement("div");
  slot.className = "distant-similarity-slot";
  slot.dataset.bookId = book.id;

  const loc = document.createElement("p");
  loc.className = "distant-similarity-loc";
  loc.textContent = bookCardLocationZh(book);

  const stage = document.createElement("div");
  stage.className = "distant-similarity-stage";

  const bookmarkBtn = document.createElement("button");
  bookmarkBtn.type = "button";
  bookmarkBtn.className = "distant-similarity-bookmark";
  const titleZh = splitTranslatedTitle(book.title).zh || book.title;
  bookmarkBtn.setAttribute("aria-label", `${titleZh}，点击展开书签`);
  bookmarkBtn.setAttribute("aria-expanded", "false");

  const shell = document.createElement("span");
  shell.className = "distant-similarity-shell";

  const cover = document.createElement("span");
  cover.className = "distant-similarity-cover";
  const slug = resolveCoverSlugForBook(book);
  let coverImg = null;
  if (slug && COVER_SLUGS_WITH_FILES.has(slug)) {
    coverImg = document.createElement("img");
    coverImg.src = coverAssetUrl(slug);
    coverImg.alt = titleZh;
    coverImg.loading = "eager";
    cover.appendChild(coverImg);
  } else {
    cover.classList.add("distant-similarity-cover--placeholder");
    cover.innerHTML = highlightSearchTermsInText(titleZh, normalizedQuery);
  }

  shell.appendChild(cover);
  bookmarkBtn.appendChild(shell);

  const panel = document.createElement("div");
  panel.className = "distant-similarity-panel";

  const peek = document.createElement("span");
  peek.className = "distant-similarity-panel-peek distant-similarity-panel-title-zh";
  peek.innerHTML = highlightSearchTermsInText(titleZh, normalizedQuery);

  const body = document.createElement("div");
  body.className = "distant-similarity-panel-body";
  body.innerHTML = buildDistantSimilarityCardHtml(book, normalizedQuery);
  body.setAttribute("aria-hidden", "true");

  panel.appendChild(peek);
  panel.appendChild(body);
  stage.appendChild(bookmarkBtn);
  stage.appendChild(panel);

  const relayout = () => applyDistantSimilaritySlotLayout(slot, book, normalizedQuery);
  if (coverImg) {
    const onCoverLoad = () => {
      if (rememberCoverAspectFromImage(coverImg)) relayout();
    };
    if (coverImg.complete && coverImg.naturalWidth) onCoverLoad();
    else coverImg.addEventListener("load", onCoverLoad, { once: true });
  }
  relayout();

  const setExpanded = (expanded) => {
    if (expanded) {
      if (slot.classList.contains("is-expanded")) return;
      slot.classList.add("is-expanded");
      bookmarkBtn.setAttribute("aria-expanded", "true");
      body.setAttribute("aria-hidden", "false");
      relayout();
      return;
    }
    slot.classList.remove("is-expanded");
    bookmarkBtn.setAttribute("aria-expanded", "false");
    body.setAttribute("aria-hidden", "true");
    relayout();
  };

  bookmarkBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (slot.classList.contains("is-expanded")) return;
    setExpanded(true);
  });

  body.querySelector(".distant-similarity-card-close")?.addEventListener("click", (e) => {
    e.stopPropagation();
    setExpanded(false);
  });

  panel.addEventListener("click", (e) => e.stopPropagation());

  slot.appendChild(loc);
  slot.appendChild(stage);
  return slot;
}

function renderDistantSimilarityPair({ books: pairBooks, distanceKm }) {
  if (!distantSimilarityPair || !distantSimilarityCaption) return;

  distantSimilarityPair.innerHTML = "";
  const q = state.searchQuery;
  const queryLabel = keywordSearch?.value?.trim() || q;

  distantSimilarityCaption.innerHTML = `搜索「<mark class="search-term-highlight">${escapeHtml(queryLabel)}</mark>」的匹配作品中，地理距离最远的一对相距约 ${formatDistanceKmLabel(distanceKm)}`;

  for (const book of pairBooks) {
    distantSimilarityPair.appendChild(createDistantSimilaritySlot(book, q));
  }
}

function openDistantSimilarity() {
  const matched = booksMatchingSearch();
  const result = findFarthestBookPair(matched);
  if (!result || !distantSimilarityLayer) return;

  closeBookCard();
  renderDistantSimilarityPair(result);
  state.distantSimilarityOpen = true;
  distantSimilarityLayer.classList.remove("is-hidden");
  distantSimilarityLayer.setAttribute("aria-hidden", "false");
  document.body.classList.add("is-distant-similarity-open");

  if (prefersReducedMotion) {
    distantSimilarityLayer.classList.add("is-visible");
  } else {
    requestAnimationFrame(() => {
      distantSimilarityLayer.classList.add("is-visible");
    });
  }
}

function closeDistantSimilarity() {
  if (!distantSimilarityLayer || !state.distantSimilarityOpen) return;

  state.distantSimilarityOpen = false;
  distantSimilarityLayer.classList.remove("is-visible");
  document.body.classList.remove("is-distant-similarity-open");

  const finish = () => {
    if (state.distantSimilarityOpen) return;
    distantSimilarityLayer.classList.add("is-hidden");
    distantSimilarityLayer.setAttribute("aria-hidden", "true");
    if (distantSimilarityPair) distantSimilarityPair.innerHTML = "";
    if (distantSimilarityCaption) distantSimilarityCaption.textContent = "";
  };

  if (prefersReducedMotion) finish();
  else window.setTimeout(finish, 420);
}

function syncDistantSimilarityButton() {
  if (!keywordSearchSimilarity) return;
  const matched = booksMatchingSearch();
  const show = state.searchQuery.length > 0 && matched.length >= 2 && !state.focusMode;
  keywordSearchSimilarity.hidden = !show;
}

const books = (window.ETHNOGRAPHY_BOOKS || []).map((book) => ({
  ...book,
  vector: sphericalToVector(book.lon, book.lat),
  pinPoints: buildPinPoints(book),
  searchHaystack: buildBookSearchHaystack(book),
}));

function regionHasSearchMatchedBook(region, normalizedQuery) {
  if (!normalizedQuery || normalizedQuery.length === 0) return true;
  for (const bookId of region.bookIds) {
    const book = books.find((b) => b.id === bookId);
    if (book && bookMatchesSearchQuery(book, normalizedQuery)) return true;
  }
  return false;
}

const pinGroups = buildPinGroups(books);
let projectedPins = [];
let projectedRegionLabelHitRects = [];
let hoveredPinId = null;
let hoveredRegionLabelId = null;
let hoveredFocusBookId = null;
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
const bookCardCoverWrap = document.querySelector("#bookCardCoverWrap");
const bookCardCover = document.querySelector("#bookCardCover");
const bookCardBookmarkHint = document.querySelector("#bookCardBookmarkHint");

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

function englishMainTitleForCard(enInParens) {
  const en = String(enInParens || "").trim();
  if (!en) return "";
  /* Card line: English bibliographic subtitles after ": " clutter the subtitle row. */
  const cut = en.indexOf(": ");
  if (cut === -1) return en;
  return en.slice(0, cut).trim();
}

function splitTranslatedTitle(displayTitle) {
  const trimmed = String(displayTitle || "").trim();
  const match = /^([\s\S]+?)\s*[（(]([\s\S]+)[）)]\s*$/.exec(trimmed);
  const stripBookQuotes = (value) => String(value || "").replace(/[《》]/g, "").trim();
  if (!match) return { zh: stripBookQuotes(trimmed), en: "" };
  return { zh: stripBookQuotes(match[1]), en: englishMainTitleForCard(match[2].trim()) };
}

function slugifyCoverTitle(en) {
  return String(en || "")
    .toLowerCase()
    .replace(/[\u2018\u2019\u201c\u201d]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function englishTitleForCover(displayTitle) {
  const trimmed = String(displayTitle || "").trim();
  const match = /^[\s\S]+?\s*[（(]([\s\S]+)[）)]\s*$/.exec(trimmed);
  if (match) return match[1].trim();
  const nested = /\((.*)\)/.exec(trimmed);
  return nested ? nested[1] : trimmed;
}

function resolveCoverSlugForBook(book) {
  if (!book) return "";
  return COVER_SLUG_BY_BOOK_ID[book.id] || slugifyCoverTitle(englishTitleForCover(book.title));
}

const coverPrefetchBySlug = new Map();

function coverAssetUrl(slug) {
  return `./assets/covers/${slug}.jpg`;
}

function shouldPrefetchCoversAggressively() {
  const conn = navigator.connection;
  if (conn?.saveData) return false;
  const type = conn?.effectiveType;
  if (type === "slow-2g" || type === "2g") return false;
  return true;
}

function prefetchCoverSlug(slug) {
  if (!slug || !COVER_SLUGS_WITH_FILES.has(slug) || coverPrefetchBySlug.has(slug)) return;
  const img = new Image();
  coverPrefetchBySlug.set(slug, img);
  const onLoad = () => {
    rememberCoverAspectFromImage(img);
    if (typeof img.decode === "function") img.decode().catch(() => {});
  };
  img.addEventListener("load", onLoad, { once: true });
  img.src = coverAssetUrl(slug);
  if (img.complete && img.naturalWidth) onLoad();
}

function prefetchCoverForBook(book) {
  prefetchCoverSlug(resolveCoverSlugForBook(book));
}

function prefetchCoversForGroup(group) {
  if (!group) return;
  for (const item of group.items) prefetchCoverForBook(item.book);
}

function prefetchRegionCovers(regionId) {
  const region = REGION_FOCUS[regionId];
  if (!region) return;
  for (const bookId of region.bookIds) {
    const book = books.find((item) => item.id === bookId);
    if (book) prefetchCoverForBook(book);
  }
}

function scheduleIdleCoverPrefetch() {
  if (!shouldPrefetchCoversAggressively()) return;
  const slugs = [...COVER_SLUGS_WITH_FILES];
  let index = 0;
  const batchSize = 3;
  const step = () => {
    const end = Math.min(index + batchSize, slugs.length);
    for (; index < end; index += 1) prefetchCoverSlug(slugs[index]);
    if (index < slugs.length) {
      if (typeof window.requestIdleCallback === "function") {
        window.requestIdleCallback(step, { timeout: 2500 });
      } else {
        window.setTimeout(step, 180);
      }
    }
  };
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(step, { timeout: 4000 });
  } else {
    window.setTimeout(step, 2000);
  }
}

function bookSupportsBookmarkCover(book) {
  if (!book) return false;
  const slug = resolveCoverSlugForBook(book);
  return Boolean(slug && COVER_SLUGS_WITH_FILES.has(slug));
}

const BOOK_COVER_ASPECT_DEFAULT = 2 / 3;
const coverAspectBySlug = new Map();

function isBookmarkCardOpen() {
  return Boolean(bookCard && bookCard.classList.contains("book-card--bookmark") && !bookCard.classList.contains("is-hidden"));
}

function isBookmarkCardExpanded() {
  return isBookmarkCardOpen() && state.bookmarkExpandTarget > 0.5;
}

function slugFromCoverSrc(src) {
  const match = /\/([^/?#]+)\.jpg(?:[?#]|$)/i.exec(String(src || ""));
  return match ? match[1] : "";
}

function rememberCoverAspectFromImage(img) {
  const slug = slugFromCoverSrc(img?.getAttribute("src") || img?.currentSrc || "");
  if (!slug || !img?.naturalWidth || !img?.naturalHeight) return false;
  coverAspectBySlug.set(slug, img.naturalWidth / img.naturalHeight);
  return true;
}

function coverAspectForBook(book) {
  const slug = resolveCoverSlugForBook(book);
  return (slug && coverAspectBySlug.get(slug)) || BOOK_COVER_ASPECT_DEFAULT;
}

function bookmarkCoverAspect() {
  const bookId = bookCard?.dataset?.bookId;
  const book = bookId ? books.find((item) => item.id === bookId) : null;
  return coverAspectForBook(book);
}

function syncBookmarkCoverLayoutAfterLoad() {
  if (!bookCardCover || !rememberCoverAspectFromImage(bookCardCover)) return;
  if (!bookCard?.classList.contains("book-card--bookmark") || bookCard.classList.contains("is-hidden")) return;
  syncBookCardLayout();
  if (isBookmarkCardExpanded()) positionBookmarkExpandedBookCard();
  else syncBookmarkCardPosition();
}

function bindBookmarkCoverLoadSync() {
  if (!bookCardCover) return;
  const onLoad = () => syncBookmarkCoverLayoutAfterLoad();
  if (bookCardCover.complete && bookCardCover.naturalWidth) onLoad();
  else bookCardCover.addEventListener("load", onLoad, { once: true });
}

function resetBookmarkCardState() {
  state.bookmarkExpandBlend = 0;
  state.bookmarkExpandTarget = 0;
  invalidateBookmarkPanelMeasureCache();
  if (!bookCard) return;
  bookCard.classList.remove("book-card--bookmark", "is-bookmark-expanded", "is-bookmark-pulling", "book-card--mobile-card-only");
  bookCard.style.removeProperty("--bookmark-expand");
  if (bookCardBookmarkHint) bookCardBookmarkHint.hidden = true;
  if (bookCardCoverWrap) bookCardCoverWrap.hidden = true;
  if (bookCardCover) bookCardCover.classList.remove("is-cover-fade-out", "is-cover-fade-in");
}

let bookCardCoverCrossfadeToken = 0;

function replaceBookCardCoverSrc(newSrc, { fade = false } = {}) {
  if (!bookCardCover) return;

  const token = ++bookCardCoverCrossfadeToken;
  const currentSrc = bookCardCover.getAttribute("src") || "";
  if (currentSrc === newSrc) {
    bookCardCover.classList.remove("is-cover-fade-out", "is-cover-fade-in");
    bindBookmarkCoverLoadSync();
    return;
  }

  bookCardCover.classList.remove("is-cover-fade-in");
  if (currentSrc) bookCardCover.classList.add("is-cover-fade-out");

  const reveal = () => {
    if (token !== bookCardCoverCrossfadeToken) return;
    bookCardCover.classList.remove("is-cover-fade-out");
    if (fade && !prefersReducedMotion) {
      void bookCardCover.offsetWidth;
      bookCardCover.classList.add("is-cover-fade-in");
      const cleanup = () => {
        bookCardCover.classList.remove("is-cover-fade-in");
      };
      bookCardCover.addEventListener("transitionend", cleanup, { once: true });
      window.setTimeout(cleanup, 320);
    }
    bindBookmarkCoverLoadSync();
  };

  const commit = () => {
    if (token !== bookCardCoverCrossfadeToken) return;
    bookCardCover.src = newSrc;
    if (bookCardCover.complete && bookCardCover.naturalWidth) reveal();
    else bookCardCover.addEventListener("load", reveal, { once: true });
  };

  const preload = new Image();
  preload.onload = commit;
  preload.onerror = commit;
  preload.src = newSrc;
  if (preload.complete) commit();
}

function crossfadeBookCardCover(newSrc) {
  replaceBookCardCoverSrc(newSrc, { fade: true });
}

function setBookCardCoverImage(book, { animate = false } = {}) {
  if (!bookCardCover || !bookCardCoverWrap) return;
  const slug = resolveCoverSlugForBook(book);
  if (!slug) {
    bookCardCoverWrap.hidden = true;
    return;
  }
  const newSrc = coverAssetUrl(slug);
  bookCardCover.alt = splitTranslatedTitle(book.title).zh || book.title;
  bookCardCoverWrap.hidden = false;

  const currentSrc = bookCardCover.getAttribute("src") || "";
  if (currentSrc === newSrc) {
    bookCardCover.classList.remove("is-cover-fade-out", "is-cover-fade-in");
    bindBookmarkCoverLoadSync();
    return;
  }
  if (!animate || !currentSrc) {
    replaceBookCardCoverSrc(newSrc, { fade: false });
    return;
  }
  crossfadeBookCardCover(newSrc);
}

function setBookmarkExpandState(expanded, { immediate = false, animatePull = false } = {}) {
  if (expanded) {
    invalidateBookmarkPanelMeasureCache();
    state.bookmarkExpandTarget = 1;
    if (immediate || prefersReducedMotion) {
      state.bookmarkExpandBlend = 1;
      bookCard.style.setProperty("--bookmark-expand", "1");
    }
    bookCard.classList.add("is-bookmark-expanded");
    if (animatePull) {
      bookCard.classList.add("is-bookmark-pulling");
      window.setTimeout(() => {
        bookCard.classList.remove("is-bookmark-pulling");
      }, prefersReducedMotion ? 120 : 760);
    }
    bookCard.dataset.anchorMode = "bookmark-expanded";
  } else {
    state.bookmarkExpandTarget = 0;
    state.bookmarkExpandBlend = 0;
    bookCard.classList.remove("is-bookmark-expanded", "is-bookmark-pulling");
    bookCard.style.setProperty("--bookmark-expand", "0");
    delete bookCard.dataset.anchorMode;
  }
}

function applyBookmarkCardMode(book, { animateCover = false } = {}) {
  if (!bookSupportsBookmarkCover(book)) {
    resetBookmarkCardState();
    return false;
  }
  bookCard.classList.add("book-card--bookmark");
  setBookCardCoverImage(book, { animate: animateCover });
  if (bookCardBookmarkHint) bookCardBookmarkHint.hidden = true;
  return true;
}

function expandBookmarkCard() {
  if (!isBookmarkCardOpen() || isBookmarkCardExpanded()) return;
  setBookmarkExpandState(true, { animatePull: true });
  syncBookCardLayout();
  if (isMobilePortrait()) positionBookmarkExpandedBookCard();
}

function fallbackEnglishLocation(book) {
  const loc = book.location || "";
  const region = book.countryOrRegion || "";
  if (!region) return loc;
  if (!loc) return region;
  return `${region}·${loc}`;
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

function bookCardContentOverflows() {
  const locRow = bookCard.querySelector(".book-card-loc-row");
  if (locRow && locRow.scrollWidth > locRow.clientWidth + 1) return true;

  const check = (el) => {
    if (!el || !String(el.textContent || "").trim()) return false;
    if (el === bookTitleEn && el.classList.contains("is-empty")) return false;
    return el.scrollWidth > el.clientWidth + 1;
  };

  return (
    check(bookLocationEn) ||
    check(bookTitleZh) ||
    check(bookTitleEn) ||
    check(bookMeta)
  );
}

function nowrapRowsOverflow(panel) {
  void panel;
  return bookCardContentOverflows();
}

function applyBookCardOuterWidth(w, maxOuter) {
  const ww = Math.min(maxOuter, Math.max(280, Math.round(w)));
  bookCard.style.width = `${ww}px`;
  bookCard.style.minWidth = `${ww}px`;
  bookCard.style.maxWidth = `${maxOuter}px`;
}

function syncBookCardLayout() {
  if (bookCard.classList.contains("is-hidden")) return;

  const hPadViewport = window.matchMedia("(max-width: 720px)").matches ? 18 : 24;
  const focusSplit = bookCard.classList.contains("book-card--focus-split");
  const focusMobile = bookCard.classList.contains("book-card--focus-mobile");
  const bookmarkExpanded = bookCard.classList.contains("book-card--bookmark") && isBookmarkCardExpanded();

  if (bookCard.classList.contains("book-card--bookmark")) {
    syncBookmarkCardMetrics();
    if (!bookmarkExpanded) {
      bookCard.classList.remove("book-card--tight", "book-card--tighter");
      return;
    }
    bookCard.classList.remove("book-card--tight", "book-card--tighter");
    return;
  }

  let maxOuter = focusMobile
    ? Math.min(420, Math.max(280, Math.round(window.innerWidth - 32)))
    : focusSplit || bookmarkExpanded
      ? Math.min(520, Math.max(300, Math.round(window.innerWidth * 0.54 - 40)))
      : Math.min(760, window.innerWidth - hPadViewport * 2);

  if (BOOK_CARD_TITLE_SINGLE_LINE_IDS.has(bookCard.dataset.bookId)) {
    const cap = window.innerWidth - hPadViewport * 2;
    maxOuter = Math.min(Math.max(maxOuter, 640), cap);
  }

  const baseMin = Math.min(420, maxOuter);

  bookCard.classList.remove("book-card--tight", "book-card--tighter");

  const tryWidth = (w) => {
    applyBookCardOuterWidth(w, maxOuter);
    void bookCard.offsetHeight;
  };

  requestAnimationFrame(() => {
    tryWidth(maxOuter);
    if (!bookCardContentOverflows()) {
      let lo = Math.min(baseMin, maxOuter);
      let hi = maxOuter;
      while (lo < hi) {
        const mid = Math.floor((lo + hi) / 2);
        tryWidth(mid);
        if (bookCardContentOverflows()) lo = mid + 1;
        else hi = mid;
      }
      tryWidth(lo);
    }

    requestAnimationFrame(() => {
      if (bookCardContentOverflows()) bookCard.classList.add("book-card--tight");
      requestAnimationFrame(() => {
        if (bookCardContentOverflows()) bookCard.classList.add("book-card--tighter");
      });
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
  amazon: "亚马逊-安第斯",
};

const REGION_FOCUS_LABELS = Object.values(REGION_FOCUS).map((region) => ({
  id: region.id,
  text: REGION_FOCUS_LABEL_TEXT[region.id] || region.label,
  vector: sphericalToVector(
    region.labelLon ?? region.centerLon,
    region.labelLat ?? region.centerLat
  ),
}));

const REGION_FOCUS_LABEL_OFFSETS = {
  amazon: { x: 0, y: 0 },
  /* ~ one label pill height (see drawRoundedRect boxHeight≈30) upward from腾冲 anchor */
  zomia: { x: 0, y: -30 },
  pacific: { x: 0, y: 0 },
  /* Nudge inland (east on screen): keep pill-left clear of continental stroke vs Jordan anchor */
  crescent: { x: 32, y: 0 },
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
  syncMobilePortraitClass();

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
  document.body.classList.toggle("is-focus-cover-notice-visible", state.focusBlendTarget > 0 || Boolean(state.focusMode));
  document.body.classList.toggle("is-drag-hint-visible", state.focusBlendTarget === 0 && !state.focusMode);
  if (state.focusRegionId) {
    document.body.dataset.focusRegion = state.focusRegionId;
  } else {
    delete document.body.dataset.focusRegion;
  }
  if (regionCoverLayer) {
    regionCoverLayer.classList.toggle("is-active", state.focusBlend > 0.35 && state.focusRegionId);
    regionCoverLayer.setAttribute("aria-hidden", state.focusBlend > 0.35 ? "false" : "true");
  }
}

function beginRegionFocus(regionId) {
  const region = REGION_FOCUS[regionId];
  if (!region) return;

  closeDistantSimilarity();
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

  prefetchRegionCovers(regionId);

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
  syncDistantSimilarityButton();
}

function exitRegionFocus() {
  resetGlobePointerState();

  closeBookCard();
  hoveredFocusBookId = null;
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
  syncDistantSimilarityButton();
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

function focusBookMatchesGroup(group, bookId = hoveredFocusBookId) {
  return Boolean(bookId && group.items.some((item) => item.book.id === bookId));
}

function regionCoverLayerBuildSignature() {
  if (!state.focusRegionId) return null;
  return `${state.focusRegionId}|${state.searchQuery}`;
}

const FOCUS_BOOKMARK = {
  sizeMul: 0.8,
  minLeftGap: 40,
  panelPad: 50,
  titleFontSize: 15,
};

let focusBookmarkMeasureCtx = null;
let focusBookmarkPanelMeasureEl = null;

function focusBookmarkTitleFont() {
  return `700 ${FOCUS_BOOKMARK.titleFontSize}px Georgia, "Times New Roman", serif`;
}

function measureFocusBookmarkTextWidth(font, text) {
  if (!focusBookmarkMeasureCtx) {
    focusBookmarkMeasureCtx = document.createElement("canvas").getContext("2d");
  }
  focusBookmarkMeasureCtx.font = font;
  return focusBookmarkMeasureCtx.measureText(String(text || "").trim()).width;
}

function focusBookmarkPanelText(book) {
  const { zh } = splitTranslatedTitle(book?.title || "");
  return { zh };
}

function ensureFocusBookmarkPanelMeasureEl() {
  if (focusBookmarkPanelMeasureEl) return focusBookmarkPanelMeasureEl;
  const panel = document.createElement("div");
  panel.className = "region-cover-bookmark-panel region-cover-bookmark-panel--measure";
  panel.innerHTML = `<span class="region-cover-bookmark-title-zh"></span>`;
  panel.setAttribute("aria-hidden", "true");
  document.body.appendChild(panel);
  focusBookmarkPanelMeasureEl = panel;
  return panel;
}

function measureFocusBookmarkPanelWidth(book) {
  const { zh } = focusBookmarkPanelText(book);
  return Math.ceil(measureFocusBookmarkTextWidth(focusBookmarkTitleFont(), zh));
}

function measureFocusBookmarkPanelHeight(book, panelW) {
  const panel = ensureFocusBookmarkPanelMeasureEl();
  const { zh } = focusBookmarkPanelText(book);
  panel.querySelector(".region-cover-bookmark-title-zh").textContent = zh;
  panel.style.width = `${Math.max(1, Math.round(panelW))}px`;
  return Math.ceil(panel.getBoundingClientRect().height);
}

function bookForCoverBtn(btn) {
  const id = btn?.dataset?.bookId;
  return id ? books.find((item) => item.id === id) : null;
}

function computeFocusBookmarkMetrics(book, mobile = isMobileFocusCoverLayout()) {
  const aspect = book ? coverAspectForBook(book) : BOOK_COVER_ASPECT_DEFAULT;
  const denseMobile = isDenseFocusRegionForMobilePortrait();
  const panelMin = mobile ? (denseMobile ? 138 : 154) : 188;
  const panelPad = denseMobile ? 42 : FOCUS_BOOKMARK.panelPad;
  const minLeftGap = denseMobile ? 32 : FOCUS_BOOKMARK.minLeftGap;
  const minCoverW = mobile ? (denseMobile ? 132 : 146) : 190;
  const contentW = book ? measureFocusBookmarkPanelWidth(book) : 0;
  const panelW = Math.max(panelMin, Math.ceil(contentW + panelPad));
  const panelH = book ? measureFocusBookmarkPanelHeight(book, panelW) : 90;
  const coverW = Math.max(panelW + minLeftGap, minCoverW);
  const finalPanelW = Math.min(panelW, coverW);
  const panelLeft = coverW - finalPanelW;
  const coverH = coverW / aspect;
  return { coverW, coverH, panelW: finalPanelW, panelLeft, tabH: panelH };
}

function applyFocusBookmarkLayoutVars(btn, metrics, scale = 1) {
  const s = (Number(scale) || 1) * FOCUS_BOOKMARK.sizeMul * focusCoverMobilePortraitSizeMul();
  const scaledTab = metrics.tabH * s;
  const minTab = isMobilePortrait() ? 36 : 28;
  const tabH = Math.max(minTab, scaledTab);
  btn.style.setProperty("--region-bookmark-tab", `${tabH}px`);
  btn.style.setProperty("--region-bookmark-panel-w", `${metrics.panelW * s}px`);
  btn.style.setProperty("--region-bookmark-panel-left", `${metrics.panelLeft * s}px`);
  return {
    width: metrics.coverW * s,
    height: metrics.coverH * s + tabH,
    imageWidth: metrics.coverW * s,
    imageHeight: metrics.coverH * s,
  };
}

function focusCoverNaturalVisualSize(btn, mobile = isMobileFocusCoverLayout()) {
  const metrics = computeFocusBookmarkMetrics(bookForCoverBtn(btn), mobile);
  return applyFocusBookmarkLayoutVars(btn, metrics, 1);
}

function invalidateFocusCoverLayout() {
  state.coverLayoutReady = false;
  syncRegionCoverPositions();
}

function createRegionCoverBookmarkPeek(item, slug) {
  const shell = document.createElement("span");
  shell.className = "region-cover-bookmark-shell";

  const cover = document.createElement("span");
  cover.className = "region-cover-bookmark-cover";
  const img = document.createElement("img");
  img.src = coverAssetUrl(slug);
  img.alt = splitTranslatedTitle(item.book.title).zh || item.book.title;
  img.loading = "eager";
  img.addEventListener(
    "load",
    () => {
      if (!rememberCoverAspectFromImage(img)) return;
      invalidateFocusCoverLayout();
    },
    { once: true }
  );
  cover.appendChild(img);
  if (img.complete && img.naturalWidth) rememberCoverAspectFromImage(img);

  const panel = document.createElement("span");
  panel.className = "region-cover-bookmark-panel";
  const { zh } = splitTranslatedTitle(item.book.title);
  const titleZh = document.createElement("span");
  titleZh.className = "region-cover-bookmark-title-zh";
  titleZh.textContent = zh;
  panel.appendChild(titleZh);

  shell.appendChild(cover);
  shell.appendChild(panel);
  return shell;
}

function buildRegionCoverLayer() {
  if (!regionCoverLayer || !state.focusRegionId) return;
  const sig = regionCoverLayerBuildSignature();
  if (state.coverLayerBuiltFor === sig) return;

  regionCoverLayer.innerHTML = "";
  state.coverLayerBuiltFor = sig;
  state.coverLayoutReady = false;
  hoveredFocusBookId = null;
  const renderedBookIds = new Set();

  for (const group of pinGroups) {
    if (!groupMatchesFocusRegion(group)) continue;
    for (const [itemIndex, item] of group.items.entries()) {
      if (!REGION_FOCUS[state.focusRegionId].bookIds.has(item.book.id)) continue;
      const skipCoverKeys = FOCUS_COVER_SKIP_GROUP_KEYS_BY_BOOK_ID[item.book.id];
      if (skipCoverKeys?.has(group.key)) continue;
      if (renderedBookIds.has(item.book.id)) continue;
      if (searchPinsActive() && state.searchQuery.length > 0 && !bookMatchesSearchQuery(item.book, state.searchQuery)) {
        continue;
      }
      renderedBookIds.add(item.book.id);
      const slug = resolveCoverSlugForBook(item.book);
      if (!slug || !COVER_SLUGS_WITH_FILES.has(slug)) continue;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "region-cover-hit region-cover-hit--bookmark";
      btn.dataset.groupKey = group.key;
      btn.dataset.bookId = item.book.id;
      btn.dataset.bookIndex = String(itemIndex);
      btn.dataset.slotJitterX = String((Math.random() - 0.5).toFixed(4));
      btn.dataset.slotJitterY = String((Math.random() - 0.5).toFixed(4));
      btn.dataset.baseCoverScale = "1";
      btn.style.setProperty("--cover-scale", "1");
      btn.setAttribute("aria-label", `${item.book.title}，点击展开`);

      btn.appendChild(createRegionCoverBookmarkPeek(item, slug));

      const setFocusHover = () => {
        hoveredFocusBookId = item.book.id;
      };
      const clearFocusHover = () => {
        if (hoveredFocusBookId === item.book.id) hoveredFocusBookId = null;
      };
      btn.addEventListener("pointerenter", setFocusHover);
      btn.addEventListener("pointerleave", clearFocusHover);
      btn.addEventListener("focus", setFocusHover);
      btn.addEventListener("blur", clearFocusHover);

      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const g = pinGroups.find((p) => p.key === group.key);
        if (!g) return;
        const itemsUi = groupItemsForSearchUI(g);
        const openIdx = itemsUi.findIndex(
          (it) => it.book.id === item.book.id && it.siteIndex === item.siteIndex
        );
        const idx = openIdx >= 0 ? openIdx : 0;
        state.selectedGroupKey = g.key;
        state.selectedBookIndex = idx;
        const x = Number(btn.dataset.coverX) || state.width * 0.5;
        const y = Number(btn.dataset.coverY) || state.height * 0.5;
        openBookCard(g, x, y, idx, { expandImmediately: !isMobilePortrait() });
        bookCard.dataset.anchorMode = "cover";
      });

      regionCoverLayer.appendChild(btn);
    }
  }
}

function isFocusBookmarkCardOpen() {
  return state.focusMode && isBookmarkCardOpen();
}

function isGlobalBookCardOpen() {
  return !state.focusMode && bookCard && !bookCard.classList.contains("is-hidden");
}

function isMobileFocusLayout() {
  return state.width <= 760 || window.matchMedia("(max-width: 760px)").matches;
}

function isMobilePortrait() {
  return isMobileFocusLayout() && state.height >= state.width;
}

function isDenseFocusRegionForMobilePortrait() {
  if (!isMobilePortrait() || !state.focusRegionId) return false;
  return state.focusRegionId === "crescent" || state.focusRegionId === "pacific";
}

function focusCoverMobilePortraitSizeMul() {
  if (!isDenseFocusRegionForMobilePortrait()) return 1;
  if (state.focusRegionId === "pacific") return 0.86;
  if (state.focusRegionId === "crescent") return 0.92;
  return 1;
}

function focusCoverMobilePortraitScaleCap() {
  if (!isDenseFocusRegionForMobilePortrait()) return 1;
  if (state.focusRegionId === "pacific") return 0.52;
  if (state.focusRegionId === "crescent") return 0.56;
  return 0.55;
}

function syncMobilePortraitClass() {
  document.body.classList.toggle("is-mobile-portrait", isMobilePortrait());
}

function isMobileFocusCoverLayout() {
  return state.focusMode && isMobileFocusLayout();
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
    const imageSize = coverImageSize(btn);
    btn.style.setProperty("--cover-render-width", `${imageSize.width}px`);
    btn.style.setProperty("--cover-render-height", `${imageSize.height}px`);
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
    const coverCenter = resolveCoverCenterAvoidingPins(pin.x + offsetX, pin.y + offsetY, size);
    const coverX = coverCenter.x;
    const coverY = coverCenter.y;
    if (state.coverLayoutReady && hasCachedOffset) {
      btn.dataset.layoutX = String(coverX);
      btn.dataset.layoutY = String(coverY);
      btn.dataset.offsetX = String(coverX - pin.x);
      btn.dataset.offsetY = String(coverY - pin.y);
    }

    const baseX = state.coverLayoutReady ? coverX : pin.x + (coverX - pin.x) * positionFade;
    const baseY = state.coverLayoutReady ? coverY : pin.y + (coverY - pin.y) * positionFade;

    const cardOpen = isFocusBookmarkCardOpen();
    const placeX = baseX;
    const placeY = baseY;

    const baseOpacity = 0.18 + pin.z * 0.82 * positionFade;
    const opacityMul = cardOpen ? suppressFade : 1;

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
    btn.style.zIndex = String(Math.round(100 + index));
    btn.classList.remove("region-cover-hit--split-active");
  }
}

function coverVisualSize(btn) {
  const scale = Number(btn.style.getPropertyValue("--cover-scale")) || 1;
  const metrics = computeFocusBookmarkMetrics(bookForCoverBtn(btn));
  const layout = applyFocusBookmarkLayoutVars(btn, metrics, scale);
  return {
    width: layout.width,
    height: layout.height,
  };
}

function coverImageSize(btn) {
  const scale = Number(btn.style.getPropertyValue("--cover-scale")) || 1;
  const metrics = computeFocusBookmarkMetrics(bookForCoverBtn(btn));
  const layout = applyFocusBookmarkLayoutVars(btn, metrics, scale);
  return {
    width: layout.imageWidth,
    height: layout.imageHeight,
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

function buildCoverLayoutItems(entries) {
  return entries.map((entry, index) => {
    const size = coverVisualSize(entry.btn);
    return {
      entry,
      index,
      size,
      area: size.width * size.height,
      pin: entry.pin,
    };
  });
}

function solveNonOverlappingCoverLayout(entries) {
  const visibleEntries = entries.filter((entry) => entry.pin && entry.pin.z > 0.04);
  if (visibleEntries.length === 0) return;

  fitCoverScalesToViewport(visibleEntries);
  const protectedPins = coverLayoutPinObstacles();
  const items = buildCoverLayoutItems(visibleEntries);

  if (isDenseFocusRegionForMobilePortrait() && items.length > 1) {
    const fallback = gridFallbackCoverLayout(items, protectedPins);
    if (fallback.size > 0) {
      for (const item of items) {
        const candidate = fallback.get(item);
        if (!candidate) continue;
        applyCoverLayoutPosition(item, candidate.x, candidate.y);
      }
      refineCoverLayoutAgainstPinsAndOverlaps(visibleEntries);
      return;
    }
  }

  if (items.length === 1) {
    const item = items[0];
    const layoutContext = createCoverLayoutContext(items);
    const candidates = coverLayoutCandidates(item, layoutContext);
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
    const safeCenter = resolveCoverCenterAvoidingPins(cx, cy, item.size, protectedPins);
    cx = safeCenter.x;
    cy = safeCenter.y;
    applyCoverLayoutPosition(item, cx, cy);
    refineCoverLayoutAgainstPinsAndOverlaps(visibleEntries);
    return;
  }

  const layoutContext = createCoverLayoutContext(items);

  for (const item of items) {
    item.candidates = coverLayoutCandidates(item, layoutContext);
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
  let bestScore = Infinity;
  let bestChosen = null;

  function placeNext(depth, runningScore = 0) {
    if (depth >= searchOrder.length) {
      if (runningScore < bestScore) {
        bestScore = runningScore;
        bestChosen = new Map(chosen);
      }
      return;
    }
    if (visited > maxNodes || runningScore >= bestScore) return;
    visited += 1;

    const item = searchOrder[depth];
    for (const candidate of item.candidates) {
      if (rectOverlapsPinObstacles(candidate.rect, protectedPins)) continue;
      if (placed.some((placedRect) => rectsOverlapWithGap(candidate.rect, placedRect, 12))) continue;
      placed.push(candidate.rect);
      chosen.set(item, candidate);
      placeNext(depth + 1, runningScore + candidate.score);
      chosen.delete(item);
      placed.pop();
    }
  }

  placeNext(0);

  if (bestChosen) {
    chosen.clear();
    for (const [item, candidate] of bestChosen) {
      chosen.set(item, candidate);
    }
  } else {
    chosen.clear();
    const fallback = gridFallbackCoverLayout(items, protectedPins);
    for (const [item, candidate] of fallback) {
      chosen.set(item, candidate);
    }
  }

  for (const item of items) {
    const candidate = chosen.get(item);
    if (!candidate) continue;
    const safeCenter = resolveCoverCenterAvoidingPins(candidate.x, candidate.y, item.size, protectedPins);
    applyCoverLayoutPosition(item, safeCenter.x, safeCenter.y);
  }

  refineCoverLayoutAgainstPinsAndOverlaps(visibleEntries);
}

function coverLayoutPinObstacles() {
  return projectedPins
    .filter((pin) => pin.z > 0.04)
    .map((pin) => ({
      x: pin.x,
      y: pin.y,
      // Include the halo, leader-line dot, and a little reading room around the marker.
      radius: pin.radius + 34,
    }));
}

function fitCoverScalesToViewport(entries) {
  const mobile = isMobileFocusCoverLayout();
  const denseMobile = isDenseFocusRegionForMobilePortrait();
  const margin = mobile ? 14 : 18;
  const gap = denseMobile ? 10 : mobile ? 14 : 12;
  const count = entries.length;
  const availableWidth = Math.max(140, state.width - margin * 2);
  const bottomReserve = mobile ? Math.max(88, Math.min(128, state.height * 0.14)) : 0;
  const availableHeight = Math.max(180, state.height - margin * 2 - bottomReserve);
  const unitSizes = entries.map((entry) => focusCoverNaturalVisualSize(entry.btn, mobile));
  const maxUnitW = Math.max(...unitSizes.map((size) => size.width), 1);
  const maxUnitH = Math.max(...unitSizes.map((size) => size.height), 1);
  let bestScale = 1;
  let bestScore = -Infinity;

  for (let columns = 1; columns <= count; columns += 1) {
    const rows = Math.ceil(count / columns);
    const slotWidth = (availableWidth - gap * (columns - 1)) / columns;
    const slotHeight = (availableHeight - gap * (rows - 1)) / rows;
    const widthScale = (slotWidth - (mobile ? (denseMobile ? 12 : 18) : 24)) / maxUnitW;
    const heightScale = (slotHeight - (mobile ? (denseMobile ? 16 : 24) : 32)) / maxUnitH;
    const scale = Math.min(widthScale, heightScale);
    const score = scale * 100 - rows * (mobile ? (denseMobile ? 8 : 6) : 4) - Math.abs(columns - rows) * 0.8;
    const minSlotWidth = mobile ? (denseMobile ? 96 : 102) : 128;
    const minSlotHeight = mobile ? (denseMobile ? 112 : 126) : 150;
    if (slotWidth >= minSlotWidth && slotHeight >= minSlotHeight && score > bestScore) {
      bestScore = score;
      bestScale = scale;
    }
  }

  const scaleFloor = mobile ? (denseMobile ? 0.44 : 0.55) : 0.72;
  let maxScale = clamp(bestScale, scaleFloor, 1);
  if (denseMobile) {
    maxScale = Math.min(maxScale, focusCoverMobilePortraitScaleCap());
  }

  const applyScale = (scale) => {
    for (const entry of entries) {
      entry.btn.style.setProperty("--cover-scale", scale.toFixed(3));
    }
  };

  applyScale(maxScale);

  if (denseMobile && entries.length > 1) {
    const protectedPins = coverLayoutPinObstacles();
    let scale = maxScale;
    while (scale >= scaleFloor) {
      const items = buildCoverLayoutItems(entries);
      const fallback = gridFallbackCoverLayout(items, protectedPins);
      if (fallback.size === items.length) {
        applyScale(scale);
        return;
      }
      scale -= 0.035;
    }
    applyScale(scaleFloor);
  }
}

function createCoverLayoutContext(items) {
  const pins = items.map((item) => item.pin);
  const xs = pins.map((pin) => pin.x);
  const ys = pins.map((pin) => pin.y);
  const avgWidth = items.reduce((sum, item) => sum + item.size.width, 0) / Math.max(1, items.length);
  const avgHeight = items.reduce((sum, item) => sum + item.size.height, 0) / Math.max(1, items.length);
  const centerX = xs.reduce((sum, x) => sum + x, 0) / Math.max(1, xs.length);
  const centerY = ys.reduce((sum, y) => sum + y, 0) / Math.max(1, ys.length);
  const spanX = Math.max(1, Math.max(...xs) - Math.min(...xs));
  const spanY = Math.max(1, Math.max(...ys) - Math.min(...ys));

  return {
    count: items.length,
    centerX,
    centerY,
    spanX,
    spanY,
    avgSize: Math.max(avgWidth, avgHeight),
  };
}

function coverLayoutClusterCandidates(item, layoutContext) {
  const candidates = [];
  const count = Math.max(1, layoutContext.count);
  const slot = item.index % count;
  const angleStep = (Math.PI * 2) / count;
  const slotAngle = -Math.PI / 2 + angleStep * slot;
  const pinAngle = Math.atan2(item.pin.y - layoutContext.centerY, item.pin.x - layoutContext.centerX);
  const clusterRadius = Math.max(
    layoutContext.avgSize * 0.72 + 28,
    Math.max(layoutContext.spanX, layoutContext.spanY) * 0.52 + layoutContext.avgSize * 0.48
  );
  const distances = [clusterRadius, clusterRadius + 54, clusterRadius + 112];
  const angles = [
    slotAngle,
    slotAngle + angleStep * 0.45,
    slotAngle - angleStep * 0.45,
    Number.isFinite(pinAngle) ? pinAngle : slotAngle,
  ];

  for (const distance of distances) {
    for (const angle of angles) {
      candidates.push({
        x: layoutContext.centerX + Math.cos(angle) * distance,
        y: layoutContext.centerY + Math.sin(angle) * distance,
      });
    }
  }

  return candidates;
}

function coverLayoutCandidateScore(kind, x, y, pin, shift, pinOverlap, jitter) {
  const distance = Math.hypot(x - pin.x, y - pin.y);
  const mobile = isMobileFocusCoverLayout();
  const distanceWeight = kind === "cluster" ? 0.78 : 1;
  const kindPenalty = mobile
    ? kind === "grid"
      ? -12
      : kind === "cluster"
        ? 10
        : kind === "ring"
          ? 34
          : 28
    : kind === "grid"
      ? 82
      : kind === "ring"
        ? 18
        : kind === "cluster"
          ? -30
          : 0;
  const viewportBalance = Math.abs(y - state.height * 0.48) * 0.08;
  return distance * distanceWeight + shift * 760 + pinOverlap * 420 + kindPenalty + viewportBalance + jitter;
}

function coverLayoutCandidates(item, layoutContext) {
  const { entry, pin, size } = item;
  const btn = entry.btn;
  const protectedPins = coverLayoutPinObstacles();
  const candidates = [];
  const addCandidate = (rawX, rawY, kind = "near") => {
    const { x, y, shift } = clampCoverCenterWithShift(rawX, rawY, size);
    const key = `${Math.round(x)}:${Math.round(y)}`;
    if (candidates.some((candidate) => candidate.key === key)) return;

    const rect = coverRectAt(x, y, size);
    const pinOverlap = pinObstacleOverlapAmount(rect, protectedPins);
    const jitter =
      (Number(btn.dataset.slotJitterX || 0) * (x - state.centerX) +
        Number(btn.dataset.slotJitterY || 0) * (y - state.centerY)) *
      0.002;

    candidates.push({
      key,
      x,
      y,
      rect,
      score: coverLayoutCandidateScore(kind, x, y, pin, shift, pinOverlap, jitter),
    });
  };

  for (const offset of coverOffsetCandidates(btn, pin, size)) {
    addCandidate(pin.x + offset.x, pin.y + offset.y, "near");
  }

  for (const candidate of coverLayoutClusterCandidates(item, layoutContext)) {
    addCandidate(candidate.x, candidate.y, "cluster");
  }

  const baseDistance = Math.max(size.width, size.height) * 0.58 + pin.radius + 18;
  const angleOffset = Number(btn.dataset.bookIndex || 0) * 0.47;
  for (const distance of [baseDistance, baseDistance + 54, baseDistance + 110, baseDistance + 172]) {
    for (let step = 0; step < 16; step += 1) {
      const angle = angleOffset + (Math.PI * 2 * step) / 16;
      addCandidate(pin.x + Math.cos(angle) * distance, pin.y + Math.sin(angle) * distance, "ring");
    }
  }

  for (const slot of gridSlotsForSize(size, isMobileFocusCoverLayout() ? Math.max(5, layoutContext.count) : 5)) {
    addCandidate(slot.x, slot.y, "grid");
  }

  return candidates.sort((a, b) => a.score - b.score).slice(0, isMobileFocusCoverLayout() ? 140 : 96);
}

function gridFallbackCoverLayout(items, protectedPins = []) {
  const mobile = isMobileFocusCoverLayout();
  const denseMobile = isDenseFocusRegionForMobilePortrait();
  const margin = mobile ? 14 : 18;
  const gap = denseMobile ? 10 : mobile ? 14 : 12;
  const maxWidth = Math.max(...items.map((item) => item.size.width));
  const maxHeight = Math.max(...items.map((item) => item.size.height));
  const count = items.length;
  let best = null;
  const bottomReserve = mobile ? Math.max(88, Math.min(128, state.height * 0.14)) : 0;

  for (let columns = 1; columns <= count; columns += 1) {
    const rows = Math.ceil(count / columns);
    const usedWidth = columns * maxWidth + (columns - 1) * gap;
    const usedHeight = rows * maxHeight + (rows - 1) * gap;
    if (usedWidth > state.width - margin * 2 || usedHeight > state.height - margin * 2 - bottomReserve) continue;

    const startX = (state.width - usedWidth) / 2 + maxWidth / 2;
    const startY = (state.height - bottomReserve - usedHeight) / 2 + maxHeight / 2;
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
  const mobile = isMobileFocusCoverLayout();
  const margin = mobile ? 14 : 18;
  const gap = mobile ? 14 : 12;
  const bottomReserve = mobile ? Math.max(88, Math.min(128, state.height * 0.14)) : 0;
  const minX = size.width / 2 + margin;
  const maxX = state.width - size.width / 2 - margin;
  const minY = size.height / 2 + margin;
  const maxY = state.height - bottomReserve - size.height / 2 - margin;
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
  const mobile = isMobileFocusCoverLayout();
  const margin = mobile ? 14 : 18;
  const bottomReserve = mobile ? Math.max(88, Math.min(128, state.height * 0.14)) : 0;
  return {
    x: clamp(x, size.width / 2 + margin, state.width - size.width / 2 - margin),
    y: clamp(y, size.height / 2 + margin, state.height - bottomReserve - size.height / 2 - margin),
  };
}

function clampCoverCenterWithShift(x, y, size) {
  const clamped = clampCoverCenter(x, y, size);
  return {
    ...clamped,
    shift: Math.hypot(clamped.x - x, clamped.y - y),
  };
}

function resolveCoverCenterAvoidingPins(x, y, size, pinObstacles = coverLayoutPinObstacles()) {
  const mobile = isMobileFocusCoverLayout();
  const margin = mobile ? 14 : 18;
  const bottomReserve = mobile ? Math.max(88, Math.min(128, state.height * 0.14)) : 0;
  const center = clampCoverCenter(x, y, size);

  for (let step = 0; step < 18; step += 1) {
    let moved = false;
    for (const ob of pinObstacles) {
      const rect = coverRectAt(center.x, center.y, size);
      const push = coverPinRepulsion(rect, { x: ob.x, y: ob.y }, ob.radius);
      if (!push) continue;
      center.x += push.x;
      center.y += push.y;
      moved = true;
    }

    center.x = clamp(center.x, size.width / 2 + margin, state.width - size.width / 2 - margin);
    center.y = clamp(center.y, size.height / 2 + margin, state.height - bottomReserve - size.height / 2 - margin);
    if (!moved || !rectOverlapsPinObstacles(coverRectAt(center.x, center.y, size), pinObstacles)) break;
  }

  return center;
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
  const mobile = isMobileFocusCoverLayout();
  const pad = mobile ? 14 : 10;
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

      const safeCenter = resolveCoverCenterAvoidingPins(item.cx, item.cy, item.size, obstacles);
      item.cx = safeCenter.x;
      item.cy = safeCenter.y;
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
  ctx.shadowBlur = 4;

  const buttons = Array.from(regionCoverLayer.querySelectorAll(".region-cover-hit"));
  for (const [index, btn] of buttons.entries()) {
    if (btn.style.opacity === "0") continue;
    const pinX = Number(btn.dataset.pinX);
    const pinY = Number(btn.dataset.pinY);
    const coverX = Number(btn.dataset.coverX);
    const coverY = Number(btn.dataset.coverY);
    if (![pinX, pinY, coverX, coverY].every(Number.isFinite)) continue;

    const isHighlighted = hoveredFocusBookId && btn.dataset.bookId === hoveredFocusBookId;
    ctx.lineWidth = isHighlighted ? 2.85 : 1.25;
    ctx.shadowBlur = isHighlighted ? 9 : 4;
    ctx.strokeStyle = isHighlighted
      ? `rgba(214, 67, 47, ${0.72 * fade})`
      : `rgba(86, 80, 75, ${0.24 * fade})`;
    ctx.fillStyle = isHighlighted ? `rgba(255, 252, 245, ${0.94 * fade})` : `rgba(86, 80, 75, ${0.46 * fade})`;
    ctx.shadowColor = isHighlighted ? `rgba(255, 102, 72, ${0.55 * fade})` : `rgba(244, 239, 229, ${0.38 * fade})`;

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
    const dotR = isHighlighted ? 5.1 : 3.1;
    if (isHighlighted) {
      ctx.beginPath();
      ctx.fillStyle = `rgba(214, 67, 47, ${0.55 * fade})`;
      ctx.arc(pinX, pinY, dotR + 3.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.fillStyle = isHighlighted ? `rgba(255, 252, 245, ${0.98 * fade})` : `rgba(86, 80, 75, ${0.46 * fade})`;
    ctx.arc(pinX, pinY, dotR, 0, Math.PI * 2);
    ctx.fill();
    if (isHighlighted) {
      ctx.beginPath();
      ctx.strokeStyle = `rgba(214, 67, 47, ${0.85 * fade})`;
      ctx.lineWidth = 1.8;
      ctx.arc(pinX, pinY, dotR + 0.6, 0, Math.PI * 2);
      ctx.stroke();
    }
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

  const allowIdleSpin = state.focusBlend < 0.06 && bookCard.classList.contains("is-hidden");
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

  if (state.focusBlend > 0.32 && state.focusMode && regionCoverLayer) {
    buildRegionCoverLayer();
  }

  const suppressionTarget = isFocusBookmarkCardOpen() ? 1 : 0;
  const suppressionEase = prefersReducedMotion ? 1 : 0.16;
  state.cardSuppressionBlend += (suppressionTarget - state.cardSuppressionBlend) * suppressionEase;
  if (Math.abs(suppressionTarget - state.cardSuppressionBlend) < 0.004) {
    state.cardSuppressionBlend = suppressionTarget;
  }

  const bookmarkExpandTarget =
    isBookmarkCardOpen() && state.bookmarkExpandTarget > 0 ? 1 : 0;
  const bookmarkEase = prefersReducedMotion ? 1 : 0.14;
  state.bookmarkExpandBlend += (bookmarkExpandTarget - state.bookmarkExpandBlend) * bookmarkEase;
  if (Math.abs(bookmarkExpandTarget - state.bookmarkExpandBlend) < 0.004) {
    state.bookmarkExpandBlend = bookmarkExpandTarget;
  }
  if (isBookmarkCardOpen()) {
    bookCard.style.setProperty("--bookmark-expand", state.bookmarkExpandBlend.toFixed(3));
  }

  const searchActive = state.searchFocused || state.searchQuery.length > 0;
  const kwTarget = searchActive ? 1 : 0;
  const kwEase = prefersReducedMotion ? 1 : 0.088;
  state.keywordFilterBlend += (kwTarget - state.keywordFilterBlend) * kwEase;
  if (Math.abs(kwTarget - state.keywordFilterBlend) < 0.002) {
    state.keywordFilterBlend = kwTarget;
  }

  const qNorm = state.searchQuery;
  let keywordAnyMatch = false;
  if (qNorm.length > 0) {
    for (let gi = 0; gi < pinGroups.length; gi += 1) {
      if (groupMatchesSearchQuery(pinGroups[gi], qNorm)) {
        keywordAnyMatch = true;
        break;
      }
    }
  }

  if (qNorm.length === 0) {
    state.keywordMatchReveal = 0;
    state.keywordRevealKey = "";
  } else if (state.keywordRevealKey !== qNorm) {
    state.keywordRevealKey = qNorm;
    state.keywordMatchReveal = 0;
  }

  const revealEase = prefersReducedMotion ? 1 : 0.09;
  if (qNorm.length > 0 && keywordAnyMatch) {
    state.keywordMatchReveal += (1 - state.keywordMatchReveal) * revealEase;
    if (1 - state.keywordMatchReveal < 0.003) {
      state.keywordMatchReveal = 1;
    }
  } else if (qNorm.length > 0 && !keywordAnyMatch) {
    state.keywordMatchReveal = 1;
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

  const suppressAlpha = state.focusMode ? 1 - state.cardSuppressionBlend : 1;

  const radius = state.radius * (0.94 + state.intro * 0.06);
  const pulse = (Math.sin(time * 0.005) + 1) * 0.5;

  const filterRegion = state.focusMode && state.focusBlend > 0.08;
  const hideFocusRegionPins = !state.focusMode;

  const kwActive = searchPinsActive();
  const q = state.searchQuery;
  const b = state.keywordFilterBlend;
  const rev = state.keywordMatchReveal;

  for (const group of pinGroups) {
    if (filterRegion && !groupMatchesFocusRegion(group)) continue;
    if (hideFocusRegionPins && groupMatchesAnyFocusRegion(group)) continue;

    const point = projectVector(group.vector, radius);
    if (point.z <= 0.04) continue;

    const depth = Math.max(0, Math.min(1, point.z));
    const itemsUi = groupItemsForSearchUI(group);
    const hasMultipleBooks = itemsUi.length > 1;
    const pinRadius = 3.8 + depth * 2.6 + (hasMultipleBooks ? 1.3 : 0);
    const isSelected = state.selectedGroupKey === group.key;
    const isHovered = hoveredPinId === group.key;
    const focusDimming = state.focusMode && state.focusBlend > 0.34;
    const focusHighlighted =
      focusDimming && (state.selectedGroupKey === group.key || focusBookMatchesGroup(group));
    const focusCoverPinBoost = focusHighlighted;

    let kwAlpha = 1;
    let kwScale = 1;
    if (kwActive) {
      if (q.length === 0) {
        kwAlpha = 1 - b;
      } else if (groupMatchesSearchQuery(group, q)) {
        kwAlpha = b * rev;
        kwScale = 0.56 + 0.44 * (1 - (1 - rev) ** 2.35);
      } else {
        kwAlpha = 1 - b;
      }
    }

    if (kwAlpha < 0.012) continue;

    let rDraw = pinRadius * kwScale;
    let glowR = (pinRadius + 4 + pulse * 2.5) * kwScale;
    let ringR = (pinRadius + 3.2) * kwScale;
    const hitR = (pinRadius + 8) * Math.max(kwScale, 0.85);

    if (focusCoverPinBoost) {
      rDraw *= 1.42;
      glowR *= 1.62;
      ringR *= 1.22;
    }

    ctx.save();
    const glowAlphaMul = focusCoverPinBoost ? 1.28 : 1;
    ctx.globalAlpha = Math.min(1, (0.5 + depth * 0.5) * glowAlphaMul) * suppressAlpha * kwAlpha;
    ctx.beginPath();
    ctx.fillStyle =
      focusDimming && !focusHighlighted ? "rgba(96, 90, 84, 0.13)" : "rgba(214, 67, 47, 0.18)";
    if (focusCoverPinBoost) {
      ctx.fillStyle = "rgba(214, 67, 47, 0.34)";
    }
    ctx.arc(point.x, point.y, glowR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = suppressAlpha * kwAlpha;

    if (hasMultipleBooks) {
      ctx.beginPath();
      ctx.strokeStyle =
        focusDimming && !focusHighlighted ? "rgba(86, 80, 75, 0.34)" : "rgba(214, 67, 47, 0.42)";
      ctx.lineWidth = focusCoverPinBoost ? 2 : 1.2;
      ctx.arc(point.x, point.y, ringR, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (focusCoverPinBoost) {
      ctx.beginPath();
      ctx.strokeStyle = "rgba(255, 252, 245, 0.55)";
      ctx.lineWidth = 2.4;
      ctx.arc(point.x, point.y, rDraw + 2.8, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.fillStyle =
      focusDimming && !focusHighlighted
        ? "rgba(86, 80, 75, 0.62)"
        : isSelected || isHovered || focusHighlighted
          ? "rgba(214, 67, 47, 0.96)"
          : "rgba(196, 58, 42, 0.9)";
    if (focusCoverPinBoost) {
      ctx.fillStyle = "rgba(235, 60, 36, 0.98)";
    }
    ctx.strokeStyle = focusDimming && !focusHighlighted ? "rgba(244, 239, 229, 0.58)" : "rgba(250, 245, 236, 0.9)";
    if (focusCoverPinBoost) {
      ctx.strokeStyle = "rgba(255, 252, 245, 0.98)";
    }
    ctx.lineWidth = focusCoverPinBoost ? 2.2 : 1.2;
    ctx.arc(point.x, point.y, rDraw, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();

    projectedPins.push({
      groupKey: group.key,
      group,
      x: point.x,
      y: point.y,
      z: point.z,
      radius: hitR,
    });
  }
}

function drawRegionFocusLabels() {
  projectedRegionLabelHitRects = [];
  if (state.focusBlend > 0.92) return;

  const radius = state.radius * (0.94 + state.intro * 0.06);
  const focusFade = 1 - smoothstep(Math.min(1, state.focusBlend / 0.46));
  const q = state.searchQuery;
  const globalKeywordEntry = !state.focusMode && q.length > 0;

  let kwFade = searchPinsActive() ? 1 - state.keywordFilterBlend : 1;
  if (globalKeywordEntry) {
    kwFade = 1;
  }

  const searchLabelReveal = globalKeywordEntry ? state.keywordMatchReveal : 1;
  const baseAlpha = state.intro * focusFade * kwFade * searchLabelReveal;
  if (baseAlpha <= 0.01) return;

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `700 ${state.width < 760 ? 14 : 16}px "Source Han Sans SC", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif`;

  for (const label of REGION_FOCUS_LABELS) {
    const region = REGION_FOCUS[label.id];
    if (globalKeywordEntry && !regionHasSearchMatchedBook(region, q)) continue;

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

    const hitLeft = labelPosition.x - boxWidth / 2;
    const hitTop = labelPosition.y - boxHeight / 2;
    projectedRegionLabelHitRects.push({
      id: label.id,
      left: hitLeft,
      top: hitTop,
      right: hitLeft + boxWidth,
      bottom: hitTop + boxHeight,
    });

    ctx.globalAlpha = alpha;
    ctx.beginPath();
    drawRoundedRectPath(hitLeft, hitTop, boxWidth, boxHeight, boxRadius);
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

function getHitRegionLabel(screenX, screenY) {
  for (let i = projectedRegionLabelHitRects.length - 1; i >= 0; i -= 1) {
    const r = projectedRegionLabelHitRects[i];
    if (screenX >= r.left && screenX <= r.right && screenY >= r.top && screenY <= r.bottom) return r.id;
  }
  return null;
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
    if (!state.focusMode) {
      const labelId = getHitRegionLabel(pointerX, pointerY);
      if (labelId) {
        beginRegionFocus(labelId);
        return;
      }
    }

    const hit = getHitPin(pointerX, pointerY);
    if (hit) {
      state.selectedGroupKey = hit.groupKey;
      state.selectedBookIndex = 0;
      const itemsUi = groupItemsForSearchUI(hit.group);
      const selected = itemsUi[0] || hit.group.items[0];
      state.selectedBookId = selected.book.id;
      state.selectedSiteIndex = selected.siteIndex;
      const expandImmediately =
        state.focusMode && bookSupportsBookmarkCover(selected.book) && !isMobilePortrait();
      openBookCard(hit.group, hit.x, hit.y, 0, { expandImmediately });
      return;
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
  if (pin) {
    const group = pinGroups.find((item) => item.key === pin.groupKey);
    prefetchCoversForGroup(group);
  }
  hoveredPinId = pin ? pin.groupKey : null;
  hoveredRegionLabelId = !state.focusMode ? getHitRegionLabel(x, y) : null;
  stage.style.cursor = pin || hoveredRegionLabelId ? "pointer" : "grab";
}

function setCardBook(group, bookIndex, options = {}) {
  const items = groupItemsForSearchUI(group);
  if (items.length === 0) return null;

  const safeIndex = ((bookIndex % items.length) + items.length) % items.length;
  const item = items[safeIndex];
  const book = item.book;
  const previousBookId = bookCard.dataset.bookId || "";
  const wasExpanded = isBookmarkCardExpanded();
  const wasBookmark = isBookmarkCardOpen();

  bookLocationZh.textContent =
    book.sourceField || [book.countryOrRegion, book.location].filter(Boolean).join("·");
  bookLocationEn.textContent = book.locationEn || fallbackEnglishLocation(book);

  const { zh, en } = splitTranslatedTitle(book.title);
  bookTitleZh.textContent = zh;
  bookTitleEn.textContent = en;
  bookTitleEn.classList.toggle("is-empty", !en);
  bookMeta.textContent = `${book.author} · ${book.year}\n${resolvePublisherLabel(book.publisher)}`;
  bookSummary.textContent = formatSummaryForCard(book.summary);
  bookCardNav.classList.toggle("is-hidden", items.length <= 1);
  bookCardCount.textContent = `${safeIndex + 1} / ${items.length}`;
  state.selectedBookId = book.id;
  state.selectedSiteIndex = item.siteIndex;
  state.selectedBookIndex = safeIndex;
  bookCard.dataset.bookIndex = String(safeIndex);
  bookCard.dataset.bookId = book.id;
  bookCard.dataset.siteIndex = String(item.siteIndex);
  bookCard.classList.toggle("book-card--title-single-line", BOOK_CARD_TITLE_SINGLE_LINE_IDS.has(book.id));

  invalidateBookmarkPanelMeasureCache();
  const bookChanged = book.id !== previousBookId;
  const animateCover =
    options.animateCover ??
    (wasBookmark && !bookChanged && (wasExpanded || safeIndex > 0));
  if (applyBookmarkCardMode(book, { animateCover })) {
    if (options.expandImmediately) {
      state.bookmarkExpandBlend = 0;
      state.bookmarkExpandTarget = 0;
      bookCard.classList.add("is-bookmark-expanded");
      bookCard.style.setProperty("--bookmark-expand", "0");
      delete bookCard.dataset.anchorMode;
    } else {
      const shouldExpand = safeIndex > 0 || wasExpanded;
      setBookmarkExpandState(shouldExpand, { immediate: shouldExpand });
    }
  }

  return item;
}

function bookmarkEase(t) {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

let bookmarkMeasureCtx = null;
let bookmarkPanelMeasureCacheKey = "";
let bookmarkPanelMeasureCacheFullH = 0;

function invalidateBookmarkPanelMeasureCache() {
  bookmarkPanelMeasureCacheKey = "";
  bookmarkPanelMeasureCacheFullH = 0;
}

function measureBookmarkExpandedPanelHeight(panelW, maxPanelH) {
  const panel = bookCard?.querySelector(".book-card-panel");
  if (!panel || !bookCard.classList.contains("book-card--bookmark")) {
    return maxPanelH;
  }

  const cacheKey = [
    bookCard.dataset.bookId || "",
    Math.round(panelW),
    bookLocationZh.textContent || "",
    bookSummary.textContent || "",
    getComputedStyle(document.documentElement).getPropertyValue("--scale-card-summary"),
  ].join("|");

  if (cacheKey === bookmarkPanelMeasureCacheKey && bookmarkPanelMeasureCacheFullH > 0) {
    return Math.min(bookmarkPanelMeasureCacheFullH, maxPanelH);
  }

  const shell = bookCard.querySelector(".book-card-shell");
  if (!shell) return maxPanelH;

  const clone = panel.cloneNode(true);
  clone.setAttribute("aria-hidden", "true");
  clone.classList.add("book-card-panel--measure");
  Object.assign(clone.style, {
    position: "absolute",
    visibility: "hidden",
    pointerEvents: "none",
    left: "-10000px",
    top: "0",
    width: `${panelW}px`,
    height: "auto",
    maxHeight: "none",
    overflow: "visible",
    transform: "none",
  });

  shell.appendChild(clone);
  const measured = Math.ceil(clone.getBoundingClientRect().height);
  shell.removeChild(clone);

  bookmarkPanelMeasureCacheKey = cacheKey;
  bookmarkPanelMeasureCacheFullH = measured;
  return Math.min(Math.max(measured, 96), maxPanelH);
}

function measureBookmarkTextWidth(el, fallbackFont, text = el?.textContent || "") {
  if (!bookmarkMeasureCtx) {
    bookmarkMeasureCtx = document.createElement("canvas").getContext("2d");
  }
  const style = el ? window.getComputedStyle(el) : null;
  bookmarkMeasureCtx.font = style?.font || fallbackFont;
  return bookmarkMeasureCtx.measureText(String(text || "").trim()).width;
}

function bookmarkPeekPanelWidth() {
  const metaFirstLine = String(bookMeta.textContent || "").split("\n")[0] || "";
  const maxText = Math.max(
    measureBookmarkTextWidth(bookTitleZh, "20px Georgia"),
    measureBookmarkTextWidth(bookTitleEn, "14px Georgia"),
    measureBookmarkTextWidth(bookMeta, "12px Inter", metaFirstLine)
  );
  return Math.ceil(maxText + 54);
}

function bookmarkExpandedBlockLayout(margin, gap, mobile) {
  if (isMobilePortrait()) {
    const maxCardH = clamp(state.height - margin * 2 - 96, 200, state.height - 88);
    const panelW = state.width - margin * 2;
    const contentH = measureBookmarkExpandedPanelHeight(panelW, maxCardH);
    const blockH = Math.min(contentH, maxCardH);
    return { blockH, coverW: 0, panelW, maxBlockH: maxCardH };
  }

  const aspect = bookmarkCoverAspect();
  const minBlockH = mobile ? 82 : 96;
  const maxBlockH = clamp(
    state.height * (mobile ? 0.48 : 0.66),
    mobile ? 250 : 360,
    state.height - margin * 2
  );

  let blockH = maxBlockH;
  let coverW = blockH * aspect;
  let panelW = clamp(
    state.width - coverW - gap - margin * 2,
    mobile ? 210 : 300,
    mobile ? state.width - margin * 2 : Math.min(520, state.width * 0.48)
  );

  for (let pass = 0; pass < 2; pass += 1) {
    const contentH = measureBookmarkExpandedPanelHeight(panelW, maxBlockH);
    blockH = clamp(contentH, minBlockH, maxBlockH);
    coverW = blockH * aspect;
    panelW = clamp(
      state.width - coverW - gap - margin * 2,
      mobile ? 210 : 300,
      mobile ? state.width - margin * 2 : Math.min(520, state.width * 0.48)
    );
  }

  return { blockH, coverW, panelW, maxBlockH };
}

function bookmarkLayoutMetrics(rawT = state.bookmarkExpandBlend) {
  const t = bookmarkEase(rawT);
  const margin = state.width <= 760 ? 14 : 18;
  const gap = state.width <= 760 ? 12 : 18;
  const mobile = state.width <= 760;
  const mobilePortrait = isMobilePortrait();
  const aspect = bookmarkCoverAspect();

  const panelPeekW = clamp(bookmarkPeekPanelWidth(), mobile ? 154 : 188, mobile ? state.width - margin * 2 : 360);
  const peekCoverW = clamp(
    Math.max(state.width * (mobilePortrait ? 0.5 : mobile ? 0.38 : 0.16), panelPeekW + (mobile ? 22 : 28)),
    mobile ? 146 : 190,
    mobilePortrait ? Math.min(236, state.width - margin * 2) : mobile ? Math.min(220, state.width - margin * 2) : 380
  );
  const peekCoverH = peekCoverW / aspect;
  const peekTabH = clamp(mobile ? 82 : 90, 78, Math.min(108, peekCoverH * 0.34));

  const expanded = bookmarkExpandedBlockLayout(margin, gap, mobile);
  const expandedCoverH = expanded.blockH;
  const expandedCoverW = expanded.coverW;
  const panelExpandedW = expanded.panelW;
  const panelExpandedH = expanded.blockH;
  const coverW = lerp(peekCoverW, expandedCoverW, t);
  const coverH = lerp(peekCoverH, expandedCoverH, t);
  const coverTop = lerp(peekTabH, 0, t);

  const panelW = lerp(panelPeekW, panelExpandedW, t);
  const panelLeft = lerp(peekCoverW - panelPeekW, mobilePortrait ? 0 : coverW + gap, t);
  const panelTop = 0;
  const panelH = lerp(peekTabH, panelExpandedH, t);
  const cardW = Math.max(coverW, panelLeft + panelW);
  const cardH = Math.max(coverTop + coverH, panelTop + panelH);

  return {
    t,
    margin,
    gap,
    coverW,
    coverH,
    coverTop,
    panelW,
    panelH,
    panelLeft,
    panelTop,
    cardW,
    cardH,
    expandedBlockH: expanded.blockH,
  };
}

function syncBookmarkCardMetrics(rawT = state.bookmarkExpandBlend) {
  if (!bookCard.classList.contains("book-card--bookmark")) return null;
  const m = bookmarkLayoutMetrics(rawT);
  bookCard.style.setProperty("--bookmark-expand", m.t.toFixed(3));
  bookCard.style.setProperty("--bookmark-card-w", `${m.cardW}px`);
  bookCard.style.setProperty("--bookmark-card-h", `${m.cardH}px`);
  bookCard.style.setProperty("--bookmark-cover-w", `${m.coverW}px`);
  bookCard.style.setProperty("--bookmark-cover-h", `${m.coverH}px`);
  bookCard.style.setProperty("--bookmark-cover-top", `${m.coverTop}px`);
  bookCard.style.setProperty("--bookmark-panel-left", `${m.panelLeft}px`);
  bookCard.style.setProperty("--bookmark-panel-top", `${m.panelTop}px`);
  bookCard.style.setProperty("--bookmark-panel-w", `${m.panelW}px`);
  bookCard.style.setProperty("--bookmark-panel-h", `${m.panelH}px`);
  bookCard.classList.toggle(
    "book-card--mobile-card-only",
    isMobilePortrait() && isBookmarkCardExpanded()
  );
  bookCard.classList.toggle(
    "book-card--bookmark-panel-scroll",
    (isMobilePortrait() && isBookmarkCardExpanded()) ||
      (isBookmarkCardExpanded() && bookmarkPanelMeasureCacheFullH > m.coverH + 1)
  );
  return m;
}

function bookmarkExpandedCenterX() {
  return state.width * 0.5;
}

function positionBookmarkExpandedBookCard() {
  if (!bookCard.classList.contains("book-card--bookmark")) return;
  syncBookmarkCardMetrics(1) || bookmarkLayoutMetrics(1);
  if (isMobilePortrait()) {
    bookCard.style.left = `${state.width * 0.5}px`;
    bookCard.style.top = `${state.height * 0.5}px`;
    bookCard.style.transform = "translate(-50%, -50%)";
    return;
  }
  bookCard.style.left = `${bookmarkExpandedCenterX()}px`;
  bookCard.style.top = `${state.height * 0.5}px`;
  bookCard.style.transform = "translate(-50%, -50%)";
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

function positionMobileFocusBookCard() {
  if (!bookCard.classList.contains("book-card--focus-mobile")) return;
  const bottomMargin = Math.max(132, Math.min(172, state.height * 0.18));
  bookCard.style.left = `${state.width * 0.5}px`;
  bookCard.style.top = `${state.height - bottomMargin}px`;
}

function openBookCard(group, x, y, bookIndex = 0, options = {}) {
  if (!setCardBook(group, bookIndex, options)) return;
  bookCard.dataset.groupKey = group.key;
  if (!options.expandImmediately) delete bookCard.dataset.anchorMode;

  const items = groupItemsForSearchUI(group);
  const safeIndex = ((bookIndex % items.length) + items.length) % items.length;
  const useBookmark = bookSupportsBookmarkCover(items[safeIndex]?.book);

  bookCard.classList.remove("book-card--focus-split", "book-card--focus-mobile");
  if (!useBookmark) resetBookmarkCardState();
  bookCard.classList.remove("is-hidden");
  syncBookCardLayout();
  bookCard.style.left = `${x}px`;
  bookCard.style.top = `${y}px`;
  if (options.expandImmediately && state.focusMode) {
    state.cardSuppressionBlend = 1;
  }
  requestAnimationFrame(() => {
    if (bookCard.classList.contains("is-hidden")) return;
    if (bookCard.classList.contains("book-card--bookmark")) {
      if (isBookmarkCardExpanded()) positionBookmarkExpandedBookCard();
      else syncBookmarkCardPosition();
    } else {
      clampBookCardToViewport();
    }
  });
}

function closeBookCard() {
  const wasBookmark = bookCard.classList.contains("book-card--bookmark");
  if (state.focusMode) hoveredFocusBookId = null;
  if (wasBookmark) {
    state.bookmarkExpandBlend = 0;
    state.bookmarkExpandTarget = 0;
    bookCard.classList.remove("is-bookmark-expanded", "is-bookmark-pulling");
    bookCard.style.setProperty("--bookmark-expand", "0");
  }
  bookCard.classList.add("is-hidden");
  if (wasBookmark) {
    window.setTimeout(() => {
      if (bookCard.classList.contains("is-hidden")) {
        bookCard.classList.remove("book-card--focus-split", "book-card--focus-mobile", "book-card--title-single-line");
        resetBookmarkCardState();
      }
    }, 400);
  } else {
    bookCard.classList.remove("book-card--focus-split", "book-card--focus-mobile", "book-card--title-single-line");
    resetBookmarkCardState();
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
  const items = group ? groupItemsForSearchUI(group) : [];
  if (!group || items.length <= 1) return;

  const currentIndex = Number(bookCard.dataset.bookIndex || 0);
  const wasBookmark = isBookmarkCardOpen();
  setCardBook(group, currentIndex + delta, { animateCover: wasBookmark });
  syncBookCardLayout();
  if (bookCard.classList.contains("book-card--bookmark")) {
    if (isBookmarkCardExpanded()) positionBookmarkExpandedBookCard();
    else syncBookmarkCardPosition();
  } else {
    clampBookCardToViewport();
  }
}

function syncBookmarkCardPosition() {
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

  const rawT = state.bookmarkExpandBlend;
  const m = syncBookmarkCardMetrics(rawT) || bookmarkLayoutMetrics(rawT);
  const t = m.t;

  const peekX = clamp(
    pin.x + (m.cardW - m.coverW) / 2,
    m.cardW / 2 + m.margin,
    state.width - m.cardW / 2 - m.margin
  );
  const peekY = clamp(pin.y, m.cardH + m.margin, state.height - m.margin);
  const expandedCenterX = bookmarkExpandedCenterX();
  const expandedTop = state.height * 0.5;
  const x = lerp(peekX, expandedCenterX, t);
  const y = lerp(peekY, expandedTop, t);

  bookCard.style.left = `${x}px`;
  bookCard.style.top = `${y}px`;

  const tx = -50;
  const ty = lerp(-100, -50, t);
  const lift = lerp(-12, 0, t);
  bookCard.style.transform = `translate(${tx}%, calc(${ty}% + ${lift}px))`;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function syncCardPosition() {
  if (bookCard.classList.contains("is-hidden")) return;

  if (bookCard.classList.contains("book-card--bookmark")) {
    syncBookmarkCardPosition();
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
  if (state.distantSimilarityOpen && distantSimilarityPair) {
    for (const slot of distantSimilarityPair.querySelectorAll(".distant-similarity-slot")) {
      const book = books.find((item) => item.id === slot.dataset.bookId);
      if (book) applyDistantSimilaritySlotLayout(slot, book);
    }
  }
  if (bookCard.classList.contains("book-card--bookmark") && isBookmarkCardExpanded()) {
    positionBookmarkExpandedBookCard();
  } else if (bookCard.classList.contains("book-card--bookmark")) {
    syncBookmarkCardPosition();
  }
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

bookCardClose.addEventListener("click", (e) => {
  e.stopPropagation();
  closeBookCard();
  state.selectedBookId = null;
  state.selectedSiteIndex = 0;
  state.selectedGroupKey = null;
  state.selectedBookIndex = 0;
});
bookCardPrev.addEventListener("click", (e) => e.stopPropagation());
bookCardNext.addEventListener("click", (e) => e.stopPropagation());
bookCardPrev.addEventListener("click", () => switchCardBook(-1));
bookCardNext.addEventListener("click", () => switchCardBook(1));

bookCard.addEventListener("click", (e) => {
  if (e.target.closest(".book-card-close, .book-card-nav-btn")) return;
  if (!isBookmarkCardOpen() || isBookmarkCardExpanded()) return;
  expandBookmarkCard();
});

if (globeFocusBack) {
  globeFocusBack.addEventListener("click", () => exitRegionFocus());
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (state.distantSimilarityOpen) {
      closeDistantSimilarity();
      return;
    }
    if (state.focusMode) exitRegionFocus();
  }
});

const keywordSearch = document.querySelector("#keywordSearch");
const keywordSearchGlass = document.querySelector("#keywordSearchGlass");
const keywordSearchMirror = document.querySelector(".intro-keyword-input-mirror");
const keywordSearchClear = document.querySelector("#keywordSearchClear");
const keywordSearchSimilarity = document.querySelector("#keywordSearchSimilarity");
const distantSimilarityLayer = document.querySelector("#distantSimilarityLayer");
const distantSimilarityClose = document.querySelector("#distantSimilarityClose");
const distantSimilarityCaption = document.querySelector("#distantSimilarityCaption");
const distantSimilarityPair = document.querySelector("#distantSimilarityPair");

if (keywordSearchSimilarity) {
  keywordSearchSimilarity.addEventListener("click", () => openDistantSimilarity());
}

if (distantSimilarityClose) {
  distantSimilarityClose.addEventListener("click", () => closeDistantSimilarity());
}

if (distantSimilarityLayer) {
  distantSimilarityLayer.addEventListener("click", (e) => {
    if (e.target === distantSimilarityLayer) closeDistantSimilarity();
  });
}
if (keywordSearch) {
  const syncKeywordMirror = () => {
    if (!keywordSearchMirror) return;
    const v = keywordSearch.value;
    keywordSearchMirror.textContent = v.length > 0 ? v : "\u200b";
  };
  const syncSearchQuery = () => {
    const prevQuery = state.searchQuery;
    state.searchQuery = normalizeKeywordQuery(keywordSearch.value);
    if (keywordSearchGlass) {
      keywordSearchGlass.classList.toggle("has-value", keywordSearch.value.trim() !== "");
    }
    syncKeywordMirror();
    if (state.distantSimilarityOpen && prevQuery !== state.searchQuery) {
      closeDistantSimilarity();
    }
    syncDistantSimilarityButton();
  };
  keywordSearch.addEventListener("focus", () => {
    state.searchFocused = true;
    syncSearchQuery();
  });
  keywordSearch.addEventListener("blur", () => {
    state.searchFocused = false;
    syncSearchQuery();
  });
  keywordSearch.addEventListener("input", syncSearchQuery);
  if (keywordSearchClear) {
    keywordSearchClear.addEventListener("mousedown", (e) => {
      e.preventDefault();
    });
    keywordSearchClear.addEventListener("click", () => {
      keywordSearch.value = "";
      syncSearchQuery();
      keywordSearch.focus();
    });
  }
  syncSearchQuery();
  syncDistantSimilarityButton();
}

resize();
applyLockedTypeScales();
applyLockedCardTypeScales();
applyLockedIntroOffsets();
loadLandData();
scheduleIdleCoverPrefetch();
requestAnimationFrame(drawGlobe);
