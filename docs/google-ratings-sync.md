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
