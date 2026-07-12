import fs from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

async function loadSourceData() {
  try {
    const source = execFileSync("git", ["show", "HEAD:src/data.js"], { encoding: "utf8" });
    return import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
  } catch {
    return import(`${pathToFileURL("src/data.js").href}?t=${Date.now()}`);
  }
}

const { cafes, dataUpdatedAt, regionOptions, routes } = await loadSourceData();

const tagOptions = [
  { id: "all", label: "全部", icon: "sparkles" },
  { id: "serious", label: "认真喝", icon: "coffee" },
  { id: "roaster", label: "烘焙买豆", icon: "factory" },
  { id: "work", label: "工作久坐", icon: "laptop" },
  { id: "quiet", label: "安静短会", icon: "briefcase-business" },
  { id: "lively", label: "热闹人气", icon: "users" },
  { id: "neighborhood", label: "街区日常", icon: "map-pin" },
  { id: "pastry", label: "甜点面包", icon: "cookie" },
  { id: "brunch", label: "早午餐", icon: "sun" },
  { id: "outdoor", label: "户外散步", icon: "waves" },
  { id: "scenic", label: "风景顺路", icon: "sun" },
  { id: "quick", label: "快取转场", icon: "train-front" },
  { id: "late", label: "下午夜间", icon: "clock" },
  { id: "date", label: "聊天约会", icon: "sparkles" },
  { id: "specialty", label: "特色风味", icon: "flame" },
  { id: "heritage", label: "老派经典", icon: "coffee" }
];

const oldToNewTag = {
  roaster: "roaster",
  laptop: "work",
  community: "neighborhood",
  pastry: "pastry",
  scenic: "scenic",
  late: "late",
  transit: "quick"
};

const reviewLanguagePattern = /(Google Maps|评分|评价|评论|候选|入选|访客|常客|好评|差评|核验|反复出现|常提|常说|高频出现|门店类型|独立咖啡去处)/;

