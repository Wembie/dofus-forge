import { chromium, expect } from "@playwright/test";
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
for (const [device, width, height] of [
  ["desktop", 1440, 900],
  ["mobile", 390, 844],
]) {
  const context = await browser.newContext({
      viewport: { width, height },
      acceptDownloads: true,
    }),
    page = await context.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:4404/", { waitUntil: "networkidle" });
  const metric = page.locator(".stats-panel .metric strong"),
    baseline = await metric.allTextContents();
  async function catalog() {
    await page.getByRole("button", { name: /^Sombrero:/ }).click();
    await page
      .getByRole("button", { name: "Cambiar objeto", exact: true })
      .click();
    await expect(
      page.getByRole("dialog", { name: "Elegir sombrero" }),
    ).toBeVisible();
  }
  await catalog();
  await page
    .getByRole("textbox", { name: "Buscar objetos", exact: true })
    .fill("no-existe-este-objeto");
  await expect(
    page.getByRole("heading", { name: "No hay coincidencias" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Restablecer filtros" }).click();
  await page
    .getByRole("textbox", { name: "Buscar objetos", exact: true })
    .fill("Sombrero Soifam");
  await page.locator(".catalog-result-open").first().click();
  await expect(page.locator(".catalog-item-heading h3")).toHaveText(
    "Sombrero Soifam",
  );
  const detailGeometry = await page
    .locator(".catalog-inspection")
    .evaluate((e) => ({ width: e.clientWidth, scrollWidth: e.scrollWidth }));
  await page.screenshot({
    path: `docs/design-v0.4/catalog-detail-${device}.png`,
  });
  await page
    .getByRole("button", { name: "Equipar en sombrero", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: /^Sombrero:/ }),
  ).toHaveAttribute("title", "Sombrero Soifam");
  await page.getByRole("button", { name: "Deshacer", exact: true }).click();
  await expect.poll(() => metric.allTextContents()).toEqual(baseline);
  await catalog();
  await page
    .getByRole("textbox", { name: "Buscar objetos", exact: true })
    .fill("Sombrero del conde");
  await page.locator(".catalog-result-open").first().click();
  await page.locator(".catalog-set-link").click();
  await expect(page.getByRole("dialog")).toHaveCount(2);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: /^Sombrero:/ }).click();
  await page.getByRole("button", { name: "Editar runas", exact: true }).click();
  const runeInput = page.getByRole("spinbutton").first();
  await runeInput.fill("25");
  await page.getByRole("button", { name: "Agregar", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect.poll(() => metric.allTextContents()).not.toEqual(baseline);
  await page.getByRole("button", { name: "Deshacer", exact: true }).click();
  await expect.poll(() => metric.allTextContents()).toEqual(baseline);
  await page.keyboard.press("Control+k");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("dialog").getByRole("textbox").fill("Forjadora");
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("dialog", { name: "La Forjadora" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Volver al taller", exact: true })
    .click();
  await page.getByRole("button", { name: "Panoplias", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Buscar panoplias", exact: true })
    .fill("volc");
  await page.locator(".catalog-result-open").first().click();
  await expect(page.locator(".set-tiers .is-reached")).toHaveCount(1);
  await page.getByRole("button", { name: /^Equipar \d+ piezas/ }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect.poll(() => metric.allTextContents()).not.toEqual(baseline);
  await page.getByRole("button", { name: "Deshacer", exact: true }).click();
  await expect.poll(() => metric.allTextContents()).toEqual(baseline);
  await page
    .getByRole("button", { name: "Distribuir características", exact: true })
    .click();
  const points = page.locator(".chars-budget strong"),
    field = (name) =>
      page.getByRole("textbox", { name: "Puntos en " + name, exact: true }),
    set = async (name, value) => {
      await field(name).fill(String(value));
      await field(name).blur();
    };
  await expect(points).toHaveText("0");
  await set("Fuerza", 100);
  await expect(points).toHaveText("500");
  await page
    .getByRole("button", { name: "Asignar el máximo posible a Agilidad" })
    .click();
  await expect(points).toHaveText("2");
  await expect(field("Agilidad")).toHaveValue("266");
  await set("Agilidad", 0);
  await set("Fuerza", 300);
  await expect(points).toHaveText("0");
  const luck = page
    .getByRole("group", { name: "Suerte" })
    .locator(".chars-total strong"),
    withScroll = Number(await luck.textContent());
  const scroll = page.getByRole("button", { name: /^Pergamino de Suerte/ });
  await scroll.click();
  await expect(luck).toHaveText(String(withScroll - 100));
  await scroll.click();
  await page.keyboard.press("Escape");
  await expect.poll(() => metric.allTextContents()).toEqual(baseline);
  await page
    .getByRole("button", { name: "Pasivos de combate", exact: true })
    .click();
  const passiveTotal = page.locator(".passive-total");
  await expect(passiveTotal).toContainText("Ninguno activo");
  await page.getByRole("radio").filter({ hasText: "Fuerza" }).first().click();
  await expect(passiveTotal).toContainText("+400 Fuerza");
  await page.getByRole("slider").first().focus();
  await page.keyboard.press("ArrowRight");
  await expect(passiveTotal).toContainText("Daño final");
  await page.getByRole("button", { name: "Restablecer", exact: true }).click();
  await expect(passiveTotal).toContainText("Ninguno activo");
  await page.keyboard.press("Escape");
  if (device === "desktop") {
    await page
      .getByRole("button", { name: "Compartir y exportar", exact: true })
      .click();
    const downloadPromise = page.waitForEvent("download", { timeout: 60000 });
    await page
      .getByRole("button", { name: "Descargar ficha", exact: true })
      .click();
    const download = await downloadPromise;
    await download.saveAs("docs/design-v0.4/export-sheet.png");
    await expect(page.getByRole("status")).toContainText("Imagen preparada");
    await page.keyboard.press("Escape");
  }
  results.push({
    device,
    detailGeometry,
    equipAndUndo: true,
    nestedSetDialog: true,
    runeAndUndo: true,
    commandPalette: true,
    setEquipAndUndo: true,
    characteristics: true,
    passives: true,
    exported: device === "desktop",
    errors,
  });
  console.log(results.at(-1));
  await context.close();
}
await browser.close();
fs.writeFileSync(
  "docs/design-v0.4/design-flows-check.json",
  JSON.stringify(results, null, 2),
);
if (
  results.some(
    (r) =>
      r.errors.length || r.detailGeometry.scrollWidth > r.detailGeometry.width,
  )
)
  process.exitCode = 1;
