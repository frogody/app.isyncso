import React from 'react';
import { Navigate } from 'react-router-dom';

export default function StudioClipshoot() {
  return <Navigate to="/CreateVideos?mode=studio" replace />;
}
