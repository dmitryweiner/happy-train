#!/usr/bin/env node

/**
 * Скрипт для анализа различий в визуальных тестах
 * 
 * Использование:
 * node analyze-diffs.js
 */

const fs = require('fs');
const path = require('path');

// Получаем все diff-файлы
const diffDir = path.join(__dirname, 'fixtures');

if (!fs.existsSync(diffDir)) {
  console.log('Директория с эталонными изображениями не найдена. Запустите тесты первый раз для создания эталонов.');
  process.exit(1);
}

const diffFiles = fs.readdirSync(diffDir)
  .filter(file => file.endsWith('-diff.png'));

if (diffFiles.length === 0) {
  console.log('Все тесты прошли успешно, различий нет! 🎉');
} else {
  console.log(`\x1b[33mНайдено ${diffFiles.length} файлов с различиями:\x1b[0m`);
  
  diffFiles.forEach((file, index) => {
    // Получаем оригинальное имя теста из имени diff-файла
    const baseName = file.replace('-diff.png', '');
    const originalFile = path.join(diffDir, `${baseName}.png`);
    
    // Проверяем наличие оригинального файла
    const originalExists = fs.existsSync(originalFile);
    
    console.log(`${index + 1}. ${file} ${originalExists ? '✓' : '✗'}`);
    
    // Если оригинал существует, выводим информацию о размерах
    if (originalExists) {
      const diffStat = fs.statSync(path.join(diffDir, file));
      const origStat = fs.statSync(originalFile);
      
      console.log(`   Размер оригинала: ${(origStat.size / 1024).toFixed(2)} KB`);
      console.log(`   Размер различий: ${(diffStat.size / 1024).toFixed(2)} KB`);
      console.log(`   Путь: ${path.join(diffDir, file)}`);
    } else {
      console.log(`   \x1b[31mОригинальный файл для сравнения не найден!\x1b[0m`);
    }
    
    console.log(''); // Пустая строка для разделения
  });
  
  console.log('\nДля обновления эталонных изображений выполните:');
  console.log('\x1b[32mnpm run test:visual:update\x1b[0m');
  console.log('\nДля просмотра различий откройте файлы -diff.png в графическом редакторе.');
} 