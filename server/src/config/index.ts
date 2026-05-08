if (!process.env.NODE_ENV) {
  const dotenv = require("dotenv");
  dotenv.config();
}

import Formatter from "../utils/formatter";
import Config from "./config";

const config = new Config(process.env);
const fmt = new Formatter();

export { config, fmt };
