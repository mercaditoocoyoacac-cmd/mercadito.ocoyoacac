const fs = require('fs');
const path = require('path');

const appType = process.argv[2];

if (!appType || !['cliente', 'vendedor', 'repartidor', 'admin'].includes(appType)) {
  console.log('Uso: node scripts/set-app.js <cliente|vendedor|repartidor|admin>');
  process.exit(1);
}

const configSource = path.join(__dirname, '..', 'capacitor-configs', `${appType}.ts`);
const configDest = path.join(__dirname, '..', 'capacitor.config.ts');

if (!fs.existsSync(configSource)) {
  console.error(`Config no encontrado: ${configSource}`);
  process.exit(1);
}

fs.copyFileSync(configSource, configDest);

const appDir = path.join(__dirname, '..', 'capacitor-configs', appType);
const mainActivitySource = path.join(appDir, 'MainActivity.java');
const mainActivityDest = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'java', 'com', 'mercaditoocoyoacac', 'app', 'MainActivity.java');

if (fs.existsSync(mainActivitySource)) {
  const destDir = path.dirname(mainActivityDest);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  fs.copyFileSync(mainActivitySource, mainActivityDest);
  console.log(`MainActivity.java copiado para ${appType}`);
}

const appIds = {
  cliente: 'com.mercaditoocoyoacac.cliente',
  vendedor: 'com.mercaditoocoyoacac.vendedor',
  repartidor: 'com.mercaditoocoyoacac.repartidor',
  admin: 'com.mercaditoocoyoacac.admin',
};

const buildGradle = path.join(__dirname, '..', 'android', 'app', 'build.gradle');
if (fs.existsSync(buildGradle)) {
  let content = fs.readFileSync(buildGradle, 'utf8');
  content = content.replace(/applicationId\s+"[^"]+"/g, `applicationId "${appIds[appType]}"`);
  fs.writeFileSync(buildGradle, content);
  console.log(`Application ID actualizado: ${appIds[appType]}`);
}

const stringsXml = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res', 'values', 'strings.xml');
if (fs.existsSync(stringsXml)) {
  let content = fs.readFileSync(stringsXml, 'utf8');
  const appNames = {
    cliente: 'Mercadito Cliente',
    vendedor: 'Mercadito Vendedor',
    repartidor: 'Mercadito Repartidor',
    admin: 'Mercadito Admin',
  };
  content = content.replace(/app_name"[^>]*>[^<]*/, `app_name">${appNames[appType]}`);
  fs.writeFileSync(stringsXml, content);
}

console.log(`App configurada como: ${appType}`);
