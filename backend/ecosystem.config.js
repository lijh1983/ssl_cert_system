module.exports = {
  apps: [
    {
      name: 'ssl-cert-backend-dev',
      script: 'src/simple-app.ts',
      interpreter: 'node',
      interpreter_args: '--loader ts-node/esm',
      cwd: './backend',
      instances: 1,
      exec_mode: 'fork',
      watch: ['src'],
      watch_delay: 1000,
      ignore_watch: [
        'node_modules',
        'dist',
        'logs',
        'uploads',
        'storage',
        '*.test.ts',
        '*.spec.ts'
      ],
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
        TS_NODE_PROJECT: './tsconfig.json'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      log_file: './logs/pm2-combined.log',
      out_file: './logs/pm2-out.log',
      error_file: './logs/pm2-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_memory_restart: '500M',
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s',
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 8000,
      shutdown_with_message: true,
      source_map_support: true,
      node_args: '--max-old-space-size=512'
    },
    {
      name: 'ssl-cert-backend-full',
      script: 'src/app.ts',
      interpreter: 'node',
      interpreter_args: '--loader ts-node/esm',
      cwd: './backend',
      instances: 1,
      exec_mode: 'fork',
      watch: ['src'],
      watch_delay: 1000,
      ignore_watch: [
        'node_modules',
        'dist',
        'logs',
        'uploads',
        'storage',
        '*.test.ts',
        '*.spec.ts'
      ],
      env: {
        NODE_ENV: 'development',
        PORT: 3001,
        TS_NODE_PROJECT: './tsconfig.json'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      log_file: './logs/pm2-full-combined.log',
      out_file: './logs/pm2-full-out.log',
      error_file: './logs/pm2-full-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_memory_restart: '500M',
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s',
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 8000,
      shutdown_with_message: true,
      source_map_support: true,
      node_args: '--max-old-space-size=512'
    }
  ]
};
