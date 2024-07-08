const os = require('os');

const totalMemoryGB = Math.floor(os.totalmem() / 1024 / 1024 / 1024);

module.exports = {
  apps: [
    {
      name: 'finance-job-scraper',
      script: './src/app.js',
      instances: 'max',
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: `${totalMemoryGB}G`,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
