import { DollarSign, Users, TrendingUp, CreditCard } from 'lucide-react';

interface Props {
  studentCount: number;
}

export function PaymentsView({ studentCount }: Props) {
  return (
    <div className="space-y-6 animate-in fade-in zoom-in-[0.99] duration-300 transition-all">
      
      {/* 1. TOP STATS - Kept your favorite 3-column bold style */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate p-6 rounded-xl border border-gray-800 transition-colors duration-300">
          <div className="text-textGrey text-xs font-bold uppercase mb-2 tracking-wider">Total Revenue</div>
          <div className="text-3xl font-bold text-white flex items-center gap-2">
            <DollarSign className="text-statusGreen" /> 0.00
          </div>
        </div>
        
        <div className="bg-slate p-6 rounded-xl border border-gray-800 transition-colors duration-300">
          <div className="text-textGrey text-xs font-bold uppercase mb-2 tracking-wider">Active Students</div>
          <div className="text-3xl font-bold text-white flex items-center gap-2">
            <Users className="text-blue-400" /> {studentCount}
          </div>
        </div>
        
        <div className="bg-slate p-6 rounded-xl border border-gray-800 transition-colors duration-300">
          <div className="text-textGrey text-xs font-bold uppercase mb-2 tracking-wider">Monthly Growth</div>
          <div className="text-3xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="text-orange" /> 0%
          </div>
        </div>
      </div>

      {/* 2. LOWER SECTION - New, cleaner Design & Content */}
      <div className="bg-slate rounded-2xl p-12 text-center border border-gray-800 transition-colors duration-300">
        {/* Modern Icon Treatment */}
        <div className="inline-flex items-center justify-center w-16 h-16 bg-midnight rounded-full mb-6 border border-gray-800 transition-colors duration-300">
          <CreditCard size={28} className="text-textGrey opacity-40" />
        </div>

        {/* Updated Content */}
        <h3 className="text-xl font-bold text-white mb-2">Income Tracking Coming Soon</h3>
        <p className="text-textGrey max-w-xs mx-auto text-sm leading-relaxed mb-8">
          The income and expense tracking module is being updated. You'll soon be able to see your monthly earnings, manage cash payments, and see package status at a glance.
        </p>

        {/* Subtle coming soon button */}
        <div className="inline-flex items-center gap-2 bg-gray-800/40 text-gray-500 px-6 py-2.5 rounded-xl font-bold text-sm cursor-default border border-gray-700/50">
          Module Under Maintenance
        </div>
      </div>
      
    </div>
  );
}