import React, { useState } from 'react';
import { FileText } from 'lucide-react';
import { Role } from '@/app/chat/page';

interface EstimateData {
  title?: string;
  repairType: string;
  partType: string;
  materialCost: string;
  laborCost: string;
  totalCost: string;
}

export default function EstimateCard({ data, role }: { data: EstimateData; role: Role }) {
  const [accepted, setAccepted] = useState(false);
  const isExpert = role === 'expert';
  const title = data.title || (isExpert ? 'Devis Réel' : 'Devis Estimatif');

  return (
    <div className="w-64 sm:w-72 mt-1 fade-in">
      <div className={`border rounded-xl p-4 shadow-sm ${isExpert ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200'}`}>
        <div className={`flex justify-between items-center border-b pb-3 mb-3 ${isExpert ? 'border-gray-700' : 'border-gray-200'}`}>
          <h4 className={`font-bold text-base flex items-center gap-2 ${isExpert ? 'text-white' : 'text-primary'}`}>
            <FileText className="w-5 h-5 text-accent" />
            {title}
          </h4>
          <span className={`text-[10px] px-2 py-1 rounded font-mono ${isExpert ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-500'}`}>
            #DEV-{Math.floor(Math.random()*9000)+1000}
          </span>
        </div>
        <div className="space-y-2.5 mb-5 text-sm">
          <div className="flex justify-between items-center">
            <span className={isExpert ? 'text-gray-400' : 'text-gray-600'}>Type de réparation</span>
            <span className={`font-semibold text-right ${isExpert ? 'text-white' : 'text-gray-800'}`}>{data.repairType}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className={isExpert ? 'text-gray-400' : 'text-gray-600'}>{data.partType}</span>
            <span className={`font-semibold ${isExpert ? 'text-white' : 'text-gray-800'}`}>{data.materialCost}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className={isExpert ? 'text-gray-400' : 'text-gray-600'}>Main d'œuvre (1h)</span>
            <span className={`font-semibold ${isExpert ? 'text-white' : 'text-gray-800'}`}>{data.laborCost}</span>
          </div>
        </div>
        <div className={`flex justify-between items-center border-t pt-3 font-bold text-lg mb-4 -mx-4 px-4 pb-2 ${isExpert ? 'border-gray-700 text-white' : 'border-gray-200 text-primary bg-gray-50/50'}`}>
          <span>Total TTC</span>
          <span className="text-accent">{data.totalCost}</span>
        </div>
        <button 
          onClick={() => setAccepted(true)}
          className={`w-full py-2.5 rounded-xl transition text-sm font-bold shadow-sm ${
            accepted 
              ? 'bg-green-600 text-white border-transparent' 
              : isExpert 
                ? 'bg-accent text-white border-accent hover:bg-accentHover' 
                : 'bg-white text-primary border-2 border-primary hover:bg-blue-50'
          }`}
        >
          {accepted ? 'Devis accepté ✓' : 'Accepter le devis'}
        </button>
      </div>
    </div>
  );
}
