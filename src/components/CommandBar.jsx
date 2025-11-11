import React, { useState, useEffect, useRef } from 'react';
import { FiSearch, FiFile, FiFolder, FiClock, FiStar, FiSettings, FiDownload, FiTrash2 } from 'react-icons/fi';
import '../CommandBar.css';

export const CommandBar = ({ 
  isOpen, 
  onClose, 
  notes, 
  folders,
  onSelectNote,
  onSelectFolder,
  onAction
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  // Quick actions
  const actions = [
    { id: 'new-note', name: 'Create New Note', icon: <FiFile />, action: () => onAction('new-note') },
    { id: 'settings', name: 'Open Settings', icon: <FiSettings />, action: () => onAction('settings') },
    { id: 'export', name: 'Export All Notes', icon: <FiDownload />, action: () => onAction('export') },
    { id: 'favorites', name: 'View Favorites', icon: <FiStar />, action: () => onAction('favorites') },
    { id: 'trash', name: 'View Trash', icon: <FiTrash2 />, action: () => onAction('trash') },
  ];

  // Filter results
  const results = [];
  
  if (query.length > 0) {
    const lowerQuery = query.toLowerCase();
    
    // Search notes
    notes
      .filter(n => !n.isDeleted)
      .filter(n => 
        n.title.toLowerCase().includes(lowerQuery) ||
        n.content.toLowerCase().includes(lowerQuery)
      )
      .slice(0, 5)
      .forEach(note => {
        results.push({
          type: 'note',
          item: note,
          name: note.title,
          icon: <FiFile />,
          action: () => onSelectNote(note)
        });
      });
    
    // Search folders
    folders
      .filter(f => f.toLowerCase().includes(lowerQuery))
      .forEach(folder => {
        results.push({
          type: 'folder',
          name: `Go to ${folder}`,
          icon: <FiFolder />,
          action: () => onSelectFolder(folder)
        });
      });
    
    // Search actions
    actions
      .filter(a => a.name.toLowerCase().includes(lowerQuery))
      .forEach(action => {
        results.push({
          type: 'action',
          ...action
        });
      });
  } else {
    // Show recent notes
    notes
      .filter(n => !n.isDeleted)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 5)
      .forEach(note => {
        results.push({
          type: 'note',
          item: note,
          name: note.title,
          icon: <FiClock />,
          subtitle: 'Recent',
          action: () => onSelectNote(note)
        });
      });
    
    // Show actions
    actions.forEach(action => {
      results.push({
        type: 'action',
        ...action
      });
    });
  }

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % results.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (results[selectedIndex]) {
          results[selectedIndex].action();
          handleClose();
        }
      } else if (e.key === 'Escape') {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Reset when closing
  const handleClose = () => {
    setQuery('');
    setSelectedIndex(0);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="command-bar-overlay" onClick={handleClose}>
      <div className="command-bar" onClick={(e) => e.stopPropagation()}>
        <div className="command-bar-search">
          <FiSearch />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type to search notes, folders, or actions..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
          />
        </div>

        <div className="command-bar-results">
          {results.length === 0 ? (
            <div className="command-bar-empty">No results found</div>
          ) : (
            results.map((result, index) => (
              <div
                key={result.id || result.name}
                className={`command-bar-item ${index === selectedIndex ? 'selected' : ''}`}
                onClick={() => {
                  result.action();
                  handleClose();
                }}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <span className="command-bar-icon">{result.icon}</span>
                <div className="command-bar-text">
                  <span className="command-bar-name">{result.name}</span>
                  {result.subtitle && (
                    <span className="command-bar-subtitle">{result.subtitle}</span>
                  )}
                </div>
                {result.type === 'note' && result.item && (
                  <span className="command-bar-meta">{result.item.folder}</span>
                )}
              </div>
            ))
          )}
        </div>

        <div className="command-bar-footer">
          <span>↑↓ Navigate</span>
          <span>↵ Select</span>
          <span>Esc Close</span>
        </div>
      </div>
    </div>
  );
};
