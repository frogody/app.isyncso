import React, { useState, useRef, useEffect } from 'react';
import { Edit2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

/**
 * InlineEditText - Inline editable text field with pencil icon
 */
export function InlineEditText({
  value,
  onSave,
  placeholder = 'Click to edit',
  className,
  textClassName,
  inputClassName,
  multiline = false,
  rows = 3,
  label,
  disabled = false,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || '');
  const inputRef = useRef(null);

  useEffect(() => {
    setEditValue(value || '');
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (inputRef.current.select) {
        inputRef.current.select();
      }
    }
  }, [isEditing]);

  const handleSave = () => {
    onSave?.(editValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value || '');
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (disabled) {
    return (
      <div className={cn("group", className)}>
        {label && <div className="text-xs text-zinc-500 mb-1">{label}</div>}
        <div className={cn("text-white", textClassName)}>
          {value || <span className="text-zinc-600 italic">{placeholder}</span>}
        </div>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className={cn("space-y-2", className)}>
        {label && <div className="text-xs text-zinc-500 mb-1">{label}</div>}
        {multiline ? (
          <Textarea
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={rows}
            className={cn(
              "bg-zinc-800/50 border-cyan-500/50 text-white resize-none",
              inputClassName
            )}
            placeholder={placeholder}
          />
        ) : (
          <Input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className={cn(
              "bg-zinc-800/50 border-cyan-500/50 text-white",
              inputClassName
            )}
            placeholder={placeholder}
          />
        )}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleSave}
            className="bg-cyan-500 hover:bg-cyan-600 text-white h-7 px-2"
          >
            <Check className="w-3 h-3 mr-1" /> Save
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCancel}
            className="text-zinc-400 hover:text-white h-7 px-2"
          >
            <X className="w-3 h-3 mr-1" /> Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("group cursor-pointer", className)} onClick={() => setIsEditing(true)}>
      {label && <div className="text-xs text-zinc-500 mb-1">{label}</div>}
      <div className="flex items-start gap-2">
        <div className={cn("flex-1 text-white", textClassName)}>
          {value || <span className="text-zinc-600 italic">{placeholder}</span>}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-cyan-400"
          onClick={(e) => {
            e.stopPropagation();
            setIsEditing(true);
          }}
        >
          <Edit2 className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

/**
 * InlineEditNumber - Inline editable number field
 */
export function InlineEditNumber({
  value,
  onSave,
  placeholder = '0',
  prefix = '',
  suffix = '',
  className,
  textClassName,
  label,
  disabled = false,
  min,
  max,
  step = 1,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value ?? '');
  const inputRef = useRef(null);

  useEffect(() => {
    setEditValue(value ?? '');
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    const numValue = editValue === '' ? null : parseFloat(editValue);
    onSave?.(numValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value ?? '');
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const displayValue = value !== null && value !== undefined
    ? `${prefix}${value}${suffix}`
    : null;

  if (disabled) {
    return (
      <div className={cn("group", className)}>
        {label && <div className="text-xs text-zinc-500 mb-1">{label}</div>}
        <div className={cn("text-white", textClassName)}>
          {displayValue || <span className="text-zinc-600 italic">{placeholder}</span>}
        </div>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className={cn("space-y-2", className)}>
        {label && <div className="text-xs text-zinc-500 mb-1">{label}</div>}
        <div className="flex items-center gap-2">
          {prefix && <span className="text-zinc-400">{prefix}</span>}
          <Input
            ref={inputRef}
            type="number"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            min={min}
            max={max}
            step={step}
            className="bg-zinc-800/50 border-cyan-500/50 text-white w-32"
            placeholder={placeholder}
          />
          {suffix && <span className="text-zinc-400">{suffix}</span>}
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleSave}
            className="bg-cyan-500 hover:bg-cyan-600 text-white h-7 px-2"
          >
            <Check className="w-3 h-3 mr-1" /> Save
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCancel}
            className="text-zinc-400 hover:text-white h-7 px-2"
          >
            <X className="w-3 h-3 mr-1" /> Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("group cursor-pointer", className)} onClick={() => setIsEditing(true)}>
      {label && <div className="text-xs text-zinc-500 mb-1">{label}</div>}
      <div className="flex items-center gap-2">
        <div className={cn("text-white", textClassName)}>
          {displayValue || <span className="text-zinc-600 italic">{placeholder}</span>}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-cyan-400"
          onClick={(e) => {
            e.stopPropagation();
            setIsEditing(true);
          }}
        >
          <Edit2 className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

/**
 * InlineEditSelect - Inline editable select field
 */
export function InlineEditSelect({
  value,
  onSave,
  options = [],
  placeholder = 'Select...',
  className,
  textClassName,
  label,
  disabled = false,
}) {
  const [isEditing, setIsEditing] = useState(false);

  const selectedOption = options.find(opt => opt.value === value);
  const displayValue = selectedOption?.label || value;

  if (disabled) {
    return (
      <div className={cn("group", className)}>
        {label && <div className="text-xs text-zinc-500 mb-1">{label}</div>}
        <div className={cn("text-white", textClassName)}>
          {displayValue || <span className="text-zinc-600 italic">{placeholder}</span>}
        </div>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className={cn("space-y-2", className)}>
        {label && <div className="text-xs text-zinc-500 mb-1">{label}</div>}
        <Select
          value={value || ''}
          onValueChange={(newValue) => {
            onSave?.(newValue);
            setIsEditing(false);
          }}
        >
          <SelectTrigger className="w-48 bg-zinc-800/50 border-cyan-500/50 text-white">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-700">
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-white hover:bg-zinc-800">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setIsEditing(false)}
          className="text-zinc-400 hover:text-white h-7 px-2"
        >
          <X className="w-3 h-3 mr-1" /> Cancel
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("group cursor-pointer", className)} onClick={() => setIsEditing(true)}>
      {label && <div className="text-xs text-zinc-500 mb-1">{label}</div>}
      <div className="flex items-center gap-2">
        <div className={cn("text-white", textClassName)}>
          {displayValue || <span className="text-zinc-600 italic">{placeholder}</span>}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-cyan-400"
          onClick={(e) => {
            e.stopPropagation();
            setIsEditing(true);
          }}
        >
          <Edit2 className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

/**
 * EditableSection - Wrapper for a section with edit toggle
 */
export function EditableSection({
  title,
  icon: Icon,
  children,
  onEdit,
  isEditing,
  className,
}) {
  return (
    <div className={cn("relative", className)}>
      {title && (
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="w-5 h-5 text-cyan-400" />}
            <span className="font-medium text-white">{title}</span>
          </div>
          {onEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onEdit}
              className="text-zinc-400 hover:text-cyan-400 h-7 px-2"
            >
              <Edit2 className="w-3 h-3 mr-1" />
              {isEditing ? 'Done' : 'Edit'}
            </Button>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
