module.exports = {
  apps: [
    {
      name: 'finance-job-scraper',
      script: './dist/server.js',
      // A single process: the shared Chrome, cache and rate limiter all live in memory.
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: process.env.MAX_MEMORY_RESTART || '1G',
      kill_timeout: 10000,
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-output.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      cron_restart: '0 2 * * *',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
