import React from 'react';
import { Home, Check, X, Sparkles, UserCheck } from 'lucide-react';
import { HouseholdInvite } from '../types/household';

interface PendingInviteBannerProps {
  invite: HouseholdInvite | null;
  onAccept: (invite: HouseholdInvite) => void;
  onDismiss: () => void;
  isAccepting?: boolean;
}

export const PendingInviteBanner: React.FC<PendingInviteBannerProps> = ({
  invite,
  onAccept,
  onDismiss,
  isAccepting
}) => {
  if (!invite) return null;

  return (
    <div
      role="alert"
      className="mb-6 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-stone-950 p-4 sm:p-5 rounded-3xl shadow-lg border border-amber-300 animate-in slide-in-from-top-3 duration-300 relative overflow-hidden"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-white/90 text-amber-700 flex items-center justify-center shadow-sm shrink-0">
            <Home className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="text-[11px] font-black uppercase tracking-wider bg-stone-950 text-amber-400 px-2 py-0.5 rounded-full">
                Family Invitation
              </span>
              <span className="text-xs font-semibold text-stone-900">
                Full Shared Access
              </span>
            </div>
            <h4 className="font-extrabold text-base text-stone-950 mt-0.5">
              Join {invite.householdName || 'Household Inventory'}
            </h4>
            <p className="text-xs text-stone-800 font-medium">
              <strong>{invite.invitedByName || invite.invitedByEmail}</strong> has invited you to share and manage your household items together.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={onDismiss}
            className="px-3 py-2 text-xs font-semibold text-stone-800 hover:text-stone-950 hover:bg-black/5 rounded-xl transition-colors"
          >
            Later
          </button>
          <button
            type="button"
            disabled={isAccepting}
            onClick={() => onAccept(invite)}
            className="flex items-center space-x-1.5 px-4 py-2 bg-stone-950 hover:bg-stone-900 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
          >
            <UserCheck className="w-4 h-4 text-amber-400" />
            <span>{isAccepting ? 'Connecting...' : 'Accept & Join Household'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
