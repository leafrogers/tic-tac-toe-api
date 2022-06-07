import config from "../config.ts";
import app from "./app.ts";
import logger from "./logger.ts";

const { PORT } = config;

app.listen({ port: PORT });

logger.info({
  event: "APP_STARTED",
  message: `Listening on port ${PORT}`,
  url: `http://localhost:${PORT}`,
});
