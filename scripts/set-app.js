const fs = require('fs');
const path = require('path');

const appType = process.argv[2];

if (!appType || !['cliente', 'vendedor', 'repartidor', 'admin'].includes(appType)) {
  console.log('Uso: node scripts/set-app.js <cliente|vendedor|repartidor|admin>');
  process.exit(1);
}

const source = path.join(__dirname, '..', 'capacitor-configs', `${appType}.ts`);
const dest = path.join(__dirname, '..', 'capacitor.config.ts');

if (!fs.existsSync(source)) {
  console.error(`Config no encontrado: ${source}`);
  process.exit(1);
}

fs.copyFileSync(source, dest);
console.log(`App configurada como: ${appType}`);
