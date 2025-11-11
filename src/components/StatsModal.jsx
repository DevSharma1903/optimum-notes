import React, { useState, useEffect } from 'react';
import { FiX, FiTrendingUp, FiCalendar, FiAward, FiUsers, FiFileText } from 'react-icons/fi';
import { getActivityStats, generateHeatmapData, getUserStats } from '../utils';
import '../StatsModal.css';

export const StatsModal = ({ isOpen, onClose, notes }) => {
  const [stats, setStats] = useState(null);
  const [heatmapData, setHeatmapData] = useState([]);
  const [userStats, setUserStats] = useState(null);

  useEffect(() => {
    if (isOpen) {
      const activityStats = getActivityStats(notes);
      const heatmap = generateHeatmapData();
      const user = getUserStats();
      
      setStats(activityStats);
      setHeatmapData(heatmap);
      setUserStats(user);
    }
  }, [isOpen, notes]);

  if (!isOpen) return null;

  // Group heatmap by weeks
  const weeks = [];
  for (let i = 0; i < heatmapData.length; i += 7) {
    weeks.push(heatmapData.slice(i, i + 7));
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal stats-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrapper">
            <FiTrendingUp size={24} />
            <h2>Your Statistics</h2>
          </div>
          <button onClick={onClose}>
            <FiX />
          </button>
        </div>

        <div className="modal-content">
          {/* User Info */}
          {userStats && (
            <div className="user-info-card">
              <div className="user-avatar">
                {userStats.userId.charAt(userStats.userId.length - 1).toUpperCase()}
              </div>
              <div className="user-details">
                <h3>Welcome back!</h3>
                <p>Member for {userStats.daysActive} days</p>
              </div>
            </div>
          )}

          {/* Stats Grid */}
          {stats && (
            <div className="stats-grid-container">
              <div className="stat-box">
                <FiAward className="stat-icon" />
                <div className="stat-content">
                  <span className="stat-value">{stats.currentStreak}</span>
                  <span className="stat-label">Day Streak</span>
                </div>
              </div>

              <div className="stat-box">
                <FiCalendar className="stat-icon" />
                <div className="stat-content">
                  <span className="stat-value">{stats.longestStreak}</span>
                  <span className="stat-label">Longest Streak</span>
                </div>
              </div>

              <div className="stat-box">
                <FiFileText className="stat-icon" />
                <div className="stat-content">
                  <span className="stat-value">{stats.totalNotes}</span>
                  <span className="stat-label">Total Notes</span>
                </div>
              </div>

              <div className="stat-box">
                <FiTrendingUp className="stat-icon" />
                <div className="stat-content">
                  <span className="stat-value">{stats.totalWords.toLocaleString()}</span>
                  <span className="stat-label">Words Written</span>
                </div>
              </div>

              <div className="stat-box">
                <FiCalendar className="stat-icon" />
                <div className="stat-content">
                  <span className="stat-value">{stats.totalDays}</span>
                  <span className="stat-label">Active Days</span>
                </div>
              </div>

              <div className="stat-box">
                <FiTrendingUp className="stat-icon" />
                <div className="stat-content">
                  <span className="stat-value">{stats.averageWordsPerDay}</span>
                  <span className="stat-label">Avg Words/Day</span>
                </div>
              </div>
            </div>
          )}

          {/* Activity Heatmap */}
          <div className="heatmap-section">
            <h3>
              <FiCalendar size={18} />
              Activity Heatmap
            </h3>
            <p className="heatmap-subtitle">Your writing activity over the past year</p>
            
            <div className="heatmap-container">
              <div className="heatmap-months">
                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, i) => (
                  <span key={month} style={{ gridColumn: `${i * 4 + 1} / span 4` }}>{month}</span>
                ))}
              </div>
              
              <div className="heatmap-grid">
                {weeks.map((week, weekIndex) => (
                  <div key={weekIndex} className="heatmap-week">
                    {week.map((day, dayIndex) => (
                      <div
                        key={day.date}
                        className={`heatmap-day level-${day.level}`}
                        title={`${day.date}: ${day.count} ${day.count === 1 ? 'note' : 'notes'}`}
                      />
                    ))}
                  </div>
                ))}
              </div>

              <div className="heatmap-legend">
                <span>Less</span>
                <div className="heatmap-day level-0" />
                <div className="heatmap-day level-1" />
                <div className="heatmap-day level-2" />
                <div className="heatmap-day level-3" />
                <div className="heatmap-day level-4" />
                <span>More</span>
              </div>
            </div>
          </div>

          {/* Global Stats */}
          <div className="global-stats">
            <FiUsers className="global-icon" />
            <div className="global-content">
              <h3>You're part of something bigger</h3>
              <p>This instance has been used for {userStats?.daysActive || 0} days</p>
              <p className="global-note">Note: Optimum is privacy-first and local-only. We don't track global users.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
