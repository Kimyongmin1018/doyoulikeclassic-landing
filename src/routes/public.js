import { Router } from "express";
import { buildPublicModel } from "../services/publicModel.js";

export const publicRouter = Router();

publicRouter.get("/", (request, response, next) => {
  const model = buildPublicModel(request.db);

  response.render("index", { title: model.serviceName, model }, (error, html) => {
    if (error) {
      next(error);
      return;
    }

    response.render("layout", {
      title: model.serviceName,
      body: html
    });
  });
});
