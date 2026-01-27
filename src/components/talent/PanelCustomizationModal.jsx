import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  User,
  Brain,
  Building2,
  History,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Check,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DEFAULT_PANEL_CONFIG } from '@/hooks/usePanelPreferences';
import { toast } from 'sonner';

// Tab icon mapping
const TAB_ICONS = {
  profile: User,
  intelligence: Brain,
  company: Building2,
  activity: History
};

// Tab display names
const TAB_LABELS = {
  profile: 'Profile',
  intelligence: 'Intelligence',
  company: 'Company',
  activity: 'Activity'
};

// Toggle Switch component
const ToggleSwitch = ({ checked, onChange, disabled }) => (
  <button
    onClick={onChange}
    disabled={disabled}
    className={`relative w-10 h-5 rounded-full transition-colors ${
      checked ? 'bg-red-500' : 'bg-zinc-600'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
  >
    <motion.div
      className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow"
      animate={{ left: checked ? '22px' : '2px' }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
    />
  </button>
);

// Section Toggle Row
const SectionToggle = ({ label, checked, onChange }) => (
  <div className="flex items-center justify-between py-2 px-3 hover:bg-zinc-800/50 rounded-lg transition-colors">
    <span className="text-sm text-zinc-300">{label}</span>
    <ToggleSwitch checked={checked} onChange={onChange} />
  </div>
);

// Tab Section with expandable content
const TabSection = ({ tabKey, config, onToggleTab, onToggleSection, expanded, onToggleExpand }) => {
  const Icon = TAB_ICONS[tabKey];
  const label = TAB_LABELS[tabKey];
  const sections = config.sections || {};
  const hasSections = Object.keys(sections).length > 0;

  return (
    <div className="border border-zinc-700/50 rounded-lg overflow-hidden">
      {/* Tab Header */}
      <div
        className={`flex items-center justify-between p-3 ${
          hasSections ? 'cursor-pointer hover:bg-zinc-800/30' : ''
        } bg-zinc-800/20`}
        onClick={hasSections ? onToggleExpand : undefined}
      >
        <div className="flex items-center gap-3">
          {hasSections && (
            <motion.div
              animate={{ rotate: expanded ? 90 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronRight className="w-4 h-4 text-zinc-500" />
            </motion.div>
          )}
          <Icon className={`w-5 h-5 ${config.enabled ? 'text-red-400' : 'text-zinc-500'}`} />
          <span className={`font-medium ${config.enabled ? 'text-white' : 'text-zinc-500'}`}>
            {label} Tab
          </span>
        </div>
        <ToggleSwitch
          checked={config.enabled}
          onChange={(e) => {
            e.stopPropagation();
            onToggleTab();
          }}
        />
      </div>

      {/* Sections */}
      <AnimatePresence>
        {expanded && hasSections && config.enabled && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-zinc-700/50 p-2 pl-10 space-y-1">
              {Object.entries(sections)
                .sort((a, b) => (a[1].order || 0) - (b[1].order || 0))
                .map(([sectionKey, sectionConfig]) => (
                  <SectionToggle
                    key={sectionKey}
                    label={sectionConfig.label || sectionKey.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    checked={sectionConfig.enabled}
                    onChange={() => onToggleSection(sectionKey)}
                  />
                ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Main Modal Component
export default function PanelCustomizationModal({
  open,
  onClose,
  preferences,
  onSave,
  saving
}) {
  const [localConfig, setLocalConfig] = useState(preferences);
  const [expandedTabs, setExpandedTabs] = useState({
    profile: true,
    intelligence: true,
    company: true,
    activity: false
  });
  const [hasChanges, setHasChanges] = useState(false);

  // Reset local config when modal opens
  useEffect(() => {
    if (open) {
      setLocalConfig(preferences);
      setHasChanges(false);
    }
  }, [open, preferences]);

  // Check for changes
  useEffect(() => {
    const changed = JSON.stringify(localConfig) !== JSON.stringify(preferences);
    setHasChanges(changed);
  }, [localConfig, preferences]);

  const handleToggleTab = (tabKey) => {
    setLocalConfig(prev => ({
      ...prev,
      [tabKey]: {
        ...prev[tabKey],
        enabled: !prev[tabKey]?.enabled
      }
    }));
  };

  const handleToggleSection = (tabKey, sectionKey) => {
    setLocalConfig(prev => ({
      ...prev,
      [tabKey]: {
        ...prev[tabKey],
        sections: {
          ...prev[tabKey]?.sections,
          [sectionKey]: {
            ...prev[tabKey]?.sections?.[sectionKey],
            enabled: !prev[tabKey]?.sections?.[sectionKey]?.enabled
          }
        }
      }
    }));
  };

  const handleToggleExpand = (tabKey) => {
    setExpandedTabs(prev => ({
      ...prev,
      [tabKey]: !prev[tabKey]
    }));
  };

  const handleResetToDefaults = () => {
    setLocalConfig(DEFAULT_PANEL_CONFIG);
    toast.success('Reset to default settings');
  };

  const handleSave = async () => {
    const success = await onSave(localConfig);
    if (success) {
      toast.success('Panel preferences saved');
      onClose();
    } else {
      toast.error('Failed to save preferences');
    }
  };

  const handleCancel = () => {
    setLocalConfig(preferences);
    onClose();
  };

  // Count enabled sections for summary
  const getEnabledCount = (tabKey) => {
    const sections = localConfig[tabKey]?.sections || {};
    const enabled = Object.values(sections).filter(s => s.enabled).length;
    const total = Object.keys(sections).length;
    return total > 0 ? `${enabled}/${total}` : '';
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/70 z-[60]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCancel}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-0 flex items-center justify-center z-[70] p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-lg bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden"
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-zinc-700">
                <div>
                  <h2 className="text-lg font-semibold text-white">Customize Panel Display</h2>
                  <p className="text-sm text-zinc-400 mt-0.5">
                    Choose which sections to show in the candidate panel
                  </p>
                </div>
                <button
                  onClick={handleCancel}
                  className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-zinc-400" />
                </button>
              </div>

              {/* Content */}
              <div className="p-4 max-h-[60vh] overflow-y-auto space-y-3">
                {['profile', 'intelligence', 'company', 'activity'].map(tabKey => (
                  <TabSection
                    key={tabKey}
                    tabKey={tabKey}
                    config={localConfig[tabKey] || { enabled: true, sections: {} }}
                    onToggleTab={() => handleToggleTab(tabKey)}
                    onToggleSection={(sectionKey) => handleToggleSection(tabKey, sectionKey)}
                    expanded={expandedTabs[tabKey]}
                    onToggleExpand={() => handleToggleExpand(tabKey)}
                  />
                ))}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between p-4 border-t border-zinc-700 bg-zinc-800/30">
                <Button
                  variant="ghost"
                  onClick={handleResetToDefaults}
                  className="text-zinc-400 hover:text-white hover:bg-zinc-700"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset to Defaults
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    className="border-zinc-600 text-zinc-300 hover:bg-zinc-800"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={!hasChanges || saving}
                    className="bg-red-500 hover:bg-red-600 text-white disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
