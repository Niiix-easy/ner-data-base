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
  HelpCircle,
  Globe,
  Lock,
  ChevronLeft,
  Key,
  Sun,
  Moon,
  Contrast
} from 'lucide-react';
import LanguageSelector from './LanguageSelector';
import { useI18n } from '@/contexts/I18nContext';
import { useTheme } from '@/contexts/ThemeContext';
import { GlobalSearch } from '@/components/layout/GlobalSearch';

const Sidebar = () => {
  const pathname = usePathname();
  const { t } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const [user, setUser] = React.useState<any>(null);

  React.useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch('/api/control-plane/auth/me');
        if (res.ok) {
          const data = await res.json();
          setUser(data);
        }
      } catch (err) {
        console.error('Sidebar error fetching user:', err);
      }
    };
    fetchUser();
  }, []);

  const mainNav = [
    { name: t('sidebar.overview'), href: '/dashboard', icon: Home },
    { name: t('sidebar.tableEditor'), href: '/editor', icon: Table },
    { name: t('sidebar.sqlEditor'), href: '/sql-editor', icon: TerminalSquare },
    { name: t('sidebar.auth'), href: '/auth', icon: Users },
    { name: t('sidebar.storage'), href: '/storage', icon: Archive },
    { name: t('sidebar.functions'), href: '/functions', icon: Zap },
    { name: t('sidebar.realtime'), href: '/realtime', icon: Radio },
  ];

  const secondaryNav = [
    { name: t('sidebar.observability'), href: '/observability', icon: Activity },
    { name: t('sidebar.logs'), href: '/logs', icon: List },
    { name: t('sidebar.integrations'), href: '/integrations', icon: Blocks },
    { name: t('sidebar.advisors'), href: '/advisors', icon: Lightbulb },
  ];

  const [expiringSoon, setExpiringSoon] = React.useState(false);

  React.useEffect(() => {
    const checkExpiring = async () => {
      try {
        const res = await fetch('/api/control-plane/api-keys');
        if (!res.ok) return;
        const keys = await res.json();
        const soon = 3 * 24 * 60 * 60 * 1000;
        const now = new Date().getTime();
        const hasSoon = keys.some((k: any) => 
          k.expires_at && 
          !k.revoked_at && 
          (new Date(k.expires_at).getTime() - now) > 0 &&
          (new Date(k.expires_at).getTime() - now) < soon
        );
        setExpiringSoon(hasSoon);
      } catch (err) {
        console.error('Sidebar error checking keys:', err);
      }
    };
    checkExpiring();
  }, []);

  const bottomNav = [
    { name: 'Site Inicial', href: '/', icon: Globe },
    { name: t('sidebar.settings'), href: '/settings', icon: Settings },
    { name: t('sidebar.apiKeys') || 'API Keys', href: '/api-keys', icon: Key, badge: expiringSoon },
    { name: t('sidebar.webhooks'), href: '/settings/webhooks', icon: Zap },
    { name: t('sidebar.search'), href: '/search', icon: Search },
    { name: t('sidebar.account'), href: '/account', icon: User },
    { name: t('sidebar.ai'), href: '/ai', icon: Bot },
    { name: t('sidebar.consultants'), href: '/consultants', icon: LifeBuoy },
    { name: t('sidebar.pricing'), href: '/pricing', icon: List },
    { name: t('sidebar.help'), href: '/help', icon: HelpCircle },
  ];

  return (
    <aside className="w-64 bg-[#0a0a0a] text-neutral-400 flex flex-col h-full border-r border-white/5 font-sans">
      <div className="p-6 flex items-center justify-between border-b border-white/5 shrink-0 bg-[#0a0a0a]">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="w-6 h-6 bg-emerald-500 rounded flex items-center justify-center text-black font-bold text-xs">
            N
          </div>
          <span className="text-white font-bold tracking-tighter">Ner-Data-Base</span>
        </Link>
        <GlobalSearch />
        <Link href="/" className="p-1 hover:bg-white/5 rounded transition-colors text-neutral-600 hover:text-white" title="Voltar ao início">
          <ChevronLeft size={16} />
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 scrollbar-thin scrollbar-thumb-white/5 scrollbar-track-transparent">
        <ul className="space-y-1">
          {mainNav.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon size={18} />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="my-6 px-3">
          <p className="text-[10px] font-bold text-neutral-600 uppercase tracking-[0.2em] mb-4">Monitoramento</p>
          <ul className="space-y-1">
            {secondaryNav.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-white/10 text-white'
                        : 'hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <Icon size={18} />
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="mt-auto pt-6 px-3">
           <p className="text-[10px] font-bold text-neutral-600 uppercase tracking-[0.2em] mb-4">Configurações</p>
           <ul className="space-y-1">
            {bottomNav.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-white/10 text-white'
                        : 'hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={18} />
                      {item.name}
                    </div>
                    {item.badge && (
                      <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]"></span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      <div className="p-6 border-t border-white/5 shrink-0 bg-[#070707]">
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center text-[10px] font-bold text-neutral-600 uppercase tracking-widest">
            <span>v0.1.0-beta</span>
            <div className="flex items-center gap-2">
              <button 
                onClick={toggleTheme}
                className="p-1.5 hover:bg-white/5 rounded-lg transition-colors border border-white/5"
                title={theme === 'dark' ? 'Switch to Light Mode' : theme === 'light' ? 'Switch to High Contrast' : 'Switch to Dark Mode'}
              >
                {theme === 'dark' ? <Sun size={14} /> : theme === 'light' ? <Contrast size={14} /> : <Moon size={14} />}
              </button>
              <LanguageSelector />
            </div>
          </div>
          <div className="flex items-center gap-3 p-2 bg-white/5 rounded-xl border border-white/5">
             <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
               <User size={16} />
             </div>
             <div className="flex-1 overflow-hidden">
               <p className="text-xs font-bold text-white truncate">{user?.name || 'Admin User'}</p>
               <p className="text-[10px] text-neutral-500 truncate">{user?.email || 'admin@ner.local'}</p>
             </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
