import { controller, http } from "@fastr/controller";
import { Context } from "@fastr/core";
import { injectable } from "@fastr/invert";

@injectable()
@controller()
export class Controller {
  @http.GET("/healthz")
  ["healthz"](ctx: Context) {
    ctx.response.type = "text/plain";
    ctx.response.body = "ok";
  }
}
