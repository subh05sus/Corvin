import dotenv from "dotenv";
import { getConfigValue } from "./helpers/cli-helpers.js";

dotenv.config({ quiet: true });

export const config = {
  websocket_url: getConfigValue(
    "WEB_SOCKET_URL",
    "wss://api.corvin.dev/v2/ws"
  ),
  api_base_url: getConfigValue(
    "API_BASE_URL",
    "https://api.corvin.dev/v2/api"
  ),
};
