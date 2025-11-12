import React, { useState, useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { autocompletion } from '@codemirror/autocomplete';
import { oneDark } from '@codemirror/theme-one-dark';
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import {
  FiPlus,
  FiTrash2,
  FiSettings,
  FiEye,
  FiMenu,
  FiX,
  FiSearch,
  FiFolder,
  FiStar,
  FiDownload,
  FiUpload,
  FiFolderPlus,
  FiEdit2,
  FiBook,
  FiClock,
  FiCheckCircle,
  FiTag,
  FiList,
  FiBold,
  FiItalic,
  FiCode,
  FiLink,
  FiTrendingUp,
  FiInfo,
  FiShield,
  FiZap,
  FiHeart,
} from 'react-icons/fi';
import {
  saveNotes,
  loadNotes,
  saveSettings,
  loadSettings,
  saveFolders,
  loadFolders,
  generateId,
  formatDate,
  extractTags,
  countTasks,
  countWords,
  estimateReadingTime,
  exportNoteAsMarkdown,
  exportNotesAsJSON,
  importNotesFromJSON,
  markdownToHTML,
  recordActivity,
  recordNoteCreation,
  trackUser,
} from './utils';
import { StatsModal } from './components/StatsModal';
import './App.css';

function App() {
  const [notes, setNotes] = useState(() => {
    const saved = localStorage.getItem('notevault_notes');
    return saved ? JSON.parse(saved) : [];
  });
  const [folders, setFolders] = useState(['Personal', 'Work', 'Ideas']);
  const [currentNote, setCurrentNote] = useState(null);
  const [currentFolder, setCurrentFolder] = useState('All');
  const [selectedTag, setSelectedTag] = useState(null);
  const [settings, setSettings] = useState({
    theme: 'dark',
    fontSize: 16,
    lineHeight: 1.6,
    fontFamily: 'Inter',
    zenMode: false,
    sortBy: 'updated',
    colorScheme: 'coral',
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [statsModalOpen, setStatsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('edit');

  const editorRef = useRef(null);
  const viewRef = useRef(null);
  const fileInputRef = useRef(null);

  const [sidebarWidth, setSidebarWidth] = useState(260);
  const isResizing = useRef(false);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing.current) return;
      const newWidth = e.clientX;
      if (newWidth >= 220 && newWidth <= 400) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      isResizing.current = false;
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  useEffect(() => {
    trackUser();
    const savedSettings = loadSettings();
    const savedFolders = loadFolders();
    
    setSettings(savedSettings);
    setFolders(savedFolders);
    
    if (notes.length > 0) {
      const activeNotes = notes.filter(n => !n.isDeleted);
      if (activeNotes.length > 0) {
        setCurrentNote(activeNotes[0]);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('notevault_notes', JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    saveFolders(folders);
  }, [folders]);

  useEffect(() => {
    if (!editorRef.current || !currentNote || viewMode === 'preview') return;

    if (viewRef.current) {
      viewRef.current.destroy();
    }

    const extensions = [
      keymap.of([...defaultKeymap, ...historyKeymap]),
      history(),
      markdown(),
      autocompletion(),
      syntaxHighlighting(defaultHighlightStyle),
      EditorView.lineWrapping,
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          const content = update.state.doc.toString();
          updateNoteContent(content);
        }
      }),
      EditorView.theme({
        '&': {
          fontSize: `${settings.fontSize}px`,
          fontFamily: settings.fontFamily,
          height: '100%',
        },
        '.cm-content': {
          lineHeight: `${settings.lineHeight}`,
          padding: '16px 0',
        },
        '.cm-scroller': {
          fontFamily: `'JetBrains Mono', 'Fira Code', 'Consolas', monospace`,
        },
        '.cm-strong': { fontWeight: 'bold' },
        '.cm-emphasis': { fontStyle: 'italic' },
        '.cm-heading': { fontWeight: 'bold', fontSize: '1.2em' },
      }),
    ];

    if (settings.theme === 'dark') {
      extensions.push(oneDark);
    }

    const startState = EditorState.create({
      doc: currentNote.content,
      extensions,
    });

    const view = new EditorView({
      state: startState,
      parent: editorRef.current,
    });

    viewRef.current = view;

    return () => {
      if (viewRef.current) {
        viewRef.current.destroy();
      }
    };
  }, [currentNote?.id, settings.theme, settings.fontSize, settings.lineHeight, settings.fontFamily, viewMode]);

  const updateNoteContent = (content) => {
    setNotes((prev) =>
      prev.map((note) =>
        note.id === currentNote.id
          ? { ...note, content, updatedAt: Date.now() }
          : note
      )
    );
    setCurrentNote((prev) => ({ ...prev, content, updatedAt: Date.now() }));
    recordActivity();
  };

  useEffect(() => {
    if (currentNote && currentNote.content) {
      const firstLine = currentNote.content
        .split('\n')[0]
        .replace(/^#+ /, '')
        .trim();
      
      if (firstLine && firstLine !== currentNote.title && firstLine.length > 0) {
        const newTitle = firstLine.substring(0, 100);
        setNotes((prev) =>
          prev.map((note) =>
            note.id === currentNote.id ? { ...note, title: newTitle } : note
          )
        );
        setCurrentNote((prev) => ({ ...prev, title: newTitle }));
      }
    }
  }, [currentNote?.content]);

  const createNote = () => {
    const newNote = {
      id: generateId(),
      title: 'Untitled Note',
      content: '# Your Note Title\n\nStart writing...',
      folder: currentFolder === 'All' || currentFolder === 'Favorites' || currentFolder === 'Recent' || currentFolder === 'Trash' 
        ? 'Personal' 
        : currentFolder,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isFavorite: false,
      isDeleted: false,
    };
    setNotes((prev) => [newNote, ...prev]);
    setCurrentNote(newNote);
    recordNoteCreation(0);
  };

  const toggleFavorite = (noteId, e) => {
    e.stopPropagation();
    setNotes((prev) =>
      prev.map((note) =>
        note.id === noteId ? { ...note, isFavorite: !note.isFavorite } : note
      )
    );
    if (currentNote?.id === noteId) {
      setCurrentNote((prev) => ({ ...prev, isFavorite: !prev.isFavorite }));
    }
  };

  const deleteNote = (id, e) => {
    e.stopPropagation();
    if (currentFolder === 'Trash') {
      if (window.confirm('Permanently delete this note?')) {
        const newNotes = notes.filter((note) => note.id !== id);
        setNotes(newNotes);
        
        if (currentNote?.id === id) {
          const activeNotes = newNotes.filter(n => !n.isDeleted);
          setCurrentNote(activeNotes[0] || null);
        }
      }
    } else {
      setNotes((prev) =>
        prev.map((note) =>
          note.id === id ? { ...note, isDeleted: true, updatedAt: Date.now() } : note
        )
      );
      
      if (currentNote?.id === id) {
        const activeNotes = notes.filter(n => !n.isDeleted && n.id !== id);
        setCurrentNote(activeNotes[0] || null);
      }
    }
  };

  const restoreNote = (id, e) => {
    e.stopPropagation();
    setNotes((prev) =>
      prev.map((note) =>
        note.id === id ? { ...note, isDeleted: false, updatedAt: Date.now() } : note
      )
    );
  };

  const createFolder = () => {
    const folderName = prompt('Enter folder name:');
    if (folderName && folderName.trim()) {
      setFolders((prev) => [...prev, folderName.trim()]);
    }
  };

  const deleteFolder = (folderName, e) => {
    e.stopPropagation();
    if (window.confirm(`Delete folder "${folderName}"? Notes will be moved to Personal.`)) {
      setNotes((prev) =>
        prev.map((note) =>
          note.folder === folderName ? { ...note, folder: 'Personal' } : note
        )
      );
      setFolders((prev) => prev.filter((f) => f !== folderName));
      if (currentFolder === folderName) {
        setCurrentFolder('All');
      }
    }
  };

  const handleExportNote = () => {
    if (currentNote) {
      exportNoteAsMarkdown(currentNote);
    }
  };

  const handleExportAll = () => {
    exportNotesAsJSON(notes);
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const importedNotes = await importNotesFromJSON(file);
        if (Array.isArray(importedNotes)) {
          const confirmed = window.confirm(
            `Import ${importedNotes.length} notes? This will merge with existing notes.`
          );
          if (confirmed) {
            setNotes((prev) => [...importedNotes, ...prev]);
          }
        }
      } catch (error) {
        alert('Failed to import notes: ' + error.message);
      }
    }
    e.target.value = '';
  };

  const insertMarkdown = (before, after = '') => {
    if (!viewRef.current) return;
    
    const view = viewRef.current;
    const { from, to } = view.state.selection.main;
    const selectedText = view.state.doc.sliceString(from, to);
    const newText = before + selectedText + after;
    
    view.dispatch({
      changes: { from, to, insert: newText },
      selection: { anchor: from + before.length + selectedText.length + after.length },
    });
  };

  const allTags = [...new Set(notes.flatMap(note => extractTags(note.content)))];

  const sortNotes = (notesToSort) => {
    switch (settings.sortBy) {
      case 'title':
        return [...notesToSort].sort((a, b) => a.title.localeCompare(b.title));
      case 'created':
        return [...notesToSort].sort((a, b) => b.createdAt - a.createdAt);
      case 'updated':
      default:
        return [...notesToSort].sort((a, b) => b.updatedAt - a.updatedAt);
    }
  };

  const filteredNotes = sortNotes(
    notes.filter((note) => {
      if (currentFolder === 'Trash') {
        if (!note.isDeleted) return false;
      } else {
        if (note.isDeleted) return false;
      }

      if (currentFolder === 'Favorites') {
        if (!note.isFavorite) return false;
      } else if (currentFolder === 'Recent') {
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        if (note.updatedAt < sevenDaysAgo) return false;
      } else if (currentFolder !== 'All' && currentFolder !== 'Trash') {
        if (note.folder !== currentFolder) return false;
      }

      if (selectedTag) {
        const noteTags = extractTags(note.content);
        if (!noteTags.includes(selectedTag)) return false;
      }

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          note.title.toLowerCase().includes(query) ||
          note.content.toLowerCase().includes(query)
        );
      }

      return true;
    })
  );

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        createNote();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        setViewMode(mode => mode === 'edit' ? 'preview' : 'edit');
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'b' && viewMode === 'edit') {
        e.preventDefault();
        insertMarkdown('**', '**');
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'i' && viewMode === 'edit') {
        e.preventDefault();
        insertMarkdown('*', '*');
      }
      if (e.key === 'Escape' && settings.zenMode) {
        setSettings((s) => ({ ...s, zenMode: false }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [settings.zenMode, viewMode]);

  const noteStats = currentNote ? {
    words: countWords(currentNote.content),
    chars: currentNote.content.length,
    reading: estimateReadingTime(currentNote.content),
    tasks: countTasks(currentNote.content),
    tags: extractTags(currentNote.content),
  } : null;

  return (
    <div className={`app ${settings.theme} ${settings.zenMode ? 'zen-mode' : ''} color-${settings.colorScheme}`}>
      {!settings.zenMode && (
        <div 
          className="sidebar" 
          style={{ width: `${sidebarWidth}px` }}
          onMouseDown={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const isNearRightEdge = e.clientX > rect.right - 5;
            if (isNearRightEdge) {
              isResizing.current = true;
              document.body.style.cursor = 'col-resize';
              document.body.style.userSelect = 'none';
            }
          }}
        >
          <div className="sidebar-header">
            <h1>Optimum</h1>
            <button onClick={() => createNote()} className="primary-btn" title="New Note (Ctrl+N)">
              <FiPlus />
            </button>
          </div>

          <div className="search-box">
            <FiSearch />
            <input
              type="text"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="clear-search">
                <FiX />
              </button>
            )}
          </div>

          <div className="folders">
            <div className="folders-header">
              <span>Folders</span>
              <button onClick={createFolder} title="New Folder">
                <FiFolderPlus />
              </button>
            </div>
            <button
              className={`folder-btn ${currentFolder === 'All' ? 'active' : ''}`}
              onClick={() => { setCurrentFolder('All'); setSelectedTag(null); }}
            >
              <FiFolder /> All ({notes.filter(n => !n.isDeleted).length})
            </button>
            <button
              className={`folder-btn ${currentFolder === 'Favorites' ? 'active' : ''}`}
              onClick={() => { setCurrentFolder('Favorites'); setSelectedTag(null); }}
            >
              <FiStar /> Favorites ({notes.filter(n => n.isFavorite && !n.isDeleted).length})
            </button>
            <button
              className={`folder-btn ${currentFolder === 'Recent' ? 'active' : ''}`}
              onClick={() => { setCurrentFolder('Recent'); setSelectedTag(null); }}
            >
              <FiClock /> Recent ({notes.filter(n => !n.isDeleted && (Date.now() - n.updatedAt) < 7 * 24 * 60 * 60 * 1000).length})
            </button>
            {folders.map((folder) => {
              const folderNotes = notes.filter((n) => n.folder === folder && !n.isDeleted);
              
              return (
                <button
                  key={folder}
                  className={`folder-btn ${currentFolder === folder ? 'active' : ''}`}
                  onClick={() => { setCurrentFolder(folder); setSelectedTag(null); }}
                >
                  <FiFolder /> {folder} ({folderNotes.length})
                  <button
                    className="delete-folder"
                    onClick={(e) => deleteFolder(folder, e)}
                    title="Delete folder"
                  >
                    <FiTrash2 />
                  </button>
                </button>
              );
            })}
            <button
              className={`folder-btn ${currentFolder === 'Trash' ? 'active' : ''}`}
              onClick={() => { setCurrentFolder('Trash'); setSelectedTag(null); }}
            >
              <FiTrash2 /> Trash ({notes.filter(n => n.isDeleted).length})
            </button>
          </div>

          {allTags.length > 0 && (
            <div className="tags-section">
              <div className="tags-header">
                <span>Tags</span>
                {selectedTag && (
                  <button onClick={() => setSelectedTag(null)} title="Clear filter">
                    <FiX />
                  </button>
                )}
              </div>
              <div className="tags-list">
                {allTags.map(tag => (
                  <button
                    key={tag}
                    className={`tag-btn ${selectedTag === tag ? 'active' : ''}`}
                    onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="notes-list">
            <div className="notes-list-header">
              <span>{filteredNotes.length} notes</span>
              <select
                value={settings.sortBy}
                onChange={(e) => setSettings(s => ({ ...s, sortBy: e.target.value }))}
                className="sort-select"
              >
                <option value="updated">Updated</option>
                <option value="created">Created</option>
                <option value="title">A-Z</option>
              </select>
            </div>
            {filteredNotes.length === 0 ? (
              <div className="no-notes">
                <p>No notes found</p>
              </div>
            ) : (
              filteredNotes.map((note) => {
                const tasks = countTasks(note.content);
                return (
                  <div
                    key={note.id}
                    className={`note-item ${currentNote?.id === note.id ? 'active' : ''}`}
                    onClick={() => setCurrentNote(note)}
                  >
                    <div className="note-item-header">
                      <h3>{note.title}</h3>
                      <div className="note-actions">
                        {currentFolder === 'Trash' ? (
                          <button
                            onClick={(e) => restoreNote(note.id, e)}
                            className="restore-note"
                            title="Restore"
                          >
                            <FiUpload />
                          </button>
                        ) : (
                          <button
                            onClick={(e) => toggleFavorite(note.id, e)}
                            className={`favorite-btn ${note.isFavorite ? 'active' : ''}`}
                            title="Favorite"
                          >
                            <FiStar />
                          </button>
                        )}
                        <button
                          onClick={(e) => deleteNote(note.id, e)}
                          className="delete-note"
                          title="Delete"
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </div>
                    <p className="note-preview">
                      {note.content.replace(/^#+ /, '').substring(0, 80)}
                    </p>
                    <div className="note-meta">
                      {tasks.total > 0 && (
                        <span className="note-tasks">
                          {tasks.completed}/{tasks.total}
                        </span>
                      )}
                      <span className="note-time">{formatDate(note.updatedAt)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="sidebar-footer">
            <button onClick={() => setAboutOpen(true)} className="footer-btn">
              <FiInfo /> About
            </button>
          </div>
        </div>
      )}

      <div className="main-content">
        {!settings.zenMode && (
          <div className="toolbar">
            <div className="toolbar-left">
              {currentNote && (
                <>
                  {noteStats && noteStats.tasks.total > 0 && (
                    <span className="note-progress">
                      {noteStats.tasks.completed}/{noteStats.tasks.total} tasks
                    </span>
                  )}
                  <span className="note-info">
                    {formatDate(currentNote.updatedAt)}
                  </span>
                </>
              )}
            </div>
            <div className="toolbar-actions">
              {currentNote && viewMode === 'edit' && (
                <div className="markdown-toolbar">
                  <button onClick={() => insertMarkdown('**', '**')} title="Bold">
                    <FiBold />
                  </button>
                  <button onClick={() => insertMarkdown('*', '*')} title="Italic">
                    <FiItalic />
                  </button>
                  <button onClick={() => insertMarkdown('`', '`')} title="Code">
                    <FiCode />
                  </button>
                  <button onClick={() => insertMarkdown('[', '](url)')} title="Link">
                    <FiLink />
                  </button>
                  <button onClick={() => insertMarkdown('- [ ] ', '')} title="Task">
                    <FiCheckCircle />
                  </button>
                  <button onClick={() => insertMarkdown('- ', '')} title="List">
                    <FiList />
                  </button>
                </div>
              )}
              {currentNote && (
                <>
                  <button
                    onClick={() => setViewMode(mode => mode === 'edit' ? 'preview' : 'edit')}
                    title="Preview"
                    className={viewMode === 'preview' ? 'active' : ''}
                  >
                    <FiBook />
                  </button>
                  <button onClick={handleExportNote} title="Export">
                    <FiDownload />
                  </button>
                </>
              )}
              <button onClick={() => setStatsModalOpen(true)} title="Stats">
                <FiTrendingUp />
              </button>
              <button onClick={() => setSettings((s) => ({ ...s, zenMode: true }))} title="Zen Mode">
                <FiEye />
              </button>
              <button onClick={() => setSettingsOpen(true)} title="Settings">
                <FiSettings />
              </button>
            </div>
          </div>
        )}

        <div className="editor-wrapper">
          {currentNote ? (
            <div className="editor-container">
              {viewMode === 'edit' ? (
                <div ref={editorRef} />
              ) : (
                <div className="preview-container" dangerouslySetInnerHTML={{ __html: markdownToHTML(currentNote.content) }} />
              )}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-content">
                <h2>Welcome to Optimum</h2>
                <p>Create your first note</p>
                <button onClick={() => createNote()} className="primary-btn large">
                  <FiPlus /> New Note
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* About Modal */}
      {aboutOpen && (
        <div className="modal-overlay" onClick={() => setAboutOpen(false)}>
          <div className="modal about-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="about-header-content">
                <FiShield size={24} />
                <h2>About Optimum</h2>
              </div>
              <button onClick={() => setAboutOpen(false)}>
                <FiX />
              </button>
            </div>
            <div className="modal-content">
              <div className="about-section">
                <h3>Our Mission</h3>
                <p>
                  Optimum is a privacy-first, minimalist note-taking app designed for people who value simplicity and data ownership.
                </p>
              </div>

              <div className="about-section">
                <h3>
                  <FiShield size={18} />
                  Privacy-First Design
                </h3>
                <ul className="about-list">
                  <li>
                    <strong>100% Local Storage</strong>
                    <p>All your notes are stored locally in your browser. We never see or touch your data.</p>
                  </li>
                  <li>
                    <strong>No Tracking</strong>
                    <p>Zero analytics, no cookies, no third-party scripts. Your writing is yours alone.</p>
                  </li>
                  <li>
                    <strong>No Account Required</strong>
                    <p>Start writing immediately. No sign-up, no email, no personal information.</p>
                  </li>
                  <li>
                    <strong>Open Source Spirit</strong>
                    <p>Built with transparency in mind. Your trust is our priority.</p>
                  </li>
                </ul>
              </div>

              <div className="about-section">
                <h3>
                  <FiZap size={18} />
                  Core Principles
                </h3>
                <ul className="about-list">
                  <li>
                    <strong>Speed</strong>
                    <p>Lightning-fast load times. No server delays, no waiting.</p>
                  </li>
                  <li>
                    <strong>Simplicity</strong>
                    <p>Clean, distraction-free interface. Just you and your thoughts.</p>
                  </li>
                  <li>
                    <strong>Customization</strong>
                    <p>Personalize your experience with themes, colors, and fonts.</p>
                  </li>
                </ul>
              </div>

              <div className="about-section">
                <h3>
                  <FiHeart size={18} />
                  Data Ownership
                </h3>
                <p>
                  Your notes belong to you. Export them anytime as Markdown or JSON. 
                  Move them to another app, back them up to your cloud storage, or keep them local. 
                  You're always in control.
                </p>
              </div>

              <div className="about-footer">
                <p>Made with care for writers, thinkers, and privacy enthusiasts.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal - CONTINUING IN NEXT MESSAGE */}
      {/* Settings Modal */}
      {settingsOpen && (
        <div className="modal-overlay" onClick={() => setSettingsOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Settings</h2>
              <button onClick={() => setSettingsOpen(false)}>
                <FiX />
              </button>
            </div>
            <div className="modal-content">
              <div className="backup-warning">
                <div className="warning-icon">⚠️</div>
                <div className="warning-content">
                  <h3>Backup Your Notes</h3>
                  <p>Your notes are stored locally. Export regularly to avoid data loss.</p>
                </div>
              </div>

              <div className="setting-section">
                <h3>Backup & Export</h3>
                <div className="export-guide">
                  <button onClick={handleExportAll} className="export-btn">
                    <FiDownload /> Export All Notes
                  </button>
                  
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="secondary-btn"
                    style={{ marginTop: '12px', width: '100%' }}
                  >
                    <FiUpload /> Import Notes
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleImport}
                    style={{ display: 'none' }}
                  />

                  {notes.length > 0 && (
                    <div className="backup-stats">
                      <p>
                        <strong>{notes.filter(n => !n.isDeleted).length}</strong> active notes
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="setting-section">
                <h3>Color Scheme</h3>
                
                <div className="color-schemes">
                  <button
                    className={`color-scheme-btn ${settings.colorScheme === 'coral' ? 'active' : ''}`}
                    onClick={() => setSettings((s) => ({ ...s, colorScheme: 'coral' }))}
                  >
                    <div className="color-preview coral-preview"></div>
                    <span>Coral</span>
                  </button>

                  <button
                    className={`color-scheme-btn ${settings.colorScheme === 'yellow' ? 'active' : ''}`}
                    onClick={() => setSettings((s) => ({ ...s, colorScheme: 'yellow' }))}
                  >
                    <div className="color-preview yellow-preview"></div>
                    <span>Yellow</span>
                  </button>

                  <button
                    className={`color-scheme-btn ${settings.colorScheme === 'mint' ? 'active' : ''}`}
                    onClick={() => setSettings((s) => ({ ...s, colorScheme: 'mint' }))}
                  >
                    <div className="color-preview mint-preview"></div>
                    <span>Mint</span>
                  </button>

                  <button
                    className={`color-scheme-btn ${settings.colorScheme === 'lavender' ? 'active' : ''}`}
                    onClick={() => setSettings((s) => ({ ...s, colorScheme: 'lavender' }))}
                  >
                    <div className="color-preview lavender-preview"></div>
                    <span>Lavender</span>
                  </button>
                </div>
              </div>

              <div className="setting-section">
                <h3>Appearance</h3>
                
                <div className="setting-group">
                  <label>Theme</label>
                  <select
                    value={settings.theme}
                    onChange={(e) => setSettings((s) => ({ ...s, theme: e.target.value }))}
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                  </select>
                </div>

                <div className="setting-group">
                  <label>Font Size: {settings.fontSize}px</label>
                  <input
                    type="range"
                    min="12"
                    max="24"
                    value={settings.fontSize}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, fontSize: parseInt(e.target.value) }))
                    }
                  />
                </div>

                <div className="setting-group">
                  <label>Line Height: {settings.lineHeight}</label>
                  <input
                    type="range"
                    min="1.2"
                    max="2.0"
                    step="0.1"
                    value={settings.lineHeight}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, lineHeight: parseFloat(e.target.value) }))
                    }
                  />
                </div>

                <div className="setting-group">
                  <label>Font Family</label>
                  <select
                    value={settings.fontFamily}
                    onChange={(e) => setSettings((s) => ({ ...s, fontFamily: e.target.value }))}
                  >
                    <option value="Inter">Inter</option>
                    <option value="Georgia">Georgia</option>
                    <option value="'Times New Roman'">Times New Roman</option>
                    <option value="'Segoe UI'">Segoe UI</option>
                    <option value="System-ui">System UI</option>
                  </select>
                </div>
              </div>

              <div className="setting-section">
                <h3>Danger Zone</h3>
                <button
                  onClick={() => {
                    if (
                      window.confirm(
                        'Delete ALL notes permanently?'
                      )
                    ) {
                      localStorage.clear();
                      setNotes([]);
                      setCurrentNote(null);
                      setFolders(['Personal', 'Work', 'Ideas']);
                      alert('All data cleared');
                    }
                  }}
                  className="danger-btn"
                >
                  <FiTrash2 /> Clear All Data
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <StatsModal
        isOpen={statsModalOpen}
        onClose={() => setStatsModalOpen(false)}
        notes={notes}
      />

      {settings.zenMode && (
        <button
          className="zen-exit"
          onClick={() => setSettings((s) => ({ ...s, zenMode: false }))}
          title="Exit Zen Mode (Esc)"
        >
          <FiMenu />
        </button>
      )}
    </div>
  );
}

export default App;
