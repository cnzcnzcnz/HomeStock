import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { Item } from '../types/inventory';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  item: Item | null;
  onClose: () => void;
  onConfirm: (id: string) => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  item,
  onClose,
  onConfirm
}) => {
  if (!isOpen || !item) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-stone-200">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-100">
          <Trash2 className="w-6 h-6 stroke-[2]" />
        </div>

        <h3 id="delete-dialog-title" className="text-base font-bold text-stone-900 text-center mb-1">
          Delete Item?
        </h3>
        <p className="text-xs text-stone-500 text-center mb-6">
          Are you sure you want to remove <strong className="text-stone-800">{item.itemName}</strong> from your household inventory?
        </p>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-stone-200 text-stone-700 font-semibold text-xs hover:bg-stone-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm(item.id);
              onClose();
            }}
            className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-sm transition-colors"
          >
            Delete Item
          </button>
        </div>
      </div>
    </div>
  );
};
