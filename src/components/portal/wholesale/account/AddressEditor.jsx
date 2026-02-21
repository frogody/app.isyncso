import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2, X } from 'lucide-react';

const COUNTRIES = [
  'Netherlands', 'Belgium', 'Germany', 'France', 'United Kingdom',
  'Spain', 'Italy', 'Austria', 'Switzerland', 'Sweden',
  'Denmark', 'Norway', 'Finland', 'Poland', 'Czech Republic',
  'Portugal', 'Ireland', 'Luxembourg', 'United States', 'Canada',
  'Australia', 'Other',
];

const REQUIRED_FIELDS = ['label', 'street_1', 'city', 'zip', 'country'];

function getEmptyAddress() {
  return {
    label: '', street_1: '', street_2: '',
    city: '', state: '', zip: '', country: 'Netherlands',
  };
}

export default function AddressEditor({ address = null, onSave, onCancel }) {
  const [form, setForm] = useState(getEmptyAddress());
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (address) {
      setForm({
        label: address.label || '',
        street_1: address.street_1 || '',
        street_2: address.street_2 || '',
        city: address.city || '',
        state: address.state || '',
        zip: address.zip || '',
        country: address.country || 'Netherlands',
      });
    } else {
      setForm(getEmptyAddress());
    }
    setErrors({});
  }, [address]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const n = { ...prev };
        delete n[field];
        return n;
      });
    }
  };

  const validate = () => {
    const next = {};
    REQUIRED_FIELDS.forEach((f) => {
      if (!form[f]?.trim()) {
        const l =
          f === 'street_1' ? 'Street'
            : f === 'zip' ? 'ZIP / Postal code'
              : f.charAt(0).toUpperCase() + f.slice(1);
        next[f] = l + ' is required';
      }
    });
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      await onSave(form);
    } catch {
      // parent handles error toast
    } finally {
      setSaving(false);
    }
  };

  const fc = 'w-full rounded-lg px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:opacity-40';
  const inputStyle = (field) => ({
    backgroundColor: 'var(--ws-bg, #09090b)',
    color: 'var(--ws-text, #fafafa)',
    border: errors[field] ? '1px solid #ef4444' : '1px solid var(--ws-border, #27272a)',
  });
  const labelStyle = { color: 'var(--ws-muted, #a1a1aa)' };
  const reqStyle = { color: 'var(--ws-primary, #06b6d4)' };

  return (
    <motion.form
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.2 }}
      onSubmit={handleSubmit}
      className="rounded-xl p-5 space-y-4"
      style={{
        backgroundColor: 'var(--ws-surface, #18181b)',
        border: '1px solid var(--ws-border, #27272a)',
      }}
    >
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--ws-text, #fafafa)' }}>
          {address ? 'Edit Address' : 'New Address'}
        </h3>
        <button type="button" onClick={onCancel} className="p-1 rounded-md hover:bg-white/[0.06] transition-colors">
          <X className="w-4 h-4" style={labelStyle} />
        </button>
      </div>

      <div>
        <label className="block text-xs font-medium mb-1.5" style={labelStyle}>
          Label <span style={reqStyle}>*</span>
        </label>
        <input type="text" value={form.label} onChange={(e) => handleChange('label', e.target.value)} placeholder="e.g. Billing, Shipping, Warehouse" className={fc} style={inputStyle('label')} />
        {errors.label && <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{errors.label}</p>}
      </div>

      <div>
        <label className="block text-xs font-medium mb-1.5" style={labelStyle}>
          Street address <span style={reqStyle}>*</span>
        </label>
        <input type="text" value={form.street_1} onChange={(e) => handleChange('street_1', e.target.value)} placeholder="123 Main Street" className={fc} style={inputStyle('street_1')} />
        {errors.street_1 && <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{errors.street_1}</p>}
      </div>

      <div>
        <label className="block text-xs font-medium mb-1.5" style={labelStyle}>Street address line 2</label>
        <input type="text" value={form.street_2} onChange={(e) => handleChange('street_2', e.target.value)} placeholder="Apt, Suite, Unit (optional)" className={fc} style={inputStyle('street_2')} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium mb-1.5" style={labelStyle}>City <span style={reqStyle}>*</span></label>
          <input type="text" value={form.city} onChange={(e) => handleChange('city', e.target.value)} placeholder="Amsterdam" className={fc} style={inputStyle('city')} />
          {errors.city && <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{errors.city}</p>}
        </div>
        <div>
          <label className="block text-xs font-medium mb-1.5" style={labelStyle}>State / Province</label>
          <input type="text" value={form.state} onChange={(e) => handleChange('state', e.target.value)} placeholder="North Holland" className={fc} style={inputStyle('state')} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium mb-1.5" style={labelStyle}>ZIP / Postal code <span style={reqStyle}>*</span></label>
          <input type="text" value={form.zip} onChange={(e) => handleChange('zip', e.target.value)} placeholder="1012 AB" className={fc} style={inputStyle('zip')} />
          {errors.zip && <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{errors.zip}</p>}
        </div>
        <div>
          <label className="block text-xs font-medium mb-1.5" style={labelStyle}>Country <span style={reqStyle}>*</span></label>
          <select value={form.country} onChange={(e) => handleChange('country', e.target.value)} className={fc + ' cursor-pointer'} style={inputStyle('country')}>
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          {errors.country && <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{errors.country}</p>}
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} disabled={saving} className="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-white/[0.06]" style={{ color: 'var(--ws-muted, #a1a1aa)', border: '1px solid var(--ws-border, #27272a)' }}>
          Cancel
        </button>
        <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50" style={{ backgroundColor: 'var(--ws-primary, #06b6d4)', color: 'var(--ws-bg, #000)' }}>
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {address ? 'Update Address' : 'Add Address'}
        </button>
      </div>
    </motion.form>
  );
}
