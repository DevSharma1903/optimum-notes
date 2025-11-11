// LocalStorage keys
const NOTES_KEY = 'notevault_notes';
const SETTINGS_KEY = 'notevault_settings';
const FOLDERS_KEY = 'notevault_folders';
const TEMPLATES_KEY = 'notevault_templates';

// Save notes to localStorage
export const saveNotes = (notes) => {
  try {
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  } catch (error) {
    console.error('Failed to save notes:', error);
  }
};

// Load notes from localStorage
export const loadNotes = () => {
  try {
    const data = localStorage.getItem(NOTES_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to load notes:', error);
    return [];
  }
};

// Save settings to localStorage
export const saveSettings = (settings) => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
};

// Load settings from localStorage
export const loadSettings = () => {
  try {
    const data = localStorage.getItem(SETTINGS_KEY);
    return data ? JSON.parse(data) : {
      theme: 'dark',
      fontSize: 16,
      lineHeight: 1.6,
      fontFamily: 'Inter',
      zenMode: false,
      sortBy: 'updated',
    };
  } catch (error) {
    console.error('Failed to load settings:', error);
    return {
      theme: 'dark',
      fontSize: 16,
      lineHeight: 1.6,
      fontFamily: 'Inter',
      zenMode: false,
      sortBy: 'updated',
    };
  }
};

// Save folders to localStorage
export const saveFolders = (folders) => {
  try {
    localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders));
  } catch (error) {
    console.error('Failed to save folders:', error);
  }
};

// Load folders from localStorage
export const loadFolders = () => {
  try {
    const data = localStorage.getItem(FOLDERS_KEY);
    return data ? JSON.parse(data) : ['Personal', 'Work', 'Ideas'];
  } catch (error) {
    console.error('Failed to load folders:', error);
    return ['Personal', 'Work', 'Ideas'];
  }
};

// Save templates
export const saveTemplates = (templates) => {
  try {
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
  } catch (error) {
    console.error('Failed to save templates:', error);
  }
};

// Load templates
export const loadTemplates = () => {
  try {
    const data = localStorage.getItem(TEMPLATES_KEY);
    return data ? JSON.parse(data) : getDefaultTemplates();
  } catch (error) {
    console.error('Failed to load templates:', error);
    return getDefaultTemplates();
  }
};

// Default templates
export const getDefaultTemplates = () => {
  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  return [
    {
      id: 'daily',
      name: 'Daily Note',
      content: '# ' + today + '\n\n## Today\'s Goals\n- [ ] \n\n## Notes\n\n\n## Reflections\n\n',
    },
    {
      id: 'meeting',
      name: 'Meeting Notes',
      content: '# Meeting: [Title]\n\n**Date:** ' + new Date().toLocaleDateString() + '\n**Attendees:** \n\n## Agenda\n- \n\n## Discussion\n\n\n## Action Items\n- [ ] \n- [ ] \n\n## Next Steps\n\n',
    },
    {
      id: 'todo',
      name: 'To-Do List',
      content: '# To-Do List\n\n## High Priority\n- [ ] \n\n## Medium Priority\n- [ ] \n\n## Low Priority\n- [ ] \n\n## Completed\n- [x] \n',
    },
  ];
};

// Generate unique ID
export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Extract hashtags from content
export const extractTags = (content) => {
  const regex = /#(\w+)/g;
  const matches = content.match(regex);
  return matches ? [...new Set(matches.map(tag => tag.toLowerCase()))] : [];
};

// Parse wiki-style links from content
export const parseWikiLinks = (content) => {
  const regex = /\[\[([^\]]+)\]\]/g;
  const links = [];
  let match;
  
  while ((match = regex.exec(content)) !== null) {
    links.push(match[1]);
  }
  
  return links;
};

// Format date
export const formatDate = (timestamp) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  
  // Less than 1 day
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor(diff / 60000);
    
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  }
  
  // Less than 7 days
  if (diff < 604800000) {
    const days = Math.floor(diff / 86400000);
    return `${days}d ago`;
  }
  
  // Format as date
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
};

// Count tasks in content
export const countTasks = (content) => {
  const allTasks = content.match(/- \[[ x]\]/gi) || [];
  const completedTasks = content.match(/- \[x\]/gi) || [];
  return {
    total: allTasks.length,
    completed: completedTasks.length,
    percentage: allTasks.length > 0 ? Math.round((completedTasks.length / allTasks.length) * 100) : 0,
  };
};

// Count words
export const countWords = (content) => {
  return content.trim().split(/\s+/).filter(word => word.length > 0).length;
};

// Estimate reading time (average 200 words per minute)
export const estimateReadingTime = (content) => {
  const words = countWords(content);
  const minutes = Math.ceil(words / 200);
  return minutes;
};

