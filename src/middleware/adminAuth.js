import { findSession } from "../services/security.js";

export function attachAdmin(request, _response, next) {
  const token = request.signedCookies.admin_session;
  request.adminSession = findSession(request.db, token, request.config.sessionSecret);
  next();
}

export function requireAdmin(request, response, next) {
  if (!request.adminSession) {
    response.redirect("/admin/login");
    return;
  }

  next();
}

export function requireCsrf(request, response, next) {
  const submittedToken = request.get("x-csrf-token") || request.body.csrfToken;

  if (!request.adminSession || submittedToken !== request.adminSession.csrf_token) {
    response.status(403).send("CSRF token mismatch");
    return;
  }

  next();
}
