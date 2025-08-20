// 临时修复脚本：在生产页面中添加这段代码来诊断问题

console.log('=== 开始调试排行榜加载问题 ===');

// 1. 检查关键配置
if (typeof KAITO_CONFIG === 'undefined') {
    console.error('❌ 关键问题：KAITO_CONFIG 未定义');
    alert('错误：KAITO_CONFIG 未定义，这是导致加载失败的主要原因！');
} else {
    console.log('✅ KAITO_CONFIG 已定义:', KAITO_CONFIG);
}

// 2. 检查DOM元素
const requiredElements = ['category-select', 'topic-select', 'duration-select', 'top-n-select', 'loading', 'users-grid'];
requiredElements.forEach(id => {
    const element = document.getElementById(id);
    if (!element) {
        console.error(`❌ 缺少DOM元素: #${id}`);
    } else {
        console.log(`✅ 找到DOM元素: #${id}`);
    }
});

// 3. 测试 kol.json 加载
async function testKolJsonLoading() {
    try {
        console.log('🔍 测试 kol.json 加载...');
        const response = await fetch('./kol.json');
        if (!response.ok) {
            console.error(`❌ kol.json 加载失败: ${response.status} ${response.statusText}`);
            return false;
        }
        
        const data = await response.json();
        console.log('✅ kol.json 加载成功');
        console.log('数据结构检查:');
        console.log('- categories 存在:', !!data.categories);
        console.log('- pre_tge 存在:', !!data.categories?.pre_tge);
        console.log('- post_tge 存在:', !!data.categories?.post_tge);
        console.log('- APT 数据存在:', !!data.categories?.post_tge?.APT);
        console.log('- APT 7d 数据存在:', !!data.categories?.post_tge?.APT?.['7d']);
        
        const aptData = data.categories?.post_tge?.APT?.['7d'];
        if (aptData) {
            console.log(`✅ APT 7d 数据: ${aptData.length} 条记录`);
            console.log('前3条数据:', aptData.slice(0, 3));
        }
        
        return true;
    } catch (error) {
        console.error('❌ kol.json 测试失败:', error);
        return false;
    }
}

