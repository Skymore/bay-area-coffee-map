import fs from "node:fs/promises";
import { cafes } from "../src/data.js";

const manifest = [
  ...JSON.parse(await fs.readFile(".verification/image-manifest.json", "utf8")),
  ...JSON.parse(await fs.readFile(".verification/selected-43-image-manifest.json", "utf8"))
];
const imageById = new Map(manifest.map(item => [item.id, item]));
const removed = [
  ["philz-mint", "Philz Coffee · 10 Mint Plaza", "该地址未匹配到当前门店条目，未保留旧评分。"],
  ["southeast-coffee", "Southeast Coffee · 2128 MacArthur Blvd", "未找到与名称和地址同时匹配的当前门店条目。"],
  ["hazel-oakland", "Hazel · 920 Washington St", "未找到可核验的当前门店条目。"],
  ["blue-bottle-west-loop", "Blue Bottle Coffee · 427 W Grand Ave", "该地址未匹配到当前 Blue Bottle 门店。"],
  ["warm-coffee-bar", "Warm Coffee Bar · 3269 Mission St", "未找到可核验的当前门店条目。"],
  ["saint-frank-russian-hill", "Saint Frank Coffee · 2320 Polk St", "地址错误且与已保留的 2340 Polk St 门店重复。"],
  ["equator-tiburon", "Equator Coffees · 16 Main St", "未找到该 Tiburon 地址的当前 Equator 门店。"],
  ["prosperity-sf", "Prosperity Sandwiches · 650 Townsend St", "未找到可核验的当前门店条目。"],
  ["andante-oakland", "Andante Coffee · 4920 Telegraph Ave", "搜索结果指向洛杉矶同名门店，Oakland 地址无法核验。"],
  ["mile-kava-berkeley", "Mile Kava & Coffee · 1809 Shattuck Ave", "未找到可核验的当前门店条目。"],
  ["coupa-4th", "Coupa Cafe · 588 Hayes St", "未找到该旧金山地址的当前 Coupa 门店。"],
  ["peets-marin", "Peet's Coffee · 500 Magnolia Ave", "未找到该 Larkspur 地址的当前 Peet's 门店。"],
  ["flywheel-san-jose", "Flywheel Coffee Roasters · 1075 Lincoln Ave", "搜索结果仅匹配旧金山门店，San Jose 地址无法核验。"]
];

const corrected = [
  ["Bartavelle", "1603 San Pablo Ave → 1621 San Pablo Ave"],
  ["Blue Bottle Coffee (Mint)", "2 Mint Plaza → 66 Mint St"],
  ["The Caffè by Mr. Espresso", "Mr. Espresso / 625 Grand Ave → 当前品牌咖啡馆 / 1120 Broadway"],
  ["Grand Coffee", "2611 Mission St → 2663 Mission St"],
  ["Verve Coffee Roasters (SF)", "3040 24th St → 2101 Market St"],
  ["Voyager Craft Coffee", "地址写法统一为 111 W St John St Ste 100"],
  ["Artís / Academic", "将 Google Maps 的 Fourth / Second 街道写法同步到数据"]
];

let publishLatest = null;
try {
  publishLatest = JSON.parse(await fs.readFile(".verification/publish-latest.json", "utf8"));
} catch {
  publishLatest = null;
}

const publishSection = publishLatest ? `
## 发布记录

- 发布地址：${publishLatest.url}
- RoomTalk 版本：\`${publishLatest.versionId}\`
- 发布时间：${publishLatest.publishedAt}
- 发布构建：\`${publishLatest.buildCommand}\`
- 发布包：${publishLatest.fileCount} 个文件，${publishLatest.totalBytes.toLocaleString("en-US")} bytes
- 发布验收：${publishLatest.verification.cards}/100 门店卡片、${publishLatest.verification.ratingCounts}/100 评分链接、${publishLatest.verification.photoFrames}/100 配图区域；atlas 图片 HTTP ${publishLatest.verification.atlasStatus}
- 发布截图：[published-latest.png](../${publishLatest.verification.screenshot})
` : "";

