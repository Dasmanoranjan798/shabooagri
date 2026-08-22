import { app } from "./app";
import { env } from "./config/env";
import { logger } from "./shared/logger";

app.listen(env.PORT, () => {
  logger.info("server.started", { port: env.PORT });
});
