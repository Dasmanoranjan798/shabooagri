import { app } from "./app";
import { env } from "./config/env";

app.listen(env.PORT, () => {
  console.log(`ShabooAgri Platform API listening on port ${env.PORT} (${env.NODE_ENV})`);
});
