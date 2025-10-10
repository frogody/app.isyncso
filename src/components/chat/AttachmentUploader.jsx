import React from "react";
import { Button } from "@/components/ui/button";
import { UploadFile } from "@/api/integrations";
import { Paperclip, RefreshCw, X } from "lucide-react";

export default function AttachmentUploader({ attachments, onChange }) {
  const [isUploading, setIsUploading] = React.useState(false);
  const fileInputRef = React.useRef(null); // NEW: ref to trigger file dialog

  const handleSelectFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setIsUploading(true);
    try {
      const uploaded = [];
      for (const file of files) {
        const res = await UploadFile({ file });
        if (res.file_url) {
          uploaded.push({
            name: file.name,
            url: res.file_url,
            size: file.size
          });
        }
      }
      onChange([...(attachments || []), ...uploaded]);
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const removeAttachment = (url) => {
    onChange((attachments || []).filter(a => a.url !== url));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {/* Hidden file input controlled via ref */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.txt,.md,.rtf,.png,.jpg,.jpeg"
          className="hidden"
          onChange={handleSelectFiles}
        />
        <Button
          type="button"
          variant="outline"
          className="btn-outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Paperclip className="w-4 h-4 mr-2" />
              Add documents
            </>
          )}
        </Button>
      </div>

      {attachments && attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map(att => (
            <div
              key={att.url}
              className="flex items-center gap-2 px-3 py-1 rounded-lg"
              style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.10)', color: 'var(--txt)' }}
              title={att.name}
            >
              <Paperclip className="w-3 h-3" style={{ color: 'var(--muted)' }} />
              <span className="text-xs max-w-[180px] truncate">{att.name}</span>
              <button
                type="button"
                onClick={() => removeAttachment(att.url)}
                className="hover:opacity-80"
                title="Remove"
              >
                <X className="w-3 h-3" style={{ color: 'var(--muted)' }} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}