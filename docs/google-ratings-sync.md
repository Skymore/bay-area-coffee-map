# Google 评分与评价数同步

`scripts/sync-google-ratings.mjs` 使用 Google Places API (New) 获取门店的 `rating` 与
`userRatingCount`。默认仅生成审计报告，不修改站点数据。

## 准备

在 Google Cloud 项目中启用 Places API (New)。本地开发可把 Key 写入不会被 Git 跟踪的 `.env`：

```sh
GOOGLE_PLACES_API_KEY="..."
```

不要把 Key 写进仓库、命令行参数或报告文件。

## 推荐流程

先抽查一间门店：

```sh
npm run ratings:check -- --id=andytown
```

再生成全量报告：

```sh
npm run ratings:check
```

检查 `.verification/google-ratings-latest.json`。只有 `status: "matched"` 的记录才允许写入；
`needs-review`、`not-found` 和 `error` 不会更新。确认后执行：

```sh
npm run ratings:apply
```

首次成功匹配会写入 `.verification/google-place-ids.json`。之后脚本按 Place ID 获取，避免同名分店错配。
门店搬迁、改名或缓存错误时使用 `--refresh-place-ids` 重新解析。

每次实际发出的 Google API HTTP 请求（包括重试）都会累计到本地
`.verification/google-api-usage.json`，并在命令结束时显示本次和历史总调用数。该文件不会被 Git 跟踪。

## 常用选项

- `--id=ID`：只处理指定门店，可重复传入。
- `--limit=N`：只处理前 N 家，便于控制 API 成本。
- `--refresh-place-ids`：忽略 Place ID 缓存。
- `--min-score=0.72`：调整最低匹配分。
- `--min-margin=0.06`：调整第一、第二候选的最低分差。
- `--output=PATH`：指定审计报告路径。

评分和评价数是 Places API 的计费字段。批量运行前请检查 Google Cloud 配额与账单设置。

## 营业时间与周边设施

`scripts/sync-google-place-context.mjs` 为每家门店请求完整的
`regularOpeningHours`，并以门店坐标为中心执行一次 Nearby Search（默认半径
1200 米）。一次 Nearby Search 同时覆盖超市、杂货店、便利店、公交与轨道站、
加油站、学校、景点、博物馆和公园。最多保存最近的 5 个购物点、6 个交通点、
3 个加油站、3 所学校与 5 个景点；结果包含坐标、距离和标准 Google Maps URL，
供详情清单与地图高亮使用。

```sh
# 只生成审计报告
npm run context:check

# 写入 src/data.js
npm run context:apply

# 复用已有营业时间，只刷新附近地点（每家店一次请求）
npm run context:apply -- --nearby-only

# 删除 Google 标记为永久停业的门店及其图片、路线引用
npm run data:prune-closed
```

同步脚本使用明确的 Field Mask，不会把 API Key 写入前端或审计报告。调用数累计记录在
被 Git 忽略的 `.verification/google-api-usage.json`。
