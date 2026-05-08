#!/usr/bin/env tsx
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { render } from "ink";
import React from "react";
// The App component must be imported. We rely on index.tsx exporting it.
import { App } from "./index.js";
import { config } from "./config.js";
import * as dotenv from "dotenv";
import chalk from "chalk";

// --- Configuration Constants ---
const HOME_DIR = os.homedir();
const CORVIN_DIR = path.join(HOME_DIR, ".corvin");
const CONFIG_PATH = path.join(CORVIN_DIR, "config");
const CONFIG_CONTENT = `# Corvin Configuration File
#
# Place your Corvin API key here.
# You can get a key from Corvin Web Studio.
#
API_KEY=
`;

function isCustomBackend(): boolean {
  const url = config.api_base_url || "";
  const defaultProdUrl = "https://corvin-api.thatdevguy.in/v2/api";
  return !!url && url !== defaultProdUrl;
}

function handleInit() {
  if (fs.existsSync(CONFIG_PATH)) {
    console.warn(`
⚠️ Warning: Corvin configuration already exists.
Path: ${CONFIG_PATH}
If you need to re-initialize, please delete the file first.
`);
    process.exit(0);
  }

  try {
    if (!fs.existsSync(CORVIN_DIR)) {
      fs.mkdirSync(CORVIN_DIR, { recursive: true });
      console.log(`✅ Created configuration directory: ${CORVIN_DIR}`);
    }

    fs.writeFileSync(CONFIG_PATH, CONFIG_CONTENT);
    console.log(`
🎉 Successfully initialized Corvin!
Configuration file created at: ${CONFIG_PATH}

Please edit this file and add your Corvin API KEY:
API_KEY=<YOUR_CORVIN_API_KEY>

Then run: debug <your command here>
(e.g., debug npm run dev)
`);
    process.exit(0);
  } catch (error) {
    console.error(`\n❌ Error initializing Corvin:`, error);
    process.exit(1);
  }
}

function runTuiApp() {
  dotenv.config({ path: CONFIG_PATH, override: true, quiet: true });

  const customBackend = isCustomBackend();
  if (
    !customBackend &&
    (!process.env.API_KEY || process.env.API_KEY.trim() === "")
  ) {
    const pathDisplay = CONFIG_PATH;

    console.error(
      chalk.redBright(
        "\n❌ ERROR: API_KEY is missing or empty in your configuration file."
      )
    );
    console.error(
      chalk.yellow(`Please edit ${pathDisplay} and add your API key.\n`)
    );
    process.exit(1);
  }

  if (!fs.existsSync(CONFIG_PATH)) {
    console.error(`
❌ Corvin is not configured.
Please run: debug init
`);
    process.exit(1);
  }
  // add custom logic to verify API KEY authenticity

  render(React.createElement(App, {}));
}

const args = process.argv.slice(2);
const command = args[0];

if (command === "init") {
  handleInit();
} else if (command) {
  runTuiApp();
} else {
  console.log(`
Corvin - Your AI-powered CLI Debugger.

Usage:
  debug init          - Create the configuration file (~/.corvin/config)
  debug <command>...  - Run a command and launch the interactive AI debugger
`);
  process.exit(0);
}
