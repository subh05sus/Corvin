module.exports = {
  apps: [
    {
      name: "clippy-api-v2",
      script: "./build/src/server.js",
      autorestart: true,
      watch: false,
      max_memory_restart: "2G",
    },
  ],
};
