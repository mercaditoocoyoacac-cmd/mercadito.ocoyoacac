const fs = require('fs');
const path = require('path');

const appType = process.argv[2];

if (!appType || !['cliente', 'vendedor', 'repartidor', 'admin'].includes(appType)) {
  console.log('Uso: node scripts/set-app.js <cliente|vendedor|repartidor|admin>');
  process.exit(1);
}

const appIds = {
  cliente: 'com.mercadito.ocoyoacac.app.compras',
  vendedor: 'com.mercadito.ocoyoacac.app.tienda',
  repartidor: 'com.mercadito.ocoyoacac.app.entregas',
  admin: 'com.mercadito.ocoyoacac.app.admin',
};

const appNames = {
  cliente: 'Mercadito-Compras',
  vendedor: 'Mercadito-Tienda',
  repartidor: 'Mercadito-Entregas',
  admin: 'Mercadito-Admin',
};

const appVersions = {
  cliente:    { code: 1, name: "1.0.0" },
  vendedor:   { code: 1, name: "1.0.0" },
  repartidor: { code: 1, name: "1.0.0" },
  admin:      { code: 1, name: "1.0.0" },
};

// 1. Configuración de Capacitor
const configSource = path.join(__dirname, '..', 'capacitor-configs', `${appType}.ts`);
const configDest = path.join(__dirname, '..', 'capacitor.config.ts');
if (fs.existsSync(configSource)) {
  fs.copyFileSync(configSource, configDest);
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
  const anyDpiDir = path.join(resDir, 'mipmap-anydpi-v26');
  if (fs.existsSync(anyDpiDir)) {
      ['ic_launcher.xml', 'ic_launcher_round.xml'].forEach(xml => {
          const p = path.join(anyDpiDir, xml);
          if (fs.existsSync(p)) fs.unlinkSync(p);
      });
  }
}

if (fs.existsSync(splashSource)) {
  ['drawable', 'drawable-hdpi', 'drawable-mdpi', 'drawable-xhdpi', 'drawable-xxhdpi', 'drawable-xxxhdpi'].forEach(density => {
    const destDir = path.join(resDir, density);
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
    fs.copyFileSync(splashSource, path.join(destDir, 'splash.png'));
  });
}

// 4. build.gradle (Identidad + Versiones)
const buildGradle = path.join(__dirname, '..', 'android', 'app', 'build.gradle');
if (fs.existsSync(buildGradle)) {
  let content = fs.readFileSync(buildGradle, 'utf8');
  content = content.replace(/namespace\s*=\s*"[^"]+"/g, `namespace = "com.mercaditoocoyoacac.app"`);
  content = content.replace(/applicationId\s+"[^"]+"/g, `applicationId "${appIds[appType]}"`);
  content = content.replace(/versionCode\s+\d+/g, `versionCode ${appVersions[appType].code}`);
  content = content.replace(/versionName\s+"[^"]+"/g, `versionName "${appVersions[appType].name}"`);
  fs.writeFileSync(buildGradle, content);
}

// 5. strings.xml
const stringsXml = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res', 'values', 'strings.xml');
if (fs.existsSync(stringsXml)) {
  let content = fs.readFileSync(stringsXml, 'utf8');
  content = content.replace(/app_name">[^<]*/, `app_name">${appNames[appType]}`);
  content = content.replace(/package_name">[^<]*/, `package_name">${appIds[appType]}`);
  content = content.replace(/custom_url_scheme">[^<]*/, `custom_url_scheme">${appIds[appType]}`);
  fs.writeFileSync(stringsXml, content);
}

console.log(`¡Configuración de PRODUCCIÓN lista para ${appNames[appType]}!`);
console.log(`Nuevo Package Name: ${appIds[appType]}`);
console.log(`Versión: ${appVersions[appType].name} (Código: ${appVersions[appType].code})`);
