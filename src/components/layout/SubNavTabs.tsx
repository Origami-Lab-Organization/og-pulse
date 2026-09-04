import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { getActiveTabs } from './nav-config';

export function SubNavTabs() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { can } = useAuth();
  const tabs = getActiveTabs(pathname, can);

  if (!tabs) return null;

  return (
    <nav className="border-b bg-background">
      <div className="px-4 sm:px-6 flex gap-0 h-10">
        {tabs.map((tab) => {
          const isActive = pathname === tab.url || pathname.startsWith(tab.url + '/');
          return (
            <button
              key={tab.url}
              onClick={() => navigate(tab.url)}
              className={cn(
                'h-full px-4 text-sm font-medium border-b-2 transition-colors',
                isActive
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.title}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
