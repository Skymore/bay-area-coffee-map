console.warn(
  "refresh-current-google-details.mjs 已停用：旧实现会在地址匹配失败时使用搜索结果第一项，可能写错分店。\n" +
  "正在转交给安全版 sync-google-ratings.mjs；默认只生成报告，显式传入 --apply 才会更新数据。"
);

await import("./sync-google-ratings.mjs");
