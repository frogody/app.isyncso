
import React, { useState, useEffect, useRef } from "react";
import { User } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
// Label component is no longer directly used in form fields as per outline, but could be for other elements if needed.
// For form fields, explicit <label> tags with styling are used.
// import { Label } from "@/components/ui/label";
// Switch component is replaced by a custom styled checkbox as per outline.
// import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  User as UserIcon,
  Save,
  Upload,
  RefreshCw,
  LogOut, // Added for logout icon
  ExternalLink // Added for external link icon
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UploadFile } from "@/api/integrations";
import { useTranslation } from "@/components/utils/translations";
import { Link } from "react-router-dom"; // New import
import { createPageUrl } from "@/utils"; // New import

import SyncAvatar from "../components/ui/SyncAvatar"; // New import
import IconWrapper from "../components/ui/IconWrapper"; // New import

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    job_title: "",
    company: "",
    phone: "",
    bio: "",
    timezone: "Europe/Amsterdam",
    language: "nl",
    email_notifications: true,
    profile_picture: ""
  });
  const [uploading, setUploading] = useState(false); // Renamed from isUploading
  const [saving, setSaving] = useState(false);     // Renamed from isSaving
  // saveResult state is removed as the corresponding UI element is removed in the outline.

  const [loading, setLoading] = useState(true); // New state for initial data load
  const fileInputRef = useRef(null); // Ref for hidden file input

  // Get translations based on form language
  const { t } = useTranslation(formData.language);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true); // Start loading
    try {
      const userData = await User.me();
      setUser(userData);
      setFormData({
        full_name: userData.full_name || "",
        email: userData.email || "",
        job_title: userData.job_title || "",
        company: userData.company || "",
        phone: userData.phone || "",
        bio: userData.bio || "",
        timezone: userData.timezone || "Europe/Amsterdam",
        language: userData.language || "nl",
        email_notifications: userData.email_notifications ?? true, // Default to true if null/undefined
        profile_picture: userData.profile_picture || ""
      });
    } catch (error) {
      console.error("Error loading profile:", error);
      // Set default values if user data fails to load
      setFormData({
        full_name: "",
        email: "",
        job_title: "",
        company: "",
        phone: "",
        bio: "",
        timezone: "Europe/Amsterdam",
        language: "nl",
        email_notifications: true, // Default to true
        profile_picture: ""
      });
      // In a real app, you might show a user-friendly error message here.
    } finally {
      setLoading(false); // End loading
    }
  };

  // handleInputChange is replaced by direct setFormData calls in the JSX.

  const handlePhotoUpload = async (event) => { // Renamed from handleImageUpload
    const file = event.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const response = await UploadFile({ file });
      if (response.file_url) {
        setFormData(prev => ({
          ...prev,
          profile_picture: response.file_url
        }));
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      alert(t('profile_photo_upload_failed')); // Using alert since saveResult UI is removed
    }
    setUploading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    // setSaveResult(null); // Removed as per outline

    const previousLanguage = user?.language; // Store current language before update

    try {
      const updateData = {
        job_title: formData.job_title,
        company: formData.company,
        phone: formData.phone,
        bio: formData.bio,
        timezone: formData.timezone,
        language: formData.language,
        email_notifications: formData.email_notifications,
        profile_picture: formData.profile_picture
      };

      await User.updateMyUserData(updateData);
      await loadProfile(); // Reload user data to reflect changes

      // Reload page only if language was changed
      if (previousLanguage && previousLanguage !== formData.language) {
        window.location.reload();
      }
      
      // setSaveResult({ success: true, message: t('profile_updated') }); // Removed as per outline
      alert(t('profile_updated')); // Using alert since saveResult UI is removed
    } catch (error) {
      console.error("Error saving profile:", error);
      alert(t('profile_update_failed')); // Using alert since saveResult UI is removed
      // setSaveResult({ success: false, message: t('profile_update_failed') }); // Removed as per outline
    }
    setSaving(false);
  };

  const handleLogout = async () => {
    if (confirm(t('logout_confirm') + "?")) { // Preserve confirmation dialog
      await User.logout();
    }
  };

  // Loading screen displayed while fetching initial user data
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        {/* Inline style block for CSS variables */}
        <style jsx>{`
          :root {
            --bg: #151A1F;
            --txt: #E9F0F1;
            --muted: #B5C0C4;
            --accent: #EF4444;
          }
        `}</style>
        <div className="flex flex-col items-center gap-4">
          <SyncAvatar size={48} />
          <p className="text-lg font-medium" style={{ color: 'var(--txt)' }}>{t('loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6" style={{ background: 'var(--bg)' }}>
      {/* Inline style block for global CSS variables and utility classes */}
      <style jsx>{`
        :root {
          --bg: #151A1F;
          --surface: #1A2026;
          --txt: #E9F0F1;
          --muted: #B5C0C4;
          --accent: #EF4444;
        }
        body {
          background: var(--bg) !important;
          color: var(--txt) !important;
        }
        .glass-card {
          background: linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.015)), rgba(26,32,38,.35);
          border: 1px solid rgba(255,255,255,.06);
          box-shadow: 0 4px 12px rgba(0,0,0,.15);
          backdrop-filter: blur(8px);
          border-radius: 16px;
        }
        .btn-primary {
          background: rgba(239,68,68,.12) !important;
          color: #FFCCCB !important;
          border: 1px solid rgba(239,68,68,.3) !important;
          border-radius: 12px !important;
        }
        .btn-primary:hover {
          background: rgba(239,68,68,.18) !important;
          color: #FFE5E5 !important;
          border-color: rgba(239,68,68,.4) !important;
        }
        .btn-outline {
          background: rgba(255,255,255,.04) !important;
          color: #E9F0F1 !important;
          border: 1px solid rgba(255,255,255,.12) !important;
          border-radius: 12px !important;
        }
        .btn-outline:hover {
          background: rgba(255,255,255,.08) !important;
          color: #FFFFFF !important;
        }
      `}</style>

      <div className="space-y-6">
        {/* Header with Buttons */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <IconWrapper icon={UserIcon} size={36} variant="muted" glow={true} />
            <div>
              <h1 className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--txt)' }}>
                {t('profile_settings')}
              </h1>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>
                {t('profile_desc')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Agent Backlog Button */}
            <Link to={createPageUrl("AgentBacklog")}>
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all"
                style={{
                  background: 'rgba(255,255,255,.04)',
                  border: '1px solid rgba(255,255,255,.08)',
                  color: 'var(--txt)'
                }}
              >
                <IconWrapper icon={ExternalLink} size={16} variant="muted" glow={false} />
                <span className="hidden md:inline text-sm">Agent Backlog</span>
              </Button>
            </Link>

            {/* Logout Button */}
            <Button
              onClick={handleLogout}
              variant="ghost"
              size="sm"
              className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all"
              style={{
                background: 'rgba(239,68,68,.08)',
                border: '1px solid rgba(239,68,68,.2)',
                color: '#FCA5A5'
              }}
            >
              <IconWrapper icon={LogOut} size={16} variant="accent" glow={false} />
              <span className="hidden md:inline text-sm">{t('logout')}</span>
            </Button>
          </div>
        </div>

        {/* Profile Picture */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle style={{ color: 'var(--txt)' }}>{t('profile_picture')}</CardTitle> {/* Removed Camera icon */}
          </CardHeader>
          <CardContent className="flex items-center gap-6">
            <div className="relative">
              {formData.profile_picture ? (
                <img
                  src={formData.profile_picture}
                  alt="Profile"
                  className="w-24 h-24 rounded-full object-cover"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gray-800 flex items-center justify-center">
                  <IconWrapper icon={UserIcon} size={32} variant="muted" /> {/* IconWrapper for fallback UserIcon */}
                </div>
              )}
            </div>
            <div className="flex-1">
              <input
                ref={fileInputRef} // Associate ref with input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload} // Use new handler name
                className="hidden" // Hide the default file input
              />
              <Button
                onClick={() => fileInputRef.current?.click()} // Trigger click on hidden input
                disabled={uploading}
                className="btn-primary" // Apply new button style
              >
                {uploading ? (
                  <>
                    <IconWrapper icon={RefreshCw} size={16} variant="accent" className="mr-2 animate-spin" /> {/* IconWrapper */}
                    {t('uploading')}
                  </>
                ) : (
                  <>
                    <IconWrapper icon={Upload} size={16} variant="accent" className="mr-2" /> {/* IconWrapper */}
                    {t('upload_photo')}
                  </>
                )}
              </Button>
              <p className="text-xs mt-2" style={{ color: 'var(--muted)' }}>
                {t('photo_requirements')}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Personal Information */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle style={{ color: 'var(--txt)' }}>{t('personal_info')}</CardTitle> {/* Removed UserIcon */}
          </CardHeader>
          <CardContent className="space-y-4"> {/* Added space-y-4 for consistent spacing */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--txt)' }}> {/* Replaced Label with <label> */}
                  {t('full_name')}
                </label>
                <Input
                  value={formData.full_name}
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})} // Direct state update
                  className="bg-transparent border" // Updated class
                  style={{ color: 'var(--txt)', borderColor: 'rgba(255,255,255,.12)' }}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--txt)' }}> {/* Replaced Label with <label> */}
                  {t('email')}
                </label>
                <Input
                  value={formData.email}
                  disabled
                  className="bg-transparent border opacity-60 cursor-not-allowed" // Updated classes
                  style={{ color: 'var(--txt)', borderColor: 'rgba(255,255,255,.12)' }}
                />
                <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                  {t('email_cannot_change')}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--txt)' }}> {/* Replaced Label with <label> */}
                  {t('job_title')}
                </label>
                <Input
                  value={formData.job_title}
                  onChange={(e) => setFormData({...formData, job_title: e.target.value})} // Direct state update
                  placeholder={t('job_title_placeholder')}
                  className="bg-transparent border" // Updated class
                  style={{ color: 'var(--txt)', borderColor: 'rgba(255,255,255,.12)' }}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--txt)' }}> {/* Replaced Label with <label> */}
                  {t('company')}
                </label>
                <Input
                  value={formData.company}
                  onChange={(e) => setFormData({...formData, company: e.target.value})} // Direct state update
                  placeholder={t('company_placeholder')}
                  className="bg-transparent border" // Updated class
                  style={{ color: 'var(--txt)', borderColor: 'rgba(255,255,255,.12)' }}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--txt)' }}> {/* Replaced Label with <label> */}
                {t('phone')}
              </label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})} // Direct state update
                placeholder={t('phone_placeholder')}
                className="bg-transparent border" // Updated class
                style={{ color: 'var(--txt)', borderColor: 'rgba(255,255,255,.12)' }}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--txt)' }}> {/* Replaced Label with <label> */}
                {t('bio')}
              </label>
              <Textarea
                value={formData.bio}
                onChange={(e) => setFormData({...formData, bio: e.target.value})} // Direct state update
                placeholder={t('bio_placeholder')}
                className="h-24 bg-transparent border" // Updated classes
                style={{ color: 'var(--txt)', borderColor: 'rgba(255,255,255,.12)' }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle style={{ color: 'var(--txt)' }}>{t('preferences')}</CardTitle> {/* Removed Globe icon */}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--txt)' }}> {/* Replaced Label with <label> */}
                  {t('timezone')}
                </label>
                <Select value={formData.timezone} onValueChange={(value) => setFormData({...formData, timezone: value})}> {/* Direct state update */}
                  <SelectTrigger className="btn-outline"> {/* New button class */}
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-card" style={{ background: 'rgba(15,20,24,.98)', borderColor: 'rgba(255,255,255,.06)' }}>
                    <SelectItem value="Europe/Amsterdam" style={{ color: 'var(--txt)' }}>Europe/Amsterdam</SelectItem> {/* Text updated */}
                    <SelectItem value="Europe/London" style={{ color: 'var(--txt)' }}>Europe/London</SelectItem>       {/* Text updated */}
                    <SelectItem value="America/New_York" style={{ color: 'var(--txt)' }}>America/New_York</SelectItem> {/* Text updated */}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--txt)' }}> {/* Replaced Label with <label> */}
                  {t('language')}
                </label>
                <Select value={formData.language} onValueChange={(value) => setFormData({...formData, language: value})}> {/* Direct state update */}
                  <SelectTrigger className="btn-outline"> {/* New button class */}
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-card" style={{ background: 'rgba(15,20,24,.98)', borderColor: 'rgba(255,255,255,.06)' }}>
                    <SelectItem value="nl" style={{ color: 'var(--txt)' }}>{t('language_dutch')}</SelectItem>
                    <SelectItem value="en" style={{ color: 'var(--txt)' }}>{t('language_english')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle style={{ color: 'var(--txt)' }}>{t('notifications')}</CardTitle> {/* Removed Bell icon */}
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium" style={{ color: 'var(--txt)' }}>{t('email_notifications')}</p> {/* Replaced Label with <p> */}
                <p className="text-sm" style={{ color: 'var(--muted)' }}>
                  {t('email_notifications_desc')}
                </p>
              </div>
              {/* Replaced Switch component with custom styled checkbox */}
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.email_notifications}
                  onChange={(e) => setFormData({...formData, email_notifications: e.target.checked})} // Direct state update
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Account Management - without buttons now */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle style={{ color: 'var(--txt)' }}>{t('account_management')}</CardTitle> {/* Removed Shield icon */}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg" style={{ background: 'rgba(255,255,255,.02)' }}> {/* New styling for status div */}
              <div>
                <p className="font-medium" style={{ color: 'var(--txt)' }}>{t('account_status')}</p> {/* Replaced Label with <p> */}
                <p className="text-sm" style={{ color: 'var(--muted)' }}>
                  {t('account_active')}
                </p>
              </div>
              <Badge variant="outline" style={{ borderColor: '#34D399', color: '#34D399' }}> {/* Updated Badge styling */}
                {t('active')}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Save Result section removed as per outline */}

        {/* Save Button */}
        <div className="flex justify-end gap-3"> {/* Added gap-3 */}
          <Button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary" // Apply new button style
          >
            {saving ? (
              <>
                <IconWrapper icon={RefreshCw} size={16} variant="accent" className="mr-2 animate-spin" /> {/* IconWrapper */}
                {t('saving')}
              </>
            ) : (
              <>
                <IconWrapper icon={Save} size={16} variant="accent" className="mr-2" /> {/* IconWrapper */}
                {t('save_changes')}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
