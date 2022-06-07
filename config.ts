export default {
  API_KEYS: Deno.env.get("API_KEYS"),
  APP_FRIENDLY_NAME: "Tic-tac-toe API",
  ID_LENGTH: Number(Deno.env.get("ID_LENGTH")) || 5,
  IS_PRODUCTION: Deno.env.get("NODE_ENV") === "production",
  PORT: Number(Deno.env.get("PORT")) || 3000,
};
