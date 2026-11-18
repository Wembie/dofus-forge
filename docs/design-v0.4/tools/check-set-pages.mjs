import { chromium, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";
expect.configure({ timeout: 15000 });
const root = "http://127.0.0.1:4404",
  index = root + "/surfaces.html?view=sets",
  output = "docs/design-v0.4/captures/sets",
  report = "docs/design-v0.4/checks/set-pages.json";
fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true }),
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
const cards = (page) => page.locator(".sp-card");
async function inspect(page, id, device, theme, lang, errors) {
  // Pointer out of the way (a resting pointer opens a piece's peek) and every image loaded.
  await page.mouse.move(0, 0);
  await page.evaluate(async () => {
    scrollTo(0, 0);
    await document.fonts.ready;
    await Promise.all(
      Array.from(document.querySelectorAll(".sp-page img, .sp-bracket:first-of-type img")).map((img) => {
        img.loading = "eager";
        return Promise.race([img.decode().catch(() => {}), new Promise((r) => setTimeout(r, 3000))]);
      }),
    );
  });
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(300);
  // Every card is the same component: on the index, axe reads the heading, the filters and the
  // first bracket instead of 500+ cards (the shell is covered by check-shell).
  let builder = new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]);
  if (await page.locator(".sp-toolbar").count()) {
    await page.evaluate(() => document.querySelector(".sp-bracket")?.setAttribute("data-axe", ""));
    builder = builder.include(".sp-heading").include(".sp-toolbar");
    if (await page.locator("[data-axe]").count()) builder = builder.include("[data-axe]");
    if (await page.locator(".sp-empty").count()) builder = builder.include(".sp-empty");
  }
  const axe = await builder.analyze(),
    geometry = await page.evaluate(() => ({
      width: innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      clipped: Array.from(document.querySelectorAll(".sp-card h3, .sp-hero h1, .sp-item h3, .sp-builds b")).filter(
        (el) => el.scrollWidth > el.clientWidth + 1,
      ).length,
      smallTargets: Array.from(document.querySelectorAll(".sp-study button, .sp-study a, .sp-study select, .sp-study input")).filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width && r.height && r.height < 24 && !el.closest(".sp-card h3, .sp-review");
      }).length,
    }));
  if (["desktop", "mobile"].includes(device))
    await page.screenshot({ path: `${output}/${id}-${device}-${theme}-${lang}.png`, fullPage: id !== "index" });
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
async function search(page, text) {
  await page.locator(".sp-search input").fill(text);
  await page.waitForTimeout(200);
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
    await page.goto(index, { waitUntil: "networkidle" });
    if (theme === "mineral") await page.getByRole("button", { name: "Cambiar tema", exact: true }).click();
    await expect(cards(page).first()).toBeVisible();
    await inspect(page, "index", device, theme, "es", errors);
    await search(page, "Kimbo");
    await page.locator(".sp-card h3 a").first().click();
    await expect(page.locator(".sp-hero h1")).toBeVisible();
    await inspect(page, "set", device, theme, "es", errors);
    if (["desktop", "mobile"].includes(device)) {
      await page.locator(".sp-crumbs button").click();
      await page.locator(".sp-element-filter button").nth(1).click();
      await page.locator(".sp-toolbar select").selectOption("151-199");
      await inspect(page, "filtered", device, theme, "es", errors);
      await search(page, "zzz-no-existe");
      await expect(page.locator(".sp-empty")).toBeVisible();
      await inspect(page, "empty", device, theme, "es", errors);
      await page.locator(".sp-empty button").click();
      await page.locator(".sp-card", { has: page.locator(".sp-class") }).first().locator("h3 a").click();
      await expect(page.locator(".sp-chip.is-class")).toBeVisible();
      await inspect(page, "class-set", device, theme, "es", errors);
      const review = page.locator(".sp-review");
      await review.locator("summary").click();
      await review.locator("select").selectOption("no-builds");
      await expect(page.locator(".sp-builds-empty")).toBeVisible();
      await inspect(page, "no-builds", device, theme, "es", errors);
      await review.locator("select").selectOption("normal");
      await page.goto(root + "/surfaces.html?view=set&slug=no-existe", { waitUntil: "networkidle" });
      await expect(page.locator(".sp-missing h1")).toBeVisible();
      await inspect(page, "missing", device, theme, "es", errors);
      for (const lang of ["en", "fr", "pt"]) {
        await page.goto(index, { waitUntil: "networkidle" });
        if (theme === "mineral") await page.getByRole("button", { name: "Cambiar tema", exact: true }).click();
        await page.getByLabel("Abrir diálogo de revisión", { exact: true }).selectOption("settings");
        await page.getByRole("dialog").locator("select").selectOption(lang);
        await page.keyboard.press("Escape");
        await inspect(page, "index", device, theme, lang, errors);
        await page.locator(".sp-card h3 a").first().click();
        await expect(page.locator(".sp-hero h1")).toBeVisible();
        await inspect(page, "set", device, theme, lang, errors);
      }
    }
    await context.close();
    console.log(device, theme, "checked");
  }

