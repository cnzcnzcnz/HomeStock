import React, { useState } from 'react';
import {
  X,
  Users,
  UserPlus,
  Mail,
  ShieldCheck,
  Check,
  Copy,
  Sparkles,
  AlertCircle,
  Home,
  Loader2,
  LogIn
} from 'lucide-react';
import { User } from 'firebase/auth';
import { Household, HouseholdInvite } from '../types/household';
import { inviteFamilyMemberByEmail } from '../lib/firebase';

interface HouseholdModalProps {
  isOpen: boolean;
  onClose: () => void;
  household: Household | null;
  currentUser: User | null;
  onInviteSuccess: (invite: HouseholdInvite) => void;
  onLoginRequest?: () => void;
}

export const HouseholdModal: React.FC<HouseholdModalProps> = ({
  isOpen,
  onClose,
  household,
  currentUser,
  onInviteSuccess,
  onLoginRequest
}) => {
  const [emailInput, setEmailInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  if (!isOpen) return null;

  // If not signed in yet, render helpful sign-in prompt modal
  if (!currentUser) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="household-signin-title"
        className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      >
        <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 relative text-center">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-600 flex items-center justify-center font-bold mx-auto mb-4">
            <Users className="w-6 h-6" />
          </div>
          <h3 id="household-signin-title" className="text-lg font-black text-stone-900 tracking-tight mb-2">
            Sign In with Google Required
          </h3>
          <p className="text-xs text-stone-600 mb-6 leading-relaxed">
            To share stock levels in real time with family members, invite family emails, and sync across devices, please sign in with your Google account.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors"
            >
              Cancel
            </button>
            {onLoginRequest && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onLoginRequest();
                }}
                className="flex items-center justify-center space-x-1.5 px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95"
              >
                <LogIn className="w-4 h-4 text-amber-400" />
                <span>Sign in with Google</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // If currentUser is present but household is still initializing
  if (!household) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="household-loading-title"
        className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      >
        <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 relative text-center">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-600 flex items-center justify-center font-bold mx-auto mb-4">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
          <h3 id="household-loading-title" className="text-lg font-black text-stone-900 tracking-tight mb-2">
            Loading Family Household...
          </h3>
          <p className="text-xs text-stone-600 mb-6 leading-relaxed">
            Synchronizing your shared family inventory and member settings with Google Cloud.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const isOwner = household.ownerUid === currentUser.uid;

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = emailInput.trim().toLowerCase();
    setErrorMsg('');
    setSuccessMsg('');

    if (!clean || !clean.includes('@') || !clean.includes('.')) {
      setErrorMsg('Please enter a valid Google email address.');
      return;
    }

    if (clean === (currentUser.email || '').toLowerCase()) {
      setErrorMsg('You cannot invite yourself to your own household.');
      return;
    }

    if (household.memberEmails?.map(e => e.toLowerCase()).includes(clean)) {
      setErrorMsg('This family member is already part of this household.');
      return;
    }

    setIsSubmitting(true);
    try {
      const invite = await inviteFamilyMemberByEmail(household, clean, currentUser);
      setSuccessMsg(`Invitation sent to ${clean}! When she logs in with Google, she will see the banner to accept.`);
      setEmailInput('');
      onInviteSuccess(invite);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to send invite.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCode = () => {
    if (household.inviteCode) {
      navigator.clipboard.writeText(household.inviteCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="household-modal-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-100 mb-5">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center font-bold">
              <Home className="w-5 h-5" />
            </div>
            <div>
              <h3 id="household-modal-title" className="text-lg font-black text-stone-900 tracking-tight">
                {household.name}
              </h3>
              <p className="text-xs text-stone-500">
                Shared household pantry • Full access for all members
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Members Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center">
              <Users className="w-3.5 h-3.5 mr-1.5 text-stone-500" />
              Family Members ({household.members?.length || 1})
            </span>
            <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Live Real-Time Sync
            </span>
          </div>

          <div className="space-y-2 bg-stone-50 p-3 rounded-2xl border border-stone-200/80">
            {household.members?.map((member) => (
              <div
                key={member.uid}
                className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-stone-200 shadow-2xs"
              >
                <div className="flex items-center space-x-2.5">
                  {member.photoURL ? (
                    <img
                      src={member.photoURL}
                      alt={member.displayName}
                      className="w-8 h-8 rounded-full object-cover border border-stone-200"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-amber-600 text-white font-bold text-xs flex items-center justify-center">
                      {member.displayName ? member.displayName[0].toUpperCase() : 'F'}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <span className="text-xs font-bold text-stone-900">
                        {member.displayName}
                      </span>
                      {member.uid === currentUser.uid && (
                        <span className="text-[10px] text-stone-400 font-medium">(You)</span>
                      )}
                    </div>
                    <span className="text-[11px] text-stone-500 block truncate max-w-[200px]">
                      {member.email}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      member.role === 'owner'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-stone-100 text-stone-700 border border-stone-200'
                    }`}
                  >
                    {member.role === 'owner' ? 'Owner' : 'Family Member'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Invite by Email Form */}
        <div className="mb-6">
          <label htmlFor="familyEmailInput" className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5 flex items-center">
            <UserPlus className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
            Invite Family by Google Email
          </label>
          <p className="text-xs text-stone-500 mb-2.5">
            Add your family member&apos;s email. When she signs in with her Google account, she will automatically see the invitation banner and gain full edit access to the pantry.
          </p>

          <form onSubmit={handleSendInvite} className="flex gap-2">
            <div className="relative flex-1">
              <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="familyEmailInput"
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="e.g. wife@gmail.com, family@gmail.com"
                className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting || !emailInput.trim()}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 active:scale-95 disabled:opacity-50 text-stone-950 font-bold text-xs rounded-xl transition-all shadow-sm shrink-0 flex items-center space-x-1"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Sending...' : 'Send Invite'}</span>
            </button>
          </form>

          {errorMsg && (
            <div className="mt-2 text-xs text-rose-600 bg-rose-50 border border-rose-200 p-2 rounded-xl flex items-center space-x-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mt-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl flex items-center space-x-1.5">
              <Check className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}
        </div>

        {/* Shareable Household Code Alternative */}
        <div className="pt-4 border-t border-stone-100 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-stone-600 block">
              Household Share Code:
            </span>
            <span className="font-mono font-black text-sm tracking-widest text-stone-900">
              {household.inviteCode || 'N/A'}
            </span>
          </div>

          <button
            type="button"
            onClick={handleCopyCode}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors"
          >
            {copiedCode ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-stone-500" />
                <span>Copy Code</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
