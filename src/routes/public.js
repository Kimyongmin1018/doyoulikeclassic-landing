import { Router } from "express";
import { buildPublicModel } from "../services/publicModel.js";
import { recordPublicVisit, recordTrafficEvent } from "../services/trafficService.js";

export const publicRouter = Router();

const defaultMeta = {
  title: "[클래식 로테이션 소개팅] 클래식을 좋아하세요..?",
  description: [
    "전공자부터 애호가까지, 클래식을 사랑하는 누구나! 좋아하는 음악이 같다는 건,",
    "이미 좋은 시작입니다.",
    "같은 취향, 같은 설렘을 만나는 클래식 로테이션 소개팅."
  ].join("\n"),
  imageUrl: "/assets/images/search-preview-classic-rotation.jpg",
  imageAlt: "클래식을 좋아하세요 클래식 로테이션 소개팅 포스터",
  naverVerification: "e4244507795bed3d205bec2c7b58aa64a6242b9d"
};

function resolvePublicUrl(publicBaseUrl, value) {
  if (typeof value !== "string" || !value.trim()) return "";

  const trimmed = value.trim();

  try {
    return new URL(trimmed).toString();
  } catch {
    const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    return `${publicBaseUrl}${path}`;
  }
}

publicRouter.post("/traffic/event", (request, response) => {
  const fetchSite = request.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "same-site") {
    response.status(204).end();
    return;
  }

  recordTrafficEvent(request, response);
  response.status(204).end();
});

publicRouter.get("/", (request, response, next) => {
  if (request.method === "GET") {
    recordPublicVisit(request, response);
  }

  const model = buildPublicModel(request.db);
  const publicBaseUrl = request.config.publicBaseUrl.replace(/\/$/, "");
  const seo = model.content.seo || {};
  const meta = {
    title: seo.title || defaultMeta.title,
    description: seo.description || defaultMeta.description,
    canonicalUrl: `${publicBaseUrl}/`,
    imageUrl: resolvePublicUrl(publicBaseUrl, seo.imageUrl || defaultMeta.imageUrl),
    imageWidth: 1200,
    imageHeight: 1500,
    imageAlt: seo.imageAlt || defaultMeta.imageAlt,
    siteName: "클래식을 좋아하세요..?",
    naverVerification: seo.naverVerification || defaultMeta.naverVerification
  };
  meta.jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: meta.title,
    description: meta.description,
    url: meta.canonicalUrl,
    image: meta.imageUrl,
    inLanguage: "ko-KR"
  }).replace(/</g, "\\u003c");

  response.render("index", { title: meta.title, model }, (error, html) => {
    if (error) {
      next(error);
      return;
    }

    response.render("layout", {
      title: meta.title,
      meta,
      body: html
    });
  });
});