function norm(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

async function readJson(path) {
  try {
    return JSON.parse(await fs.readFile(path, "utf8"));
  } catch {
    return [];
  }
}

const evidenceRecords = [
  ...(await readJson(".verification/current-google-details.json")),
  ...(await readJson(".verification/selected-43-google-maps.json")),
  ...(await readJson(".verification/google-maps-candidate-pool.json"))
];

const evidenceById = new Map();
const evidenceByAddress = new Map();
for (const item of evidenceRecords) {
  if (item.id && !evidenceById.has(item.id)) evidenceById.set(item.id, item);
  if (item.address && !evidenceByAddress.has(norm(item.address))) evidenceByAddress.set(norm(item.address), item);
}

function evidenceFor(cafe) {
  return evidenceById.get(cafe.id) || evidenceByAddress.get(norm(cafe.address)) || null;
}

function sentenceFragments(text) {
  return String(text || "")
    .split(/[。；;]/)
    .map(item => item.trim())
    .filter(Boolean);
}

function cleanText(text) {
  return sentenceFragments(text)
    .filter(item => !reviewLanguagePattern.test(item))
    .map(item => item.replace(/；?$/, ""))
    .join("；");
}

function hasAny(text, terms) {
  return terms.some(term => text.includes(term));
}

function categoryText(detail) {
  return (detail?.categories || []).join(" ").toLowerCase();
}

function add(tags, tag) {
  if (!tags.includes(tag)) tags.push(tag);
}

function inferTags(cafe, detail) {
  const tags = [];
  const oldTags = new Set(cafe.tags || []);
  for (const tag of cafe.tags || []) add(tags, oldToNewTag[tag] || tag);

  const categories = categoryText(detail);
  const text = norm([
    cafe.name,
    cafe.city,
    cafe.neighborhood,
    cafe.address,
    cafe.signature,
    cafe.note,
    cafe.vibe,
    cafe.website,
    categories
  ].join(" "));

  if (
    oldTags.has("roaster") ||
    hasAny(text, ["roaster", "roasters", "roasted", "roasting", "beans", "bean", "烘焙", "买豆", "coffee store"])
  ) add(tags, "roaster");

  if (
    hasAny(text, [
      "single-origin",
      "single origin",
      "pour-over",
      "pour over",
      "filter",
      "flight",
      "tasting",
      "education",
      "lab",
      "specialty",
      "espresso tonic",
      "seasonal",
      "house-roasted",
      "fresh-roasted",
      "rotating",
      "认真喝",
      "产区",
      "手冲",
      "滤泡",
      "豆子"
    ])
  ) add(tags, "serious");

  if (
    oldTags.has("laptop") ||
    hasAny(text, ["laptop", "work", "working", "study", "remote", "电脑", "工作", "学习", "桌", "久坐", "坐一阵"])
  ) add(tags, "work");

  if (
    hasAny(text, ["quiet", "calm", "clean", "克制", "安静", "短会", "桌距", "空间大", "宽敞", "干净", "坐一阵"])
  ) add(tags, "quiet");

  if (
    hasAny(text, ["event", "events", "open mic", "live music", "bar", "活动", "热闹", "人气", "小聚", "聊天", "社区活动", "音乐", "周末早高峰"])
  ) add(tags, "lively");

  if (
    oldTags.has("community") ||
    hasAny(text, ["community", "neighborhood", "local", "downtown", "street", "district", "village", "社区", "街区", "本地", "日常", "老店"])
  ) add(tags, "neighborhood");

  if (
    oldTags.has("pastry") ||
    /bakery|dessert|pastry|bagel|cake|patisserie|toast|waffle|croissant/.test(text) ||
    hasAny(text, ["甜点", "面包", "烘焙", "点心", "吐司", "华夫", "蛋糕"])
  ) add(tags, "pastry");

  if (
    /breakfast|brunch|restaurant|plates|bites|cafe menu|casual plates|soda farl/.test(text) ||
    hasAny(text, ["早午餐", "早餐", "轻食", "餐点", "吃点东西"])
  ) add(tags, "brunch");

  if (
    oldTags.has("scenic") ||
    hasAny(text, ["ocean", "beach", "waterfront", "bridgeway", "ferry", "park", "garden", "courtyard", "patio", "sunset", "marin", "sausalito", "mill valley", "niles", "海", "水边", "公园", "散步", "庭院", "阳光", "山城"])
  ) add(tags, "outdoor");

  if (
    oldTags.has("scenic") ||
    hasAny(text, ["ocean", "beach", "waterfront", "bridgeway", "ferry", "park", "marin", "sausalito", "mill valley", "niles", "great highway", "风景", "海边", "水边", "散步", "周末开车"])
  ) add(tags, "scenic");

  if (
    oldTags.has("transit") ||
    hasAny(text, ["caltrain", "bart", "station", "transit", "fidi", "soma", "convention", "downtown", "kiosk", "window", "takeout", "takeout restaurant", "顺路", "转场", "快取", "带走", "赶路", "补给", "会议"])
  ) add(tags, "quick");

  if (
    oldTags.has("late") ||
    hasAny(text, ["late", "night", "evening", "bar", "open mic", "live music", "下午晚些", "晚上", "傍晚", "夜晚", "晚些"])
  ) add(tags, "late");

  if (
    hasAny(text, ["cozy", "warm", "cute", "romantic", "date", "聊天", "小聚", "约会", "暖灯", "温柔", "可爱", "庭院", "水边"]) ||
    (tags.includes("pastry") && tags.includes("neighborhood"))
  ) add(tags, "date");

  if (
    hasAny(text, [
      "yemeni",
      "qishr",
      "sanaa",
      "delah",
      "qamaria",
      "ethiopian",
      "venezuelan",
      "korean",
      "matcha",
      "tea",
      "boba",
      "kava",
      "alkaline",
      "tonic",
      "charcoal",
      "new orleans",
      "snowy plover",
      "creative",
      "tea house",
      "也门",
      "埃塞",
      "抹茶",
      "波霸",
      "茶饮",
      "特调",
      "创意",
      "水吧"
    ])
  ) add(tags, "specialty");

  if (
    hasAny(text, ["1951", "trieste", "caffè", "caffe", "classic", "historic", "history", "traditional", "italian", "nonprofit", "老牌", "经典", "历史", "活化石", "家族", "非营利", "意式"])
  ) add(tags, "heritage");

  if (!tags.includes("neighborhood")) add(tags, "neighborhood");
  if (tags.length < 3 && tags.includes("work")) add(tags, "quiet");
  if (tags.length < 3 && tags.includes("roaster")) add(tags, "serious");
  if (tags.length < 3) add(tags, "quick");

  const order = tagOptions.map(item => item.id);
  return [...new Set(tags)]
    .filter(tag => tag !== "all")
    .sort((a, b) => order.indexOf(a) - order.indexOf(b))
    .slice(0, 6);
}

const signatureReplacements = [
  [/single-origin coffee/gi, "单一产地咖啡"],
  [/single-origin/gi, "单一产地"],
  [/specialty coffee/gi, "精品咖啡"],
  [/alkaline water bar/gi, "碱性水吧"],
  [/pour-over/gi, "手冲"],
  [/filter coffee/gi, "滤泡咖啡"],
  [/espresso tonic/gi, "espresso tonic"],
  [/espresso/gi, "espresso"],
  [/house-roasted/gi, "自家烘焙"],
  [/fresh-roasted/gi, "现烘"],
  [/seasonal drinks/gi, "季节饮品"],
  [/seasonal/gi, "季节款"],
  [/tasting flight/gi, "品鉴 flight"],
  [/coffee education/gi, "咖啡品鉴"],
  [/cafe menu/gi, "咖啡馆餐单"],
  [/breakfast/gi, "早餐"],
  [/brunch/gi, "早午餐"],
  [/pastries/gi, "甜点"],
  [/baked goods/gi, "烘焙点心"],
  [/beans/gi, "咖啡豆"],
  [/latte/gi, "拿铁"],
  [/cold brew/gi, "冷萃"],
  [/matcha/gi, "抹茶"],
  [/boba/gi, "波霸"],
  [/tea/gi, "茶饮"],
  [/yemeni/gi, "也门"],
  [/ethiopian/gi, "埃塞"],
  [/venezuelan/gi, "委内瑞拉"],
  [/korean-inspired/gi, "韩式灵感"],
  [/\s*\/\s*/g, "、"]
];

function signatureText(signature) {
  let value = signature || "咖啡";
  for (const [pattern, replacement] of signatureReplacements) value = value.replace(pattern, replacement);
  return value
    .replace(/\s+([，、。；])/g, "$1")
    .replace(/([\u4e00-\u9fff])\s+([\u4e00-\u9fff])/g, "$1$2")
    .replace(/\s+/g, " ")
    .trim();
}

function inlineSignature(signature) {
  const prefix = /^[A-Za-z0-9]/.test(signature) ? " " : "";
  const suffix = /[A-Za-z0-9]$/.test(signature) ? " " : "";
  return `${prefix}${signature}${suffix}`;
}

function noteFor(cafe, tags) {
  const place = cafe.neighborhood || cafe.city;
  if (tags.includes("outdoor") || tags.includes("scenic")) {
    return `${place} 一带适合慢走，把咖啡和附近街区一起安排会更顺。`;
  }
  if (tags.includes("work") || tags.includes("quiet")) {
    return `${place} 适合留出一段坐下来的时间，不只是路过买一杯。`;
  }
  if (tags.includes("pastry") || tags.includes("brunch")) {
    return `${place} 的咖啡加点心/轻食型停靠，适合早午间或下午补一站。`;
  }
  if (tags.includes("quick")) {
    return `${place} 的顺路补给点，适合在转场时快速拿到一杯靠谱咖啡。`;
  }
  return `${place} 的街区咖啡点，适合按当天节奏顺路停一下。`;
}

function angleFor(cafe, tags) {
  const place = cafe.neighborhood || cafe.city;
  if (tags.includes("heritage")) {
    return `我会把它当成有故事的一站：不只是买咖啡，更适合坐下来感受 ${place} 的老派气质。`;
  }
  if (tags.includes("outdoor") || tags.includes("scenic")) {
    return `我会给它多留十几分钟，不急着带走，喝完顺着 ${place} 走一段会更舒服。`;
  }
  if (tags.includes("work") && tags.includes("quiet")) {
    return `我会把它留给需要打开电脑或聊一个短会的下午，节奏比纯打卡店稳定。`;
  }
  if (tags.includes("pastry") || tags.includes("brunch")) {
    return `我会把它当作“咖啡顺便吃点东西”的选择，空腹来比只外带一杯更划算。`;
  }
  if (tags.includes("lively") || tags.includes("date")) {
    return `我会选它来聊天或碰头，氛围比纯工作店更松，忙时也更有生活气。`;
  }
  if (tags.includes("quick")) {
    return `我会在转场时用它补一杯，目标很简单：少绕路、出杯稳、拿了继续走。`;
  }
  if (tags.includes("roaster") || tags.includes("serious")) {
    return `我会从基础款点起，先试豆子和萃取，再决定要不要顺手带豆回去。`;
  }
  return `我会把它放进附近行程里，不需要专门赶时间，适合按当天状态决定坐多久。`;
}

function fallbackIntroFor(cafe, tags) {
  const place = cafe.neighborhood || cafe.city;
  if (tags.includes("specialty")) {
    return `${place} 的菜单更有辨识度，适合想换一种风味、不要只喝常规拿铁的时候。`;
  }
  if (tags.includes("roaster") || tags.includes("serious")) {
    return `${place} 里的认真咖啡点，适合不想只喝连锁味道、愿意多看一眼菜单的时候。`;
  }
  if (tags.includes("pastry") || tags.includes("brunch")) {
    return `${place} 的节奏更像咖啡加点心的小停靠，坐下来吃点东西会比纯外带更完整。`;
  }
  if (tags.includes("work") || tags.includes("quiet")) {
    return `${place} 这一站更适合坐下来处理事情，空间感比纯快取店更重要。`;
  }
  if (tags.includes("quick")) {
    return `${place} 的位置适合转场补咖啡，不需要专门绕远也能喝到稳定的一杯。`;
  }
  return `${place} 的街区咖啡点，适合按当天节奏顺路停一下。`;
}

function copyFor(cafe, tags) {
  const original = cleanText(cafe.vibe);
  const note = cleanText(cafe.note);
  const intro = original || note || fallbackIntroFor(cafe, tags);
  const angle = angleFor(cafe, tags);
  const signature = signatureText(cafe.signature);
  const signaturePhrase = inlineSignature(signature);
  const closing = tags.includes("specialty")
    ? `想喝出记忆点，可以从${signaturePhrase}下手；这类店的乐趣在于菜单比普通咖啡馆更有个性。`
    : tags.includes("roaster") || tags.includes("serious")
      ? `想认真喝就从${signaturePhrase}开始；如果时间够，顺手看看豆子或季节菜单。`
      : `点单可以从${signaturePhrase}开始，搭配它的场景感会比只看分数更有参考。`;

  return [intro.endsWith("。") ? intro : `${intro}。`, angle, closing].join("");
}

const enrichedCafes = cafes.map(cafe => {
  const detail = evidenceFor(cafe);
  const tags = inferTags(cafe, detail);
  return {
    ...cafe,
    tags,
    note: noteFor(cafe, tags),
    vibe: copyFor(cafe, tags)
  };
});

const tagCounts = Object.fromEntries(
  tagOptions
    .filter(tag => tag.id !== "all")
    .map(tag => [tag.id, enrichedCafes.filter(cafe => cafe.tags.includes(tag.id)).length])
);

const body = `export const dataUpdatedAt = ${JSON.stringify(dataUpdatedAt)};\n\n` +
  `export const cafes = ${JSON.stringify(enrichedCafes, null, 2)};\n\n` +
  `export const regionOptions = ${JSON.stringify(regionOptions, null, 2)};\n\n` +
  `export const tagOptions = ${JSON.stringify(tagOptions, null, 2)};\n\n` +
  `export const routes = ${JSON.stringify(routes, null, 2)};\n`;

await fs.writeFile("src/data.js", body);
await fs.writeFile(
  ".verification/tag-enrichment-summary.json",
  `${JSON.stringify({
    enrichedAt: new Date().toISOString(),
    cafes: enrichedCafes.length,
    tagOptions: tagOptions.length - 1,
    tagCounts,
    evidenceRecords: evidenceRecords.length,
    sourceFiles: [
      ".verification/current-google-details.json",
      ".verification/selected-43-google-maps.json",
      ".verification/google-maps-candidate-pool.json",
      "src/data.js website/ratingSource fields"
    ]
  }, null, 2)}\n`
);

console.log(JSON.stringify({ cafes: enrichedCafes.length, tagCounts }, null, 2));
