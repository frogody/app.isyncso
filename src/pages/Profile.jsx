import React, { useEffect, useState } from "react";
import { User } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import SyncAvatar from "../components/ui/SyncAvatar";
import AgentWhatsAppButton from "@/components/profile/AgentWhatsAppButton";

export default function Profile() {
  const [me, setMe] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    profile_picture: "",
    job_title: "",
    company: "",
    phone: "",
    bio: "",
    timezone: "Europe/Amsterdam",
    language: "nl",
    email_notifications: true
  });

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const user = await User.me();
        if (!mounted) return;
        setMe(user || null);
        setForm({
          profile_picture: user?.profile_picture || "",
          job_title: user?.job_title || "",
          company: user?.company || "",
          phone: user?.phone || "",
          bio: user?.bio || "",
          timezone: user?.timezone || "Europe/Amsterdam",
          language: user?.language || "nl",
          email_notifications: user?.email_notifications ?? true
        });
      } catch {
        setMe(null);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  const onChange = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const onSave = async () => {
    setSaving(true);
    try {
      await User.updateProfile(form);
      const updated = await User.me();
      setMe(updated);
      alert("Profiel succesvol bijgewerkt!");
    } catch (e) {
      console.error(e);
      alert("Kon profiel niet opslaan. Probeer het opnieuw.");
    } finally {
      setSaving(false);
    }
  };

  if (!me) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <SyncAvatar size={48} />
      </div>
    );
  }

  const isNl = (me?.language || 'nl') === 'nl';

  return (
    <div className="min-h-screen px-4 md:px-6 py-6" style={{ background: 'var(--bg)' }}>
      <div className="max-w-3xl mx-auto space-y-6">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle style={{ color: 'var(--txt)' }}>
              {isNl ? "Profiel Instellingen" : "Profile Settings"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label style={{ color: 'var(--txt)' }}>{isNl ? "Volledige Naam" : "Full Name"}</Label>
                <Input value={me.full_name || ""} disabled className="mt-1" />
              </div>
              <div>
                <Label style={{ color: 'var(--txt)' }}>Email</Label>
                <Input value={me.email || ""} disabled className="mt-1" />
              </div>
              <div>
                <Label style={{ color: 'var(--txt)' }}>{isNl ? "Functietitel" : "Job Title"}</Label>
                <Input value={form.job_title} onChange={(e) => onChange("job_title", e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label style={{ color: 'var(--txt)' }}>{isNl ? "Bedrijf" : "Company"}</Label>
                <Input value={form.company} onChange={(e) => onChange("company", e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label style={{ color: 'var(--txt)' }}>{isNl ? "Telefoon" : "Phone"}</Label>
                <Input value={form.phone} onChange={(e) => onChange("phone", e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label style={{ color: 'var(--txt)' }}>{isNl ? "Tijdzone" : "Timezone"}</Label>
                <Input value={form.timezone} onChange={(e) => onChange("timezone", e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label style={{ color: 'var(--txt)' }}>{isNl ? "Taal" : "Language"}</Label>
                <Select value={form.language} onValueChange={(v) => onChange("language", v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nl">Nederlands</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3 mt-6">
                <Switch checked={form.email_notifications} onCheckedChange={(v) => onChange("email_notifications", v)} />
                <span style={{ color: 'var(--txt)' }}>{isNl ? "E-mail Notificaties" : "Email Notifications"}</span>
              </div>
            </div>

            <div>
              <Label style={{ color: 'var(--txt)' }}>{isNl ? "Bio" : "Bio"}</Label>
              <Textarea value={form.bio} onChange={(e) => onChange("bio", e.target.value)} className="mt-1 min-h-[120px]" />
            </div>

            <div className="flex justify-end">
              <Button onClick={onSave} disabled={saving}>
                {saving ? (isNl ? "Opslaan..." : "Saving...") : (isNl ? "Wijzigingen Opslaan" : "Save Changes")}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle style={{ color: 'var(--txt)' }}>
              {isNl ? "Integraties" : "Integrations"}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium" style={{ color: 'var(--txt)' }}>
                Recruitment Assistent (WhatsApp)
              </div>
              <div className="text-xs" style={{ color: 'var(--muted)' }}>
                {isNl
                  ? "Verbind de recruitment assistent met WhatsApp om snel kandidaten te bereiken."
                  : "Connect the recruitment assistant with WhatsApp to reach candidates quickly."}
              </div>
            </div>
            <AgentWhatsAppButton />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}