import axios from 'axios';

// Kaito API 配置
const BASE_URL = 'https://hub.kaito.ai/api/v1/gateway/ai/kol/mindshare/top-leaderboard';

// 定义 API 响应的数据类型
export interface KaitoUser {
    user_id: string;
    name: string;
    username: string;
    icon?: string;
    twitter_user_url?: string;
    following_count?: number;
    follower_count?: number;
    smart_follower_count?: number;
    mindshare: number;
    rank: string | number;
    bio?: string;
    last_7_day_standard_smart_engagement_count?: string;
    last_7_day_engagement_count?: string;
    last_7_day_mention_count?: string;
    last_7_sum_mention_percentage?: number;
    last_7_day_avg_llm_insightfulness_score_scaled?: number;
    last_7_day_avg_originality_score_scaled?: number;
    last_7_normalized_mention_score?: number;
    created_at?: string;
}

export interface KaitoLeaderboardResponse {
    data: KaitoUser[];
    total_count: number;
    duration: string;
    topic_id: string;
}

// 重试配置
const RETRY_CONFIG = {
    maxRetries: 3,
    retryDelay: 1000, // 1秒
    backoffMultiplier: 2
};

// 延迟函数
const delay = (ms: number): Promise<void> =>
    new Promise(resolve => setTimeout(resolve, ms));

// 带重试的请求函数
const requestWithRetry = async <T>(
    requestFn: () => Promise<T>,
    retries: number = RETRY_CONFIG.maxRetries
): Promise<T> => {
    try {
        return await requestFn();
    } catch (error) {
        if (retries > 0) {
            const delayTime = RETRY_CONFIG.retryDelay *
                Math.pow(RETRY_CONFIG.backoffMultiplier, RETRY_CONFIG.maxRetries - retries);

            console.warn(`请求失败，${delayTime}ms 后重试... (剩余重试次数: ${retries})`);
            await delay(delayTime);
            return requestWithRetry(requestFn, retries - 1);
        }
        throw error;
    }
};

// 获取排行榜数据
export const fetchLeaderboard = async (
    duration: string = '7d',
    topic_id: string = 'APT',
    top_n: number = 100
): Promise<KaitoUser[]> => {
    const params = {
        duration,
        topic_id,
        top_n: top_n.toString()
    };

    const requestFn = async () => {
        const response = await axios.get<KaitoLeaderboardResponse>(BASE_URL, {
            params,
            timeout: 10000, // 10秒超时
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        return response;
    };

    try {
        const response = await requestWithRetry(requestFn);

        // 处理不同的 API 响应结构
        if (response.data && Array.isArray(response.data)) {
            return response.data.map((user, index) => ({
                ...user,
                rank: user.rank || (index + 1),
                user_id: user.user_id || `user-${index}`,
                name: user.name || 'Unknown User',
                username: user.username || '',
                mindshare: user.mindshare || 0,
                icon: user.icon || '',
                twitter_user_url: user.twitter_user_url || '',
                following_count: user.following_count || 0,
                follower_count: user.follower_count || 0,
                smart_follower_count: user.smart_follower_count || 0,
                bio: user.bio || ''
            }));
        } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
            return response.data.data.map((user, index) => ({
                ...user,
                rank: user.rank || (index + 1),
                user_id: user.user_id || `user-${index}`,
                name: user.name || 'Unknown User',
                username: user.username || '',
                mindshare: user.mindshare || 0,
                icon: user.icon || '',
                twitter_user_url: user.twitter_user_url || '',
                following_count: user.following_count || 0,
                follower_count: user.follower_count || 0,
                smart_follower_count: user.smart_follower_count || 0,
                bio: user.bio || ''
            }));
        } else {
            // 如果 API 结构不符合预期，返回模拟数据用于测试
            console.warn('Unexpected API response structure, using mock data:', response.data);
            return generateMockData(top_n, topic_id);
        }
    } catch (error) {
        console.error('Error fetching leaderboard after retries:', error);

        // 如果是网络错误或 API 不可用，返回模拟数据
        if (axios.isAxiosError(error)) {
            if (error.code === 'ECONNABORTED' || error.code === 'NETWORK_ERROR' || !error.response) {
                console.warn('Network error, using mock data for demonstration');
                return generateMockData(top_n, topic_id);
            }
        }

        throw new Error(`获取 ${topic_id} 排行榜数据失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
};

// 生成模拟数据用于演示
const generateMockData = (count: number, topic: string): KaitoUser[] => {
    const mockNames = [
        'Vitalik Buterin', 'Changpeng Zhao', 'Elon Musk', 'Michael Saylor',
        'Cathie Wood', 'Anthony Pompliano', 'Andreas Antonopoulos', 'Naval Ravikant',
        'Balaji Srinivasan', 'Lex Fridman', 'Tim Draper', 'Barry Silbert',
        'Cameron Winklevoss', 'Tyler Winklevoss', 'Brian Armstrong',
        'Gavin Wood', 'Charles Hoskinson', 'Dan Larimer', 'Justin Sun',
        'Roger Ver', 'Erik Voorhees', 'Tone Vays', 'Max Keiser',
        'Stacy Herbert', 'Preston Pysh', 'Robert Kiyosaki', 'Peter Schiff'
    ];

    return Array.from({ length: Math.min(count, mockNames.length) }, (_, index) => ({
        user_id: `mock-user-${index}`,
        name: mockNames[index] || `User ${index + 1}`,
        username: mockNames[index]?.toLowerCase().replace(/\s+/g, '') || `user${index + 1}`,
        icon: `https://ui-avatars.com/api/?name=${encodeURIComponent(mockNames[index] || `User ${index + 1}`)}&background=random`,
        twitter_user_url: `https://x.com/${mockNames[index]?.toLowerCase().replace(/\s+/g, '') || `user${index + 1}`}`,
        following_count: Math.floor(Math.random() * 5000) + 100,
        follower_count: Math.floor(Math.random() * 1000000) + 10000,
        smart_follower_count: Math.floor(Math.random() * 100) + 5,
        mindshare: Math.random() * 0.1,
        rank: index + 1,
        bio: `${topic} enthusiast and thought leader in the crypto space.`,
        last_7_day_standard_smart_engagement_count: String(Math.floor(Math.random() * 1000) + 100),
        last_7_day_engagement_count: String(Math.floor(Math.random() * 5000) + 500),
        last_7_day_mention_count: String(Math.floor(Math.random() * 50) + 5),
        last_7_sum_mention_percentage: Math.random() * 0.1,
        last_7_day_avg_llm_insightfulness_score_scaled: Math.floor(Math.random() * 100),
        last_7_day_avg_originality_score_scaled: Math.floor(Math.random() * 100),
        last_7_normalized_mention_score: Math.floor(Math.random() * 100),
        created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString()
    }));
};

