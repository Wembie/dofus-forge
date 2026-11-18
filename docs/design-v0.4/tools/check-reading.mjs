import { chromium, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";
expect.configure({ timeout: 15000 });
const root = "http://127.0.0.1:4404",
  url = (view) => root + "/surfaces.html?view=" + view,
  output = "docs/design-v0.4/captures/lectura",
  report = "docs/design-v0.4/checks/reading.json",
  PAGES = ["how-to-use", "forge-guide", "shortcuts", "about", "privacy", "terms", "class&class=iop"];
fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch({
    headless: true,
    args: ["--enable-webgl", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
  }),
  results = [];
async function create(width, height) {
  const context = await browser.newContext({ viewport: { width, height } }),
    page = await context.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const path of ["**/auth/v1/**", "**/rest/v1/**"])
    await context.route(path, (route) => {
      errors.push("Unexpected cloud request");
      return route.abort();
    });
  return { context, page, errors };
}
async function ready(page, view) {
  await expect(page.locator(".rd-head h1")).toBeVisible();
  if (view.startsWith("class")) {
    await expect(page.locator(".rd-element-panel")).toHaveCount(4);
    await expect(page.locator(".rd-spells article").first()).toBeVisible();
  }
}
async function inspect(page, id, device, theme, lang, errors) {
  await page.mouse.move(0, 0);
  await page.evaluate(async () => {
    scrollTo(0, 0);
    await document.fonts.ready;
  });
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(250);
  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).exclude("canvas").analyze(),
    geometry = await page.evaluate(() => ({
      width: innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      clipped: Array.from(document.querySelectorAll(".rd-head h1, .rd-section h2, .rd-cards h3, .rd-toc a")).filter(
        (el) => el.scrollWidth > el.clientWidth + 1,
      ).length,
      smallTargets: Array.from(document.querySelectorAll(".rd-study button, .rd-study a, .rd-study summary")).filter((el) => {
        const r = el.getBoundingClientRect();
        // A set card's title link covers the whole card through ::after.
        return r.width && r.height && r.height < 24 && !el.closest(".sp-card h3");
      }).length,
    }));
  if (["desktop", "mobile"].includes(device))
    await page.screenshot({ path: `${output}/${id}-${device}-${theme}-${lang}.png`, fullPage: true });
  results.push({
    id,
    device,
    theme,
    lang,
    geometry,
    errors: [...errors],
    violations: axe.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
    })),
  });
  errors.length = 0;
  fs.writeFileSync(report, JSON.stringify(results, null, 2) + "\n");
}

for (const [device, width, height] of [
  ["desktop", 1440, 1000],
  ["laptop", 1366, 900],
  ["tablet", 768, 1024],
  ["mobile", 390, 844],
  ["small-mobile", 360, 800],
])
  for (const theme of ["tinta", "mineral"]) {
    const { context, page, errors } = await create(width, height);
    for (const view of PAGES) {
      await page.goto(url(view), { waitUntil: "networkidle" });
      if (theme === "mineral") await page.getByRole("button", { name: "Cambiar tema", exact: true }).click();
      await ready(page, view);
      await inspect(page, view.split("&")[0], device, theme, "es", errors);
    }
    if (["desktop", "mobile"].includes(device))
      for (const lang of ["en", "fr", "pt"]) {
        await page.goto(url("forge-guide"), { waitUntil: "networkidle" });
        if (theme === "mineral") await page.getByRole("button", { name: "Cambiar tema", exact: true }).click();
        await page.getByLabel("Abrir diálogo de revisión", { exact: true }).selectOption("settings");
        await page.getByRole("dialog").locator("select").selectOption(lang);
        await page.keyboard.press("Escape");
        for (const view of ["forge-guide", "class&class=cra", "terms"]) {
          if (view !== "forge-guide") {
            await page.getByLabel("Vista del producto", { exact: true }).selectOption(view.split("&")[0]);
          }
          await ready(page, view);
          await inspect(page, view.split("&")[0], device, theme, lang, errors);
        }
      }
    await context.close();
    console.log(device, theme, "checked");
  }