// Journeys.
const { context, page, errors } = await create(1440, 1000);
await page.goto(index, { waitUntil: "networkidle" });
const total = await cards(page).count();
expect(total).toBeGreaterThan(400);
// Search ignores accents and case.
await search(page, "MALDICION");
await expect(cards(page).first().locator("h3")).toContainText("Maldición");
await search(page, "");
// Element and level filters narrow the list, stay in the URL and survive a set page.
await page.locator(".sp-element-filter button", { hasText: "Agua" }).click();
await expect(page.locator(".sp-element-filter button", { hasText: "Agua" })).toHaveAttribute("aria-pressed", "true");
await page.locator(".sp-toolbar select").selectOption("200-200");
await expect(page).toHaveURL(/element=water/);
await expect(page).toHaveURL(/level=200-200/);
await expect(page.locator(".sp-bracket")).toHaveCount(1);
await page.waitForTimeout(400);
const filtered = await cards(page).count();
expect(filtered).toBeLessThan(total);
await expect(page.locator(".sp-note")).toBeVisible();
await expect(page.locator(".sp-bracket")).toHaveCount(1);
const name = await page.locator(".sp-card h3").first().innerText();
await page.locator(".sp-card h3 a").first().click();
await expect(page).toHaveURL(/view=set&slug=/);
await expect(page.locator(".sp-hero h1")).toHaveText(name);
// Every piece shows its effects on focus; tiers mark the full set; totals are listed.
await page.locator(".sp-hero-pieces .sp-tile").first().focus();
await expect(page.locator(".item-peek")).toBeVisible();
await page.locator(".sp-hero-pieces .sp-tile").first().blur();
await expect(page.locator(".sp-tiers li.is-full")).toHaveCount(1);
expect(await page.locator(".sp-totals .sp-stat").count()).toBeGreaterThan(2);
await expect(page.locator(".sp-item")).toHaveCount(await page.locator(".sp-hero-pieces li").count());
await page.locator(".sp-crumbs button").click();
await expect(page.locator(".sp-element-filter button", { hasText: "Agua" })).toHaveAttribute("aria-pressed", "true");
await expect(cards(page)).toHaveCount(filtered);
await page.locator(".sp-clear").click();
await expect(cards(page)).toHaveCount(total);
// Related sets open other set pages.
await search(page, "Kimbo");
await page.locator(".sp-card h3 a").first().click();
const kimbo = await page.locator(".sp-hero h1").innerText();
await page.locator(".sp-related .sp-card h3 a").first().click();
await expect(page.locator(".sp-hero h1")).not.toHaveText(kimbo);
// Builds wearing a piece open their build page.
await page.locator(".sp-crumbs button").click();
await search(page, "Kimbo");
await page.locator(".sp-card h3 a").first().click();
expect(await page.locator(".sp-builds li").count()).toBeGreaterThan(0);
await page.locator(".sp-builds li a").first().click();
await expect(page.locator(".detail-hero h1")).toBeVisible();
// A class set links to its class guide.
await page.goto(index, { waitUntil: "networkidle" });
await page.locator(".sp-card", { has: page.locator(".sp-class") }).first().locator("h3 a").click();
await page.locator(".sp-chip.is-class").click();
await expect(page).toHaveURL(/view=class/);
// Try it: the workshop equips the whole set once and says so; the param is dropped.
// (The example build already wears the Kimbo set, so a set it doesn't wear is used.)
await page.goto(index, { waitUntil: "networkidle" });
await search(page, "Buhoset");
await page.locator(".sp-card h3 a").first().click();
const tryHref = await page.locator(".sp-hero-actions a.primary").getAttribute("href");
expect(tryHref).toMatch(/^\/\?set=\d+$/);
await page.goto(root + tryHref, { waitUntil: "networkidle" });
await expect(page.locator(".toast")).toContainText("equipado");
await expect(page).not.toHaveURL(/set=/);
// A missing set points back to the index.
await page.goto(root + "/surfaces.html?view=set&slug=no-existe", { waitUntil: "networkidle" });
await page.locator(".sp-missing button").click();
await expect(page).toHaveURL(/view=sets/);
results.push({
  id: "flows",
  accentInsensitiveSearch: true,
  filtersInUrlAndKept: true,
  elementNote: true,
  setPageMatchesCard: true,
  piecePeek: true,
  fullSetTier: true,
  relatedSets: true,
  buildsWearingSet: true,
  classGuideLink: true,
  workshopEquipsSet: true,
  missingSet: true,
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
