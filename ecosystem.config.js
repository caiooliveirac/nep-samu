module.exports = {
  apps: [
    {
      name: "nep-samu",
      script: ".next/standalone/server.js",
      cwd: "/home/ubuntu/nep-samu",
      env: {
        NODE_ENV: "production",
        PORT: 3002,
        HOSTNAME: "0.0.0.0",
      },
    },
  ],
};
