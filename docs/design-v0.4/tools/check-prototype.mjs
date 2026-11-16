import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";
const browser = await chromium.launch({
  headless: true,
  args: [
    "--enable-webgl",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const results = [];
fs.mkdirSync("docs/design-v0.4/evidence", { recursive: true });
for (const [name, width, height] of [
  ["desktop", 1440, 900],
  ["laptop", 1366, 900],
  ["tablet", 768, 1024],
  ["mobile", 390, 844],
  ["small-mobile", 360, 800],
]) {
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:4404/", { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  await page.screenshot({
    path: `docs/design-v0.4/workshop-3d-${name}.png`,
    fullPage: true,
  });
  const geometry = await page.evaluate(() => ({
    width: innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    canvasCount: document.querySelectorAll("canvas").length,
    canvasVisible: document.querySelector("canvas")?.style.opacity === "1",
    height: document.documentElement.scrollHeight,
    brokenImages: [...document.images]
      .filter((i) => !i.complete || !i.naturalWidth)
      .map((i) => i.src),
  }));
  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  if (width < 1080)
    await page
      .getByRole("button", { name: "Estadísticas", exact: true })
      .click();
  await page
    .getByRole("button", { name: "Ficha completa", exact: true })
    .click();
  const statCount = await page.locator(".all-stats .stat-entry").count();
  const sheetHeight = await page.evaluate(
    () => document.documentElement.scrollHeight,
  );
  await page.screenshot({
    path: `docs/design-v0.4/evidence/all-stats-${name}.png`,
    fullPage: true,
  });
  await page
    .getByRole("textbox", { name: "Buscar una estadística" })
    .fill("Retiro");
  const searchCount = await page.locator(".all-stats .stat-entry").count();
  await page
    .getByRole("button", { name: "Volver al taller", exact: true })
    .click();
  if (width < 1080)
    await page.getByRole("button", { name: "Equipo", exact: true }).click();
  await page.getByRole("button", { name: /^Anillo I:/ }).click();
  await page.getByRole("button", { name: "Quitar y ver el cambio" }).click();
  const removed = await page.locator(".slot.empty").count();
  await page.getByRole("button", { name: "Deshacer", exact: true }).click();
  const restored = await page.locator(".slot.empty").count();
  await page.getByRole("button", { name: /^Sombrero:/ }).click();
  await page.keyboard.press("Escape");
  const focusReturned = await page
    .getByRole("button", { name: /^Sombrero:/ })
    .evaluate((e) => e === document.activeElement);
  await page
    .getByRole("button", { name: "Guardar borrador", exact: true })
    .click();
  await page.reload({ waitUntil: "networkidle" });
  const restoredAfterReload = await page.locator(".slot.empty").count();
  await page.getByRole("button", { name: "Tema mineral" }).click();
  await page.waitForTimeout(300);
  const lightAxe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  if (name === "desktop")
    await page.screenshot({
      path: "docs/design-v0.4/workshop-mineral-desktop.png",
      fullPage: true,
    });
  results.push({
    name,
    geometry,
    viewportHeight: height,
    statCount,
    sheetHeight,
    searchCount,
    removed,
    restored,
    focusReturned,
    restoredAfterReload,
    errors,
    accessibilityDark: axe.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      nodes: v.nodes.map((n) => ({
        target: n.target,
        summary: n.failureSummary,
      })),
    })),
    accessibilityLight: lightAxe.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      nodes: v.nodes.map((n) => ({
        target: n.target,
        summary: n.failureSummary,
      })),
    })),
  });
  await context.close();
}
await browser.close();
fs.writeFileSync(
  "docs/design-v0.4/prototype-check.json",
  JSON.stringify(results, null, 2),
);
console.log(
  JSON.stringify(
    results.map(({ accessibilityDark, accessibilityLight, ...r }) => ({
      ...r,
      accessibilityDark: accessibilityDark.map((v) => v.id),
      accessibilityLight: accessibilityLight.map((v) => v.id),
    })),
    null,
    2,
  ),
);
if (
  results.some(
    (r) =>
      r.errors.length ||
      (r.geometry.width >= 1080 && r.sheetHeight > r.viewportHeight) ||
      r.geometry.scrollWidth > r.geometry.width ||
      r.geometry.brokenImages.length ||
      r.geometry.canvasCount !== 1 ||
      !r.geometry.canvasVisible ||
      r.statCount !== 73 ||
      r.searchCount !== 2 ||
      r.removed !== 1 ||
      r.restored !== 0 ||
      !r.focusReturned ||
      r.accessibilityDark.length ||
      r.accessibilityLight.length,
  )
)
  process.exitCode = 1;
