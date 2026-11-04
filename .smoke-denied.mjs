import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const stamp = Date.now();
const results = [];
const check = (n, c, extra = "") => {
  results.push({ n, c: Boolean(c) });
  console.log(`${c ? "PASS" : "FAIL"} — ${n}${extra ? ` (${extra})` : ""}`);
};

async function signUp(page, name, email) {
  await page.goto(`${BASE}/sign-up`);
  await page.fill("#name", name);
  await page.fill("#email", email);
  await page.fill("#password", "password123");
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.startsWith("/sign-up"), { timeout: 20000 });
  await page.waitForTimeout(400);
}

const browser = await chromium.launch({
  channel: "msedge",
  headless: true,
  args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"],
});
const hostCtx = await browser.newContext({ permissions: ["microphone", "camera"] });
const host = await hostCtx.newPage();

const guestCtx = await browser.newContext({ permissions: ["microphone", "camera"] });
const guest = await guestCtx.newPage();
// Simulate a user who blocked mic/camera at the browser level.
await guest.addInitScript(() => {
  navigator.mediaDevices.getUserMedia = async () => {
    const err = new DOMException("Permission denied", "NotAllowedError");
    throw err;
  };
});

try {
  await signUp(host, "Hosty", `host${stamp}@example.com`);
  await host.goto(`${BASE}/cinema/create?movie=27205&title=Inception`);
  await host.waitForTimeout(1000);
  await host.click('button:has-text("Continue")');
  await host.waitForTimeout(200);
  await host.click('button:has-text("Voice + video")');
  await host.click('button:has-text("Continue")');
  await host.waitForTimeout(300);
  await host.locator('button:has-text("Create cinema room")').click();
  await host.waitForURL(/\/cinema\/room\//, { timeout: 20000 });
  const code = new URL(host.url()).pathname.split("/").pop();

  await signUp(guest, "Guesty", `guest${stamp}@example.com`);
  await guest.goto(`${BASE}/cinema/join/${code}`);
  await guest.waitForTimeout(1200);
  await guest.locator('button:has-text("Join room")').click();
  await guest.waitForURL(/\/cinema\/room\//, { timeout: 20000 });
  await guest.waitForTimeout(1200);
  await guest.locator('button:has-text("Join call")').first().click();
  await guest.waitForTimeout(14000);

  const body = await guest.locator("body").innerText();
  check("call still connects when media permission is denied", body.includes("in call"));
  check("a recoverable mic/camera error is shown", /blocked|denied|allow access/i.test(body));
  check("mute/camera controls still exist", (await guest.locator('button[aria-label="Mute microphone"]').count()) > 0);
  check("guest can still leave the call", (await guest.locator('button[aria-label="Leave the call"]').count()) > 0);
} catch (e) {
  check("script completed", false, e.message);
}

await browser.close();
const failed = results.filter((r) => !r.c);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) process.exitCode = 1;
