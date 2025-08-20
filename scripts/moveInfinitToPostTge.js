#!/usr/bin/env node

/**
 * 移动 INFINIT 项目从 PRE_TGE 到 POST_TGE
 * 由于 INFINIT 最近换了，需要重新分类
 */

const fs = require('fs');
const path = require('path');

// 文件路径
const kolJsonPath = path.join(__dirname, '..', 'kol.json');
const backupPath = path.join(__dirname, '..', `kol_backup_infinit_move_${Date.now()}.json`);

console.log('🔄 INFINIT 项目分类迁移工具');
console.log('============================');

function moveInfinitToPostTge() {
    try {
        // 读取当前 kol.json
        console.log('📖 读取 kol.json 文件...');
        const kolData = JSON.parse(fs.readFileSync(kolJsonPath, 'utf8'));
        
        // 创建备份
        console.log('💾 创建备份文件...');
        fs.writeFileSync(backupPath, JSON.stringify(kolData, null, 2));
        console.log(`   ✅ 备份保存至: ${path.basename(backupPath)}`);
        
        // 检查 INFINIT 是否在 pre_tge 中
        if (!kolData.categories || !kolData.categories.pre_tge || !kolData.categories.pre_tge.INFINIT) {
            console.log('❌ 错误: 在 categories.pre_tge 中未找到 INFINIT 项目');
            return false;
        }
        
        // 检查 post_tge 是否存在
        if (!kolData.categories.post_tge) {
            console.log('❌ 错误: categories.post_tge 部分不存在');
            return false;
        }
        
        console.log('🔍 验证 INFINIT 项目数据...');
        const infinitData = kolData.categories.pre_tge.INFINIT;
        
        // 验证数据完整性
        const timeIntervals = ['7d', '30d', '3m', '6m', '12m'];
        let totalKols = 0;
        
        timeIntervals.forEach(interval => {
            if (infinitData[interval] && Array.isArray(infinitData[interval])) {
                totalKols += infinitData[interval].length;
                console.log(`   📊 ${interval}: ${infinitData[interval].length} 个KOL`);
            }
        });
        
        console.log(`   📈 总计: ${totalKols} 个数据点`);
        
        // 执行移动操作
        console.log('🚚 开始移动 INFINIT 项目...');
        
        // 1. 复制到 post_tge
        kolData.categories.post_tge.INFINIT = infinitData;
        console.log('   ✅ 已复制到 POST_TGE');
        
        // 2. 从 pre_tge 删除
        delete kolData.categories.pre_tge.INFINIT;
        console.log('   ✅ 已从 PRE_TGE 删除');
        
        // 写入更新后的数据
        console.log('💾 保存更新后的 kol.json...');
        fs.writeFileSync(kolJsonPath, JSON.stringify(kolData, null, 2));
        
        // 验证结果
        console.log('🔍 验证迁移结果...');
        const updatedData = JSON.parse(fs.readFileSync(kolJsonPath, 'utf8'));
        
        const preProjects = Object.keys(updatedData.categories?.pre_tge || {}).length;
        const postProjects = Object.keys(updatedData.categories?.post_tge || {}).length;
        
        console.log(`   📊 PRE_TGE: ${preProjects} 个项目`);
        console.log(`   📊 POST_TGE: ${postProjects} 个项目`);
        console.log(`   📊 总项目数: ${preProjects + postProjects} 个`);
        
        // 验证 INFINIT 在正确位置
        const infinitInPost = !!(updatedData.categories?.post_tge?.INFINIT);
        const infinitInPre = !!(updatedData.categories?.pre_tge?.INFINIT);
        
        if (infinitInPost && !infinitInPre) {
            console.log('✅ 迁移成功!');
            console.log('   🎯 INFINIT 现在位于 POST_TGE 分类中');
            console.log(`   📁 文件大小: ${(fs.statSync(kolJsonPath).size / 1024 / 1024).toFixed(2)} MB`);
            return true;
        } else {
            console.log('❌ 迁移验证失败');
            console.log(`   Pre_tge 中有 INFINIT: ${infinitInPre}`);
            console.log(`   Post_tge 中有 INFINIT: ${infinitInPost}`);
            return false;
        }
        
    } catch (error) {
        console.error('❌ 迁移过程中发生错误:', error.message);
        return false;
    }
}

// 执行迁移
const success = moveInfinitToPostTge();

if (success) {
    console.log('\n🎉 INFINIT 项目分类迁移完成!');
    console.log('📋 下一步建议:');
    console.log('   1. 运行 node scripts/checkNewProjects.js 验证数据一致性');
    console.log('   2. 测试前端页面确保正常显示');
    console.log('   3. 提交更改到版本控制');
} else {
    console.log('\n💥 迁移失败，请检查错误信息');
}
