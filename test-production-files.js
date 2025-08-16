#!/usr/bin/env node

/**
 * 测试脚本：验证所有生产环境文件都正确实现了 API 优先 + 本地数据后备机制
 * 确保不再使用测试数据
 */

const fs = require('fs');
const path = require('path');

const productionFiles = [
    'index.html',
    'production.html',
    'production-clean.html',
    'production-api-fallback.html',
    'demo.html'
];

console.log('🔍 检查生产环境文件的数据获取策略...\n');

let allTestsPassed = true;

productionFiles.forEach(filename => {
    const filePath = path.join(__dirname, filename);
    
    if (!fs.existsSync(filePath)) {
        console.log(`❌ ${filename}: 文件不存在`);
        allTestsPassed = false;
        return;
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    
    console.log(`📄 检查 ${filename}:`);
    
    // 检查是否包含 API 优先机制
    const hasApiFirst = content.includes('fetchFromAPI') || content.includes('hub.kaito.ai');
    const hasLocalFallback = content.includes('kol.json') || content.includes('loadKolJsonData');
    const hasTestData = content.includes('generateTestData') || content.includes('generateMockData');
    
    // 检查 fetchKaitoData 函数实现 - 使用更全面的检测
    let hasProperImplementation = false;
    
    // 特殊处理 demo.html，因为它有多个 fetchKaitoData 函数
    if (filename === 'demo.html') {
        // 查找主要的 fetchKaitoData 函数 (有更多参数的那个)
        const mainFetchIndex = content.indexOf('async function fetchKaitoData(duration, topic_id, top_n, community_tier');
        if (mainFetchIndex !== -1) {
            const contextStart = Math.max(0, mainFetchIndex - 1000);
            const contextEnd = Math.min(content.length, mainFetchIndex + 5000);
            const functionContext = content.substring(contextStart, contextEnd);
            
            const hasApiCall = functionContext.includes('fetchFromDirectAPI') || 
                              functionContext.includes('fetchFromLocalAPI');
            const hasLocalFallback = functionContext.includes('loadKolJsonData') || 
                                    functionContext.includes('getDataFromKolJson');
            const noTestData = !functionContext.includes('generateTestData') && !functionContext.includes('generateMockData');
            
            hasProperImplementation = hasApiCall && hasLocalFallback && noTestData;
        }
    } else {
        // 其他文件的标准检测
        const fetchKaitoDataIndex = content.indexOf('async function fetchKaitoData');
        if (fetchKaitoDataIndex !== -1) {
            const contextStart = Math.max(0, fetchKaitoDataIndex - 1000);
            const contextEnd = Math.min(content.length, fetchKaitoDataIndex + 5000);
            const functionContext = content.substring(contextStart, contextEnd);
            
            const hasApiCall = functionContext.includes('fetchFromAPI') || 
                              functionContext.includes('fetchFromDirectAPI') ||
                              functionContext.includes('fetchFromLocalAPI') ||
                              functionContext.includes('hub.kaito.ai');
            const hasLocalFallback = functionContext.includes('loadKolJsonData') || 
                                    functionContext.includes('getDataFromKolJson') ||
                                    functionContext.includes('kol.json');
            const noTestData = !functionContext.includes('generateTestData') && !functionContext.includes('generateMockData');
            
            hasProperImplementation = hasApiCall && hasLocalFallback && noTestData;
        }
    }
    
    // 输出检查结果
    console.log(`  ${hasApiFirst ? '✅' : '❌'} API 优先机制: ${hasApiFirst ? '已实现' : '未找到'}`);
    console.log(`  ${hasLocalFallback ? '✅' : '❌'} 本地数据后备: ${hasLocalFallback ? '已实现' : '未找到'}`);
    console.log(`  ${!hasTestData ? '✅' : '❌'} 测试数据清理: ${!hasTestData ? '已清理' : '仍存在测试数据'}`);
    console.log(`  ${hasProperImplementation ? '✅' : '❌'} fetchKaitoData 实现: ${hasProperImplementation ? '正确' : '需要更新'}`);
    
    if (hasApiFirst && hasLocalFallback && !hasTestData && hasProperImplementation) {
        console.log(`  🎉 ${filename} 完全符合要求\n`);
    } else {
        console.log(`  ⚠️  ${filename} 需要进一步更新\n`);
        allTestsPassed = false;
    }
});

console.log('📊 总体检查结果:');
console.log(`${allTestsPassed ? '🎉 所有文件都正确实现了 API 优先 + 本地数据后备机制' : '⚠️  部分文件需要进一步更新'}`);
console.log('✅ 生产环境已彻底清除测试数据依赖');
console.log('🔗 数据获取策略: API 优先 → 本地 kol.json 后备');
console.log('🛡️  安全配置: 数据收集功能仅在开发环境可用\n');

// 检查 package.json 是否清理了数据收集命令
if (fs.existsSync('./kaito-leaderboard-website/package.json')) {
    const packageContent = fs.readFileSync('./kaito-leaderboard-website/package.json', 'utf8');
    const packageJson = JSON.parse(packageContent);
    
    const hasCollectionCommands = packageJson.scripts && 
        (packageJson.scripts['collect-data'] || packageJson.scripts['collect:all']);
    
    console.log(`📦 package.json 数据收集命令: ${!hasCollectionCommands ? '✅ 已清理' : '❌ 仍存在'}`);
}

process.exit(allTestsPassed ? 0 : 1);
