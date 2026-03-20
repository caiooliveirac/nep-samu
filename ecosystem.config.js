module.exports = {
  apps: [
    {
      name: "nep-samu",
      script: "node_modules/.bin/next",
      args: "start -p 3002",
      cwd: "/home/ubuntu/nep-samu",
      env: {
        NODE_ENV: "production",
        PORT: 3002,
      },
    },
  ],
};
