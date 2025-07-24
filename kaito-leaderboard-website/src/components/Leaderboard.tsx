import React, { useEffect, useState } from 'react';
import {
    fetchLeaderboard,
    KaitoUser,
    getTopicCategories,
    getAvailableDurations,
    TopicCategory
} from '../api/kaitoApi';
import '../styles/Leaderboard.css';

const Leaderboard: React.FC = () => {
    const [users, setUsers] = useState<KaitoUser[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string>('post_tge');
    const [selectedTopic, setSelectedTopic] = useState<string>('APT');
    const [selectedDuration, setSelectedDuration] = useState<string>('7d');
    const [topN, setTopN] = useState<number>(50);

    const categories = getTopicCategories();
    const durations = getAvailableDurations();

    // 获取当前选中分类的项目列表
    const currentCategoryTopics = categories.find(cat => cat.name === selectedCategory)?.topics || [];

    const loadLeaderboardData = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchLeaderboard(selectedDuration, selectedTopic, topN);
            setUsers(data);
        } catch (err) {
            setError('获取排行榜数据失败，请稍后重试');
            console.error('Error fetching leaderboard:', err);
        } finally {
            setLoading(false);
        }
    };

    // 当分类改变时，重置选中的项目为该分类的第一个项目
    useEffect(() => {
        if (currentCategoryTopics.length > 0 && !currentCategoryTopics.includes(selectedTopic)) {
            setSelectedTopic(currentCategoryTopics[0]);
        }
    }, [selectedCategory, currentCategoryTopics, selectedTopic]);

    useEffect(() => {
        loadLeaderboardData();
    }, [selectedTopic, selectedDuration, topN]);

    const formatNumber = (num: number): string => {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    };

    const getTwitterUrl = (url: string): string => {
        return url || '#';
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>正在加载排行榜数据...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="error-container">
                <div className="error-message">
                    <h3>❌ 加载失败</h3>
                    <p>{error}</p>
                    <button onClick={loadLeaderboardData} className="retry-button">
                        重试
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="leaderboard-container">
            <div className="controls-section">
                <div className="control-group">
                    <label htmlFor="category-select">项目分类:</label>
                    <select
                        id="category-select"
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="control-select"
                    >
                        {categories.map(category => (
                            <option key={category.name} value={category.name}>
                                {category.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="control-group">
                    <label htmlFor="topic-select">项目/代币:</label>
                    <select
                        id="topic-select"
                        value={selectedTopic}
                        onChange={(e) => setSelectedTopic(e.target.value)}
                        className="control-select"
                    >
                        {currentCategoryTopics.map(topic => (
                            <option key={topic} value={topic}>{topic}</option>
                        ))}
                    </select>
                </div>

                <div className="control-group">
                    <label htmlFor="duration-select">时间范围:</label>
                    <select
                        id="duration-select"
                        value={selectedDuration}
                        onChange={(e) => setSelectedDuration(e.target.value)}
                        className="control-select"
                    >
                        {durations.map(duration => (
                            <option key={duration.value} value={duration.value}>
                                {duration.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="control-group">
                    <label htmlFor="top-n-select">显示数量:</label>
                    <select
                        id="top-n-select"
                        value={topN}
                        onChange={(e) => setTopN(Number(e.target.value))}
                        className="control-select"
                    >
                        <option value={10}>Top 10</option>
                        <option value={25}>Top 25</option>
                        <option value={50}>Top 50</option>
                        <option value={100}>Top 100</option>
                    </select>
                </div>
            </div>

            <div className="leaderboard-header">
                <h2>🏆 {selectedTopic} 影响力排行榜</h2>
                <p className="subtitle">
                    {categories.find(cat => cat.name === selectedCategory)?.label} -
                    显示过去 {durations.find(d => d.value === selectedDuration)?.label} 的前 {topN} 名影响者
                </p>
            </div>

            <div className="users-grid">
                {users.map((user, index) => (
                    <div key={user.user_id || index} className="user-card">
                        <div className="rank-badge">
                            #{user.rank || (index + 1)}
                        </div>

                        <div className="user-avatar">
                            {user.icon ? (
                                <img
                                    src={user.icon}
                                    alt={user.name}
                                    onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`;
                                    }}
                                />
                            ) : (
                                <div className="avatar-placeholder">
                                    {user.name.charAt(0).toUpperCase()}
                                </div>
                            )}
                        </div>

                        <div className="user-info">
                            <h3 className="user-name">{user.name}</h3>
                            {user.username && (
                                <p className="user-username">@{user.username}</p>
                            )}
                            {user.bio && (
                                <p className="user-bio">{user.bio}</p>
                            )}
                        </div>

                        <div className="user-stats">
                            <div className="stat-item">
                                <span className="stat-label">影响力分数</span>
                                <span className="stat-value mindshare-score">
                                    {(user.mindshare * 100)?.toFixed(2) || 'N/A'}%
                                </span>
                            </div>

                            <div className="stat-item">
                                <span className="stat-label">粉丝数</span>
                                <span className="stat-value">
                                    {formatNumber(user.follower_count || 0)}
                                </span>
                            </div>

                            <div className="stat-item">
                                <span className="stat-label">关注数</span>
                                <span className="stat-value">
                                    {formatNumber(user.following_count || 0)}
                                </span>
                            </div>

                            <div className="stat-item">
                                <span className="stat-label">智能粉丝</span>
                                <span className="stat-value">
                                    {formatNumber(user.smart_follower_count || 0)}
                                </span>
                            </div>
                        </div>

                        <div className="user-actions">
                            {user.twitter_user_url && (
                                <a
                                    href={getTwitterUrl(user.twitter_user_url)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="twitter-link"
                                >
                                    🐦 Twitter
                                </a>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {users.length === 0 && (
                <div className="empty-state">
                    <p>暂无数据</p>
                </div>
            )}
        </div>
    );
};

export default Leaderboard;