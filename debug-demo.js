#!/usr/bin/env node

const fs = require('fs');

const content = fs.readFileSync('./demo.html', 'utf8');

console.log('🔍 调试 demo.html 的 fetchKaitoData 函数检测...\n');

// 寻找 fetchKaitoData 函数（不是 fetchKaitoDataForCollection）
const searchPattern = 'async function fetchKaitoData(duration, topic_id, top_n';
const startIndex = content.indexOf(searchPattern);

if (startIndex !== -1) {
    console.log('✅ 找到 fetchKaitoData 函数');
    
    // 提取函数附近的代码段进行检查
    const contextStart = Math.max(0, startIndex - 1000);
    const contextEnd = Math.min(content.length, startIndex + 5000);
    const functionContext = content.substring(contextStart, contextEnd);
    
    console.log('📏 检查范围:', functionContext.length, '字符\n');
    
    const checks = {
        'fetchFromDirectAPI': functionContext.includes('fetchFromDirectAPI'),
        'fetchFromLocalAPI': functionContext.includes('fetchFromLocalAPI'),
        'loadKolJsonData': functionContext.includes('loadKolJsonData'),
        'getDataFromKolJson': functionContext.includes('getDataFromKolJson'),
        'kol.json': functionContext.includes('kol.json'),
        'generateTestData': functionContext.includes('generateTestData'),
        'generateMockData': functionContext.includes('generateMockData')
    };
    
    console.log('🔍 关键字检查:');
    Object.entries(checks).forEach(([key, value]) => {
        console.log(`  ${value ? '✅' : '❌'} ${key}: ${value}`);
    });
    
    const hasApiCall = checks['fetchFromDirectAPI'] || checks['fetchFromLocalAPI'];
    const hasLocalFallback = checks['loadKolJsonData'] || checks['getDataFromKolJson'] || checks['kol.json'];
    const noTestData = !checks['generateTestData'] && !checks['generateMockData'];
    
    console.log('\n📊 综合评估:');
    console.log(`  API 调用: ${hasApiCall}`);
    console.log(`  本地后备: ${hasLocalFallback}`);
    console.log(`  无测试数据: ${noTestData}`);
    console.log(`  最终结果: ${hasApiCall && hasLocalFallback && noTestData}`);
    
} else {
    console.log('❌ 未找到 fetchKaitoData 函数');
}
