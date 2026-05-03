const fs = require('fs');
const path = require('path');

const appType = process.argv[2];

if (!appType || !['cliente', 'vendedor', 'repartidor', 'admin'].includes(appType)) {
  console.log('Uso: node scripts/set-app.js <cliente|vendedor|repartidor|admin>');
  process.exit(1);
}

const baseDir = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'java', 'com', 'mercaditoocoyoacac');
const appIds = {
  cliente: 'com.mercaditoocoyoacac.cliente',
  vendedor: 'com.mercaditoocoyoacac.vendedor',
  repartidor: 'com.mercaditoocoyoacac.repartidor',
  admin: 'com.mercaditoocoyoacac.admin',
};

const configSource = path.join(__dirname, '..', 'capacitor-configs', `${appType}.ts`);
const configDest = path.join(__dirname, '..', 'capacitor.config.ts');

if (!fs.existsSync(configSource)) {
  console.error(`Config no encontrado: ${configSource}`);
  process.exit(1);
}

fs.copyFileSync(configSource, configDest);
console.log(`capacitor.config.ts actualizado para ${appType}`);

for (const app of Object.keys(appIds)) {
  const dir = path.join(baseDir, app);
  const file = path.join(dir, 'MainActivity.java');
  if (fs.existsSync(file)) {
    fs.rmSync(file, { force: true });
  }
}

const sourceDir = path.join(__dirname, '..', 'capacitor-configs', appType);
const sourceFile = path.join(sourceDir, 'MainActivity.java');
const targetDir = path.join(baseDir, appType);
const targetFile = path.join(targetDir, 'MainActivity.java');

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

if (fs.existsSync(sourceFile)) {
  fs.copyFileSync(sourceFile, targetFile);
  console.log(`MainActivity.java instalado en ${appType}/`);
}

const buildGradle = path.join(__dirname, '..', 'android', 'app', 'build.gradle');
if (fs.existsSync(buildGradle)) {
  let content = fs.readFileSync(buildGradle, 'utf8');
  content = content.replace(/namespace\s*=\s*"[^"]+"/g, `namespace = "${appIds[appType]}"`);
  content = content.replace(/applicationId\s+"[^"]+"/g, `applicationId "${appIds[appType]}"`);
  fs.writeFileSync(buildGradle, content);
  console.log(`build.gradle actualizado: namespace + applicationId = ${appIds[appType]}`);
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
  content = content.replace(/custom_url_scheme"[^>]*>[^<]*/, `custom_url_scheme">${appIds[appType]}`);
  fs.writeFileSync(stringsXml, content);
  console.log(`strings.xml actualizado: nombre = ${appNames[appType]}`);
}

console.log(`App configurada como: ${appType}`);
