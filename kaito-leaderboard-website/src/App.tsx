import React from 'react';
import Leaderboard from './components/Leaderboard';
import ErrorBoundary from './components/ErrorBoundary';
import './styles/App.css';

const App: React.FC = () => {
    return (
        <ErrorBoundary>
            <div className="App">
                <header className="app-header">
                    <div className="header-content">
                        <h1 className="app-title">
                            <span className="logo">🚀</span>
                            Kaito 影响力排行榜
                        </h1>
                        <p className="app-description">
                            发现加密货币领域最具影响力的 KOL 和思想领袖
                        </p>
                    </div>
                </header>

                <main className="app-main">
                    <ErrorBoundary>
                        <Leaderboard />
                    </ErrorBoundary>
                </main>

                <footer className="app-footer">
                    <p>
                        数据来源: <a href="https://yaps.kaito.ai/yapper-leaderboards" target="_blank" rel="noopener noreferrer">Kaito AI</a>
                    </p>
                </footer>
            </div>
        </ErrorBoundary>
    );
};

export default App;