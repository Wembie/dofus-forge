import fs from "node:fs";
import { chromium, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const names = [
    "confirm-signup",
    "reset-password",
    "magic-link",
    "invite-user",
    "change-email",
    "reauthentication",
  ],
  results = [];
fs.mkdirSync("docs/design-v0.4/captures/correos", { recursive: true });
const browser = await chromium.launch({ headless: true });
for (const name of names) {
  const html = fs.readFileSync(`supabase/email-templates/${name}.html`, "utf8"),
    otp = name === "reauthentication";
  const variables = [
    ...new Set(
      [...html.matchAll(/\{\{\s*\.([A-Za-z]+)\s*\}\}/g)].map((m) => m[1]),
    ),
  ].sort();
  if (
    JSON.stringify(variables) !==
    JSON.stringify(
      (otp ? ["SiteURL", "Token"] : ["ConfirmationURL", "SiteURL"]).sort(),
    )
  )
    throw Error("Variable mismatch: " + name);
  if (
    /<script|<form|on(?:click|load|error)=|display:\s*(?:flex|grid)/i.test(html)
  )
    throw Error("Unsupported email content: " + name);
  const rendered = html
    .replaceAll(
      "{{ .ConfirmationURL }}",
      "https://example.invalid/auth/v1/verify?token=" +
        "abc123".repeat(30) +
        "&type=recovery",
    )
    .replaceAll("{{ .SiteURL }}", "https://dofusforge.com")
    .replaceAll("{{ .Token }}", "123456");
  for (const width of [600, 360]) {
    const context = await browser.newContext({
        viewport: { width, height: 900 },
      }),
      page = await context.newPage();
    await page.setContent(rendered);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    const axe = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze(),
      geometry = await page.evaluate(() => ({
        width: innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
    const links = await page
      .locator('a[href^="https://example.invalid"]')
      .count();
    if (!otp && links !== 2) throw Error("Missing action/fallback: " + name);
    await page.screenshot({
      path: `docs/design-v0.4/captures/correos/${name}-${width}.png`,
      fullPage: true,
    });
    results.push({
      name,
      width,
      variables,
      links,
      geometry,
      violations: axe.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      })),
    });
    await context.close();
  }
}
await browser.close();
fs.writeFileSync(
  "docs/design-v0.4/checks/emails.json",
  JSON.stringify(results, null, 2) + "\n",
);
console.log(
  JSON.stringify(
    results.map((r) => ({
      name: r.name,
      width: r.width,
      geometry: r.geometry,
      violations: r.violations,
    })),
    null,
    2,
  ),
);
if (
  results.some(
    (r) => r.violations.length || r.geometry.scrollWidth > r.geometry.width,
  )
)
  process.exitCode = 1;
