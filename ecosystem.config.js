module.exports = {
  apps: [
    {
      name: 'finance-job-scraper',
      script: './src/app.js',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
    },
  ],
};