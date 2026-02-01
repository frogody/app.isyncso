import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Target, TrendingUp, UserCheck, Truck, Handshake,
  UserPlus, Crosshair, Plus, Search, ChevronDown, Star, StarOff,
  Settings, Upload, Filter, MoreHorizontal, Hash, Building2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTheme } from '@/contexts/GlobalThemeContext';

// Contact type definitions with icons and colors
const CONTACT_TYPES = [
  {
    id: 'all',
    label: 'All Contacts',
    icon: Users,
    color: 'cyan',
    bgColor: 'bg-cyan-500/10',
    textColor: 'text-cyan-400',
    borderColor: 'border-cyan-500/30'
  },
  {
    id: 'lead',
    label: 'Leads',
    icon: Target,
    color: 'zinc',
    bgColor: 'bg-zinc-500/10',
    textColor: 'text-zinc-400',
    borderColor: 'border-zinc-500/30',
    description: 'Unqualified contacts'
  },
  {
    id: 'prospect',
    label: 'Prospects',
    icon: TrendingUp,
    color: 'blue',
    bgColor: 'bg-blue-500/10',
    textColor: 'text-blue-400',
    borderColor: 'border-blue-500/30',
    description: 'Qualified leads in pipeline'
  },
  {
    id: 'customer',
    label: 'Customers',
    icon: UserCheck,
    color: 'green',
    bgColor: 'bg-green-500/10',
    textColor: 'text-green-400',
    borderColor: 'border-green-500/30',
    description: 'Paying customers'
  },
  {
    id: 'supplier',
    label: 'Suppliers',
    icon: Truck,
    color: 'orange',
    bgColor: 'bg-orange-500/10',
    textColor: 'text-orange-400',
    borderColor: 'border-orange-500/30',
    description: 'Product suppliers',
    isExternal: true // Links to suppliers table
  },
  {
    id: 'partner',
    label: 'Partners',
    icon: Handshake,
    color: 'purple',
    bgColor: 'bg-purple-500/10',
    textColor: 'text-purple-400',
    borderColor: 'border-purple-500/30',
    description: 'Business partners'
  },
  {
    id: 'candidate',
    label: 'Candidates',
    icon: UserPlus,
    color: 'rose',
    bgColor: 'bg-rose-500/10',
    textColor: 'text-rose-400',
    borderColor: 'border-rose-500/30',
    description: 'Job applicants'
  },
  {
    id: 'target',
    label: 'Targets',
    icon: Crosshair,
    color: 'amber',
    bgColor: 'bg-amber-500/10',
    textColor: 'text-amber-400',
    borderColor: 'border-amber-500/30',
    description: 'Target accounts for outreach'
  },
];

