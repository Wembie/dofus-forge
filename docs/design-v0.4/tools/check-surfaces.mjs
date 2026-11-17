import { chromium, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";
fs.mkdirSync("docs/design-v0.4/checks", { recursive: true });
fs.mkdirSync("docs/design-v0.4/captures/vistas", { recursive: true });
fs.mkdirSync("docs/design-v0.4/evidence/surfaces", { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: [
    "--enable-webgl",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const mineral = process.argv.includes("--mineral");
const results = [];
for (const [device, width, height] of [
  ["desktop", 1440, 900],
  ["mobile", 390, 844],
]) {
  const context = await browser.newContext({ viewport: { width, height } }),
    page = await context.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:4404/surfaces.html", {
    waitUntil: "networkidle",
  });
  if (mineral)
    await page
      .getByRole("button", { name: "Cambiar tema", exact: true })
      .click();
  const views = await page
    .locator('[aria-label="Vista del producto"] option')
    .evaluateAll((nodes) => nodes.map((n) => n.value));
  for (const view of views) {
    await page
      .getByLabel("Vista del producto", { exact: true })
      .selectOption(view);
    await page.waitForTimeout(
      view === "class" || view === "build" || view === "builder" ? 1000 : 100,
    );
    const geometry = await page.evaluate(() => ({
      width: innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    const axe = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .exclude("iframe")
      .analyze();
    await page.screenshot({
      path: `docs/design-v0.4/evidence/surfaces/${mineral ? "mineral-" : ""}${view}-${device}.png`,
    });
    results.push({
      device,
      kind: "page",
      id: view,
      geometry,
      violations: axe.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      })),
      errors: [...errors],
    });
    errors.length = 0;
    console.log(
      device,
      "page",
      view,
      geometry.scrollWidth,
      axe.violations.map((v) => v.id),
    );
  }
  await page
    .getByLabel("Vista del producto", { exact: true })
    .selectOption("explore");
  const dialogIds = await page
    .locator('[aria-label="Abrir diálogo de revisión"] option')
    .evaluateAll((nodes) => nodes.map((n) => n.value).filter(Boolean));
  for (const id of dialogIds) {
    const trigger = page.getByLabel("Abrir diálogo de revisión", {
      exact: true,
    });
    await trigger.focus();
    await trigger.selectOption(id);
    await expect(page.getByRole("dialog")).toBeVisible();
    const geometry = await page
      .getByRole("dialog")
      .evaluate((e) => ({
        width: e.clientWidth,
        scrollWidth: e.scrollWidth,
        contentWidth: e.querySelector(".surface-dialog-content").clientWidth,
        contentScrollWidth: e.querySelector(".surface-dialog-content")
          .scrollWidth,
      }));
    const axe = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    await page.screenshot({
      path: `docs/design-v0.4/evidence/surfaces/${mineral ? "mineral-" : ""}dialog-${id}-${device}.png`,
    });
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    results.push({
      device,
      kind: "dialog",
      id,
      geometry,
      focusReturned: await trigger.evaluate(
        (e) => e === document.activeElement,
      ),
      violations: axe.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      })),
      errors: [...errors],
    });
    errors.length = 0;
    console.log(
      device,
      "dialog",
      id,
      geometry.scrollWidth,
      axe.violations.map((v) => v.id),
    );
  }
  for (const state of [
    "empty",
    "loading",
    "error",
    "signed-out",
    "forbidden",
    "missing",
  ]) {
    await page
      .getByLabel("Estado de la vista", { exact: true })
      .selectOption(state);
    await page.screenshot({
      path: `docs/design-v0.4/evidence/surfaces/${mineral ? "mineral-" : ""}state-${state}-${device}.png`,
    });
    results.push({
      device,
      kind: "state",
      id: state,
      geometry: await page.evaluate(() => ({
        width: innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
      })),
      errors: [...errors],
    });
    errors.length = 0;
  }
  await context.close();
}
// Committed captures of the build cards: they wait for the character stills.
if (!mineral)
  for (const [device, width, height] of [
    ["desktop", 1440, 900],
    ["mobile", 390, 844],
  ]) {
    const context = await browser.newContext({ viewport: { width, height } }),
      page = await context.newPage();
    await page.goto("http://127.0.0.1:4404/surfaces.html?view=explore", {
      waitUntil: "networkidle",
    });
    await page.waitForFunction(
      () =>
        document.querySelectorAll(".sheet-figure").length > 0 &&
        !document.querySelector(".sheet-figure.is-portrait"),
      null,
      { timeout: 20000 },
    );
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(400);
    await page.screenshot({
      path: `docs/design-v0.4/captures/vistas/explore-${device}.png`,
      fullPage: true,
    });
    await context.close();
  }
await browser.close();
fs.writeFileSync(
  `docs/design-v0.4/checks/surfaces${mineral ? "-mineral" : ""}.json`,
  JSON.stringify(results, null, 2),
);
if (
  results.some(
    (r) =>
      r.errors.length ||
      r.geometry.scrollWidth > r.geometry.width ||
      r.geometry.contentScrollWidth > r.geometry.contentWidth ||
      r.violations?.length ||
      r.focusReturned === false,
  )
)
  process.exitCode = 1;
