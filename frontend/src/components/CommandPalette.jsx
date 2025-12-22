import React, { useState, useEffect, useMemo } from 'react';
import { Search, Command, ArrowRight, Camera, Monitor, Calendar, Settings, LogOut, X, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CommandPalette = ({ isOpen, onClose, onLogout }) => {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();

  // Define commands
  const commands = useMemo(() => [
    { 
      id: 'dash', 
      label: 'Dashboard', 
      icon: Home, 
      category: 'Navigation', 
      action: () => navigate('/') 
    },
    { 
        id: 'live', 
        label: 'Live Feed', 
        icon: Monitor, 
        category: 'Navigation', 
        action: () => navigate('/live') 
    },
    { 
        id: 'events', 
        label: 'Event History', 
        icon: Calendar, 
        category: 'Navigation', 
        action: () => navigate('/events') 
    },
    { 
        id: 'cams', 
        label: 'Camera Management', 
        icon: Camera, 
        category: 'Navigation', 
        action: () => navigate('/cameras') 
    },
    { 
        id: 'settings', 
        label: 'System Settings', 
        icon: Settings, 
        category: 'System', 
        action: () => navigate('/settings') 
    },
    { 
        id: 'cam-01', 
        label: 'View Camera 01', 
        icon: Camera, 
        category: 'Cameras', 
        action: () => navigate('/live?cam=01') 
    },
    { 
        id: 'cam-02', 
        label: 'View Camera 02', 
        icon: Camera, 
        category: 'Cameras', 
        action: () => navigate('/live?cam=02') 
    },
    { 
        id: 'logout', 
        label: 'Sign Out', 
        icon: LogOut, 
        category: 'Account', 
        action: () => onLogout && onLogout() 
    }
  ], [navigate, onLogout]);

  // Filter logic
  const filteredCommands = useMemo(() => {
    if (!query) return commands;
    const lowerQuery = query.toLowerCase();
    return commands.filter(cmd => 
      cmd.label.toLowerCase().includes(lowerQuery) || 
      cmd.category.toLowerCase().includes(lowerQuery)
    );
  }, [query, commands]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const cmd = filteredCommands[selectedIndex];
        if (cmd) {
            cmd.action();
            onClose();
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, onClose]);

  // Reset selection on query change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Focus input on open
  useEffect(() => {
      if(isOpen) setQuery("");
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-[#0B0F14] border border-white/10 rounded-xl shadow-2xl shadow-black/50 overflow-hidden transform transition-all animate-fade-in ring-1 ring-white/5">
        
        {/* Search Input */}
        <div className="flex items-center px-4 py-3 border-b border-white/5 bg-white/[0.02]">
          <Search className="w-5 h-5 text-slate-400 mr-3" />
          <input
            autoFocus
            type="text"
            placeholder="Search commands, pages, or cameras..."
            className="w-full bg-transparent border-none outline-none text-slate-200 placeholder-slate-500 text-sm font-medium"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button onClick={onClose} className="p-1 rounded hover:bg-white/10 text-slate-500 hover:text-white transition-colors">
            <span className="text-[10px] font-mono border border-white/10 rounded px-1.5 py-0.5">Esc</span>
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-[60vh] overflow-y-auto custom-scrollbar p-2">
            {filteredCommands.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                    <p className="text-sm">No results found.</p>
                </div>
            ) : (
                <>
                    <div className="px-2 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Suggestions
                    </div>
                    {filteredCommands.map((cmd, idx) => (
                        <button
                            key={cmd.id}
                            onClick={() => { cmd.action(); onClose(); }}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                                idx === selectedIndex 
                                    ? 'bg-indigo-500/10 text-white shadow-sm ring-1 ring-indigo-500/20' 
                                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                            }`}
                            onMouseEnter={() => setSelectedIndex(idx)}
                        >
                            <div className={`p-1.5 rounded-md ${idx === selectedIndex ? 'bg-indigo-500/20 text-indigo-400' : 'bg-white/5 text-slate-500'}`}>
                                <cmd.icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1">
                                <span className={`text-sm font-medium ${idx === selectedIndex ? 'text-indigo-100' : ''}`}>
                                    {cmd.label}
                                </span>
                                {cmd.category && (
                                    <span className="ml-2 text-[10px] text-slate-600 font-medium px-1.5 py-0.5 rounded border border-white/5 bg-white/[0.02]">
                                        {cmd.category}
                                    </span>
                                )}
                            </div>
                            {idx === selectedIndex && (
                                <ArrowRight className="w-3.5 h-3.5 text-indigo-400 opacity-50" />
                            )}
                        </button>
                    ))}
                </>
            )}
        </div>
        
        {/* Footer */}
        <div className="px-4 py-2 bg-white/[0.02] border-t border-white/5 flex items-center justify-between text-[10px] text-slate-500">
            <div className="flex gap-3">
                <span><strong className="text-slate-400">↑↓</strong> to navigate</span>
                <span><strong className="text-slate-400">↵</strong> to select</span>
            </div>
            <div className="flex items-center gap-1">
                 <Command className="w-3 h-3" /> 
                 <span>Command Palette</span>
            </div>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
