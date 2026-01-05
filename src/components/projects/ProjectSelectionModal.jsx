// ... keep existing code (imports and component start) ...

  const _getStatusColor = (status) => {
    switch (status) {
      case 'discovery': return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
      case 'active_search': return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'shortlisting': return 'bg-red-500/15 text-red-300 border-red-500/25';
      case 'interviewing': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'negotiating': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'closed': return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  // ... keep existing code (rest of component) ...