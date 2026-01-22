import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
  AlignLeft, Heading1, Heading2, Heading3, List, ListOrdered, CheckSquare,
  Quote, Code, Minus, ChevronRight, ChevronDown, AlertCircle, Lightbulb,
  Info, AlertTriangle, Plus, GripVertical, Trash2, Image, Link2, Table,
  ToggleRight, MessageSquare, ArrowRight, FileText, X, Search, Hash,
  Type, Circle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Block type definitions with icons and styling
const BLOCK_TYPES = {
  text: {
    label: 'Text',
    icon: Type,
    description: 'Plain text',
    shortcut: 'text',
    category: 'basic'
  },
  heading1: {
    label: 'Heading 1',
    icon: Heading1,
    description: 'Large section heading',
    shortcut: 'h1',
    category: 'basic'
  },
  heading2: {
    label: 'Heading 2',
    icon: Heading2,
    description: 'Medium section heading',
    shortcut: 'h2',
    category: 'basic'
  },
  heading3: {
    label: 'Heading 3',
    icon: Heading3,
    description: 'Small section heading',
    shortcut: 'h3',
    category: 'basic'
  },
  bullet: {
    label: 'Bulleted List',
    icon: List,
    description: 'Simple bullet point',
    shortcut: '-',
    category: 'list'
  },
  numbered: {
    label: 'Numbered List',
    icon: ListOrdered,
    description: 'Numbered list item',
    shortcut: '1.',
    category: 'list'
  },
  todo: {
    label: 'To-do',
    icon: CheckSquare,
    description: 'Checkbox item',
    shortcut: '[]',
    category: 'list'
  },
  toggle: {
    label: 'Toggle',
    icon: ToggleRight,
    description: 'Collapsible content',
    shortcut: '>',
    category: 'advanced'
  },
  quote: {
    label: 'Quote',
    icon: Quote,
    description: 'Capture a quote',
    shortcut: '"',
    category: 'basic'
  },
  code: {
    label: 'Code',
    icon: Code,
    description: 'Code snippet',
    shortcut: '```',
    category: 'advanced'
  },
  divider: {
    label: 'Divider',
    icon: Minus,
    description: 'Visual separator',
    shortcut: '---',
    category: 'basic'
  },
  callout: {
    label: 'Callout',
    icon: AlertCircle,
    description: 'Highlighted info box',
    shortcut: '!',
    category: 'advanced'
  },
  image: {
    label: 'Image',
    icon: Image,
    description: 'Upload or embed',
    shortcut: 'img',
    category: 'media'
  },
  bookmark: {
    label: 'Bookmark',
    icon: Link2,
    description: 'Save a link',
    shortcut: 'bookmark',
    category: 'media'
  },
  table: {
    label: 'Table',
    icon: Table,
    description: 'Simple table',
    shortcut: 'table',
    category: 'advanced'
  },
};

