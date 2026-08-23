import React, { useEffect, useState } from 'react';
import { SmsLog, Order } from '../types';
import { MessageSquare, Zap, X, CheckCircle2, PhoneCall, Terminal } from 'lucide-react';

interface SmsNotificationToastProps {
  currentLog: { log: SmsLog; order: Order } | null;
  onClose: () => void;
  onOpenLogsModal: () => void;
}

export const SmsNotificationToast: React.FC<SmsNotificationToastProps> = ({
  currentLog,
  onClose,
  onOpenLogsModal,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (currentLog) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [currentLog]);

  if (!currentLog || !isVisible) return null;

  const { log } = currentLog;

  return (
    <div className="fixed top-20 right-4 z-[9999] max-w-md w-full animate-in fade-in slide-in-from-top-5 duration-300">
      <div className="bg-[#1C1C1F] border border-[#27272A] rounded-xl shadow-2xl p-4 text-[#FAFAFA] relative overflow-hidden">
        {/* Top accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-blue-500 to-indigo-500" />

        {/* Header info */}
        <div className="flex items-center justify-between pb-2 border-b border-[#27272A] mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Zap className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Firebase Cloud Function Trigger
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                  SMS SENT
                </span>
              </div>
              <p className="text-[10px] font-mono text-[#A1A1AA]">
                fn: {log.functionName} • ID: {log.functionExecutionId}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setIsVisible(false);
              onClose();
            }}
            className="p-1 text-[#A1A1AA] hover:text-white rounded-md hover:bg-[#27272A] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* SMS Card Content */}
        <div className="bg-[#09090B] rounded-lg p-3 border border-[#27272A] space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 text-[#A1A1AA] font-mono">
              <PhoneCall className="w-3.5 h-3.5 text-blue-400" />
              To: <strong className="text-white">{log.customerName}</strong> ({log.customerPhone})
            </span>
            <span className="text-[10px] text-emerald-400 font-mono font-semibold">
              {log.smsGateway.split(' ')[0]}
            </span>
          </div>

          <div className="text-xs font-mono text-emerald-300 bg-emerald-950/30 p-2.5 rounded border border-emerald-500/20 flex gap-2">
            <MessageSquare className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">{log.message}</p>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="mt-3 flex items-center justify-between text-xs pt-2">
          <span className="text-[11px] text-[#A1A1AA] flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Customer notified via SMS gateway
          </span>
          <button
            onClick={onOpenLogsModal}
            className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 cursor-pointer hover:underline"
          >
            <Terminal className="w-3.5 h-3.5" /> View Trigger Logs
          </button>
        </div>
      </div>
    </div>
  );
};
