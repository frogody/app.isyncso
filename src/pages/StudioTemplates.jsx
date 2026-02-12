import React from 'react';
import { Navigate } from 'react-router-dom';

export default function StudioTemplates() {
  return <Navigate to="/CreateVideos?mode=templates" replace />;
}
