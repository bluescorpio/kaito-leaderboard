# 个人影响力查询效率优化方案

## 当前问题分析

### 现状
- **API调用量**: 95项目 × 5周期 = 475个请求
- **缓存时间**: 1小时
- **首次加载**: 需要等待所有API请求完成
- **服务器压力**: 瞬时大量并发请求

### 效率问题
1. 首次使用体验极差（需要等待475个API请求）
2. 对Kaito API服务器造成突发压力
3. 网络环境不佳时容易超时失败
4. 资源浪费（大部分用户只查询1-2个人）

## 优化方案

### 方案一：智能按需加载 ⭐⭐⭐⭐⭐

**核心思路**: 只在用户查询特定用户时才加载相关数据

```javascript
// 新的查询策略
async function searchUserOptimized(username) {
    // 1. 先检查本地缓存
    let userData = searchUserInLocalCache(username);
    if (userData) return userData;
    
    // 2. 如果没有缓存，进行智能搜索
    userData = await smartUserSearch(username);
    return userData;
}

async function smartUserSearch(username) {
    // 策略：从热门项目开始搜索，找到后停止
    const popularProjects = ['KAITO', 'APT', 'ARB', 'BERA', 'DYDX'];
    const durations = ['7d', '30d'];
    
    for (const project of popularProjects) {
        for (const duration of durations) {
            const data = await fetchKaitoData(duration, project, 100);
            const user = data.find(u => u.username.toLowerCase() === username.toLowerCase());
            
            if (user) {
                // 找到用户，缓存并返回
                cacheUserData(username, user, project, duration);
                return user;
            }
        }
    }
    
    // 如果热门项目没找到，再搜索其他项目
    return await searchInRemainingProjects(username);
}
```

**优势**:
- ✅ 大幅提升首次查询速度
- ✅ 减少服务器压力
- ✅ 按需加载，节省资源
- ✅ 用户体验显著改善

### 方案二：分批后台预加载 ⭐⭐⭐⭐

**核心思路**: 后台分批预加载数据，不阻塞用户操作

```javascript
// 后台预加载策略
async function backgroundPreload() {
    const projects = getAllProjects();
    const batchSize = 5; // 每批5个请求
    
    for (let i = 0; i < projects.length; i += batchSize) {
        const batch = projects.slice(i, i + batchSize);
        
        // 并行处理一批
        await Promise.all(batch.map(project => 
            loadProjectData(project)
        ));
        
        // 批次间延迟，避免服务器压力
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
}

// 用户查询时立即响应已加载的数据
async function searchUser(username) {
    // 立即搜索已加载的数据
    let result = searchInLoadedData(username);
    if (result) return result;
    
    // 如果没找到，等待更多数据加载完成
    await waitForMoreData();
    return searchInLoadedData(username);
}
```

### 方案三：混合优化策略 ⭐⭐⭐⭐⭐

**核心思路**: 结合本地kol.json + 智能API查询

```javascript
// 混合查询策略
async function hybridSearch(username) {
    // 1. 优先搜索本地kol.json（如果存在）
    let userData = await searchInLocalJSON(username);
    if (userData) {
        // 异步更新该用户的最新数据
        updateUserDataInBackground(username);
        return userData;
    }
    
    // 2. 本地没找到，进行智能API搜索
    return await smartUserSearch(username);
}

async function searchInLocalJSON(username) {
    try {
        const response = await fetch('./kol.json');
        const data = await response.json();
        
        // 在所有项目数据中搜索用户
        for (const category in data.categories) {
            for (const project in data.categories[category]) {
                for (const duration in data.categories[category][project]) {
                    const users = data.categories[category][project][duration];
                    const user = users.find(u => 
                        u.username.toLowerCase() === username.toLowerCase()
                    );
                    if (user) return user;
                }
            }
        }
    } catch (error) {
        console.log('本地JSON文件不可用，切换到API查询');
    }
    return null;
}
```

## 推荐实施顺序

1. **立即实施**: 方案三（混合策略）
   - 利用现有kol.json数据
   - 快速改善用户体验
   - 减少API调用

2. **中期优化**: 方案一（智能按需加载）
   - 重构查询逻辑
   - 实现智能搜索策略
   - 优化缓存机制

3. **长期完善**: 方案二（后台预加载）
   - 实现后台数据更新
   - 建立增量更新机制
   - 完善数据同步策略

## 性能预期

### 当前性能
- 首次查询: 30-60秒（475个API请求）
- 后续查询: <1秒（本地缓存）
- API压力: 极高（瞬时475请求）

### 优化后性能
- 首次查询: 2-5秒（本地JSON或智能搜索）
- 后续查询: <1秒（本地缓存）
- API压力: 极低（按需请求）
- 用户体验: 显著提升
