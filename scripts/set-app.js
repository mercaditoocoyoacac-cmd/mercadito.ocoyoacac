const fs = require('fs');
const path = require('path');

const appType = process.argv[2];

if (!appType || !['cliente', 'vendedor', 'repartidor', 'admin'].includes(appType)) {
  console.log('Uso: node scripts/set-app.js <cliente|vendedor|repartidor|admin>');
  process.exit(1);
}

const appIds = {
  cliente: 'com.mercaditoocoyoacac.cliente',
  vendedor: 'com.mercaditoocoyoacac.vendedor',
  repartidor: 'com.mercaditoocoyoacac.repartidor',
  admin: 'com.mercaditoocoyoacac.admin',
};

const appNames = {
  cliente: 'Mercadito-Compras',
  vendedor: 'Mercadito-Tienda',
  repartidor: 'Mercadito-Entregas',
  admin: 'Mercadito-Admin',
};

// 1. Configuración de Capacitor
const configSource = path.join(__dirname, '..', 'capacitor-configs', `${appType}.ts`);
const configDest = path.join(__dirname, '..', 'capacitor.config.ts');
if (fs.existsSync(configSource)) {
  fs.copyFileSync(configSource, configDest);
  console.log(`capacitor.config.ts actualizado para ${appType}`);
}

// 2. MainActivity.java
const mainActivitySource = path.join(__dirname, '..', 'capacitor-configs', appType, 'MainActivity.java');
const mainActivityDest = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'java', 'com', 'mercaditoocoyoacac', 'app', 'MainActivity.java');

if (fs.existsSync(mainActivitySource)) {
  const destDir = path.dirname(mainActivityDest);
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
  let content = fs.readFileSync(mainActivitySource, 'utf8');
  content = content.replace(/package\s+[^;]+;/, 'package com.mercaditoocoyoacac.app;');
  fs.writeFileSync(mainActivityDest, content);
}

// 3. Iconos y Splash
const sourceDir = path.join(__dirname, '..', 'capacitor-configs', appType);
const iconSource = path.join(sourceDir, 'icon.png');
const splashSource = path.join(sourceDir, 'splash.png');
const resDir = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');

if (fs.existsSync(iconSource)) {
  const mipmapDensities = ['mipmap-hdpi', 'mipmap-mdpi', 'mipmap-xhdpi', 'mipmap-xxhdpi', 'mipmap-xxxhdpi'];
  for (const density of mipmapDensities) {
    const destDir = path.join(resDir, density);
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
    fs.copyFileSync(iconSource, path.join(destDir, 'ic_launcher.png'));
    fs.copyFileSync(iconSource, path.join(destDir, 'ic_launcher_round.png'));
    fs.copyFileSync(iconSource, path.join(destDir, 'ic_launcher_foreground.png'));
  }

  // ELIMINAR XMLs que bloquean el icono PNG en Android 8+
  const anyDpiDir = path.join(resDir, 'mipmap-anydpi-v26');
  if (fs.existsSync(anyDpiDir)) {
      const xmls = ['ic_launcher.xml', 'ic_launcher_round.xml'];
      for (const xml of xmls) {
          const xmlPath = path.join(anyDpiDir, xml);
          if (fs.existsSync(xmlPath)) fs.unlinkSync(xmlPath);
      }
  }
  console.log(`Iconos limpios y actualizados`);
}

if (fs.existsSync(splashSource)) {
  const drawableDensities = ['drawable', 'drawable-hdpi', 'drawable-mdpi', 'drawable-xhdpi', 'drawable-xxhdpi', 'drawable-xxxhdpi'];
  for (const density of drawableDensities) {
    const destDir = path.join(resDir, density);
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
    fs.copyFileSync(splashSource, path.join(destDir, 'splash.png'));
  }
}

// 4. build.gradle
const buildGradle = path.join(__dirname, '..', 'android', 'app', 'build.gradle');
if (fs.existsSync(buildGradle)) {
  let content = fs.readFileSync(buildGradle, 'utf8');
  content = content.replace(/namespace\s*=\s*"[^"]+"/g, `namespace = "com.mercaditoocoyoacac.app"`);
  content = content.replace(/applicationId\s+"[^"]+"/g, `applicationId "${appIds[appType]}"`);
  fs.writeFileSync(buildGradle, content);
}

// 5. strings.xml
const stringsXml = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res', 'values', 'strings.xml');
if (fs.existsSync(stringsXml)) {
  let content = fs.readFileSync(stringsXml, 'utf8');
  content = content.replace(/app_name">[^<]*/, `app_name">${appNames[appType]}`);
  content = content.replace(/custom_url_scheme">[^<]*/, `custom_url_scheme">${appIds[appType]}`);
  fs.writeFileSync(stringsXml, content);
}

console.log(`¡App ${appType} configurada y lista!`);
