import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const results = [];

async function check(name, viewport) {
  const page = await browser.newPage({ viewport });
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", message => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", error => pageErrors.push(error.message));

  await page.goto("http://127.0.0.1:5173", { waitUntil: "networkidle" });
  await page.locator(".coffee-marker").first().waitFor();

  const initialCount = await page.locator(".cafe-card").count();
  await page.locator("#searchInput").fill("Ritual");
  await page.waitForTimeout(500);
  const searchCount = await page.locator(".cafe-card").count();
  await page.locator(".cafe-card").first().click();
  await page.locator(".map-detail-panel h2").waitFor();
  await Promise.all([".cafe-card img", ".map-detail-panel img"].map(selector =>
    page.locator(selector).first().scrollIntoViewIfNeeded()
  ));
  await Promise.all([".cafe-card img", ".map-detail-panel img"].map(selector =>
    page.locator(selector).first().evaluate(img => {
      if (img.complete && img.naturalWidth > 0) return;
      return new Promise(resolve => {
        img.addEventListener("load", resolve, { once: true });
        img.addEventListener("error", resolve, { once: true });
      });
    })
  ));
  const detailTitle = await page.locator(".map-detail-panel h2").textContent();
  await page.screenshot({ path: `.checks/${name}-latest.png`, fullPage: false });

  await page.locator(".coffee-marker").first().click();
  await page.locator(".leaflet-popup-content h2").waitFor();
  await page.waitForTimeout(800);
  const popupTitle = await page.locator(".leaflet-popup-content h2").textContent();

  results.push({
    name,
    initialCount,
    searchCount,
    detailTitle,
    popupTitle,
    markers: await page.locator(".coffee-marker").count(),
    consoleErrors,
    pageErrors,
    viewport: await page.evaluate(() => ({
      bodyWidth: document.body.scrollWidth,
      viewportWidth: window.innerWidth,
      bodyHeight: document.body.scrollHeight,
      viewportHeight: window.innerHeight
    }))
  });
  await page.close();
}

if (process.env.TARGET !== "mobile") {
  await check("desktop", { width: 1440, height: 900 });
}
if (process.env.TARGET !== "desktop") {
  await check("mobile", { width: 390, height: 844 });
}

console.log(JSON.stringify(results, null, 2));
await browser.close();
