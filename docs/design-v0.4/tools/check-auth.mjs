import { chromium, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs";
const output = "docs/design-v0.4/captures/acceso";
fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true }),
  results = [];
for (const [device, width, height] of [
  ["desktop", 1440, 1000],
  ["laptop", 1366, 900],
  ["tablet", 768, 1024],
  ["mobile", 390, 844],
  ["small-mobile", 360, 800],
]) {
  for (const theme of ["tinta", "mineral"]) {
    const context = await browser.newContext({ viewport: { width, height } }),
      page = await context.newPage(),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await context.route("**/auth/v1/**", (route) => {
      errors.push("Unexpected auth request");
      return route.abort();
    });
    await page.goto("http://127.0.0.1:4404/surfaces.html?view=explore", {
      waitUntil: "networkidle",
    });
    if (theme === "mineral")
      await page
        .getByRole("button", { name: "Cambiar tema", exact: true })
        .click();
    const trigger = page.getByLabel("Abrir diálogo de revisión", {
      exact: true,
    });
    for (const mode of [
      "signin",
      "signup",
      "forgot",
      "reset-password",
      "consent",
    ]) {
      await trigger.focus();
      await trigger.selectOption(mode);
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      const geometry = await dialog.evaluate((e) => ({
        width: innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        dialogWidth: e.clientWidth,
        dialogScroll: e.scrollWidth,
        contentWidth: e.querySelector(".surface-dialog-content").clientWidth,
        contentScroll: e.querySelector(".surface-dialog-content").scrollWidth,
      }));
      const axe = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      await page.screenshot({
        path: `${output}/${mode}-${device}-${theme}.png`,
      });
      await page.keyboard.press("Escape");
      await expect(dialog).toHaveCount(0);
      results.push({
        kind: "view",
        device,
        theme,
        mode,
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
    }
    await context.close();
    console.log(device, theme, "checked");
  }
}
const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  }),
  page = await context.newPage(),
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto("http://127.0.0.1:4404/surfaces.html?view=explore", {
  waitUntil: "networkidle",
});
const trigger = page.getByLabel("Abrir diálogo de revisión", { exact: true });
await trigger.selectOption("signin");
let dialog = page.getByRole("dialog");
await dialog.getByLabel("Correo", { exact: true }).fill("player@example.com");
await dialog.getByLabel("Contraseña", { exact: true }).fill("secret123");
await dialog
  .getByRole("button", { name: "Mostrar contraseña", exact: true })
  .click();
await expect(dialog.getByLabel("Contraseña", { exact: true })).toHaveAttribute(
  "type",
  "text",
);
await dialog
  .getByRole("button", { name: "Ocultar contraseña", exact: true })
  .click();
await dialog.locator(".access-review summary").click();
await dialog
  .getByLabel("Respuesta del servicio", { exact: true })
  .selectOption("credentials");
await dialog.locator(".access-review summary").click();
await dialog
  .getByRole("button", { name: "Iniciar sesión", exact: true })
  .last()
  .click();
await expect(dialog.getByRole("alert")).toContainText("incorrectos");
await expect(dialog.locator(".access-submit")).toBeDisabled();
await expect(dialog.getByLabel("Correo", { exact: true })).toHaveValue(
  "player@example.com",
);
await page.screenshot({ path: output + "/signin-error-mobile.png" });
await dialog.locator(".access-review summary").click();
await dialog
  .getByLabel("Respuesta del servicio", { exact: true })
  .selectOption("success");
await dialog.locator(".access-review summary").click();
await dialog
  .getByRole("button", { name: "Volver a verificar", exact: true })
  .click();
