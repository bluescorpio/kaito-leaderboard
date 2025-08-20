const fs = require('fs');

try {
    const data = JSON.parse(fs.readFileSync('kol.json', 'utf8'));
    
    console.log('🔍 INFINIT 项目位置检查');
    console.log('====================');
    
    const preTge = data.categories?.pre_tge || {};
    const postTge = data.categories?.post_tge || {};
    
    console.log('Pre_tge projects:', Object.keys(preTge).length);
    console.log('Post_tge projects:', Object.keys(postTge).length);
    console.log('INFINIT in pre_tge:', !!preTge.INFINIT);
    console.log('INFINIT in post_tge:', !!postTge.INFINIT);
    
    if (preTge.INFINIT) {
        console.log('✅ INFINIT 在 PRE_TGE 中');
        console.log('   数据点:', Object.keys(preTge.INFINIT).length);
    }
    
    if (postTge.INFINIT) {
        console.log('✅ INFINIT 在 POST_TGE 中');
        console.log('   数据点:', Object.keys(postTge.INFINIT).length);
    }
    
    if (!preTge.INFINIT && !postTge.INFINIT) {
        console.log('❌ INFINIT 项目在两个分类中都未找到');
    }
    
} catch (error) {
    console.error('❌ 错误:', error.message);
}
