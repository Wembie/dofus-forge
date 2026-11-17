import { chromium, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";
expect.configure({ timeout: 10000 });
const root = "http://127.0.0.1:4404",
  about = root + "/surfaces.html?view=about",
  output = "docs/design-v0.4/captures/armazon",
  report = "docs/design-v0.4/checks/shell.json";
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
const directory = (page, id) =>
  page.getByLabel("Abrir diálogo de revisión", { exact: true }).selectOption(id);
async function inspect(page, id, device, theme, lang, errors, fullPage = false) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(250);
  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).exclude("canvas").analyze(),
    geometry = await page.evaluate(() => ({
      width: innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      smallTargets: Array.from(
        document.querySelectorAll(
          ".shell-popover button, .shell-settings button, .shell-settings select, .shell-sheet button, .shell-update button, .shell-footer button, .shell-footer a, .shell-bell > button",
        ),
      ).filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width && r.height && r.height < 24;
      }).length,
      clipped: Array.from(document.querySelectorAll(".shell-setting b, .shell-notifications li span:not(.sr-only), .shell-footer dt, .shell-footer dd")).filter(
        (el) => el.scrollWidth > el.clientWidth + 1,
      ).length,
    }));
  if (["desktop", "mobile"].includes(device))
    await page.screenshot({ path: `${output}/${id}-${device}-${theme}-${lang}.png`, fullPage });
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
    await page.goto(about, { waitUntil: "networkidle" });
    if (theme === "mineral") await page.getByRole("button", { name: "Cambiar tema", exact: true }).click();
    await page.locator(".shell-bell > button").click();
    await expect(page.locator(".shell-notifications li")).toHaveCount(7);
    await inspect(page, "notifications", device, theme, "es", errors);
    await page.keyboard.press("Escape");
    await expect(page.locator(".shell-bell > button")).toBeFocused();
    await page.locator(".shell-avatar").click();
    await inspect(page, "account", device, theme, "es", errors);
    await page.keyboard.press("Escape");
    await directory(page, "settings");
    await inspect(page, "settings", device, theme, "es", errors);
    await page.keyboard.press("Escape");
    await directory(page, "navigation");
    await inspect(page, "navigation", device, theme, "es", errors);
    await page.keyboard.press("Escape");
    await directory(page, "update-banner");
    await expect(page.locator(".shell-update")).toBeVisible();
    await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
    await inspect(page, "footer-update", device, theme, "es", errors);
    await page.goto(root + "/", { waitUntil: "networkidle" });
    if (theme === "mineral" && width >= 1080)
      await page.getByRole("button", { name: "Tema mineral", exact: true }).click();
    await inspect(page, "workshop-header", device, theme, "es", errors);
    if (["desktop", "mobile"].includes(device)) {
      await page.goto(about, { waitUntil: "networkidle" });
      if (theme === "mineral") await page.getByRole("button", { name: "Cambiar tema", exact: true }).click();
      await page.locator(".shell-review select").selectOption("empty");
      await page.locator(".shell-bell > button").click();
      await expect(page.locator(".shell-empty p")).toBeVisible();
      await inspect(page, "notifications-empty", device, theme, "es", errors);
      await page.keyboard.press("Escape");
      for (const lang of ["en", "fr", "pt"]) {
        await directory(page, "settings");
        await page.getByRole("dialog").locator("select").selectOption(lang);
        await inspect(page, "settings", device, theme, lang, errors);
        await page.keyboard.press("Escape");
        await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
        await inspect(page, "footer", device, theme, lang, errors);
        await page.evaluate(() => scrollTo(0, 0));
      }
    }
    await context.close();
    console.log(device, theme, "checked");
  }