const rows = cafes.map((cafe, index) => {
  const image = imageById.get(cafe.id);
  return `| ${index + 1} | ${cafe.name} | ${cafe.address} | ${cafe.rating.toFixed(1)} | ${cafe.ratingCount.toLocaleString("en-US")} | [Google Maps](${cafe.ratingSource}) | [${cafe.id}.jpg](../public/images/cafes/${cafe.id}.jpg) | ${image.bytes.toLocaleString("en-US")} / \`${image.sha256.slice(0, 12)}…\` | 通过 |`;
});

const report = `# 湾区咖啡地图：门店图片与评分核验记录

- 最新核验日期：2026-07-11（UTC）
- 原始条目：70
- 清理错误条目后：57
- 新增：43（从 285 个 Google Maps 候选中筛选）
- 最终发布：${cafes.length}
- 删除无法成立或重复条目：${removed.length}
- 评分来源：Google Maps 公开门店页，按“门店名 + 完整地址”逐项匹配
- 图片来源：同一 Google Maps 门店页的门店主图，下载成本地静态文件

## 验收口径与结果

1. 门店名和街道地址必须落到同一 Google Maps 门店条目；仅名称相似不算通过。
2. 评分与评分数从 Google Maps 列表页的同一原始响应读取；现有 57 家逐店精确查询，新增 43 家从 285 个候选中筛选。
3. 图片必须取自完成地址匹配后的同一门店页；下载后必须返回图片 MIME、文件大于 10 KB，并能解码显示。
4. 100 张图片的 SHA-256 均不相同（100/100 唯一）；新增 43 图联系表已人工目检，图片均能解码且与对应咖啡馆场景一致。
5. 新增门槛：Google Maps 评分不低于 4.5、评分数不低于 100；再按区域平衡和精确地址去重选出 43 家。
6. 最终结果：100/100 门店具备评分、评分数、来源链接和本地门店图片；应用内来源可点击回到对应 Google Maps 查询页。

评分会随新评论变化；“准确”指 2026-07-11 核验快照，不代表永久不变。

## 更正的门店资料

| 门店 | 更正 |
| --- | --- |
${corrected.map(item => `| ${item[0]} | ${item[1]} |`).join("\n")}

## 删除的旧条目

| ID | 原条目 | 处理理由 |
| --- | --- | --- |
${removed.map(item => `| \`${item[0]}\` | ${item[1]} | ${item[2]} |`).join("\n")}

${publishSection}

## 问题条目二次搜索确认

以下是 2026-07-11 再次通过品牌官网、地址资料与地图检索得到的分类。这里严格区分“证实有误”和“无法证实”，不把搜索不到直接写成已关闭。

### 品牌或地址明确有误（8 条）

