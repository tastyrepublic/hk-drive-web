import { ChevronRight } from 'lucide-react';

interface Props {
  balance: number;
  cardColor: string;
}

export function PackagesView({ balance, cardColor }: Props) {
  const packages = [
    { title: "Single Lesson", price: "$280" },
    { title: "Standard Package (10)", price: "$2,800" },
    { title: "Exam Route Prep", price: "$1,600" }
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold">Lesson Packages</h2>
        <p className="text-xs opacity-60">Current Balance: {balance} Credits</p>
      </div>
      <div className="space-y-3">
        {packages.map((pkg, i) => (
          <div key={i} className={`p-4 rounded-2xl border flex items-center justify-between ${cardColor}`}>
            <p className="font-bold text-sm">{pkg.title}</p>
            <button className="bg-primary text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1">
              {pkg.price} <ChevronRight size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}