await dialog.locator(".access-submit").click();
await expect(
  dialog.getByRole("heading", { name: "Sesión iniciada" }),
).toBeVisible();
await dialog.getByRole("button", { name: "Volver a mi build" }).click();
await expect(dialog).toHaveCount(0);
await trigger.selectOption("signup");
dialog = page.getByRole("dialog");
await dialog.getByLabel("Correo", { exact: true }).fill("player@example.com");
await dialog.getByLabel("Nombre de usuario", { exact: true }).fill("brasa");
await dialog.getByLabel("Contraseña", { exact: true }).fill("secret123");
await expect(
  dialog.getByLabel("Nombre de usuario", { exact: true }),
).toHaveAttribute("maxlength", "30");
await expect(dialog.locator(".access-submit")).toBeDisabled();
const checks = dialog.locator(".access-consent input");
await checks.nth(0).check();
await expect(dialog.locator(".access-submit")).toBeDisabled();
await checks.nth(1).check();
await expect(dialog.locator(".access-submit")).toBeEnabled();
await expect(dialog.locator(".access-consent a")).toHaveCount(2);
await dialog.locator(".access-submit").click();
await expect(dialog.getByRole("status")).toContainText("Confirma tu correo");
await page.screenshot({ path: output + "/signup-confirmation-mobile.png" });
await dialog.getByRole("button", { name: "Usar otro correo" }).click();
await expect(dialog.getByLabel("Correo", { exact: true })).toHaveValue(
  "player@example.com",
);
await page.keyboard.press("Escape");
await trigger.selectOption("forgot");
dialog = page.getByRole("dialog");
await dialog.getByLabel("Correo", { exact: true }).fill("nobody@example.com");
await dialog.locator(".access-submit").click();
await expect(dialog.getByRole("status")).toContainText("Si existe una cuenta");
await page.screenshot({ path: output + "/forgot-confirmation-mobile.png" });
await page.keyboard.press("Escape");
await trigger.selectOption("reset-password");
dialog = page.getByRole("dialog");
await dialog.getByLabel("Nueva contraseña", { exact: true }).fill("secret123");
await dialog
  .getByLabel("Confirmar contraseña", { exact: true })
  .fill("different123");
await dialog.locator(".access-submit").click();
await expect(dialog.getByRole("alert")).toContainText("no coinciden");
await dialog
  .getByLabel("Confirmar contraseña", { exact: true })
  .fill("secret123");
await dialog.locator(".access-submit").click();
await expect(dialog.getByRole("status")).toContainText(
  "Usa la nueva contraseña",
);
await page.keyboard.press("Escape");
await trigger.selectOption("signup");
dialog = page.getByRole("dialog");
await dialog.locator(".access-review summary").click();
for (const lang of ["en", "fr", "pt", "es"]) {
  await dialog.locator(".access-review select").last().selectOption(lang);
  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  results.push({
    kind: "language",
    lang,
    violations: axe.violations.map((v) => ({ id: v.id })),
    geometry: await dialog.evaluate((e) => ({
      dialogWidth: e.clientWidth,
      dialogScroll: e.scrollWidth,
    })),
    errors: [...errors],
  });
  await page.screenshot({ path: `${output}/signup-mobile-${lang}.png` });
}
await context.close();
await browser.close();
results.push({
  kind: "flows",
  passwordVisibility: true,
  serviceError: true,
  challengeRefresh: true,
  emailRetained: true,
  separateConsents: true,
  registrationConfirmation: true,
  neutralRecoveryConfirmation: true,
  passwordMismatchRejected: true,
  errors,
});
fs.writeFileSync(
  "docs/design-v0.4/checks/auth.json",
  JSON.stringify(results, null, 2) + "\n",
);
const failures = results.filter(
  (r) =>
    r.errors?.length ||
    r.violations?.length ||
    r.focusReturned === false ||
    r.geometry?.scrollWidth > r.geometry?.width ||
    r.geometry?.dialogScroll > r.geometry?.dialogWidth ||
    r.geometry?.contentScroll > r.geometry?.contentWidth,
);
console.log(JSON.stringify({ checks: results.length, failures }, null, 2));
if (failures.length) process.exitCode = 1;
