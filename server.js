const { start } = require('./src/server');

start().catch((error) => {
  console.error('Startup failed:', error);
  process.exit(1);
});
