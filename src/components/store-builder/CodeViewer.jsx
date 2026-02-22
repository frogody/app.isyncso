// ---------------------------------------------------------------------------
// CodeViewer.jsx -- Virtual file tree + syntax-highlighted code panel
// with diff markers (red/green) for changed lines.
// ---------------------------------------------------------------------------

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FolderOpen,
  FolderClosed,
  FileCode2,
  FileJson,
  Palette,
  ChevronRight,
  Copy,
  Check,
  Pencil,
} from 'lucide-react';

import { highlight, languages } from 'prismjs';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-json';
import 'prismjs/themes/prism-tomorrow.css';

import { generateFileTree, generateFileContent } from './utils/generateStoreCode';

// ── Icon mapping ────────────────────────────────────────────────────────────

function getFileIcon(name) {
  if (name.endsWith('.jsx')) return FileCode2;
  if (name.endsWith('.css')) return Palette;
  if (name.endsWith('.json')) return FileJson;
  return FileCode2;
}

function getFileIconColor(name) {
  if (name.endsWith('.jsx')) return 'text-cyan-400';
  if (name.endsWith('.css')) return 'text-pink-400';
  if (name.endsWith('.json')) return 'text-amber-400';
  return 'text-zinc-400';
}

function getLangForFile(name) {
  if (name.endsWith('.jsx')) return 'jsx';
  if (name.endsWith('.css')) return 'css';
  if (name.endsWith('.json')) return 'json';
  return 'jsx';
}

// ── Simple line diff ────────────────────────────────────────────────────────
// Returns a Map<lineIndex, 'added' | 'removed'> for changed lines.

function computeLineDiff(oldCode, newCode) {
  if (!oldCode || oldCode === newCode) return new Map();
  const oldLines = oldCode.split('\n');
  const newLines = newCode.split('\n');
  const diff = new Map();

  // Simple LCS-like approach: mark lines that are new or changed
  const oldSet = new Set(oldLines.map((l) => l.trim()));

  for (let i = 0; i < newLines.length; i++) {
    const trimmed = newLines[i].trim();
    if (trimmed && !oldSet.has(trimmed)) {
      diff.set(i, 'added');
    }
  }

  return diff;
}

// ── File Tree Item ──────────────────────────────────────────────────────────

