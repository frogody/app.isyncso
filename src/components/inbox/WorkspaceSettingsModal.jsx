import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Settings, Bell, BellOff, Users, Shield, Palette, 
  Volume2, VolumeX, Archive, Trash2, ChevronRight
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';

export default function WorkspaceSettingsModal({ isOpen, onClose, user }) {
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState({
    notifications: true,
    sounds: true,
    desktopNotifications: false,
    showOnlineStatus: true,
    compactMode: false,
    darkMode: true,
  });

  if (!isOpen) return null;

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'privacy', label: 'Privacy', icon: Shield },
  ];

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex"
        >
          {/* Sidebar */}
          <div className="w-48 bg-zinc-950 border-r border-zinc-800 p-4 flex-shrink-0">
            <h2 className="font-semibold text-white mb-4">Settings</h2>
            <nav className="space-y-1">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'bg-cyan-500/20 text-cyan-400'
                      : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <h3 className="font-semibold text-white capitalize">{activeTab} Settings</h3>
              <button
                onClick={onClose}
                className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Settings Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {activeTab === 'general' && (
                <>
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-zinc-300">Workspace</h4>
                    <div className="p-4 bg-zinc-800/50 rounded-xl border border-zinc-700">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-500" />
                        <div>
                          <h5 className="font-medium text-white">ISYNCSO</h5>
                          <p className="text-xs text-zinc-500">Team workspace</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-zinc-300">Quick Settings</h4>
                    <SettingRow
                      label="Compact mode"
                      description="Show messages in a more compact view"
                      checked={settings.compactMode}
                      onChange={(v) => updateSetting('compactMode', v)}
                    />
                  </div>
                </>
              )}

              {activeTab === 'notifications' && (
                <>
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-zinc-300">Notifications</h4>
                    <SettingRow
                      label="Enable notifications"
                      description="Receive notifications for new messages"
                      checked={settings.notifications}
                      onChange={(v) => updateSetting('notifications', v)}
                    />
                    <SettingRow
                      label="Sound effects"
                      description="Play sound when receiving messages"
                      checked={settings.sounds}
                      onChange={(v) => updateSetting('sounds', v)}
                    />
                    <SettingRow
                      label="Desktop notifications"
                      description="Show system notifications on desktop"
                      checked={settings.desktopNotifications}
                      onChange={(v) => updateSetting('desktopNotifications', v)}
                    />
                  </div>
                </>
              )}

              {activeTab === 'appearance' && (
                <>
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-zinc-300">Theme</h4>
                    <SettingRow
                      label="Dark mode"
                      description="Use dark theme (always on)"
                      checked={settings.darkMode}
                      onChange={(v) => updateSetting('darkMode', v)}
                      disabled
                    />
                  </div>
                </>
              )}

              {activeTab === 'privacy' && (
                <>
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-zinc-300">Status</h4>
                    <SettingRow
                      label="Show online status"
                      description="Let others see when you're online"
                      checked={settings.showOnlineStatus}
                      onChange={(v) => updateSetting('showOnlineStatus', v)}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-zinc-800 flex justify-end gap-2">
              <Button variant="outline" onClick={onClose} className="border-zinc-700 text-zinc-300">
                Cancel
              </Button>
              <Button onClick={onClose} className="bg-cyan-600 hover:bg-cyan-500">
                Save Changes
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function SettingRow({ label, description, checked, onChange, disabled = false }) {
  return (
    <div className="flex items-center justify-between p-3 bg-zinc-800/30 rounded-lg border border-zinc-700/50">
      <div>
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="text-xs text-zinc-500">{description}</p>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
        className="data-[state=checked]:bg-cyan-500"
      />
    </div>
  );
}