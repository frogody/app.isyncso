import React from 'react';
import CreateVideos from './CreateVideos';

export default function StudioClipshoot() {
  return (
    <div className="min-h-screen bg-black">
      <CreateVideos embedded defaultMode="studio" />
    </div>
  );
}
