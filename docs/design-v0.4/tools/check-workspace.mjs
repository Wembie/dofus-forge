import { chromium, expect } from "@playwright/test";
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
const wanted = process.argv
  .find((a) => a.startsWith("--only="))
  ?.slice(7)
  .split(",");
const results = [];
fs.mkdirSync("docs/design-v0.4/evidence/workspace", { recursive: true });
for (const [device, width, height] of [
  ["desktop", 1440, 900],
  ["mobile", 390, 844],
]) {
  const context = await browser.newContext({ viewport: { width, height } }),
    page = await context.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:4404/", { waitUntil: "networkidle" });
  const tools = [
    ["characteristics", "Distribuir características"],
    ["passives", "Pasivos de combate"],
    ["spells", "Hechizos y arma"],
    ["pvp", "Simular un combate"],
    ["sets", "Panoplias"],
    ["bonuses", "Bonificaciones de panoplia"],
    ["compare", "Comparar dos builds"],
    ["share", "Compartir y exportar"],
  ];
  for (const [id, label] of tools) {
    if (wanted && !wanted.includes(device + ":" + id)) continue;
    const trigger = page.getByRole("button", { name: label, exact: true });
    await trigger.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.waitForTimeout(id === "spells" ? 1200 : 200);
    const geometry = await page.getByRole("dialog").evaluate((e) => {
      const content =
        e.querySelector(".surface-dialog-content") ||
        e.querySelector(".catalog-panel") ||
        e;
      return {
        width: innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        contentWidth: content.clientWidth,
        contentScrollWidth: content.scrollWidth,
      };
    });
    const axe = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    await page.screenshot({
      path: `docs/design-v0.4/evidence/workspace/${id}-${device}.png`,
    });
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    results.push({
      device,
      id,
      geometry,
      focusReturned: await trigger.evaluate(
        (e) => e === document.activeElement,
      ),
      errors: [...errors],
      violations: axe.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      })),
    });
    errors.length = 0;
    console.log(
      device,
      id,
      geometry,
      axe.violations.map((v) => v.id),
    );
  }
  for (const [id, action] of [
    ["catalog", "Cambiar objeto"],
    ["runes", "Editar runas"],
  ]) {
    if (wanted && !wanted.includes(device + ":" + id)) continue;
    await page.getByRole("button", { name: /^Sombrero:/ }).click();
    await page.getByRole("button", { name: action, exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.waitForTimeout(400);
    const geometry = await page.getByRole("dialog").evaluate((e) => {
      const content = e.querySelector(".catalog-panel") || e;
      return {
        width: innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        contentWidth: content.clientWidth,
        contentScrollWidth: content.scrollWidth,
      };
    });
    const axe = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    await page.screenshot({
      path: `docs/design-v0.4/evidence/workspace/${id}-${device}.png`,
    });
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    results.push({
      device,
      id,
      geometry,
      errors: [...errors],
      violations: axe.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      })),
    });
    errors.length = 0;
    console.log(
      device,
      id,
      geometry,
      axe.violations.map((v) => v.id),
    );
  }
  await context.close();
}
await browser.close();
const report = wanted
  ? [
      ...JSON.parse(
        fs.readFileSync("docs/design-v0.4/workspace-check.json", "utf8"),
      ).filter((r) => !wanted.includes(r.device + ":" + r.id)),
      ...results,
    ]
  : results;
fs.writeFileSync(
  "docs/design-v0.4/workspace-check.json",
  JSON.stringify(report, null, 2),
);
if (
  results.some(
    (r) =>
      r.errors.length ||
      r.geometry.scrollWidth > r.geometry.width ||
      r.geometry.contentScrollWidth > r.geometry.contentWidth ||
      r.violations.length ||
      r.focusReturned === false,
  )
)
  process.exitCode = 1;
