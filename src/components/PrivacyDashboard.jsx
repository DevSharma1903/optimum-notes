import React, { useState, useEffect } from 'react';
import { FiShield, FiDatabase, FiLock, FiDownload, FiX, FiCheck } from 'react-icons/fi';
import { getStorageStats, exportAllData } from '../utils';
import '../PrivacyDashboard.css';

export const PrivacyDashboard = ({ isOpen, onClose, notes }) => {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadStats();
    }
  }, [isOpen]);

  const loadStats = async () => {
    const storageStats = await getStorageStats();
    setStats(storageStats);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal privacy-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrapper">
            <FiShield size={24} />
            <h2>Privacy & Data</h2>
          </div>
          <button onClick={onClose}>
            <FiX />
          </button>
        </div>

        <div className="modal-content">
          {/* Privacy Score */}
          <div className="privacy-score">
            <div className="privacy-score-circle">
              <span className="privacy-score-number">100</span>
              <span className="privacy-score-label">Privacy Score</span>
            </div>
            <p className="privacy-score-text">
              Your data is 100% private and stored locally on your device.
            </p>
          </div>

          {/* Storage Stats */}
          {stats && (
            <div className="stats-grid">
              <div className="stat-card">
                <FiDatabase className="stat-icon" />
                <div className="stat-content">
                  <span className="stat-value">{stats.notesCount}</span>
                  <span className="stat-label">Notes Stored</span>
                </div>
              </div>

              <div className="stat-card">
                <FiLock className="stat-icon" />
                <div className="stat-content">
                  <span className="stat-value">{stats.totalSize}</span>
                  <span className="stat-label">Total Size</span>
                </div>
              </div>

              <div className="stat-card">
                <FiDatabase className="stat-icon" />
                <div className="stat-content">
                  <span className="stat-value">{stats.percentage}%</span>
                  <span className="stat-label">Storage Used</span>
                </div>
              </div>
            </div>
          )}

          {/* Data Location */}
          <div className="data-location">
            <h3>Where Your Data Lives</h3>
            <div className="location-list">
              <div className="location-item">
                <FiCheck className="location-check" />
                <div>
                  <strong>Notes Storage:</strong>
                  <p>Browser LocalStorage (your device only)</p>
                </div>
              </div>
              <div className="location-item">
                <FiCheck className="location-check" />
                <div>
                  <strong>Cloud Servers:</strong>
                  <p>Zero servers used (by design)</p>
                </div>
              </div>
              <div className="location-item">
                <FiCheck className="location-check" />
                <div>
                  <strong>Tracking & Analytics:</strong>
                  <p>None - completely private</p>
                </div>
              </div>
              <div className="location-item">
                <FiCheck className="location-check" />
                <div>
                  <strong>Data Ownership:</strong>
                  <p>100% yours - export anytime</p>
                </div>
              </div>
            </div>
          </div>

          {/* Export Data */}
          <div className="export-section">
            <h3>Export Your Data</h3>
            <p>Download a complete backup of all your notes, settings, and folders.</p>
            <button onClick={exportAllData} className="primary-btn">
              <FiDownload /> Download Complete Backup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