// Export note as markdown file
export const exportNoteAsMarkdown = (note) => {
  const blob = new Blob([note.content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${note.title.replace(/[^a-z0-9]/gi, '_')}.md`;
  a.click();
  URL.revokeObjectURL(url);
};

// Export all notes as JSON
export const exportNotesAsJSON = (notes) => {
  const dataStr = JSON.stringify(notes, null, 2);
  const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
  
  const exportFileDefaultName = `notes_backup_${Date.now()}.json`;
  
  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();
};

// Import notes from JSON
export const importNotesFromJSON = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const notes = JSON.parse(e.target.result);
        resolve(notes);
      } catch (error) {
        reject(new Error('Invalid JSON file'));
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
};

// Simple markdown to HTML converter (basic implementation)
export const markdownToHTML = (markdown) => {
  let html = markdown;
  
  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  
  // Bold
  html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
  html = html.replace(/__(.*?)__/gim, '<strong>$1</strong>');
  
  // Italic
  html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>');
  html = html.replace(/_(.*?)_/gim, '<em>$1</em>');
  
  // Code
  html = html.replace(/`(.*?)`/gim, '<code>$1</code>');
  
  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank">$1</a>');
  
  // Task lists
  html = html.replace(/- \[x\] (.*$)/gim, '<div class="task-item completed"><input type="checkbox" checked disabled> $1</div>');
  html = html.replace(/- \[ \] (.*$)/gim, '<div class="task-item"><input type="checkbox" disabled> $1</div>');
  
  // Unordered lists
  html = html.replace(/^\* (.*$)/gim, '<li>$1</li>');
  html = html.replace(/^- (.*$)/gim, '<li>$1</li>');
  
  // Blockquotes
  html = html.replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>');
  
  // Line breaks
  html = html.replace(/\n/gim, '<br>');
  
  return html;
};

// ===== ACTIVITY TRACKING =====

// Track daily activity
export const recordActivity = () => {
  const today = new Date().toDateString();
  const activities = JSON.parse(localStorage.getItem('activity_log') || '{}');
  
  if (!activities[today]) {
    activities[today] = {
      date: Date.now(),
      notesCreated: 0,
      notesEdited: 0,
      wordsWritten: 0,
    };
  }
  
  activities[today].notesEdited += 1;
  localStorage.setItem('activity_log', JSON.stringify(activities));
};

// Record note creation
export const recordNoteCreation = (wordCount = 0) => {
  const today = new Date().toDateString();
  const activities = JSON.parse(localStorage.getItem('activity_log') || '{}');
  
  if (!activities[today]) {
    activities[today] = {
      date: Date.now(),
      notesCreated: 0,
      notesEdited: 0,
      wordsWritten: 0,
    };
  }
  
  activities[today].notesCreated += 1;
  activities[today].wordsWritten += wordCount;
  localStorage.setItem('activity_log', JSON.stringify(activities));
};

// Get activity log for heatmap
export const getActivityLog = () => {
  return JSON.parse(localStorage.getItem('activity_log') || '{}');
};

// Get activity stats
export const getActivityStats = (notes) => {
  const activities = getActivityLog();
  const dates = Object.keys(activities);
  
  // Calculate streak
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Sort dates
  const sortedDates = dates.sort((a, b) => new Date(b) - new Date(a));
  
  // Calculate current streak
  let checkDate = new Date(today);
  for (let i = 0; i < 365; i++) {
    const dateStr = checkDate.toDateString();
    if (activities[dateStr]) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }
  
  // Calculate longest streak
  sortedDates.forEach((dateStr, index) => {
    if (index === 0 || new Date(sortedDates[index - 1]) - new Date(dateStr) === 86400000) {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      tempStreak = 1;
    }
  });
  
  // Total stats
  const totalDays = dates.length;
  const totalWords = notes.reduce((sum, note) => sum + countWords(note.content), 0);
  const totalNotes = notes.filter(n => !n.isDeleted).length;
  
  return {
    currentStreak,
    longestStreak,
    totalDays,
    totalWords,
    totalNotes,
    averageWordsPerDay: totalDays > 0 ? Math.round(totalWords / totalDays) : 0,
  };
};

// Generate heatmap data for last 365 days
export const generateHeatmapData = () => {
  const activities = getActivityLog();
  const heatmapData = [];
  const today = new Date();
  
  // Generate last 365 days
  for (let i = 364; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    
    const dateStr = date.toDateString();
    const activity = activities[dateStr];
    
    heatmapData.push({
      date: date.toISOString().split('T')[0],
      count: activity ? activity.notesEdited + activity.notesCreated : 0,
      level: activity ? Math.min(4, Math.floor((activity.notesEdited + activity.notesCreated) / 2)) : 0,
    });
  }
  
  return heatmapData;
};

// Track global user count (simple localStorage-based)
export const trackUser = () => {
  const userId = localStorage.getItem('user_id');
  
  if (!userId) {
    // Generate unique ID for this user
    const newUserId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('user_id', newUserId);
    localStorage.setItem('first_visit', Date.now().toString());
  }
  
  localStorage.setItem('last_visit', Date.now().toString());
};

// Get user stats
export const getUserStats = () => {
  const userId = localStorage.getItem('user_id');
  const firstVisit = localStorage.getItem('first_visit');
  const lastVisit = localStorage.getItem('last_visit');
  
  return {
    userId: userId || 'guest',
    firstVisit: firstVisit ? parseInt(firstVisit) : Date.now(),
    lastVisit: lastVisit ? parseInt(lastVisit) : Date.now(),
    daysActive: firstVisit ? Math.floor((Date.now() - parseInt(firstVisit)) / (1000 * 60 * 60 * 24)) : 0,
  };
};
