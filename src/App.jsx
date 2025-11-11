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
  FiFileText,
  FiBold,
  FiItalic,
  FiCode,
  FiLink,
  FiTrendingUp,
} from 'react-icons/fi';
import {
  saveNotes,
  loadNotes,
  saveSettings,
  loadSettings,
  saveFolders,
  loadFolders,
  saveTemplates,
  loadTemplates,
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
  // State - Initialize notes from localStorage
  const [notes, setNotes] = useState(() => {
    const saved = localStorage.getItem('notevault_notes');
    return saved ? JSON.parse(saved) : [];
  });
  const [folders, setFolders] = useState(['Personal', 'Work', 'Ideas']);
  const [expandedFolders, setExpandedFolders] = useState(new Set(['Personal', 'Work', 'Ideas']));
  const [templates, setTemplates] = useState([]);
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
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [statsModalOpen, setStatsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('edit');
  const [showTemplates, setShowTemplates] = useState(false);

  const editorRef = useRef(null);
  const viewRef = useRef(null);
  const fileInputRef = useRef(null);

  // Sidebar resize functionality
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const isResizing = useRef(false);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing.current) return;
      const newWidth = e.clientX;
      if (newWidth >= 250 && newWidth <= 500) {
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

  // Load data on mount and track user
  useEffect(() => {
    // Track user activity
    trackUser();
    
    const savedSettings = loadSettings();
    const savedFolders = loadFolders();
    const savedTemplates = loadTemplates();
    
    setSettings(savedSettings);
    setFolders(savedFolders);
    setTemplates(savedTemplates);
    
    // Set current note if notes exist
    if (notes.length > 0) {
      const activeNotes = notes.filter(n => !n.isDeleted);
      if (activeNotes.length > 0) {
        setCurrentNote(activeNotes[0]);
      }
    }
  }, []);

  // Auto-save notes
  useEffect(() => {
    localStorage.setItem('notevault_notes', JSON.stringify(notes));
  }, [notes]);

  // Save settings
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  // Save folders
  useEffect(() => {
    saveFolders(folders);
  }, [folders]);

  // Save templates
  useEffect(() => {
    saveTemplates(templates);
  }, [templates]);

  // Setup CodeMirror editor
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

  // Update note content
  const updateNoteContent = (content) => {
    setNotes((prev) =>
      prev.map((note) =>
        note.id === currentNote.id
          ? { ...note, content, updatedAt: Date.now() }
          : note
      )
    );
    setCurrentNote((prev) => ({ ...prev, content, updatedAt: Date.now() }));
    
    // Track activity
    recordActivity();
  };

  // Auto-update note title from first line
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

  // Create new note
  const createNote = (templateContent = '') => {
    const newNote = {
      id: generateId(),
      title: 'Untitled Note',
      content: templateContent || '# Your Note Title\n\nStart typing your notes here...\n\n**Tip:** Use # for headers, **bold**, *italic*, - [ ] for tasks',
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
    setShowTemplates(false);
    
    // Track note creation
    recordNoteCreation(countWords(templateContent || ''));
  };

  // Create note from template
  const createFromTemplate = (template) => {
    createNote(template.content);
  };

  // Toggle favorite
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

  // Delete note
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

  // Restore note from trash
  const restoreNote = (id, e) => {
    e.stopPropagation();
    setNotes((prev) =>
      prev.map((note) =>
        note.id === id ? { ...note, isDeleted: false, updatedAt: Date.now() } : note
      )
    );
  };

  // Toggle folder expand
  const toggleFolderExpand = (folder) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folder)) {
      newExpanded.delete(folder);
    } else {
      newExpanded.add(folder);
    }
    setExpandedFolders(newExpanded);
  };

  // Create new folder
  const createFolder = () => {
    const folderName = prompt('Enter folder name:');
    if (folderName && folderName.trim()) {
      setFolders((prev) => [...prev, folderName.trim()]);
    }
  };

  // Delete folder
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

  // Export current note
  const handleExportNote = () => {
    if (currentNote) {
      exportNoteAsMarkdown(currentNote);
    }
  };

  // Export all notes
  const handleExportAll = () => {
    exportNotesAsJSON(notes);
  };

  // Import notes
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

  // Insert markdown formatting
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

  // Get all unique tags
  const allTags = [...new Set(notes.flatMap(note => extractTags(note.content)))];

  // Sort notes
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

  // Filter notes
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

  // Keyboard shortcuts
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

  // Calculate stats for current note
  const noteStats = currentNote ? {
    words: countWords(currentNote.content),
    chars: currentNote.content.length,
    reading: estimateReadingTime(currentNote.content),
    tasks: countTasks(currentNote.content),
    tags: extractTags(currentNote.content),
  } : null;

  return (
    <div className={`app ${settings.theme} ${settings.zenMode ? 'zen-mode' : ''}`}>
      {/* Sidebar */}
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
            <div className="header-actions">
              <button onClick={() => setShowTemplates(!showTemplates)} className="icon-btn" title="New from Template">
                <FiFileText />
              </button>
              <button onClick={() => createNote()} className="primary-btn" title="New Note (Ctrl+N)">
                <FiPlus />
              </button>
            </div>
          </div>

          {/* Templates Dropdown */}
          {showTemplates && (
            <div className="templates-dropdown">
              <div className="templates-header">
                <span>Choose Template</span>
                <button onClick={() => setShowTemplates(false)}>
                  <FiX />
                </button>
              </div>
              {templates.map(template => (
                <button
                  key={template.id}
                  className="template-item"
                  onClick={() => createFromTemplate(template)}
                >
                  <FiFileText />
                  {template.name}
                </button>
              ))}
            </div>
          )}

          {/* Search */}
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

          {/* Folders */}
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
              <FiFolder /> All Notes ({notes.filter(n => !n.isDeleted).length})
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
              const isExpanded = expandedFolders.has(folder);
              
              return (
                <div key={folder}>
                  <button
                    className={`folder-btn ${currentFolder === folder ? 'active' : ''}`}
                    onClick={() => { setCurrentFolder(folder); setSelectedTag(null); }}
                  >
                    <button 
                      className="folder-chevron"
                      onClick={(e) => { e.stopPropagation(); toggleFolderExpand(folder); }}
                    >
                      {isExpanded ? '▼' : '▶'}
                    </button>
                    <FiFolder /> {folder} ({folderNotes.length})
                    <button
                      className="delete-folder"
                      onClick={(e) => deleteFolder(folder, e)}
                      title="Delete folder"
                    >
                      <FiTrash2 />
                    </button>
                  </button>
                  
                  {isExpanded && folderNotes.length > 0 && (
                    <div className="folder-notes">
                      {folderNotes.slice(0, 5).map(note => (
                        <div
                          key={note.id}
                          className={`folder-note-item ${currentNote?.id === note.id ? 'active' : ''}`}
                          onClick={() => setCurrentNote(note)}
                        >
                          {note.title}
                        </div>
                      ))}
                      {folderNotes.length > 5 && (
                        <div className="folder-note-more">
                          +{folderNotes.length - 5} more
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            <button
              className={`folder-btn ${currentFolder === 'Trash' ? 'active' : ''}`}
              onClick={() => { setCurrentFolder('Trash'); setSelectedTag(null); }}
            >
              <FiTrash2 /> Trash ({notes.filter(n => n.isDeleted).length})
            </button>
          </div>

          {/* Tags */}
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

          {/* Notes List */}
          <div className="notes-list">
            <div className="notes-list-header">
              <span>{filteredNotes.length} notes</span>
              <select
                value={settings.sortBy}
                onChange={(e) => setSettings(s => ({ ...s, sortBy: e.target.value }))}
                className="sort-select"
              >
                <option value="updated">Last Updated</option>
                <option value="created">Date Created</option>
                <option value="title">Title (A-Z)</option>
              </select>
            </div>
            {filteredNotes.length === 0 ? (
              <div className="no-notes">
                <p>No notes found</p>
                <button onClick={() => createNote()} className="primary-btn">
                  <FiPlus /> Create Note
                </button>
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
                            title="Restore note"
                          >
                            <FiUpload />
                          </button>
                        ) : (
                          <button
                            onClick={(e) => toggleFavorite(note.id, e)}
                            className={`favorite-btn ${note.isFavorite ? 'active' : ''}`}
                            title="Toggle favorite"
                          >
                            <FiStar />
                          </button>
                        )}
                        <button
                          onClick={(e) => deleteNote(note.id, e)}
                          className="delete-note"
                          title={currentFolder === 'Trash' ? 'Delete permanently' : 'Move to trash'}
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </div>
                    <p className="note-preview">
                      {note.content.replace(/^#+ /, '').substring(0, 100)}
                    </p>
                    <div className="note-meta">
                      <span className="note-folder">{note.folder}</span>
                      {tasks.total > 0 && (
                        <span className="note-tasks">
                          <FiCheckCircle size={12} /> {tasks.completed}/{tasks.total}
                        </span>
                      )}
                      <span className="note-time">{formatDate(note.updatedAt)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="main-content">
        {!settings.zenMode && (
          <div className="toolbar">
            <div className="toolbar-left">
              {currentNote && (
                <>
                  <span className="note-folder-badge">{currentNote.folder}</span>
                  {noteStats && noteStats.tasks.total > 0 && (
                    <span className="note-progress">
                      <FiCheckCircle size={14} />
                      {noteStats.tasks.percentage}% ({noteStats.tasks.completed}/{noteStats.tasks.total})
                    </span>
                  )}
                  <span className="note-info">
                    <FiEdit2 size={14} /> {formatDate(currentNote.updatedAt)}
                  </span>
                </>
              )}
            </div>
            <div className="toolbar-actions">
              {currentNote && viewMode === 'edit' && (
                <div className="markdown-toolbar">
                  <button onClick={() => insertMarkdown('**', '**')} title="Bold (Ctrl+B)">
                    <FiBold />
                  </button>
                  <button onClick={() => insertMarkdown('*', '*')} title="Italic (Ctrl+I)">
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
                    title={`${viewMode === 'edit' ? 'Preview' : 'Edit'} (Ctrl+P)`}
                    className={viewMode === 'preview' ? 'active' : ''}
                  >
                    <FiBook />
                  </button>
                  <button onClick={handleExportNote} title="Export Note">
                    <FiDownload />
                  </button>
                </>
              )}
              <button onClick={() => setStatsModalOpen(true)} title="Statistics">
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

        {/* Note Stats Bar */}
        {!settings.zenMode && currentNote && noteStats && (
          <div className="stats-bar">
            <span><strong>{noteStats.words}</strong> words</span>
            <span><strong>{noteStats.chars}</strong> characters</span>
            <span><strong>{noteStats.reading}</strong> min read</span>
            {noteStats.tags.length > 0 && (
              <span className="stats-tags">
                <FiTag size={12} />
                {noteStats.tags.join(' ')}
              </span>
            )}
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
                <p>Create your first note to get started</p>
                <button onClick={() => createNote()} className="primary-btn large">
                  <FiPlus /> Create Note
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

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
              {/* Data Backup Warning */}
              <div className="backup-warning">
                <div className="warning-icon">⚠️</div>
                <div className="warning-content">
                  <h3>Important: Backup Your Notes</h3>
                  <p>Your notes are stored locally in your browser. They will be lost if you:</p>
                  <ul>
                    <li>Clear browser data or cache</li>
                    <li>Switch to a different device or browser</li>
                    <li>Reinstall your browser</li>
                  </ul>
                  <p className="warning-cta">
                    <strong>Export your notes regularly to keep them safe!</strong>
                  </p>
                </div>
              </div>

              <div className="setting-section">
                <h3>Backup & Export</h3>
                <div className="export-guide">
                  <div className="export-step">
                    <div className="step-number">1</div>
                    <div className="step-content">
                      <p><strong>Export All Notes</strong></p>
                      <p>Download a complete backup as JSON file</p>
                    </div>
                  </div>
                  <button onClick={handleExportAll} className="export-btn">
                    <FiDownload /> Export All Notes
                  </button>
                  
                  <div className="export-step" style={{ marginTop: '16px' }}>
                    <div className="step-number">2</div>
                    <div className="step-content">
                      <p><strong>Import Notes</strong></p>
                      <p>Restore from a previously exported backup</p>
                    </div>
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="secondary-btn"
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
                      <p className="backup-tip">
                        💡 Tip: Keep your exported file in Google Drive or Dropbox
                      </p>
                    </div>
                  )}
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
                        'Are you sure? This will delete ALL notes and settings permanently!'
                      )
                    ) {
                      localStorage.clear();
                      setNotes([]);
                      setCurrentNote(null);
                      setFolders(['Personal', 'Work', 'Ideas']);
                      alert('All data cleared!');
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

      {/* Stats Modal */}
      <StatsModal
        isOpen={statsModalOpen}
        onClose={() => setStatsModalOpen(false)}
        notes={notes}
      />

      {/* Zen Mode Exit Button */}
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