// Journeys.
const { context, page, errors } = await create(1440, 1000);
// How to use: eight steps, the three ways on.
await page.goto(url("how-to-use"), { waitUntil: "networkidle" });
await expect(page.locator(".rd-steps > li")).toHaveCount(8);
await page.locator(".rd-actions").getByRole("button", { name: "Guía de La Forjadora" }).click();
await expect(page).toHaveURL(/view=forge-guide/);
// Forge guide: nine sections, contents follow the reading, FAQ folds, the example callouts.
await expect(page.locator(".rd-section")).toHaveCount(9);
await expect(page.locator(".rd-heat")).toHaveCount(4);
await expect(page.locator(".rd-example")).toHaveCount(2);
await page.locator(".rd-toc a[href='#faq']").click();
await expect(page.locator(".rd-toc a[href='#faq']")).toHaveAttribute("aria-current", "location");
const faq = page.locator(".rd-faq details").first();
await faq.locator("summary").click();
await expect(faq).toHaveAttribute("open", "");
// Open the Forger: the workshop opens it once and drops the parameter.
await page.locator(".rd-head .rd-actions button.primary").click();
await expect(page).toHaveURL(root + "/");
await expect(page.getByRole("dialog", { name: "La Forjadora" })).toBeVisible();
// Shortcuts: three groups, keyboard combos.
await page.goto(url("shortcuts"), { waitUntil: "networkidle" });
await expect(page.locator(".rd-keys > div")).toHaveCount(10);
await expect(page.locator(".rd-combo")).toHaveCount(4);
await expect(page.locator(".rd-combo").first()).toContainText("Ctrl");
// About: the builds count, four blocks, six features, every class and the FAQ.
await page.goto(url("about"), { waitUntil: "networkidle" });
await expect(page.locator(".rd-pill")).toContainText("builds");
await expect(page.locator(".rd-features article")).toHaveCount(6);
await expect(page.locator(".rd-classes li")).toHaveCount(19);
await expect(page.locator(".rd-qa > div")).toHaveCount(5);
await page.locator(".rd-classes button", { hasText: "Sram" }).click();
await expect(page).toHaveURL(/view=class&class=sram/);
await expect(page.locator(".rd-class-title")).toContainText("Sram");
// Legal: every section numbered, the contents jump to one.
await page.goto(url("privacy"), { waitUntil: "networkidle" });
await expect(page.locator(".rd-legal-section")).toHaveCount(12);
await page.goto(url("terms"), { waitUntil: "networkidle" });
await expect(page.locator(".rd-legal-section")).toHaveCount(15);
await expect(page.locator(".rd-effective")).toBeVisible();
await page.locator(".rd-toc a[href='#s9']").click();
await expect(page).toHaveURL(/#s9$/);
// Class guide: own element first and marked, set chips and class sets open set pages,
// builds open their page, the class switch, the spells, and "build a …" in the workshop.
await page.goto(url("class&class=iop"), { waitUntil: "networkidle" });
await ready(page, "class");
await expect(page.locator(".rd-element-panel").first()).toHaveAttribute("data-element", "earth");
await expect(page.locator(".rd-element-panel").first().locator(".rd-main")).toBeVisible();
await expect(page.locator(".rd-main")).toHaveCount(1);
expect(await page.locator(".rd-spells article").count()).toBeGreaterThan(10);
const chip = page.locator(".rd-element-panel dd button").first(),
  setName = await chip.locator("span").innerText();
await chip.click();
await expect(page).toHaveURL(/view=set&slug=/);
await expect(page.locator(".sp-hero h1")).toHaveText(setName);
await page.goto(url("class&class=iop"), { waitUntil: "networkidle" });
await ready(page, "class");
await page.locator("#class-sets .sp-card h3 a").first().click();
await expect(page).toHaveURL(/view=set&slug=/);
await page.goto(url("class&class=iop"), { waitUntil: "networkidle" });
await ready(page, "class");
await page.locator(".rd-builds button").first().click();
await expect(page.locator(".detail-hero h1")).toBeVisible();
await page.goto(url("class&class=iop"), { waitUntil: "networkidle" });
await ready(page, "class");
await page.locator(".rd-link", { hasText: "Ver todas las builds" }).click();
await expect(page).toHaveURL(/view=explore/);
await page.goto(url("class&class=iop"), { waitUntil: "networkidle" });
await ready(page, "class");
await page.locator(".rd-class-switch button[aria-label='Ocra']").click();
await expect(page).toHaveURL(/class=cra/);
await expect(page.locator(".rd-class-title")).toContainText("Ocra");
await page.locator(".rd-head .rd-actions button.primary").click();
await expect(page).toHaveURL(/\/\?class=cra/);
await expect(page.locator(".character-controls select").first().locator("option:checked")).toHaveText("Ocra");
// A class that doesn't exist.
await page.goto(url("class&class=no-existe"), { waitUntil: "networkidle" });
await expect(page.locator(".rd-missing h1")).toBeVisible();
results.push({
  id: "flows",
  howToSteps: true,
  forgeSectionsHeatExamples: true,
  tocFollowsReading: true,
  faqFolds: true,
  workshopOpensForge: true,
  shortcutCombos: true,
  aboutCountFeaturesClassesFaq: true,
  legalSections: true,
  classElementsOwnFirst: true,
  classSetChips: true,
  classSets: true,
  classBuilds: true,
  classMoreBuilds: true,
  classSwitch: true,
  workshopPicksClass: true,
  missingClass: true,
  errors: [...errors],
});
await context.close();
await browser.close();
fs.writeFileSync(report, JSON.stringify(results, null, 2) + "\n");
const failures = results.filter(
  (r) =>
    r.errors?.length ||
    r.violations?.length ||
    r.geometry?.scrollWidth > r.geometry?.width ||
    r.geometry?.clipped ||
    r.geometry?.smallTargets,
);
console.log(JSON.stringify({ checks: results.length, failures }, null, 2));
if (failures.length) process.exitCode = 1;