function TreeItem({ node, depth = 0, expandedFolders, toggleFolder, activeFile, onSelectFile, activeFolder, changedFiles }) {
  const isFolder = node.type === 'folder';
  const isExpanded = expandedFolders.has(node.path);
  const isActive = activeFile === node.path;
  const isActiveFolder = isFolder && activeFolder && node.path === activeFolder;
  const isChanged = changedFiles && changedFiles.has(node.path);
  const Icon = isFolder ? (isExpanded ? FolderOpen : FolderClosed) : getFileIcon(node.name);
  const iconColor = isFolder
    ? (isActiveFolder ? 'text-cyan-400' : 'text-zinc-500')
    : getFileIconColor(node.name);

  return (
    <>
      <button
        onClick={() => (isFolder ? toggleFolder(node.path) : onSelectFile(node.path))}
        className={`w-full flex items-center gap-1.5 py-[5px] pr-3 text-[12px] transition-colors cursor-pointer select-none group ${
          isActive && !isFolder
            ? 'bg-cyan-500/10 text-cyan-400'
            : isActiveFolder
              ? 'bg-cyan-500/5 text-cyan-300'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]'
        }`}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
      >
        {isFolder && (
          <ChevronRight
            className={`w-3 h-3 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-90' : ''} ${isActiveFolder ? 'text-cyan-500' : 'text-zinc-600'}`}
          />
        )}
        {!isFolder && <span className="w-3" />}
        <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${iconColor}`} />
        <span className="truncate flex-1">{node.name}</span>
        {/* Changed indicator dot */}
        {isChanged && (
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
        )}
        {/* Active folder pulse */}
        {isActiveFolder && (
          <Pencil className="w-3 h-3 text-cyan-400 shrink-0 animate-pulse" />
        )}
      </button>
      {isFolder && isExpanded && (
        <AnimatePresence initial={false}>
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {(node.children || []).map((child) => (
              <TreeItem
                key={child.path}
                node={child}
                depth={depth + 1}
                expandedFolders={expandedFolders}
                toggleFolder={toggleFolder}
                activeFile={activeFile}
                onSelectFile={onSelectFile}
                activeFolder={activeFolder}
                changedFiles={changedFiles}
              />
            ))}
          </motion.div>
        </AnimatePresence>
      )}
    </>
  );
}

// ── Code Panel with Line Numbers + Diff Markers ─────────────────────────────

function CodePanel({ code, lang, filePath, typing, lineDiff }) {
  const [copied, setCopied] = useState(false);
  const codeRef = useRef(null);
  const [visibleChars, setVisibleChars] = useState(typing ? 0 : code.length);
  const animRef = useRef(null);

  // Typing animation
  useEffect(() => {
    if (!typing) {
      setVisibleChars(code.length);
      return;
    }
    setVisibleChars(0);
    let frame = 0;
    const totalChars = code.length;
    const charsPerTick = Math.max(2, Math.ceil(totalChars / 300));
    const tick = () => {
      frame += charsPerTick;
      if (frame >= totalChars) {
        setVisibleChars(totalChars);
        return;
      }
      setVisibleChars(frame);
      animRef.current = requestAnimationFrame(tick);
    };
    const timeout = setTimeout(() => {
      animRef.current = requestAnimationFrame(tick);
    }, 200);
    return () => {
      clearTimeout(timeout);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [typing, code]);

  useEffect(() => {
    if (!typing) setVisibleChars(code.length);
  }, [code, typing]);

  const displayCode = typing ? code.slice(0, visibleChars) : code;
  const isAnimating = typing && visibleChars < code.length;

  const highlighted = useMemo(() => {
    try {
      const grammar = languages[lang] || languages.jsx;
      return highlight(displayCode, grammar, lang);
    } catch {
      return displayCode;
    }
  }, [displayCode, lang]);

  const lines = displayCode.split('\n');
  const highlightedLines = highlighted.split('\n');

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [code]);

  useEffect(() => {
    if (codeRef.current) codeRef.current.scrollTop = 0;
  }, [filePath]);

  useEffect(() => {
    if (isAnimating && codeRef.current) {
      codeRef.current.scrollTop = codeRef.current.scrollHeight;
    }
  }, [visibleChars, isAnimating]);

  const hasDiff = lineDiff && lineDiff.size > 0;

  return (
    <div className="flex flex-col h-full">
      {/* File header bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800/60 bg-zinc-900/50 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[11px] text-zinc-500 font-mono truncate">{filePath}</span>
          {isAnimating && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium text-cyan-400 bg-cyan-500/10 animate-pulse">
              writing...
            </span>
          )}
          {hasDiff && !isAnimating && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium text-emerald-400 bg-emerald-500/10">
              {lineDiff.size} lines changed
            </span>
          )}
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 transition-colors"
        >
          {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      {/* Code content */}
      <div ref={codeRef} className="flex-1 overflow-auto">
        <div className="min-w-0">
          {lines.map((_, i) => {
            const diffType = lineDiff?.get(i);
            const bgClass = diffType === 'added'
              ? 'bg-emerald-500/8'
              : diffType === 'removed'
                ? 'bg-red-500/8'
                : '';
            const gutterClass = diffType === 'added'
              ? 'border-l-2 border-emerald-400'
              : diffType === 'removed'
                ? 'border-l-2 border-red-400'
                : 'border-l-2 border-transparent';

            return (
              <div key={i} className={`flex ${bgClass} ${gutterClass}`}>
                {/* Diff indicator */}
                <div className="w-5 flex-shrink-0 flex items-center justify-center select-none">
                  {diffType === 'added' && (
                    <span className="text-[10px] font-mono text-emerald-400 leading-[20px]">+</span>
                  )}
                  {diffType === 'removed' && (
                    <span className="text-[10px] font-mono text-red-400 leading-[20px]">−</span>
                  )}
                </div>
                {/* Line number */}
                <div className="w-10 flex-shrink-0 text-right pr-3 select-none">
                  <span className={`text-[11px] leading-[20px] font-mono ${
                    diffType ? (diffType === 'added' ? 'text-emerald-600' : 'text-red-600') : 'text-zinc-700'
                  }`}>
                    {i + 1}
                  </span>
                </div>
                {/* Code line */}
                <div className="flex-1 pl-2 pr-6 overflow-x-auto">
                  <pre className="m-0 bg-transparent">
                    <code
                      className={`language-${lang} text-[12px] leading-[20px] font-mono`}
                      style={{ fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace" }}
                      dangerouslySetInnerHTML={{ __html: highlightedLines[i] || '' }}
                    />
                  </pre>
                </div>
              </div>
            );
          })}
          {isAnimating && (
            <div className="pl-[60px]">
              <span className="inline-block w-[2px] h-[14px] bg-cyan-400 ml-px animate-pulse align-middle" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main CodeViewer ─────────────────────────────────────────────────────────

export default function CodeViewer({ config, typingEffect }) {
  const fileTree = useMemo(() => generateFileTree(config), [config]);

  const allFolderPaths = useMemo(() => {
    const paths = new Set();
    const walk = (nodes) => {
      for (const node of nodes) {
        if (node.type === 'folder') {
          paths.add(node.path);
          if (node.children) walk(node.children);
        }
      }
    };
    walk(fileTree);
    return paths;
  }, [fileTree]);

  const [expandedFolders, setExpandedFolders] = useState(() => new Set(allFolderPaths));
  const [activeFile, setActiveFile] = useState('store/config/store.json');

  // Track previous code per file for diffs
  const prevCodeRef = useRef({});
  const [changedFiles, setChangedFiles] = useState(new Set());
  const [activeFolder, setActiveFolder] = useState(null);

  useEffect(() => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      for (const p of allFolderPaths) next.add(p);
      return next;
    });
  }, [allFolderPaths]);

  const toggleFolder = useCallback((path) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  // When typing effect activates, snapshot current code for all files,
  // then detect which files changed after config update.
  const prevConfigRef = useRef(null);

  useEffect(() => {
    if (typingEffect && config) {
      // Snapshot all current file contents BEFORE the new config
      const snap = {};
      const walk = (nodes) => {
        for (const n of nodes) {
          if (n.type === 'folder' && n.children) walk(n.children);
          else if (n.type === 'file') {
            snap[n.path] = generateFileContent(n.path, prevConfigRef.current || config);
          }
        }
      };
      walk(fileTree);
      prevCodeRef.current = snap;
    }
    prevConfigRef.current = config;
  }, [typingEffect]); // Only run when typingEffect changes

  // Detect changed files when config changes
  useEffect(() => {
    if (!config) return;
    const changed = new Set();
    const walk = (nodes) => {
      for (const n of nodes) {
        if (n.type === 'folder' && n.children) walk(n.children);
        else if (n.type === 'file') {
          const oldCode = prevCodeRef.current[n.path];
          if (oldCode) {
            const newCode = generateFileContent(n.path, config);
            if (oldCode !== newCode) {
              changed.add(n.path);
            }
          }
        }
      }
    };
    walk(fileTree);
    if (changed.size > 0) {
      setChangedFiles(changed);
      // Auto-clear changed markers after 15s
      const t = setTimeout(() => setChangedFiles(new Set()), 15000);
      return () => clearTimeout(t);
    }
  }, [config, fileTree]);

  // When typing effect activates, select a meaningful file and set active folder
  useEffect(() => {
    if (!typingEffect) {
      setActiveFolder(null);
      return;
    }
    const walk = (nodes) => {
      for (const n of nodes) {
        if (n.type === 'folder' && n.children) {
          const found = walk(n.children);
          if (found) return found;
        }
        if (n.type === 'file' && n.path.startsWith('store/components/') && n.name.endsWith('.jsx')) {
          return n.path;
        }
      }
      return null;
    };
    const target = walk(fileTree) || 'store/config/store.json';
    setActiveFile(target);
    // Set active folder (parent of the file)
    const folder = target.substring(0, target.lastIndexOf('/'));
    setActiveFolder(folder);
  }, [typingEffect, fileTree]);

  // Generate code for the active file
  const { code, lang } = useMemo(() => {
    const content = generateFileContent(activeFile, config);
    return {
      code: content,
      lang: getLangForFile(activeFile),
    };
  }, [activeFile, config]);

  // Compute line diff for the active file
  const lineDiff = useMemo(() => {
    const oldCode = prevCodeRef.current[activeFile];
    return computeLineDiff(oldCode, code);
  }, [activeFile, code]);

  const fileCount = useMemo(() => {
    let count = 0;
    const walk = (nodes) => {
      for (const n of nodes) {
        if (n.type === 'folder') walk(n.children || []);
        else count++;
      }
    };
    walk(fileTree);
    return count;
  }, [fileTree]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800/60">
        <FileCode2 className="w-4 h-4 text-cyan-400" />
        <span className="text-sm font-medium text-white">Code</span>
        {changedFiles.size > 0 && (
          <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
            {changedFiles.size} modified
          </span>
        )}
        <span className="text-[10px] text-zinc-600 ml-auto">{fileCount} files</span>
      </div>

      {/* Split: tree + code */}
      <div className="flex flex-1 min-h-0">
        {/* File tree */}
        <div className="w-[220px] flex-shrink-0 border-r border-zinc-800/60 overflow-y-auto bg-zinc-950/50">
          <div className="py-2">
            {fileTree.map((node) => (
              <TreeItem
                key={node.path}
                node={node}
                depth={0}
                expandedFolders={expandedFolders}
                toggleFolder={toggleFolder}
                activeFile={activeFile}
                onSelectFile={setActiveFile}
                activeFolder={activeFolder}
                changedFiles={changedFiles}
              />
            ))}
          </div>
        </div>

        {/* Code panel */}
        <div className="flex-1 min-w-0 bg-[#0d1117]">
          <CodePanel code={code} lang={lang} filePath={activeFile} typing={typingEffect} lineDiff={lineDiff} />
        </div>
      </div>
    </div>
  );
}
