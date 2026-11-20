import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// No R2 / Durable Object overrides on purpose: this app has no storage needs
// beyond Next's own caching, so the Worker runs with the default cache and the
// deploy needs nothing provisioned in the account.
export default defineCloudflareConfig({});