export default function CRMSidebar({
  selectedType,
  onSelectType,
  contactCounts = {},
  onAddContact,
  onImportContacts,
  onOpenSettings,
  suppliers = [],
  className
}) {
  const { crt } = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [showQuickFilters, setShowQuickFilters] = useState(true);

  // Filter contact types based on search
  const filteredTypes = useMemo(() => {
    if (!searchTerm) return CONTACT_TYPES;
    const term = searchTerm.toLowerCase();
    return CONTACT_TYPES.filter(type =>
      type.label.toLowerCase().includes(term) ||
      type.description?.toLowerCase().includes(term)
    );
  }, [searchTerm]);

  // Calculate supplier count
  const supplierCount = suppliers.length;

  // Get count for a type
  const getCount = (typeId) => {
    if (typeId === 'all') {
      return Object.values(contactCounts).reduce((sum, count) => sum + count, 0);
    }
    if (typeId === 'supplier') {
      return supplierCount;
    }
    return contactCounts[typeId] || 0;
  };

  // Type item component
  const TypeItem = ({ type }) => {
    const isSelected = selectedType === type.id;
    const count = getCount(type.id);
    const Icon = type.icon;

    return (
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={() => onSelectType(type.id)}
        className={`group relative flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl cursor-pointer transition-all duration-200 ${
          isSelected
            ? `${type.bgColor} border ${type.borderColor}`
            : `${crt('hover:bg-slate-100', 'hover:bg-zinc-800/50')} border border-transparent`
        }`}
      >
        {/* Selection indicator */}
        {isSelected && (
          <motion.div
            layoutId="activeType"
            className={`absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-${type.color}-500 rounded-r-full`}
          />
        )}

        {/* Icon */}
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
          isSelected
            ? `${type.bgColor} border ${type.borderColor}`
            : `${crt('bg-slate-100', 'bg-zinc-800/80')} border ${crt('border-slate-300', 'border-zinc-700/50')}`
        }`}>
          <Icon className={`w-4 h-4 ${
            isSelected ? type.textColor : crt('text-slate-400', 'text-zinc-500')
          }`} />
        </div>

        {/* Label */}
        <div className="flex-1 min-w-0">
          <span className={`text-sm font-medium ${
            isSelected ? crt('text-slate-900', 'text-white') : `${crt('text-slate-500', 'text-zinc-400')} ${crt('group-hover:text-slate-700', 'group-hover:text-zinc-200')}`
          }`}>
            {type.label}
          </span>
          {type.description && (
            <p className={`text-xs ${crt('text-slate-400', 'text-zinc-600')} truncate`}>{type.description}</p>
          )}
        </div>

        {/* Count badge */}
        {count > 0 && (
          <Badge
            variant="outline"
            className={`${
              isSelected
                ? `${type.bgColor} ${type.textColor} ${type.borderColor}`
                : `${crt('bg-slate-100', 'bg-zinc-800')} ${crt('text-slate-500', 'text-zinc-400')} ${crt('border-slate-300', 'border-zinc-700')}`
            } text-xs px-1.5`}
          >
            {count}
          </Badge>
        )}

        {/* External indicator for suppliers */}
        {type.isExternal && (
          <Building2 className={`w-3 h-3 ${crt('text-slate-400', 'text-zinc-600')}`} title="Links to Suppliers" />
        )}
      </motion.div>
    );
  };

  return (
    <div className={`w-64 ${crt('bg-gradient-to-b from-slate-50 via-white to-cyan-50/5 border-r border-slate-200', 'bg-gradient-to-b from-zinc-950 via-zinc-900 to-cyan-950/5 border-r border-zinc-800/50')} flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className={`p-4 border-b ${crt('border-slate-200', 'border-zinc-800/60')}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500/30 to-cyan-600/30 border border-cyan-500/40 flex items-center justify-center shadow-lg shadow-cyan-500/10">
              <Users className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className={`font-bold ${crt('text-slate-900', 'text-white')} text-base`}>CRM</h2>
              <p className={`text-[10px] ${crt('text-slate-400', 'text-zinc-500')} uppercase tracking-wider`}>Contacts</p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className={`h-8 w-8 ${crt('text-slate-400 hover:text-slate-900', 'text-zinc-500 hover:text-white')}`}>
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className={`${crt('bg-white border-slate-200', 'bg-zinc-900 border-zinc-700')}`} align="end">
              <DropdownMenuItem onClick={onOpenSettings} className={crt('text-slate-600', 'text-zinc-300')}>
                <Settings className="w-4 h-4 mr-2" /> Settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${crt('text-slate-400', 'text-zinc-600')}`} />
          <input
            type="text"
            placeholder="Search types..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-10 pr-3 py-2 ${crt('bg-slate-50 border border-slate-200', 'bg-zinc-800/50 border border-zinc-700/60')} rounded-xl text-sm ${crt('text-slate-900 placeholder-slate-400', 'text-white placeholder-zinc-600')} focus:border-cyan-600/50 focus:ring-1 focus:ring-cyan-600/30 focus:outline-none transition-all`}
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className={`px-3 py-3 border-b ${crt('border-slate-200', 'border-zinc-800/40')}`}>
        <div className="flex gap-2">
          <Button
            onClick={onAddContact}
            className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white text-sm py-2"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add Contact
          </Button>
          <Button
            onClick={onImportContacts}
            variant="outline"
            className={`${crt('border-slate-300 text-slate-500 hover:text-slate-900 hover:border-slate-400', 'border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600')}`}
            size="sm"
          >
            <Upload className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Contact Types List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-hide">
        {/* Section Header */}
        <button
          onClick={() => setShowQuickFilters(!showQuickFilters)}
          className={`flex items-center gap-2 px-2 py-1.5 mb-2 text-xs font-semibold ${crt('text-slate-400 hover:text-slate-600', 'text-zinc-500 hover:text-zinc-300')} uppercase tracking-wider transition-colors w-full`}
        >
          <motion.div
            animate={{ rotate: showQuickFilters ? 0 : -90 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </motion.div>
          Contact Types
          <span className="text-cyan-500/70 font-normal ml-auto">
            {getCount('all')}
          </span>
        </button>

        <AnimatePresence>
          {showQuickFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden space-y-1"
            >
              {filteredTypes.map(type => (
                <TypeItem key={type.id} type={type} />
              ))}

              {filteredTypes.length === 0 && searchTerm && (
                <p className={`text-xs ${crt('text-slate-400', 'text-zinc-600')} px-2.5 py-2 text-center`}>
                  No contact types found
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Stats */}
      <div className={`p-4 border-t ${crt('border-slate-200 bg-slate-50/50', 'border-zinc-800/60 bg-zinc-950/50')}`}>
        <div className="grid grid-cols-2 gap-2">
          <div className={`p-2 ${crt('bg-slate-100/50', 'bg-zinc-800/30')} rounded-lg`}>
            <div className={`text-lg font-bold ${crt('text-slate-900', 'text-white')}`}>{getCount('all')}</div>
            <div className={`text-[10px] ${crt('text-slate-400', 'text-zinc-500')} uppercase`}>Total</div>
          </div>
          <div className={`p-2 ${crt('bg-slate-100/50', 'bg-zinc-800/30')} rounded-lg`}>
            <div className="text-lg font-bold text-green-400">{contactCounts.customer || 0}</div>
            <div className={`text-[10px] ${crt('text-slate-400', 'text-zinc-500')} uppercase`}>Customers</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export { CONTACT_TYPES };
