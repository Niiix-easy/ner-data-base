'use client'

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Table,
  TerminalSquare,
  Database,
  Users,
  Archive,
  Zap,
  Radio,
  Lightbulb,
  Activity,
  List,
  Blocks,
  Settings,
  Search,
  User,
  Bot,
  LifeBuoy,
  HelpCircle
} from 'lucide-react';
import LanguageSelector from './LanguageSelector';
import { useI18n } from '@/contexts/I18nContext';

const Sidebar = () => {
  const pathname = usePathname();
  const { t } = useI18n();

  const navItems = [
    { name: t('sidebar.overview'), href: '/', icon: Home },
    { name: t('sidebar.tableEditor'), href: '/editor', icon: Table },
    { name: t('sidebar.sqlEditor'), href: '/sql-editor', icon: TerminalSquare },
    { name: t('sidebar.database'), href: '/database', icon: Database, separator: true },
    { name: t('sidebar.auth'), href: '/auth', icon: Users },
    { name: t('sidebar.storage'), href: '/storage', icon: Archive },
    { name: t('sidebar.functions'), href: '/functions', icon: Zap },
    { name: t('sidebar.realtime'), href: '/realtime', icon: Radio },
    { name: t('sidebar.advisors'), href: '/advisors', icon: Lightbulb, separator: true },
    { name: t('sidebar.observability'), href: '/observability', icon: Activity },
    { name: t('sidebar.logs'), href: '/logs', icon: List },
    { name: t('sidebar.integrations'), href: '/integrations', icon: Blocks },
    { name: t('sidebar.settings'), href: '/settings', icon: Settings, separator: true },
    { name: t('sidebar.webhooks'), href: '/settings/webhooks', icon: Zap },
    { name: t('sidebar.search'), href: '/search', icon: Search, separator: true },
    { name: t('sidebar.account'), href: '/account', icon: User },
    { name: t('sidebar.ai'), href: '/ai', icon: Bot },
    { name: t('sidebar.consultants'), href: '/consultants', icon: LifeBuoy },
    { name: t('sidebar.pricing'), href: '/pricing', icon: List },
    { name: t('sidebar.help'), href: '/help', icon: HelpCircle },
  ];

  return (
    <aside className="w-64 bg-[#1c1c1c] text-[#a0a0a0] flex flex-col h-full border-r border-[#333]">
      <div className="p-4 flex items-center gap-2 border-b border-[#333]">
        <div className="w-8 h-8 bg-green-500 rounded flex items-center justify-center text-white font-bold text-xl">
          N
        </div>
        <span className="text-white font-semibold text-lg">Neer-Data-Base</span>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <React.Fragment key={item.name}>
                {item.separator && index !== 0 && (
                  <li className="my-3 border-t border-[#333]" />
                )}
                <li>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-[#333] text-white border-l-2 border-green-500 pl-[14px]'
                        : 'hover:bg-[#2c2c2c] hover:text-white'
                    }`}
                  >
                    <Icon size={18} className={isActive ? 'text-green-500' : ''} />
                    {item.name}
                  </Link>
                </li>
              </React.Fragment>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-[#333] flex justify-between items-center text-xs">
        <span>Neer-Data-Base v0.1.0</span>
        <LanguageSelector />
      </div>
    </aside>
  );
};

export default Sidebar;
