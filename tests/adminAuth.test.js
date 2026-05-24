import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { safeCompareText } from "../src/services/security.js";

describe("admin auth", () => {
  it("redirects unauthenticated dashboard access to the admin login", async () => {
    const app = createApp({ dbPath: ":memory:", seed: true, adminPassword: "secret" });
    const response = await request(app).get("/admin");

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe("/admin/login");
  });

  it("rejects the wrong admin password", async () => {
    const app = createApp({ dbPath: ":memory:", seed: true, adminPassword: "secret" });
    const response = await request(app).post("/admin/login").send("password=wrong");

    expect(response.status).toBe(401);
    expect(response.text).toContain("비밀번호");
  });

  it("sets an httpOnly admin session cookie after correct password login", async () => {
    const app = createApp({ dbPath: ":memory:", seed: true, adminPassword: "secret" });
    const response = await request(app).post("/admin/login").send("password=secret");
    const cookieHeader = response.headers["set-cookie"].join(";");

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe("/admin");
    expect(cookieHeader).toContain("admin_session=");
    expect(cookieHeader).toContain("HttpOnly");
    expect(cookieHeader).toContain("SameSite=Lax");
  });

  it("safely rejects password comparisons with mismatched lengths", () => {
    expect(() => safeCompareText("short", "much-longer-secret")).not.toThrow();
    expect(safeCompareText("short", "much-longer-secret")).toBe(false);
  });
});
