import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ReceiptText, 
  BarChart3, 
  Target, 
  Settings, 
  LogOut,
  ChevronDown
} from 'lucide-react';
import { useDataStore } from '@/store/dataStore';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', to: '/' },
  { icon: ReceiptText, label: 'Ledger', to: '/transactions' },
  { icon: BarChart3, label: 'Insights', to: '/insights' },
  { icon: Target, label: 'Budget', to: '/budget' },
];

export default function Sidebar() {
  const { userProfile, setAccessToken } = useDataStore();

  const handleSignOut = () => {
    setAccessToken(null);
  };

  return (
    <aside className="w-[220px] h-screen flex flex-col fixed left-0 top-0 border-r border-border bg-background z-50">
      {/* Logo */}
      <div className="h-[48px] px-6 flex items-center">
        <NavLink to="/" className="flex items-center gap-2 group">
          <div className="h-6 w-6 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm group-hover:scale-110 transition-transform">
            m
          </div>
          <span className="font-bold tracking-tight text-lg">moniq</span>
        </NavLink>
      </div>

      <div className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              isActive 
                ? "bg-primary/10 text-primary" 
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}

        <div className="pt-4 pb-2">
          <div className="h-px bg-border mx-3" />
        </div>

        <NavLink
            to="/settings"
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              isActive 
                ? "bg-primary/10 text-primary" 
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Settings className="h-4 w-4" />
            Settings
          </NavLink>
      </div>

      {/* User Chip */}
      <div className="p-3 border-t border-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-3 p-2 rounded-xl border border-transparent hover:border-border hover:bg-accent/50 transition-all text-left">
              <Avatar className="h-8 w-8 border border-border">
                <AvatarImage src={userProfile?.picture} />
                <AvatarFallback className="text-xs">{userProfile?.name?.charAt(0) || 'U'}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate leading-none mb-1">{userProfile?.name || 'User'}</p>
                <p className="text-[10px] text-muted-foreground truncate leading-none">Settings</p>
              </div>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[200px]">
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sign out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
