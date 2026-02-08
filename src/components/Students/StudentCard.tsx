import { Edit2, Phone, Car, MapPin, MessageCircle, Share2, CheckCircle2 } from 'lucide-react';

interface Props {
  stu: any;
  updateBalance: (id: string, newBalance: number) => void;
  openStudentModal: (stu: any) => void;
  onSendInvite: (student: any) => void; // <--- ADDED
}

export function StudentCard({ stu, updateBalance, openStudentModal, onSendInvite }: Props) {
  const isLinked = !!stu.uid;

  const openWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    const cleanPhone = stu.phone.replace(/[^\d+]/g, '');
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  };

  const sendInvite = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSendInvite(stu); // <--- UPDATED: Calls the secure generator
  };

  return (
    <div key={stu.id} className="bg-slate p-5 rounded-xl border border-gray-800 flex flex-col gap-4 transition-all duration-300 hover:border-gray-700 shadow-sm relative overflow-hidden">
      
      {/* Top Section: Profile & Status */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-midnight border border-gray-700 flex items-center justify-center text-orange font-bold text-xl flex-shrink-0">
            {stu.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg text-white">{stu.name}</h3>
              {isLinked ? (
                <span className="flex items-center gap-1 text-[10px] font-black text-statusGreen bg-statusGreen/10 px-2 py-0.5 rounded-full border border-statusGreen/20">
                  <CheckCircle2 size={10} /> LINKED
                </span>
              ) : (
                <span className="text-[10px] font-black text-orange bg-orange/10 px-2 py-0.5 rounded-full border border-orange/20">
                  UNLINKED
                </span>
              )}
            </div>
            
            <div className="text-textGrey text-sm flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
              <div className="flex items-center gap-1.5">
                <Phone size={13} className="text-blue-400" /> 
                <span>{stu.phone}</span>
              </div>
              <span className="flex items-center gap-1.5">
                <Car size={13} className="text-yellow-400" /> {stu.vehicle}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Invite Button */}
        {!isLinked && (
          <button 
            onClick={sendInvite}
            className="flex items-center gap-2 px-3 py-2 bg-statusGreen text-black rounded-lg font-bold text-xs hover:bg-statusGreen/90 transition-all active:scale-95"
          >
            <Share2 size={14} />
            Invite
          </button>
        )}
      </div>

      {/* Bottom Section: Info & Balance */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-800/50">
        <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-xs text-textGrey">
                <MapPin size={14} className="text-orange" /> {stu.examRoute || 'No Route'}
            </span>
            <button 
                onClick={openWhatsApp}
                className="flex items-center gap-1.5 text-xs font-bold text-statusGreen hover:text-statusGreen/80 transition-colors"
            >
                <MessageCircle size={14} /> WhatsApp
            </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-midnight p-1 rounded-lg border border-gray-800">
            <button 
              onClick={() => updateBalance(stu.id, stu.balance - 1)} 
              className="w-7 h-7 rounded bg-slate border border-gray-700 hover:text-red-500 transition-colors"
            > - </button>
            <span className="min-w-[20px] text-center font-bold text-orange">{stu.balance}</span>
            <button 
              onClick={() => updateBalance(stu.id, stu.balance + 1)} 
              className="w-7 h-7 rounded bg-slate border border-gray-700 hover:text-green-500 transition-colors"
            > + </button>
          </div>

          <button 
            onClick={() => openStudentModal(stu)} 
            className="p-2 bg-midnight border border-gray-800 rounded-lg text-textGrey hover:text-orange hover:border-orange transition-all"
          >
            <Edit2 size={16}/>
          </button>
        </div>
      </div>
    </div>
  );
}