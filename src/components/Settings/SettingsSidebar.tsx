import { User as UserIcon, Landmark, ShieldCheck } from 'lucide-react';

type SettingTab = 'general' | 'payouts' | 'subscription';

interface Props {
  activeTab: SettingTab;
  onTabChange: (tab: SettingTab) => void;
}

export function SettingsSidebar({ activeTab, onTabChange }: Props) {
  const menuItems = [
    { id: 'general', label: 'General', icon: UserIcon },
    { id: 'payouts', label: 'Payouts', icon: Landmark },
    { id: 'subscription', label: 'Subscription', icon: ShieldCheck },
  ];

  return (
    <aside className="w-full md:w-64 flex md:flex-col overflow-x-auto md:overflow-visible gap-2 pb-2 md:pb-0">
      {menuItems.map((item) => {
        const Icon = item.icon;
        return (
          <button
  key={item.id}
  onClick={() => onTabChange(item.id as SettingTab)}
  // Reverted to exactly 'transition' as per your original code
  className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition whitespace-nowrap w-full ${
    activeTab === item.id 
      ? 'bg-orange text-white' 
      : 'text-textGrey hover-bg-theme'
  }`}
>
  <Icon size={18} />
  {item.label}
</button>
        );
      })}
    </aside>
  );
}