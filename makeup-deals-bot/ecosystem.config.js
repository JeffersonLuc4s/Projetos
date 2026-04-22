module.exports = {
  apps: [
    {
      name: "makeup-deals-bot",
      script: "node",
      args: "--require tsx/cjs src/index.ts",
      cwd: "C:\\Users\\Jeff\\Desktop\\Revisão\\ProjetosFinais\\Projetos\\makeup-deals-bot",
      interpreter: "none",
      restart_delay: 5000,
      max_restarts: 10,
      autorestart: true,
    },
  ],
};