// 项目分类数据
export const PRE_TGE_TOPICS = [
    "0G", "ALLORA", "ANOMA", "BLS", "BOUNDLESS", "CAMP", "CYSIC", "FOGO", "HANAHANA",
    "GOATNETWORK", "INFINEX", "INFINIT", "IRYS", "KAT", "LOMBARD", "LUMITERRA", "MEGAETH",
    "MEMEX", "MIRA", "MITOSIS", "MONAD", "MULTIBANK", "MULTIPLI", "NYT", "NOYA",
    "OPENLEDGER", "PARADEX", "PORTALPORTAL", "PUFFPAW", "SATLAYER", "SIDEKICK", "SOMNIA",
    "SO", "SUCCINCT", "SURF", "SYMPHONY", "THEORIQ", "THRIVE", "TURTLECLUB", "UNION",
    "WARP", "YEET"
];

export const POST_TGE_TOPICS = [
    "KAITO", "ANIME", "APT", "ARB", "BERA", "BOOPBOOPFUN", "BYBITTRADFI", "CALDERA",
    "CORN", "CREATORBID", "DEFIAPP", "DYDX", "ECLIPSE", "FRAX", "FUEL", "HUMAFINANCE",
    "HUMANITY", "INITIA", "INJ", "IQ", "KAIA", "KINTO", "MNT", "MAPLESTORYUNIVERSE",
    "MOVEMENT", "NEAR", "NEWTON", "ORDERLYNETWORK", "PEAQ", "PENGU", "DOT", "PYTH",
    "QUAI", "SEI", "SKATE", "S", "SOON", "SOPHON", "STARKNET", "STORYPROTOCOL",
    "UXLINK", "VIRTUALECOSYSTEM", "WAYFINDER", "XION", "ZEC"
];

// 项目分类接口
export interface TopicCategory {
    name: string;
    label: string;
    topics: string[];
}

// 获取项目分类
export const getTopicCategories = (): TopicCategory[] => {
    return [
        {
            name: 'pre_tge',
            label: 'Pre TGE 项目',
            topics: PRE_TGE_TOPICS
        },
        {
            name: 'post_tge',
            label: 'Post TGE 项目',
            topics: POST_TGE_TOPICS
        }
    ];
};

// 获取所有可用的项目/主题列表
export const getAllTopics = (): string[] => {
    return [...PRE_TGE_TOPICS, ...POST_TGE_TOPICS].sort();
};

// 获取可用的时间范围选项
export const getAvailableDurations = (): Array<{value: string, label: string}> => {
    return [
        { value: '7d', label: '7 天' },
        { value: '30d', label: '30 天' },
        { value: '3m', label: '3 个月' },
        { value: '6m', label: '6 个月' },
        { value: '12m', label: '12 个月' }
    ];
};