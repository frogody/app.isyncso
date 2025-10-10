import React, { useState, useRef } from "react";
import { Organization } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, Upload, Save } from "lucide-react";
import { UploadFile } from "@/api/integrations";
import IconWrapper from "../ui/IconWrapper";

export default function OrganizationProfile({ organization, onUpdate }) {
  const [formData, setFormData] = useState({
    name: organization?.name || "",
    email_domain: organization?.email_domain || "",
    website: organization?.website || "",
    description: organization?.description || "",
    industry: organization?.industry || "",
    company_size: organization?.company_size || "",
    logo_url: organization?.logo_url || "",
    address: organization?.address || {
      street: "",
      city: "",
      state: "",
      postal_code: "",
      country: ""
    }
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleLogoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const response = await UploadFile({ file });
      if (response.file_url) {
        setFormData(prev => ({
          ...prev,
          logo_url: response.file_url
        }));
      }
    } catch (error) {
      console.error("Error uploading logo:", error);
      alert("Failed to upload logo. Please try again.");
    }
    setUploading(false);
    if (event.target) event.target.value = "";
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await Organization.update(organization.id, formData);
      if (onUpdate) await onUpdate();
      alert("Organization updated successfully!");
    } catch (error) {
      console.error("Error saving:", error);
      alert("Failed to save organization");
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      {/* Organization Logo */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle style={{ color: 'var(--txt)' }}>Organization Logo</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-6">
          <div className="relative">
            {formData.logo_url ? (
              <img
                src={formData.logo_url}
                alt="Organization Logo"
                className="w-24 h-24 rounded-lg object-cover"
              />
            ) : (
              <div className="w-24 h-24 rounded-lg bg-gray-800 flex items-center justify-center">
                <IconWrapper icon={Building2} size={32} variant="muted" />
              </div>
            )}
          </div>
          <div className="flex-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="btn-primary"
            >
              {uploading ? (
                <>
                  <IconWrapper icon={Upload} size={16} variant="accent" className="mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <IconWrapper icon={Upload} size={16} variant="accent" className="mr-2" />
                  Upload Logo
                </>
              )}
            </Button>
            <p className="text-xs mt-2" style={{ color: 'var(--muted)' }}>
              JPG, PNG or GIF. Max size 5MB.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Organization Information */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle style={{ color: 'var(--txt)' }}>Organization Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium mb-2 block" style={{ color: 'var(--txt)' }}>
                Organization Name
              </Label>
              <Input
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="bg-transparent border"
                style={{ color: 'var(--txt)', borderColor: 'rgba(255,255,255,.12)' }}
              />
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block" style={{ color: 'var(--txt)' }}>
                Email Domain
              </Label>
              <Input
                value={formData.email_domain}
                onChange={(e) => handleInputChange('email_domain', e.target.value)}
                placeholder="company.com"
                className="bg-transparent border"
                style={{ color: 'var(--txt)', borderColor: 'rgba(255,255,255,.12)' }}
              />
              <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                Users with this email domain will automatically join your organization
              </p>
            </div>
            
            <div>
              <Label className="text-sm font-medium mb-2 block" style={{ color: 'var(--txt)' }}>Website</Label>
              <Input
                value={formData.website}
                onChange={(e) => handleInputChange('website', e.target.value)}
                placeholder="https://company.com"
                className="bg-transparent border"
                style={{color: 'var(--txt)', borderColor: 'rgba(255,255,255,.12)'}}
              />
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block" style={{ color: 'var(--txt)' }}>Industry</Label>
              <Select value={formData.industry} onValueChange={(value) => handleInputChange('industry', value)}>
                <SelectTrigger className="bg-transparent border" style={{color: 'var(--txt)', borderColor: 'rgba(255,255,255,.12)'}}>
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent className="glass-card" style={{background: 'rgba(15,20,24,.98)', borderColor: 'rgba(255,255,255,.06)'}}>
                  <SelectItem value="technology" style={{color: 'var(--txt)'}}>Technology</SelectItem>
                  <SelectItem value="finance" style={{color: 'var(--txt)'}}>Finance</SelectItem>
                  <SelectItem value="healthcare" style={{color: 'var(--txt)'}}>Healthcare</SelectItem>
                  <SelectItem value="consulting" style={{color: 'var(--txt)'}}>Consulting</SelectItem>
                  <SelectItem value="manufacturing" style={{color: 'var(--txt)'}}>Manufacturing</SelectItem>
                  <SelectItem value="retail" style={{color: 'var(--txt)'}}>Retail</SelectItem>
                  <SelectItem value="other" style={{color: 'var(--txt)'}}>Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block" style={{ color: 'var(--txt)' }}>Company Size</Label>
              <Select value={formData.company_size} onValueChange={(value) => handleInputChange('company_size', value)}>
                <SelectTrigger className="bg-transparent border" style={{color: 'var(--txt)', borderColor: 'rgba(255,255,255,.12)'}}>
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent className="glass-card" style={{background: 'rgba(15,20,24,.98)', borderColor: 'rgba(255,255,255,.06)'}}>
                  <SelectItem value="1-10" style={{color: 'var(--txt)'}}>1-10 employees</SelectItem>
                  <SelectItem value="11-50" style={{color: 'var(--txt)'}}>11-50 employees</SelectItem>
                  <SelectItem value="51-200" style={{color: 'var(--txt)'}}>51-200 employees</SelectItem>
                  <SelectItem value="201-500" style={{color: 'var(--txt)'}}>201-500 employees</SelectItem>
                  <SelectItem value="500+" style={{color: 'var(--txt)'}}>500+ employees</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block" style={{ color: 'var(--txt)' }}>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Tell us about your organization..."
              className="bg-transparent border"
              style={{color: 'var(--txt)', borderColor: 'rgba(255,255,255,.12)'}}
              rows={3}
            />
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block" style={{ color: 'var(--txt)' }}>Address</Label>
            <div className="grid md:grid-cols-2 gap-4 mt-2">
              <div className="md:col-span-2">
                <Label className="text-xs" style={{color: 'var(--muted)'}}>Street Address</Label>
                <Input
                  value={formData.address.street}
                  onChange={(e) => handleInputChange('address.street', e.target.value)}
                  className="bg-transparent border mt-1"
                  style={{color: 'var(--txt)', borderColor: 'rgba(255,255,255,.12)'}}
                />
              </div>
              <div>
                <Label className="text-xs" style={{color: 'var(--muted)'}}>City</Label>
                <Input
                  value={formData.address.city}
                  onChange={(e) => handleInputChange('address.city', e.target.value)}
                  className="bg-transparent border mt-1"
                  style={{color: 'var(--txt)', borderColor: 'rgba(255,255,255,.12)'}}
                />
              </div>
              <div>
                <Label className="text-xs" style={{color: 'var(--muted)'}}>State/Province</Label>
                <Input
                  value={formData.address.state}
                  onChange={(e) => handleInputChange('address.state', e.target.value)}
                  className="bg-transparent border mt-1"
                  style={{color: 'var(--txt)', borderColor: 'rgba(255,255,255,.12)'}}
                />
              </div>
              <div>
                <Label className="text-xs" style={{color: 'var(--muted)'}}>Postal Code</Label>
                <Input
                  value={formData.address.postal_code}
                  onChange={(e) => handleInputChange('address.postal_code', e.target.value)}
                  className="bg-transparent border mt-1"
                  style={{color: 'var(--txt)', borderColor: 'rgba(255,255,255,.12)'}}
                />
              </div>
              <div>
                <Label className="text-xs" style={{color: 'var(--muted)'}}>Country</Label>
                <Input
                  value={formData.address.country}
                  onChange={(e) => handleInputChange('address.country', e.target.value)}
                  className="bg-transparent border mt-1"
                  style={{color: 'var(--txt)', borderColor: 'rgba(255,255,255,.12)'}}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary"
            >
              {saving ? (
                <>
                  <IconWrapper icon={Save} size={16} variant="accent" className="mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <IconWrapper icon={Save} size={16} variant="accent" className="mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}