// Journeys.
const { context, page, errors } = await create(1440, 1000);
await page.goto(about, { waitUntil: "networkidle" });
const bell = page.locator(".shell-bell > button");
await expect(bell.locator(".shell-badge")).toHaveText("3");
await bell.click();
await expect(page.locator(".shell-notifications li .is-unread")).toHaveCount(3);
// A follower opens their profile; the item is read and the count drops.
await page.locator(".shell-notifications li button", { hasText: "empezó a seguirte" }).click();
await expect(page.locator(".public-profile-heading h1")).toHaveText("caliza");
await expect(bell.locator(".shell-badge")).toHaveText("2");
// A build notification opens that build.
await bell.click();
await page.locator(".shell-notifications li button", { hasText: "comentó en tu build" }).click();
await expect(page).toHaveURL(/view=build&build=library-0/);
await expect(page.locator(".detail-hero h1")).toBeVisible();
// Mark all read clears the count; reopening keeps them read.
await bell.click();
await page.getByRole("button", { name: "Marcar todo como leído" }).click();
await expect(bell.locator(".shell-badge")).toHaveCount(0);
await page.keyboard.press("Escape");
await bell.click();
await expect(page.locator(".shell-notifications li .is-unread")).toHaveCount(0);
await page.mouse.click(10, 500);
await expect(page.locator(".shell-notifications")).toHaveCount(0);
// Account menu: public profile, account, sign out.
await page.locator(".shell-avatar").click();
await page.getByRole("button", { name: "Perfil público" }).click();
await expect(page.locator(".public-profile-heading h1")).toHaveText("brasa");
await page.locator(".shell-avatar").click();
await page.locator(".shell-account-menu").getByRole("button", { name: "Mi perfil" }).click();
await expect(page).toHaveURL(/view=account/);
await page.locator(".shell-avatar").click();
await page.locator(".shell-account-menu").getByRole("button", { name: "Cerrar sesión" }).click();
await expect(page.getByRole("dialog")).toContainText("Cerrar sesión");
await page.keyboard.press("Escape");
// Signed out: no bell, a sign-in button that opens access.
await page.goto(root + "/surfaces.html?view=explore", { waitUntil: "networkidle" });
await page.locator(".explore-review summary").click();
await page.locator(".explore-review select").nth(1).selectOption("out");
await expect(page.locator(".shell-bell")).toHaveCount(0);
await page.locator(".shell-signin").click();
await expect(page.locator(".access-submit")).toBeVisible();
await page.keyboard.press("Escape");
await page.locator(".explore-review select").nth(1).selectOption("in");
// Settings apply at once and persist on the device.
await directory(page, "settings");
const dialog = page.getByRole("dialog");
await dialog.getByRole("radio", { name: "Mineral" }).click();
await expect(page.locator("html")).toHaveAttribute("data-theme", "mineral");
const sound = dialog.getByRole("switch", { name: "Sonido" });
const before = await sound.getAttribute("aria-checked");
await sound.click();
await expect(sound).not.toHaveAttribute("aria-checked", before);
await dialog.getByRole("radio", { name: "2D" }).click();
await dialog.getByRole("radio", { name: "Izquierda" }).click();
await page.keyboard.press("Escape");
await directory(page, "settings");
await expect(dialog.getByRole("radio", { name: "2D" })).toHaveAttribute("aria-checked", "true");
await expect(dialog.getByRole("radio", { name: "Izquierda" })).toHaveAttribute("aria-checked", "true");
await dialog.locator("select").selectOption("en");
await page.keyboard.press("Escape");
await expect(page.locator(".product-header nav")).toContainText("Explore");
await directory(page, "settings");
await dialog.locator("select").selectOption("es");
await dialog.getByRole("radio", { name: "3D" }).click();
await dialog.getByRole("radio", { name: "Derecha" }).click();
await dialog.getByRole("radio", { name: "Tinta" }).click();
await page.keyboard.press("Escape");
// Navigation sheet and footer reach every destination.
await directory(page, "navigation");
await page.getByRole("dialog").getByRole("button", { name: "Sets" }).click();
await expect(page).toHaveURL(/view=sets/);
await page.locator(".shell-footer").getByRole("button", { name: "Política de Privacidad" }).click();
await expect(page).toHaveURL(/view=privacy/);
await page.locator(".shell-footer").getByRole("button", { name: "Guía de La Forjadora" }).click();
await expect(page).toHaveURL(/view=forge-guide/);
await expect(page.locator(".shell-footer a", { hasText: "Discord" })).toHaveAttribute("href", /discord\.gg/);
await expect(page.locator(".shell-footer a", { hasText: "Contacto" })).toHaveAttribute("href", "mailto:contact@dofusforge.com");
// Update notice: reload or dismiss.
await directory(page, "update-banner");
await page.locator(".shell-update").getByRole("button", { name: "Cerrar" }).click();
await expect(page.locator(".shell-update")).toHaveCount(0);
// Workshop: site links, bell and account, and the menu on narrow screens.
const workshop = await context.newPage();
workshop.on("pageerror", (e) => errors.push(e.message));
await workshop.goto(root + "/", { waitUntil: "networkidle" });
await expect(workshop.locator(".global-end .shell-bell")).toBeVisible();
await expect(workshop.locator(".global-end .shell-avatar")).toBeVisible();
await expect(workshop.locator(".shell-footer")).toHaveCount(1);
await workshop.locator(".global-links").getByRole("button", { name: "Explorar" }).click();
await expect(workshop).toHaveURL(/surfaces\.html\?view=explore/);
await workshop.setViewportSize({ width: 390, height: 844 });
await workshop.goto(root + "/", { waitUntil: "networkidle" });
await workshop.locator(".workshop-menu").click();
await workshop.getByRole("dialog").getByRole("button", { name: "Mis Builds" }).click();
await expect(workshop).toHaveURL(/surfaces\.html\?view=my-builds/);
results.push({
  id: "flows",
  followerOpensProfile: true,
  buildNotificationOpensBuild: true,
  markAllPersists: true,
  outsideClickCloses: true,
  accountMenu: true,
  signedOutSignIn: true,
  settingsApplyAndPersist: true,
  languageSwitch: true,
  navigationSheet: true,
  footerLinks: true,
  updateDismiss: true,
  workshopShell: true,
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
    r.geometry?.smallTargets ||
    r.geometry?.clipped,
);
console.log(JSON.stringify({ checks: results.length, failures }, null, 2));
if (failures.length) process.exitCode = 1;
