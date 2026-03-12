import { test } from "node:test";
import { request } from "@fastr/client";
import { start } from "@fastr/client-testlib";
import { allToRoutes } from "@fastr/controller";
import { Application } from "@fastr/core";
import { Router } from "@fastr/middleware-router";
import { equal } from "rich-assert";
import { createTestServer } from "../test/request.ts";
import { Controller } from "./controller.ts";

test("returns a health status", async () => {
  const app = new Application().use(
    new Router().registerAll(allToRoutes(Controller)).middleware(),
  );

  const response = await request
    .use(start(createTestServer(app.callback())))
    .GET("/healthz")
    .send();

  equal(response.status, 200);
  equal(await response.body.text(), "ok");
});