// 4. 修复版本的快速加载函数
async function fixedLoadDataFast() {
    console.log('🚀 开始修复版本的快速加载...');
    
    try {
        // 检查DOM元素
        const categorySelect = document.getElementById('category-select');
        const topicSelect = document.getElementById('topic-select');
        const durationSelect = document.getElementById('duration-select');
        const topNSelect = document.getElementById('top-n-select');
        const loadingDiv = document.getElementById('loading');
        const usersGrid = document.getElementById('users-grid');
        
        if (!categorySelect || !topicSelect || !durationSelect || !topNSelect || !loadingDiv || !usersGrid) {
            console.error('❌ 关键DOM元素缺失');
            return false;
        }
        
        const category = categorySelect.value || 'post_tge';
        const topic = topicSelect.value || 'APT';
        const duration = durationSelect.value || '7d';
        const topN = parseInt(topNSelect.value) || 10;
        
        console.log(`📋 加载参数: ${category} -> ${topic} -> ${duration} -> Top${topN}`);
        
        // 显示加载状态
        loadingDiv.innerHTML = `
            <div class="loading-spinner"></div>
            <p>正在加载数据... (${topic} ${duration} Top${topN})</p>
        `;
        loadingDiv.style.display = 'block';
        usersGrid.style.display = 'none';
        
        // 测试 kol.json 加载
        const kolJsonSuccess = await testKolJsonLoading();
        if (!kolJsonSuccess) {
            loadingDiv.innerHTML = `
                <div class="error">
                    <p>❌ 数据文件加载失败</p>
                    <p>请检查 kol.json 文件是否存在且可访问</p>
                    <button onclick="location.reload()">刷新页面</button>
                </div>
            `;
            return false;
        }
        
        // 加载实际数据
        const response = await fetch('./kol.json');
        const kolData = await response.json();
        
        // 确定分类
        const actualCategory = (topic === 'APT' || KAITO_CONFIG?.POST_TGE_PROJECTS?.includes(topic)) ? 'post_tge' : 'pre_tge';
        
        const projectData = kolData.categories?.[actualCategory]?.[topic]?.[duration];
        
        if (!projectData || projectData.length === 0) {
            console.warn(`⚠️ 未找到数据: ${actualCategory}.${topic}.${duration}`);
            loadingDiv.innerHTML = `
                <div class="warning">
                    <p>⚠️ 未找到 ${topic} ${duration} 的数据</p>
                    <p>请尝试选择其他项目或时间范围</p>
                </div>
            `;
            return false;
        }
        
        // 显示数据
        const displayData = projectData.slice(0, topN);
        console.log(`✅ 找到数据: ${displayData.length} 条记录`);
        
        // 简单的数据渲染（如果没有现有的 renderUsers 函数）
        if (typeof renderUsers === 'function') {
            renderUsers(displayData);
        } else {
            // 简单渲染
            usersGrid.innerHTML = displayData.map((user, index) => `
                <div class="user-card" style="border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 5px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-weight: bold; color: #007bff;">#${user.rank || (index + 1)}</span>
                        <img src="${user.icon || ''}" alt="" style="width: 40px; height: 40px; border-radius: 50%;" onerror="this.style.display='none'">
                        <div>
                            <h3 style="margin: 0; font-size: 16px;">${user.name || 'Unknown'}</h3>
                            <p style="margin: 0; color: #666; font-size: 14px;">@${user.username || 'unknown'}</p>
                            <p style="margin: 5px 0 0 0; font-size: 12px; color: #888;">
                                Mindshare: ${(user.mindshare * 100).toFixed(2)}% | 
                                Followers: ${user.follower_count?.toLocaleString() || 'N/A'}
                            </p>
                        </div>
                    </div>
                </div>
            `).join('');
        }
        
        loadingDiv.style.display = 'none';
        usersGrid.style.display = 'block';
        
        console.log('✅ 数据加载和显示完成');
        return true;
        
    } catch (error) {
        console.error('❌ 修复版本加载失败:', error);
        
        const loadingDiv = document.getElementById('loading');
        if (loadingDiv) {
            loadingDiv.innerHTML = `
                <div class="error">
                    <p>❌ 加载失败: ${error.message}</p>
                    <p>详细错误信息已输出到控制台</p>
                    <button onclick="fixedLoadDataFast()">重试</button>
                    <button onclick="location.reload()">刷新页面</button>
                </div>
            `;
        }
        
        return false;
    }
}

// 5. 自动运行诊断
console.log('🔧 准备运行自动诊断...');

// 如果页面已经加载完成，立即运行
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        console.log('📄 DOM 加载完成，开始诊断...');
        setTimeout(() => {
            fixedLoadDataFast();
        }, 1000);
    });
} else {
    console.log('📄 页面已加载，立即开始诊断...');
    setTimeout(() => {
        fixedLoadDataFast();
    }, 1000);
}

// 6. 全局错误监听
window.addEventListener('error', function(event) {
    console.error('❌ 全局错误:', event.error);
    console.error('错误位置:', event.filename, '行', event.lineno);
});

window.addEventListener('unhandledrejection', function(event) {
    console.error('❌ 未处理的Promise拒绝:', event.reason);
});

console.log('=== 调试脚本加载完成 ===');

// 导出到全局，方便手动调用
window.debugKaito = {
    testKolJsonLoading,
    fixedLoadDataFast,
    checkConfig: () => console.log('KAITO_CONFIG:', typeof KAITO_CONFIG, KAITO_CONFIG)
};

console.log('💡 提示：在控制台中运行 debugKaito.fixedLoadDataFast() 来手动测试加载');
