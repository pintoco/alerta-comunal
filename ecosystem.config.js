// PM2 process manager para correr en EC2 (fuera de Railway).
// Uso: pm2 start ecosystem.config.js --env production
module.exports = {
  apps: [
    {
      name: 'alertacomunal',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      cwd: __dirname,
      instances: 2,
      exec_mode: 'cluster',
      env: {
        PORT: 3000,
      },
      max_memory_restart: '400M',
      autorestart: true,
    },
  ],
}
