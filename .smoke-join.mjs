import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const stamp = Date.now();
const mk = (kind) => `${kind}${stamp}@example.com`;

const results = [];
function check(name, cond, extra = "") {
  results.push({ name, pass: Boolean(cond), extra });
  console.log(`${cond ? "PASS" : "FAIL"} — ${name}${extra ? ` (${extra})` : ""}`);
}

async function signUp(page, name, email) {
  await page.goto(`${BASE}/sign-up`);
  await page.fill("#name", name);
  await page.fill("#email", email);
  await page.fill("#password", "password123");
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.startsWith("/sign-up"), { timeout: 20000 });
  await page.waitForTimeout(500);
}

const browser = await chromium.launch({
  channel: "msedge",
  headless: true,
  args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"],
});

async function newUser(name) {
  const ctx = await browser.newContext({ permissions: ["microphone", "camera"] });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log(`[${name} pageerror]`, e.message));
  page.on("console", (m) => {
    if (m.type() === "error") console.log(`[${name} console error]`, m.text());
  });
  return { ctx, page };
}

/** Creates a room through the 3-step wizard. Returns the room code. */
async function createRoom(page, modeLabel) {
  await page.goto(`${BASE}/cinema/create?movie=27205&title=Inception`);
  await page.waitForTimeout(1200);
  check("wizard starts at step 1 even with prefilled movie", await page.locator("text=Step 1 of 3").count() > 0);
  await page.click('button:has-text("Continue")');
  await page.waitForTimeout(300);
  check("step 2 shows the comms mode chooser", await page.locator('button:has-text("Voice + video")').count() > 0);
  await page.click(`button:has-text("${modeLabel}")`);
  await page.waitForTimeout(200);
  await page.click('button:has-text("Continue")');
  await page.waitForTimeout(400);
  await page.locator('button:has-text("Create cinema room")').click();
  await page.waitForURL(/\/cinema\/room\//, { timeout: 20000 });
  return new URL(page.url()).pathname.split("/").pop();
}

const host = await newUser("host");
const guest = await newUser("guest");
guest.page.addInitScript(() => { (window).__CINEMA_DEBUG = true; });
host.page.addInitScript(() => { (window).__CINEMA_DEBUG = true; });

try {
  await signUp(host.page, "Hosty", mk("host"));

  // ---------------------------------------------------------------- VIDEO ROOM
  const code = await createRoom(host.page, "Voice + video");
  check("voice+video room created", Boolean(code), code);

  // Host joins the call first so the guest later has a remote participant.
  check("host sees the call panel", await host.page.locator("text=You’re in control").count() > 0);
  await host.page.locator('button:has-text("Join call")').first().click();
  await host.page.waitForTimeout(9000);
  check("host call connected", await host.page.locator("text=in call").count() > 0);

  await signUp(guest.page, "Guesty", mk("guest"));
  await guest.page.goto(`${BASE}/cinema/join/${code}`);
  await guest.page.waitForTimeout(1500);
  check("join page offers audio/video/silent choices", await guest.page.locator('button:has-text("Audio + video")').count() > 0);

  await guest.page.locator('button:has-text("Audio + video")').click();
  await guest.page.locator('button:has-text("Join room")').click();
  await guest.page.waitForURL(/\/cinema\/room\//, { timeout: 20000 });
  await guest.page.waitForTimeout(2000);

  check("chosen preference is preselected in the call panel", await guest.page.locator('button:has-text("Camera on")').count() > 0);
  check("pre-join camera preview is rendered", await guest.page.locator("video").count() > 0);

  await guest.page.locator('button:has-text("Join with audio + video")').click();
  await guest.page.waitForTimeout(12000);

  check("guest call connected", await guest.page.locator("text=in call").count() > 0);
  await guest.page.waitForTimeout(3000);
  const remoteTiles = await guest.page.locator('div[data-participant]').count();
  const audioCount = await guest.page.evaluate(() => document.querySelectorAll("audio").length);
  console.log("[dbg] guest remote tiles:", remoteTiles, "audio elements:", audioCount);
  const micBtn = guest.page.locator('button[aria-label="Mute microphone"]');
  const camBtn = guest.page.locator('button[aria-label="Turn camera off"]');
  check("guest has a mute control", await micBtn.count() > 0);
  check("guest has a camera control", await camBtn.count() > 0);
  check("remote participant tile shows host name", await guest.page.locator('div[data-participant] >> text=Hosty').count() > 0);
  const audioAttached = await guest.page.evaluate(() =>
    Array.from(document.querySelectorAll("audio")).some((a) => Boolean(a.srcObject)),
  );
  check("remote audio track is attached to an audio element", audioAttached);

  await micBtn.click();
  await guest.page.waitForTimeout(1500);
  check("mute flips to unmute", await guest.page.locator('button[aria-label="Unmute microphone"]').count() > 0);

  await guest.page.locator('button[aria-label="Turn camera off"]').click();
  await guest.page.waitForTimeout(1500);
  check("camera off flips to camera on", await guest.page.locator('button[aria-label="Turn camera on"]').count() > 0);

  await guest.page.locator('button[aria-label="Leave the call"]').click();
  await guest.page.waitForTimeout(800);
  check("leaving the call returns to the setup panel", await guest.page.locator("text=You’re in control").count() > 0);
  check("guest is still in the room after leaving the call", guest.page.url().includes(`/cinema/room/${code}`));

  // --------------------------------------------------------------- VOICE ROOM
  const voiceCode = await createRoom(host.page, "Voice");
  await signUp(guest.page, `GuestyV${stamp}`, mk("guestv"));
  await guest.page.goto(`${BASE}/cinema/join/${voiceCode}`);
  await guest.page.waitForTimeout(1500);
  check("voice room join has no audio+video option", await guest.page.locator('button:has-text("Audio + video")').count() === 0);
  await guest.page.locator('button:has-text("Join room")').click();
  await guest.page.waitForURL(/\/cinema\/room\//, { timeout: 20000 });
  await guest.page.waitForTimeout(1500);
  check("voice room call panel shows", await guest.page.locator("text=Voice room — you can talk").count() > 0);
  check("voice room has no camera toggle", await guest.page.locator('button:has-text("Camera off")').count() === 0);

  // ------------------------------------------------------------ MOVIE ONLY
  const movieCode = await createRoom(host.page, "Movie only");
  await signUp(guest.page, `GuestyM${stamp}`, mk("guestm"));
  await guest.page.goto(`${BASE}/cinema/join/${movieCode}`);
  await guest.page.waitForTimeout(1500);
  check("movie-only join says no mic/camera needed", await guest.page.locator("text=Movie only — no mic or camera").count() > 0);
  await guest.page.locator('button:has-text("Join room")').click();
  await guest.page.waitForURL(/\/cinema\/room\//, { timeout: 20000 });
  await guest.page.waitForTimeout(1500);
  check("movie-only room has no call panel", await guest.page.locator("text=Join call").count() === 0);
  check("movie-only guest still has playback re-sync", await guest.page.locator('button[title="Re-sync to the host"]').count() > 0);
} catch (e) {
  console.log("SCRIPT ERROR:", e.message);
  check("script completed without throwing", false, e.message);
}

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
awaitedShutdown: {
  await browser.close();
}
if (failed.length) {
  console.log("FAILED:", failed.map((f) => f.name).join(" | "));
  process.exitCode = 1;
}
