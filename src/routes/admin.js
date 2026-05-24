import { Router } from "express";
import rateLimit from "express-rate-limit";
import { attachAdmin, requireAdmin, requireCsrf } from "../middleware/adminAuth.js";
import { getEventForAdmin, getFeaturedEventForAdmin, listEvents, updateEvent } from "../services/adminService.js";
import { buildPublicModel } from "../services/publicModel.js";
import { createSession, destroySession, safeCompareText } from "../services/security.js";

export const adminRouter = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false
});

function renderWithLayout(response, view, viewModel, next) {
  response.render(view, viewModel, (error, html) => {
    if (error) {
      next(error);
      return;
    }

    response.render("layout", {
      title: viewModel.title,
      body: html
    });
  });
}

function writeAuditLog(request, action, detail = "") {
  request.db
    .prepare("insert into admin_audit_log (action, detail, ip_address) values (?, ?, ?)")
    .run(action, detail, request.ip);
}

function renderDashboard(request, response, next, options = {}) {
  const model = buildPublicModel(request.db);
  const adminFeaturedEvent = getFeaturedEventForAdmin(request.db);
  const events = listEvents(request.db);

  renderWithLayout(
    response,
    "admin-dashboard",
    {
      title: "관리자",
      csrfToken: request.adminSession.csrf_token,
      model,
      adminFeaturedEvent,
      events,
      error: options.error || ""
    },
    next
  );
}

adminRouter.use(attachAdmin);

adminRouter.get("/login", (request, response, next) => {
  if (request.adminSession) {
    response.redirect("/admin");
    return;
  }

  renderWithLayout(response, "admin-login", { title: "관리자 로그인", error: "" }, next);
});

adminRouter.post("/login", loginLimiter, (request, response, next) => {
  const password = request.body.password || "";

  if (!safeCompareText(password, request.config.adminPassword)) {
    writeAuditLog(request, "login_failed", "wrong password");
    response.status(401);
    renderWithLayout(
      response,
      "admin-login",
      { title: "관리자 로그인", error: "비밀번호를 확인해 주세요." },
      next
    );
    return;
  }

  const session = createSession(request.db, request.config.sessionSecret);

  response.cookie("admin_session", session.token, {
    httpOnly: true,
    signed: true,
    sameSite: "lax",
    secure: request.config.secureCookies,
    expires: new Date(session.expiresAt)
  });

  writeAuditLog(request, "login_success");
  response.redirect("/admin");
});

adminRouter.post("/logout", requireAdmin, requireCsrf, (request, response) => {
  destroySession(request.db, request.signedCookies.admin_session, request.config.sessionSecret);
  response.clearCookie("admin_session", {
    httpOnly: true,
    sameSite: "lax",
    secure: request.config.secureCookies
  });
  response.redirect("/admin/login");
});

adminRouter.get("/", requireAdmin, (request, response, next) => {
  renderDashboard(request, response, next);
});

adminRouter.post("/events/:id", requireAdmin, requireCsrf, (request, response, next) => {
  const event = getEventForAdmin(request.db, request.params.id);

  if (!event) {
    response.status(404).send("Event not found");
    return;
  }

  try {
    updateEvent(request.db, request.params.id, request.body);
    writeAuditLog(request, "event_updated", request.params.id);
    response.redirect("/admin");
  } catch (error) {
    response.status(400);
    renderDashboard(request, response, next, { error: error.message });
  }
});
