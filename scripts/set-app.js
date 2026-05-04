const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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

const iconSource = path.join(sourceDir, 'icon.png');
const splashSource = path.join(sourceDir, 'splash.png');
const resDir = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');

if (fs.existsSync(iconSource)) {
  const densities = ['mipmap-hdpi', 'mipmap-mdpi', 'mipmap-xhdpi', 'mipmap-xxhdpi', 'mipmap-xxxhdpi'];
  for (const density of densities) {
    const destDir = path.join(resDir, density);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    fs.copyFileSync(iconSource, path.join(destDir, 'ic_launcher.png'));
    fs.copyFileSync(iconSource, path.join(destDir, 'ic_launcher_round.png'));
  }
  console.log(`Icono copiado a todas las densidades`);
}

if (fs.existsSync(splashSource)) {
  const densities = [
    'drawable', 'drawable-hdpi', 'drawable-mdpi', 'drawable-xhdpi', 'drawable-xxhdpi', 'drawable-xxxhdpi',
    'drawable-port-hdpi', 'drawable-port-mdpi', 'drawable-port-xhdpi', 'drawable-port-xxhdpi', 'drawable-port-xxxhdpi',
    'drawable-land-hdpi', 'drawable-land-mdpi', 'drawable-land-xhdpi', 'drawable-land-xxhdpi', 'drawable-land-xxxhdpi',
  ];
  for (const density of densities) {
    const destDir = path.join(resDir, density);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    fs.copyFileSync(splashSource, path.join(destDir, 'splash.png'));
  }
  console.log(`Splash copiado a todas las densidades y orientaciones`);
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
