const Handlebars = require('handlebars');
const fs = require('fs-extra');
const path = require('path');

// 註冊 Handlebars 輔助函數
Handlebars.registerHelper('keys', function(obj) {
    return Object.keys(obj);
});

Handlebars.registerHelper('first', function(array) {
    return array[0];
});

Handlebars.registerHelper('lookup', function(obj, key) {
    return obj[key];
});

async function build() {
    // 確保輸出目錄存在
    await fs.ensureDir('dist');

    // 讀取模板
    const templateContent = await fs.readFile('templates/main.hbs', 'utf-8');
    const template = Handlebars.compile(templateContent);

    // 讀取數據
    const data = await fs.readJson('data.json');

    // 生成頁面
    const html = template(data);
    await fs.writeFile('dist/index.html', html);

    // 複製靜態資源
    await fs.copy('data.json', 'dist/data.json');
    await fs.copy('style.css', 'dist/style.css');
    await fs.copy('script.js', 'dist/script.js');
    await fs.copy('images', 'dist/images');

    console.log('靜態網站生成完成！');
}

build().catch(console.error); 