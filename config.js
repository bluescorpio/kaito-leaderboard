/**
 * Kaito 项目配置文件
 * 包含所有项目ID、时间范围和社区层级配置
 */

// Pre TGE 项目配置
const PRE_TGE_PROJECTS = [
    "0G", "ALLORA", "ANOMA", "BILLIONS", "BLS", "BOUNDLESS", "CAMP", "CYSIC", 
    "EVERLYN", "FALCON", "FOGO", "HANAHANA", "GOATNETWORK", "INFINEX", "IRYS", 
    "KAT", "LOMBARD", "LUMITERRA", "MAVRYK", "MEGAETH", "MEMEX", "MIRA", "MITOSIS", 
    "MOMENTUM", "MONAD", "MOONBIRDS", "MULTIBANK", "MULTIPLI", "NYT", "NOYA", "OPENLEDGER",
    "PARADEX", "PORTALPORTAL", "PUFFPAW", "SAPIEN", "SOMNIA", "SO", "SURF", 
    "SYMPHONY", "THEORIQ", "THRIVE", "TURTLECLUB", "UNION", "WARP", "YEET"
];

// Post TGE 项目配置
const POST_TGE_PROJECTS = [
    "KAITO", "ANIME", "APT", "ARB", "BERA", "BLUE", "BOOPBOOPFUN", "BYBITTRADFI", 
    "CALDERA", "CORN", "CREATORBID", "DEFIAPP", "DYDX", "ECLIPSE", "ETH", "FRAX", "FUEL",
    "HUMAFINANCE", "HUMANITY", "INFINIT", "INITIA", "INJ", "IQ", "KAIA", "KINTO", "MNT", "OM", 
    "MAPLESTORYUNIVERSE", "MOVEMENT", "NEAR", "NEWTON", "ORDERLYNETWORK", "PEAQ", 
    "PENGU", "DOT", "POL", "PYTH", "QUAI", "SATLAYER", "SEI", "SIDEKICK", "SKATE", 
    "S", "SOON", "SOPHON", "STARKNET", "STORYPROTOCOL", "SUCCINCT", "UXLINK", 
    "VIRTUALECOSYSTEM", "WAL", "WAYFINDER", "XION", "ZEC"
];

// 时间范围配置
const DURATIONS = ["7d", "30d", "3m", "6m", "12m"];

// 社区层级配置
const COMMUNITY_TIER = "tier1";

// API 相关配置
const API_CONFIG = {
    baseUrl: "https://hub.kaito.ai/api/v1/gateway/ai/kol/mindshare/top-leaderboard",
    devProxyUrl: "http://localhost:3000/api/kol/mindshare/top-leaderboard",
    timeout: 10000,
    retryAttempts: 2,
    retryDelay: 3000
};

// 项目分类映射
const PROJECT_CATEGORIES = {
    post_tge: {
        name: "Post TGE 项目",
        projects: POST_TGE_PROJECTS,
        defaultProject: "KAITO"
    },
    pre_tge: {
        name: "Pre TGE 项目", 
        projects: PRE_TGE_PROJECTS,
        defaultProject: "0G"
    }
};

// 项目显示名称映射（可选，用于UI显示优化）
const PROJECT_DISPLAY_NAMES = {
    "KAITO": "KAITO",
    "0G": "0G",
    "APT": "Aptos",
    "ARB": "Arbitrum",
    "BERA": "Berachain",
    "DYDX": "dYdX",
    "FUEL": "Fuel",
    "INJ": "Injective",
    "NEAR": "NEAR Protocol",
    "SEI": "Sei",
    "STARKNET": "Starknet",
    "POL": "Polygon",
    "DOT": "Polkadot",
    // 可以继续添加更多项目的显示名称
};

// 时间范围显示名称映射
const DURATION_DISPLAY_NAMES = {
    "7d": "7 天",
    "30d": "30 天", 
    "3m": "3 个月",
    "6m": "6 个月",
    "12m": "12 个月"
};

// 导出配置对象
const CONFIG = {
    // 项目配置
    PRE_TGE_PROJECTS,
    POST_TGE_PROJECTS,
    PROJECT_CATEGORIES,
    PROJECT_DISPLAY_NAMES,
    
    // 时间配置
    DURATIONS,
    DURATION_DISPLAY_NAMES,
    
    // 其他配置
    COMMUNITY_TIER,
    API_CONFIG,
    
    // 获取所有项目的便捷方法
    getAllProjects: () => [...PRE_TGE_PROJECTS, ...POST_TGE_PROJECTS],
    
    // 根据分类获取项目列表
    getProjectsByCategory: (category) => PROJECT_CATEGORIES[category]?.projects || [],
    
    // 获取项目显示名称
    getProjectDisplayName: (projectId) => PROJECT_DISPLAY_NAMES[projectId] || projectId,
    
    // 获取时间范围显示名称
    getDurationDisplayName: (duration) => DURATION_DISPLAY_NAMES[duration] || duration,
    
    // 验证项目ID是否有效
    isValidProject: (projectId) => {
        return [...PRE_TGE_PROJECTS, ...POST_TGE_PROJECTS].includes(projectId);
    },
    
    // 验证时间范围是否有效
    isValidDuration: (duration) => DURATIONS.includes(duration),
    
    // 获取项目所属分类
    getProjectCategory: (projectId) => {
        if (PRE_TGE_PROJECTS.includes(projectId)) return 'pre_tge';
        if (POST_TGE_PROJECTS.includes(projectId)) return 'post_tge';
        return null;
    }
};

// 在 Node.js 环境中导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}

// 在浏览器环境中设置全局变量
if (typeof window !== 'undefined') {
    window.KAITO_CONFIG = CONFIG;
}
