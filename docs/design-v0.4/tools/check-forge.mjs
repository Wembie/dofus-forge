import { chromium, expect } from "@playwright/test";
import fs from "node:fs";
fs.mkdirSync("docs/design-v0.4/captures/forjadora", { recursive: true });
fs.mkdirSync("docs/design-v0.4/checks", { recursive: true });
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
for (const [name, width, height] of [
  ["desktop", 1440, 900],
  ["mobile", 390, 844],
]) {
  const context = await browser.newContext({ viewport: { width, height } }),
    page = await context.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await context.addInitScript(() =>
    localStorage.setItem(
      "dofus-forge:optimizer-config",
      JSON.stringify({
        defaultsRev: 2,
        intensity: "quick",
        stats: [
          { stat: "ap", minimum: 9, weight: 500, cap: 12, strictCap: false },
          { stat: "mp", minimum: 5, weight: 500, cap: 6, strictCap: false },
          {
            stat: "strength",
            minimum: 300,
            weight: 5,
            cap: null,
            strictCap: false,
          },
        ],
      }),
    ),
  );
  await page.goto("http://127.0.0.1:4404/", { waitUntil: "networkidle" });
  const baseline = await page
    .locator(".stats-panel .metric strong")
    .allTextContents();
  await page.getByRole("button", { name: "La Forjadora", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "La Forjadora" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Qué quieres mejorar", exact: true }),
  ).toBeVisible();
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: `docs/design-v0.4/captures/forjadora/order-${name}.png` });
  const geometry = await page
    .locator(".fg-dialog")
    .evaluate((e) => ({
      width: e.clientWidth,
      scrollWidth: e.scrollWidth,
      bodyWidth: e.querySelector(".fg-body").clientWidth,
      bodyScrollWidth: e.querySelector(".fg-body").scrollWidth,
    }));
  const controls = await page
    .getByRole("dialog")
    .locator("button,input,select")
    .count();
  if (name === "desktop") {
    await page
      .getByRole("button", { name: "Encender la fragua", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Templar ahora", exact: true }),
    ).toBeEnabled({ timeout: 60000 });
    await page.waitForLoadState("networkidle");
  await page.screenshot({
      path: "docs/design-v0.4/captures/forjadora/running-desktop.png",
    });
    await page
      .getByRole("button", { name: "Templar ahora", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Reforjar", exact: true }),
    ).toBeVisible({ timeout: 45000 });
    await page.waitForLoadState("networkidle");
  await page.screenshot({
      path: "docs/design-v0.4/captures/forjadora/results-desktop.png",
    });
    const load = page
      .getByRole("button", { name: /^Cargar este build/ })
      .first();
    const resultCount = await page
      .getByRole("button", { name: /^Cargar este build/ })
      .count();
    await expect(load).toBeVisible();
    await load.click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    const after = await page
      .locator(".metric.maxHp strong")
      .first()
      .textContent();
    await page.getByRole("button", { name: "Deshacer", exact: true }).click();
    await expect
      .poll(() => page.locator(".stats-panel .metric strong").allTextContents())
      .toEqual(baseline);
    results.push({
      name,
      geometry,
      controls,
      resultCount,
      appliedHp: after,
      undoRestored: true,
      errors,
    });
  } else {
    await page
      .getByRole("button", { name: "Volver al taller", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    results.push({ name, geometry, controls, errors });
  }
  await context.close();
}
await browser.close();
fs.writeFileSync(
  "docs/design-v0.4/checks/forge.json",
  JSON.stringify(results, null, 2),
);
console.log(JSON.stringify(results, null, 2));
if (
  results.some(
    (r) =>
      r.errors.length ||
      r.geometry.scrollWidth > r.geometry.width ||
      r.geometry.bodyScrollWidth > r.geometry.bodyWidth,
  )
)
  process.exitCode = 1;
