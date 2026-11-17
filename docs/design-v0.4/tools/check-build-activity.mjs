import { chromium, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";
const output = "docs/design-v0.4/captures/explorar",
  report = "docs/design-v0.4/checks/build-activity.json";
fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch({
    args: [
      "--enable-webgl",
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
    ],
  }),
  results = [];
async function inspect(page, id, device, theme, lang, errors) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      Array.from(document.images).map((img) => {
        img.loading = "eager";
        return Promise.race([
          img.decode().catch(() => {}),
          new Promise((resolve) => setTimeout(resolve, 3000)),
        ]);
      }),
    );
  });
  const axe = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze(),
    geometry = await page.evaluate(() => ({
      width: innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      clippedLabels: Array.from(
        document.querySelectorAll(".build-activity dt"),
      ).filter((el) => el.scrollWidth > el.clientWidth + 1).length,
    }));
  if (["desktop", "mobile"].includes(device))
    await page.screenshot({
      path: `${output}/${id}-${device}-${theme}-${lang}.png`,
      fullPage: true,
    });
  results.push({
    id,
    device,
    theme,
    lang,
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
  fs.writeFileSync(report, JSON.stringify(results, null, 2) + "\n");
}
for (const [device, width, height] of [
  ["desktop", 1440, 900],
  ["laptop", 1366, 900],
  ["tablet", 768, 1024],
  ["mobile", 390, 844],
  ["small-mobile", 360, 800],
])
  for (const theme of ["tinta", "mineral"]) {
    const context = await browser.newContext({ viewport: { width, height } }),
      page = await context.newPage(),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    for (const path of ["**/auth/v1/**", "**/rest/v1/**"])
      await context.route(path, (r) => {
        errors.push("Unexpected account/database request");
        return r.abort();
      });
    await page.goto("http://127.0.0.1:4404/surfaces.html?view=explore", {
      waitUntil: "networkidle",
    });
    if (theme === "mineral")
      await page
        .getByRole("button", { name: "Cambiar tema", exact: true })
        .click();
    await page.locator(".explore-sort select").selectOption("recent");
    await expect(page.locator(".explore-card h2").nth(1)).toHaveText(
      "El filo paciente",
    );
    await expect(page.locator(".build-activity")).toHaveCount(6);
    await expect(
      page.locator(".build-activity-counts").first().locator("dt"),
    ).toHaveText(["Me gusta", "Vistas", "Comentarios"]);
    await expect(page.locator(".build-activity-rating").first()).toContainText(
      "24 valoraciones",
    );
    await expect(
      page.locator(".build-activity").nth(1).locator(".build-activity-rating"),
    ).toHaveText("Sin valoraciones");
    await expect(
      page.locator(".build-activity").nth(1).locator("dd"),
    ).toHaveText(["0", "0", "0"]);
    await expect(
      page.locator(".build-activity-counts").first().locator("div").nth(1),
    ).toHaveAttribute("title", /12.?480/);
    await expect(page.locator(".build-activity time").first()).toHaveAttribute(
      "datetime",
      "2026-11-17T12:00:00Z",
    );
    for (const lang of ["es", "en", "fr", "pt"]) {
      if (lang !== "es") {
        await page
          .getByLabel("Vista del producto", { exact: true })
          .selectOption("account");
        const review = page.locator(".account-review");
        if (!(await review.evaluate((e) => e.open)))
          await review.locator("summary").click();
        await review.locator("select").nth(2).selectOption(lang);
        await page
          .getByLabel("Vista del producto", { exact: true })
          .selectOption("explore");
      }
      await inspect(page, "activity", device, theme, lang, errors);
    }
    if (["desktop", "mobile"].includes(device)) {
      await page
        .getByLabel("Vista del producto", { exact: true })
        .selectOption("profile");
      await expect(page.locator(".build-activity")).toHaveCount(2);
      await inspect(page, "profile-activity", device, theme, "pt", errors);
    }
    await context.close();
    console.log(device, theme, "checked");
  }
await browser.close();
const failures = results.filter(
  (r) =>
    r.errors.length ||
    r.violations.length ||
    r.geometry.scrollWidth > r.geometry.width ||
    r.geometry.clippedLabels,
);
console.log(JSON.stringify({ checks: results.length, failures }, null, 2));
if (failures.length) process.exitCode = 1;