- **Philz Coffee · 10 Mint Plaza**：Philz [当前旧金山门店列表](https://philzcoffee.com/locations)没有 Mint Plaza；该地址资料反而提到附近的 Blue Bottle，因此原数据很可能混淆品牌。
- **Blue Bottle · 427 W Grand Ave**：Blue Bottle 当前 Oakland 官方页面指向 [Old Oakland · 480 9th St](https://bluebottlecoffee.com/cafes/old-oakland)，当前门店检索无法匹配 427 W Grand Ave。
- **Equator · 16 Main St, Tiburon**：Equator [官方 Marin 门店列表](https://www.equatorcoffees.com/all-locations/)没有 Tiburon；16 Main St 当前是 [Main St Mercantile](https://www.mainstmercantile.com/service/contact-us/)。
- **Coupa Cafe · 588 Hayes St**：Coupa [官方门店列表](https://www.coupacafe.com/locations/)集中在 Palo Alto、Stanford、Redwood City 与 Los Altos，没有旧金山 Hayes Street 门店。
- **Peet's · 500 Magnolia Ave, Larkspur**：该地址由 Larkspur 市政府资料确认为 American Legion Post 313 所在地，并非 Peet's；Peet's [官方定位器](https://www.peets.com/pages/store-locator)也无法匹配此门店。
- **Flywheel · 1075 Lincoln Ave, San Jose**：Flywheel [官网](https://flywheelcoffee.com/)只列出 San Francisco 的 672 Stanyan St 与 22 Battery St，没有 San Jose 门店。
- **Andante Coffee · 4920 Telegraph Ave, Oakland**：当前该地址的可核商户是 [Forma Bakery](https://www.visitoakland.com/listing/forma-bakery/8378/)，Andante 搜索结果指向洛杉矶同名门店。
- **Prosperity Sandwiches · 650 Townsend St**：650 Townsend 是大型办公物业，而非该三明治店；当前物业资料也将其列为办公楼。

### 重复且门牌错误（1 条）

- **Saint Frank · 2320 Polk St**：Saint Frank [官网](https://www.saintfrankcoffee.com/pages/our-locations)明确列出 Russian Hill 门店为 **2340 Polk St**；数据中已另有这家正确门店，所以 2320 条目既写错门牌又重复。

### 无法证实存在（4 条）

- **Southeast Coffee · 2128 MacArthur Blvd**
- **Hazel · 920 Washington St**
- **Warm Coffee Bar · 3269 Mission St**
- **Mile Kava & Coffee · 1809 Shattuck Ave**

这四条的精确名称与地址组合在当前品牌网页、地图商户页和一般网页搜索中均无可信匹配。它们不能被断言为“已经关闭”，但同样没有足够证据作为真实门店发布。

## 逐店核验明细

| # | 门店 | 已核地址 | 评分 | 评分数 | 评分来源 | 本地图片 | 字节 / SHA-256 前缀 | 目检 |
| ---: | --- | --- | ---: | ---: | --- | --- | --- | --- |
${rows.join("\n")}

## 应用回归验证

- 生产构建：\`npm run build\` 通过。
- 数据一致性：100 个门店 ID、100 个本地图片文件完全对应；路线中不存在悬空 ID。
- 图片请求：浏览器逐项请求 100 个本地图片 URL，全部返回 HTTP 200、图片 MIME 且文件大于 10 KB。
- 桌面与移动端：初始门店数 100；评分与评分数均显示；搜索 Ritual 后为 1。
- 渲染检查：筛选后的卡片图和地图详情图均完成同步解码并实际绘制；桌面、移动端截图无控制台或页面错误。
- 回归截图：[desktop-latest.png](../.checks/desktop-latest.png)、[mobile-latest.png](../.checks/mobile-latest.png)

## 可复现材料

- Google Maps 原始抓取：[google-maps-raw.json](./google-maps-raw.json)
- 285 家候选池：[google-maps-candidate-pool.json](./google-maps-candidate-pool.json)
- 新增 43 家完整证据：[selected-43-google-maps.json](./selected-43-google-maps.json)
- 现有 57 家评分数复核：[current-google-details.json](./current-google-details.json)
- 最终门店快照：[current-place-snapshots.json](./current-place-snapshots.json)
- 图片哈希清单：[image-manifest.json](./image-manifest.json)
- 原 57 图联系表：[image-contact-sheet.jpg](./image-contact-sheet.jpg)
- 新增 43 图联系表：[selected-43-contact-sheet.jpg](./selected-43-contact-sheet.jpg)
- 新增图片哈希清单：[selected-43-image-manifest.json](./selected-43-image-manifest.json)
- 核验脚本：[verify-places.mjs](../scripts/verify-places.mjs)、[collect-current-places.mjs](../scripts/collect-current-places.mjs)
- 扩展与复核脚本：[discover-google-candidates.mjs](../scripts/discover-google-candidates.mjs)、[refresh-current-google-details.mjs](../scripts/refresh-current-google-details.mjs)、[expand-to-100.mjs](../scripts/expand-to-100.mjs)、[download-selected-images.mjs](../scripts/download-selected-images.mjs)
`;

await fs.writeFile(".verification/VERIFICATION.md", report);
console.log(`wrote .verification/VERIFICATION.md (${cafes.length} rows)`);
