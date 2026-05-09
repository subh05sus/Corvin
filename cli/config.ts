import dotenv from "dotenv";
import { getConfigValue } from "./helpers/cli-helpers.js";

dotenv.config({ quiet: true });

export const config = {
  websocket_url: getConfigValue(
    "WEB_SOCKET_URL",
    "wss://corvin-api.thatdevguy.in/v2/ws"
  ),
  api_base_url: getConfigValue(
    "API_BASE_URL",
    "https://corvin-api.thatdevguy.in/v2/api"
  ),
  web_dashboard_url: getConfigValue(
    "WEB_DASHBOARD_URL",
    "http://localhost:3001"
  ),
};
