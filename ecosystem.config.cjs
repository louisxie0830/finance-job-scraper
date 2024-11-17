const os = require('os');

const totalMemoryGB = Math.floor(os.totalmem() / 1024 / 1024 / 1024);

module.exports = {
  apps: [
    {
      name: 'finance-job-scraper',
      script: './src/app.js',
      instances: '1',
      // exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: `${totalMemoryGB}G`,
      error_file: "./logs/error.log",
      out_file: "./logs/output.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      cron_restart: "0 2 * * *",
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
