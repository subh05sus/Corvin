import App from "./app";
import { config } from "./config";
import crypto from "crypto";
import logger from "./utils/logger";

const app = new App({
  genReqId: function (request: any) {
    return (request.id = crypto.randomUUID());
  },
  logger: logger,
});

(BigInt.prototype as any).toJSON = function () {
  return Number(this);
};

app.log.info("Corvin Backend App starting");
app.listen({ port: config.port, host: "0.0.0.0" }, (err, address) => {
  if (err) {
    app.log.error(`[ERROR] Failed to start server @ ${address} - ${err}`);
    process.exit(1);
  }
  app.log.info(`Server listening on port ${config.port}`);
  app.log.info(`Server Running in ${config.env} mode`);
});
