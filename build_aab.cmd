@echo off
set JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-21.0.11.10-hotspot
set ANDROID_HOME=C:\Users\EducaciónEspecialUSA\AppData\Local\Android\Sdk
cd /d C:\Users\mercadito.ocoyoacac\android
call gradlew.bat bundleRelease
