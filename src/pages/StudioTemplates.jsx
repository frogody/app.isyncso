import React from 'react';
import CreateVideos from './CreateVideos';

export default function StudioTemplates() {
  return (
    <div className="min-h-screen bg-black">
      <CreateVideos embedded defaultMode="templates" />
    </div>
  );
}
