import React, { useState } from "react";
import { User, Mail, Phone, Linkedin, MapPin, Copy, Check, ExternalLink } from "lucide-react";
import WidgetWrapper from "./WidgetWrapper";

/**
 * ContactInfoWidget - Displays candidate contact information with copy buttons
 */
const CopyButton = ({ value }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e) => {
    e.stopPropagation();
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1.5 hover:bg-zinc-700 rounded-lg transition-colors"
      title="Copy to clipboard"
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-green-400" />
      ) : (
        <Copy className="w-3.5 h-3.5 text-zinc-500 hover:text-zinc-300" />
      )}
    </button>
  );
};

const ContactRow = ({ icon: Icon, label, value, copyable, link, iconColor = "text-zinc-400" }) => {
  if (!value) return null;

  return (
    <div className="flex items-center justify-between py-2 px-3 hover:bg-zinc-700/30 rounded-lg transition-colors group">
      <div className="flex items-center gap-3 min-w-0">
        <Icon className={`w-4 h-4 flex-shrink-0 ${iconColor}`} />
        <div className="min-w-0">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{label}</p>
          {link ? (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-cyan-400 hover:text-cyan-300 truncate block"
            >
              {value}
            </a>
          ) : (
            <p className="text-sm text-zinc-200 truncate">{value}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {copyable && <CopyButton value={value} />}
        {link && (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 hover:bg-zinc-700 rounded-lg transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5 text-zinc-500 hover:text-zinc-300" />
          </a>
        )}
      </div>
    </div>
  );
};

const ContactInfoWidget = ({ candidate, editMode, onRemove, dragHandleProps }) => {
  const email = candidate?.email || candidate?.verified_email || candidate?.personal_email;
  const phone = candidate?.phone || candidate?.verified_phone || candidate?.mobile_phone || candidate?.work_phone;
  const linkedin = candidate?.linkedin_url || candidate?.linkedin_profile;
  const location = candidate?.location || candidate?.person_home_location ||
    [candidate?.location_city, candidate?.location_region, candidate?.location_country].filter(Boolean).join(', ');

  const hasData = email || phone || linkedin || location;

  return (
    <WidgetWrapper
      title="Contact Info"
      icon={User}
      iconColor="text-cyan-400"
      editMode={editMode}
      onRemove={onRemove}
      dragHandleProps={dragHandleProps}
      isEmpty={!hasData}
    >
      <div className="space-y-1">
        <ContactRow
          icon={Mail}
          label="Email"
          value={email}
          copyable
          iconColor="text-cyan-400"
        />
        <ContactRow
          icon={Phone}
          label="Phone"
          value={phone}
          copyable
          iconColor="text-green-400"
        />
        <ContactRow
          icon={Linkedin}
          label="LinkedIn"
          value={linkedin ? "View Profile" : null}
          link={linkedin}
          iconColor="text-blue-400"
        />
        <ContactRow
          icon={MapPin}
          label="Location"
          value={location}
          iconColor="text-amber-400"
        />
      </div>
    </WidgetWrapper>
  );
};

export default ContactInfoWidget;
