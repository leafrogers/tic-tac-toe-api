import config from "../config.ts";
import logger from "./logger.ts";

type ExpressError = (Error & { status: number });

class HttpError extends Error {
  status: number;
  message: string;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.message = message;
  }
}

export const handleAuth = () => {
  const apiKeys = (config.API_KEYS || "").split(",").filter(Boolean);

  if (!apiKeys.length) {
    throw new Error(
      'At least one API key must be set, but none were found. Set a list of API keys via an environment variable called API_KEYS. The variable’s value should be a string of keys separated by commas. Example: API_KEYS="key1,key2"',
    );
  }

  return ({ request }: { request: Request }, next: (arg0?: Error) => void) => {
    const key = request.headers.get("API-Key");
    const requestId = request.headers.get("X-Request-ID");

    if (!key) {
      return next(new HttpError(401, "API key missing"));
    }

    if (!apiKeys.includes(key)) {
      return next(new HttpError(403, "Invalid API key"));
    }

    logger.info({
      event: "AUTH_PASSED",
      keyTail: key.slice(-4),
      requestId,
    });

    next();
  };
};

export const onlyNonProduction = ({}, next: (arg0?: Error) => void) => {
  if (config.IS_PRODUCTION) {
    return next(
      new HttpError(405, "This method or route is not allowed in production"),
    );
  }

  next();
};

export const handleNotFound = (
  { request, response }: { request: Request; response: Response },
) => {
  const requestId = request.headers.get("X-Request-ID");
  const responseObject = {
    game: null,
    message: "Couldn’t find this route",
    status: 404,
  };

  logger.warn({ event: "NOT_FOUND", requestId, ...responseObject });

  response.status = 404;
  response.type = "json";
  response.body = responseObject;
};

export const handleErrors = (
  error: ExpressError | HttpError,
  req: Request,
  res: Response,
) => {
  const requestId = req.headers.get("X-Request-ID");
  const status = error.status || 500;
  const response = {
    game: null,
    message: error.message,
    status,
  };

  logger.error({ event: "REQUEST_ERROR", requestId, ...response }, error.stack);

  res.status = status;
  res.type = "json";
  res.body = response;
};