const CALLOUT_STYLES = {
  info: { icon: Info, bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400' },
  warning: { icon: AlertTriangle, bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400' },
  tip: { icon: Lightbulb, bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400' },
  error: { icon: AlertCircle, bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400' },
};

// Generate unique ID
const generateId = () => `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Slash command menu component
function SlashMenu({ query, onSelect, onClose, position }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef(null);

  const filteredBlocks = useMemo(() => {
    const q = query.toLowerCase();
    return Object.entries(BLOCK_TYPES).filter(([key, block]) =>
      block.label.toLowerCase().includes(q) ||
      block.shortcut.toLowerCase().includes(q) ||
      block.description.toLowerCase().includes(q)
    );
  }, [query]);

  const categories = useMemo(() => {
    const cats = { basic: [], list: [], advanced: [], media: [] };
    filteredBlocks.forEach(([key, block]) => {
      cats[block.category].push([key, block]);
    });
    return cats;
  }, [filteredBlocks]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, filteredBlocks.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredBlocks[selectedIndex]) {
          onSelect(filteredBlocks[selectedIndex][0]);
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [filteredBlocks, selectedIndex, onSelect, onClose]);

  if (filteredBlocks.length === 0) return null;

  let currentIndex = 0;

  return (
    <div
      ref={menuRef}
      className="fixed z-50 w-72 max-h-80 overflow-y-auto bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl"
      style={{ top: position.top, left: position.left }}
    >
      <div className="p-2 border-b border-zinc-800">
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Search className="w-3 h-3" />
          <span>Type to filter...</span>
        </div>
      </div>

      {Object.entries(categories).map(([cat, blocks]) => {
        if (blocks.length === 0) return null;
        return (
          <div key={cat}>
            <div className="px-3 py-1.5 text-xs font-medium text-zinc-500 uppercase tracking-wider">
              {cat}
            </div>
            {blocks.map(([key, block]) => {
              const idx = currentIndex++;
              const Icon = block.icon;
              return (
                <div
                  key={key}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors",
                    idx === selectedIndex ? "bg-cyan-500/20 text-white" : "text-zinc-300 hover:bg-zinc-800"
                  )}
                  onClick={() => onSelect(key)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                >
                  <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-zinc-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{block.label}</div>
                    <div className="text-xs text-zinc-500 truncate">{block.description}</div>
                  </div>
                  <div className="text-xs text-zinc-600 font-mono">/{block.shortcut}</div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// Individual block component with editing
function Block({ block, index, onUpdate, onDelete, onAddAfter, isEditing }) {
  const [content, setContent] = useState(block.content || '');
  const [isExpanded, setIsExpanded] = useState(block.isExpanded !== false);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef(null);
  const blockRef = useRef(null);

  const blockConfig = BLOCK_TYPES[block.type] || BLOCK_TYPES.text;
  const Icon = blockConfig.icon;

  // Handle content change with slash command detection
  const handleChange = (e) => {
    const value = e.target.value;
    setContent(value);

    // Detect slash commands
    const lastSlash = value.lastIndexOf('/');
    if (lastSlash !== -1 && (lastSlash === 0 || value[lastSlash - 1] === ' ' || value[lastSlash - 1] === '\n')) {
      const query = value.slice(lastSlash + 1);
      if (!query.includes(' ')) {
        setSlashQuery(query);
        setShowSlashMenu(true);

        // Calculate menu position
        if (textareaRef.current) {
          const rect = textareaRef.current.getBoundingClientRect();
          setMenuPosition({
            top: rect.bottom + 8,
            left: rect.left
          });
        }
        return;
      }
    }

    setShowSlashMenu(false);
  };

  // Handle block type selection from slash menu
  const handleSlashSelect = (type) => {
    const lastSlash = content.lastIndexOf('/');
    const newContent = lastSlash > 0 ? content.slice(0, lastSlash) : '';

    if (type === 'divider') {
      onUpdate(block.id, { ...block, type, content: '' });
    } else {
      onUpdate(block.id, { ...block, type, content: newContent });
    }
    setContent(newContent);
    setShowSlashMenu(false);
  };

  // Handle blur - save content
  const handleBlur = () => {
    setIsFocused(false);
    setShowSlashMenu(false);
    if (content !== block.content) {
      onUpdate(block.id, { ...block, content });
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !showSlashMenu) {
      e.preventDefault();
      handleBlur();
      onAddAfter(index);
    } else if (e.key === 'Backspace' && content === '' && block.type !== 'text') {
      e.preventDefault();
      onUpdate(block.id, { ...block, type: 'text' });
    }
  };

  // Toggle checkbox for todo blocks
  const handleToggleCheck = () => {
    onUpdate(block.id, { ...block, checked: !block.checked });
  };

  // Toggle expand for toggle blocks
  const handleToggleExpand = () => {
    setIsExpanded(!isExpanded);
    onUpdate(block.id, { ...block, isExpanded: !isExpanded });
  };

  // Render divider
  if (block.type === 'divider') {
    return (
      <Draggable draggableId={block.id} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            className="group relative py-2"
          >
            <div className="flex items-center gap-2">
              {isEditing && (
                <div
                  {...provided.dragHandleProps}
                  className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab"
                >
                  <GripVertical className="w-4 h-4 text-zinc-600" />
                </div>
              )}
              <div className="flex-1 border-t border-zinc-700" />
              {isEditing && (
                <button
                  onClick={() => onDelete(block.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-zinc-600 hover:text-red-400"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )}
      </Draggable>
    );
  }

  // Render callout
  if (block.type === 'callout') {
    const calloutStyle = CALLOUT_STYLES[block.calloutType || 'info'];
    const CalloutIcon = calloutStyle.icon;

    return (
      <Draggable draggableId={block.id} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            className="group relative"
          >
            <div className="flex items-start gap-2">
              {isEditing && (
                <div
                  {...provided.dragHandleProps}
                  className="mt-3 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab"
                >
                  <GripVertical className="w-4 h-4 text-zinc-600" />
                </div>
              )}
              <div className={cn(
                "flex-1 p-4 rounded-lg border",
                calloutStyle.bg, calloutStyle.border
              )}>
                <div className="flex items-start gap-3">
                  <CalloutIcon className={cn("w-5 h-5 mt-0.5 flex-shrink-0", calloutStyle.text)} />
                  {isEditing ? (
                    <textarea
                      ref={textareaRef}
                      value={content}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      onFocus={() => setIsFocused(true)}
                      onKeyDown={handleKeyDown}
                      placeholder="Type callout content..."
                      className="flex-1 bg-transparent border-none outline-none resize-none text-zinc-200 placeholder-zinc-500"
                      rows={1}
                    />
                  ) : (
                    <div className="text-zinc-200">{content || 'Empty callout'}</div>
                  )}
                </div>
                {isEditing && (
                  <div className="flex gap-2 mt-2 pt-2 border-t border-zinc-700/50">
                    {Object.entries(CALLOUT_STYLES).map(([key, style]) => (
                      <button
                        key={key}
                        onClick={() => onUpdate(block.id, { ...block, calloutType: key })}
                        className={cn(
                          "w-6 h-6 rounded flex items-center justify-center",
                          block.calloutType === key ? "ring-2 ring-white/50" : "",
                          style.bg
                        )}
                      >
                        <style.icon className={cn("w-3 h-3", style.text)} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {isEditing && (
                <button
                  onClick={() => onDelete(block.id)}
                  className="mt-3 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-zinc-600 hover:text-red-400"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
            {showSlashMenu && (
              <SlashMenu
                query={slashQuery}
                position={menuPosition}
                onSelect={handleSlashSelect}
                onClose={() => setShowSlashMenu(false)}
              />
            )}
          </div>
        )}
      </Draggable>
    );
  }

  // Render toggle
  if (block.type === 'toggle') {
    return (
      <Draggable draggableId={block.id} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            className="group relative"
          >
            <div className="flex items-start gap-2">
              {isEditing && (
                <div
                  {...provided.dragHandleProps}
                  className="mt-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab"
                >
                  <GripVertical className="w-4 h-4 text-zinc-600" />
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleToggleExpand}
                    className="p-0.5 hover:bg-zinc-800 rounded transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-zinc-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-zinc-400" />
                    )}
                  </button>
                  {isEditing ? (
                    <input
                      ref={textareaRef}
                      type="text"
                      value={content}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      onFocus={() => setIsFocused(true)}
                      onKeyDown={handleKeyDown}
                      placeholder="Toggle title..."
                      className="flex-1 bg-transparent border-none outline-none text-zinc-200 font-medium placeholder-zinc-500"
                    />
                  ) : (
                    <span className="text-zinc-200 font-medium">{content || 'Toggle'}</span>
                  )}
                </div>
                {isExpanded && (
                  <div className="ml-6 mt-2 pl-4 border-l border-zinc-700">
                    {isEditing ? (
                      <textarea
                        value={block.toggleContent || ''}
                        onChange={(e) => onUpdate(block.id, { ...block, toggleContent: e.target.value })}
                        placeholder="Toggle content..."
                        className="w-full bg-transparent border-none outline-none resize-none text-zinc-300 placeholder-zinc-600"
                        rows={2}
                      />
                    ) : (
                      <div className="text-zinc-300">{block.toggleContent || 'Empty toggle'}</div>
                    )}
                  </div>
                )}
              </div>
              {isEditing && (
                <button
                  onClick={() => onDelete(block.id)}
                  className="mt-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-zinc-600 hover:text-red-400"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
            {showSlashMenu && (
              <SlashMenu
                query={slashQuery}
                position={menuPosition}
                onSelect={handleSlashSelect}
                onClose={() => setShowSlashMenu(false)}
              />
            )}
          </div>
        )}
      </Draggable>
    );
  }

  // Get block-specific styles
  const getStyles = () => {
    switch (block.type) {
      case 'heading1': return 'text-2xl font-bold text-white';
      case 'heading2': return 'text-xl font-semibold text-white';
      case 'heading3': return 'text-lg font-medium text-white';
      case 'quote': return 'text-zinc-400 italic border-l-2 border-cyan-500 pl-4';
      case 'code': return 'font-mono text-sm bg-zinc-800/60 p-3 rounded-lg text-cyan-300';
      case 'bullet':
      case 'numbered':
      case 'todo':
        return 'text-zinc-300';
      default: return 'text-zinc-300';
    }
  };

  // Render prefix for list items
  const renderPrefix = () => {
    if (block.type === 'bullet') {
      return <span className="text-cyan-500 mr-2">•</span>;
    }
    if (block.type === 'numbered') {
      return <span className="text-zinc-500 mr-2 tabular-nums">{(block.number || index + 1)}.</span>;
    }
    if (block.type === 'todo') {
      return (
        <button
          onClick={handleToggleCheck}
          className={cn(
            "w-4 h-4 mr-2 rounded border transition-colors flex items-center justify-center",
            block.checked
              ? "bg-cyan-500 border-cyan-500"
              : "border-zinc-600 hover:border-cyan-500"
          )}
        >
          {block.checked && (
            <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="20,6 9,17 4,12" />
            </svg>
          )}
        </button>
      );
    }
    return null;
  };

  return (
    <Draggable draggableId={block.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={cn(
            "group relative py-0.5",
            snapshot.isDragging && "opacity-90"
          )}
        >
          <div className="flex items-start gap-2">
            {isEditing && (
              <div className="flex items-center gap-1 mt-1">
                <button
                  onClick={() => onAddAfter(index - 1)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-zinc-600 hover:text-cyan-400"
                >
                  <Plus className="w-3 h-3" />
                </button>
                <div
                  {...provided.dragHandleProps}
                  className="opacity-0 group-hover:opacity-100 transition-opacity cursor-grab p-1"
                >
                  <GripVertical className="w-4 h-4 text-zinc-600" />
                </div>
              </div>
            )}

            <div className={cn(
              "flex-1 flex items-start",
              block.type === 'code' && "block"
            )}>
              {renderPrefix()}

              {isEditing ? (
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  onFocus={() => setIsFocused(true)}
                  onKeyDown={handleKeyDown}
                  placeholder={block.type === 'code' ? 'Write code...' : 'Type something...'}
                  className={cn(
                    "flex-1 bg-transparent border-none outline-none resize-none placeholder-zinc-600",
                    getStyles(),
                    block.checked && "line-through text-zinc-500"
                  )}
                  rows={block.type === 'code' ? 3 : 1}
                  style={{ minHeight: '1.5em' }}
                />
              ) : (
                <div className={cn(
                  getStyles(),
                  block.checked && "line-through text-zinc-500",
                  !content && "text-zinc-600"
                )}>
                  {content || 'Empty block'}
                </div>
              )}
            </div>

            {isEditing && (
              <button
                onClick={() => onDelete(block.id)}
                className="mt-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-zinc-600 hover:text-red-400"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>

          {showSlashMenu && (
            <SlashMenu
              query={slashQuery}
              position={menuPosition}
              onSelect={handleSlashSelect}
              onClose={() => setShowSlashMenu(false)}
            />
          )}
        </div>
      )}
    </Draggable>
  );
}

// Main NotionEditor component
export default function NotionEditor({
  blocks = [],
  onChange,
  isEditing = true,
  placeholder = "Type '/' for commands...",
  className = ""
}) {
  const [localBlocks, setLocalBlocks] = useState(blocks);
  const editorRef = useRef(null);

  useEffect(() => {
    setLocalBlocks(blocks);
  }, [blocks]);

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(localBlocks);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update numbered list numbers
    let numberCount = 0;
    const updatedItems = items.map((item, idx) => {
      if (item.type === 'numbered') {
        numberCount++;
        return { ...item, number: numberCount };
      }
      return item;
    });

    setLocalBlocks(updatedItems);
    onChange?.(updatedItems);
  };

  const handleUpdateBlock = (blockId, updates) => {
    const updatedBlocks = localBlocks.map(b =>
      b.id === blockId ? updates : b
    );
    setLocalBlocks(updatedBlocks);
    onChange?.(updatedBlocks);
  };

  const handleDeleteBlock = (blockId) => {
    const updatedBlocks = localBlocks.filter(b => b.id !== blockId);
    setLocalBlocks(updatedBlocks);
    onChange?.(updatedBlocks);
  };

  const handleAddBlockAfter = (index) => {
    const newBlock = {
      id: generateId(),
      type: 'text',
      content: '',
    };
    const updatedBlocks = [...localBlocks];
    updatedBlocks.splice(index + 1, 0, newBlock);
    setLocalBlocks(updatedBlocks);
    onChange?.(updatedBlocks);

    // Focus the new block after render
    setTimeout(() => {
      const textarea = editorRef.current?.querySelector(`[data-block-id="${newBlock.id}"] textarea`);
      textarea?.focus();
    }, 50);
  };

  const handleAddNewBlock = () => {
    handleAddBlockAfter(localBlocks.length - 1);
  };

  return (
    <div ref={editorRef} className={cn("notion-editor", className)}>
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="blocks">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="space-y-1"
            >
              {localBlocks.length === 0 && isEditing ? (
                <div
                  onClick={handleAddNewBlock}
                  className="py-2 text-zinc-500 cursor-text hover:text-zinc-400 transition-colors"
                >
                  {placeholder}
                </div>
              ) : (
                localBlocks.map((block, index) => (
                  <Block
                    key={block.id}
                    block={block}
                    index={index}
                    onUpdate={handleUpdateBlock}
                    onDelete={handleDeleteBlock}
                    onAddAfter={handleAddBlockAfter}
                    isEditing={isEditing}
                  />
                ))
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {isEditing && localBlocks.length > 0 && (
        <button
          onClick={handleAddNewBlock}
          className="flex items-center gap-2 mt-4 py-2 px-3 text-sm text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add block
        </button>
      )}
    </div>
  );
}

// Export block types for use in other components
export { BLOCK_TYPES, CALLOUT_STYLES, generateId };
