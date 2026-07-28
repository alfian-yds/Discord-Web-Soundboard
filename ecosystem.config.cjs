// PM2 config to run the bot 24/7 on a VPS.
// Run from the project folder: pm2 start ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: 'soundboard',
      script: 'src/index.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 15,
      min_uptime: '10s',
      watch: false,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
