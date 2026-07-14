import { useState, useMemo } from 'react';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Card } from '@/components/ui/Card';
import { formatRupiah } from '@/lib/currency';
import { getPocketEffectiveBalance } from '@/lib/balanceCalculations';
import { POCKET_GROUPS } from '@/data/constants';
import type { Pocket } from '@/types/pocket';
import type { Transaction } from '@/types/transaction';

interface PocketPickerFieldProps {
  label: string;
  title?: string;
  placeholder?: string;
  pockets: Pocket[];
  transactions: Transaction[];
  selectedPocketId: string;
  onSelect: (pocketId: string) => void;
  excludedPocketIds?: string[];
  disabled?: boolean;
  helperText?: string;
}

export function PocketPickerField({
  label,
  title = 'Pilih Pocket',
  placeholder = 'Pilih pocket',
  pockets,
  transactions,
  selectedPocketId,
  onSelect,
  excludedPocketIds = [],
  disabled = false,
  helperText,
}: PocketPickerFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Find the selected pocket object
  const selectedPocket = useMemo(() => {
    return pockets.find((p) => p.id === selectedPocketId && p.isActive && !p.isArchived);
  }, [pockets, selectedPocketId]);

  // Compute selected pocket effective balance
  const selectedPocketBalance = useMemo(() => {
    if (!selectedPocket) return 0;
    return getPocketEffectiveBalance(selectedPocket, transactions);
  }, [selectedPocket, transactions]);

  // Filter pockets based on exclusions and search query
  const filteredPockets = useMemo(() => {
    return pockets.filter((p) => {
      // 1. Must be active and not archived
      if (!p.isActive || p.isArchived) return false;
      // 2. Must not be excluded
      if (excludedPocketIds.includes(p.id)) return false;
      // 3. Must match search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        return p.name.toLowerCase().includes(query);
      }
      return true;
    });
  }, [pockets, excludedPocketIds, searchQuery]);

  // Handle pocket selection
  const handleSelect = (pocketId: string) => {
    onSelect(pocketId);
    setSearchQuery('');
    setIsOpen(false);
  };

  // Close sheet reset search query
  const handleClose = () => {
    setSearchQuery('');
    setIsOpen(false);
  };

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {/* Label */}
      <div className="flex items-center justify-between px-1">
        <span className="text-label-caps text-text-secondary font-bold tracking-wider">
          {label}
        </span>
        {helperText && (
          <span className="text-[10px] text-text-muted italic">{helperText}</span>
        )}
      </div>

      {/* Interactive Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(true)}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className={`w-full text-left flex items-center justify-between p-3 border rounded-card transition-all focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary ${
          disabled
            ? 'bg-surface-container/50 border-border/30 opacity-60 cursor-not-allowed'
            : selectedPocket
            ? 'bg-surface-container border-border/40 hover:border-primary/30 active:scale-[0.99]'
            : 'bg-surface-container border-border/40 text-text-muted hover:border-primary/30 active:scale-[0.99]'
        }`}
      >
        {selectedPocket ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-pocket bg-surface-container-high text-xl">
              {selectedPocket.emoji}
            </div>
            <div>
              <div className="font-display text-body-lg font-bold text-text-primary">
                {selectedPocket.name}
              </div>
              <div className="text-[11px] text-text-muted">
                Saldo: {formatRupiah(selectedPocketBalance)}
              </div>
            </div>
          </div>
        ) : (
          <span className="text-body-sm font-body text-text-disabled pl-1">
            {placeholder}
          </span>
        )}
        <span className="material-symbols-rounded text-text-muted text-xl flex-shrink-0 ml-2">
          chevron_right
        </span>
      </button>

      {/* Reusable Bottom Sheet */}
      <BottomSheet isOpen={isOpen} onClose={handleClose} title={title}>
        <div className="flex flex-col gap-4 max-h-[65dvh]">
          {/* Search Input Field */}
          <div className="relative px-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-rounded text-text-muted text-lg">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama pocket..."
              className="w-full h-10 pl-9 pr-4 rounded-card border border-border/40 bg-surface-container text-text-primary text-body-sm font-body focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-text-disabled"
            />
          </div>

          {/* Grouped Options List with Internal Scroll */}
          <div className="flex-1 overflow-y-auto px-1 pb-4 flex flex-col gap-4">
            {filteredPockets.length > 0 ? (
              POCKET_GROUPS.map((group) => {
                const groupPockets = filteredPockets.filter((p) => p.groupId === group.id);
                if (groupPockets.length === 0) return null;

                return (
                  <div key={group.id} className="flex flex-col gap-2">
                    <h4 className="text-[10px] font-bold text-text-muted tracking-wider uppercase px-1">
                      {group.label}
                    </h4>
                    <div className="flex flex-col gap-2">
                      {groupPockets.map((p) => {
                        const isSelected = p.id === selectedPocketId;
                        const balance = getPocketEffectiveBalance(p, transactions);

                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handleSelect(p.id)}
                            className={`flex items-center gap-3 p-3 rounded-card border transition-all text-left ${
                              isSelected
                                ? 'border-primary bg-primary-soft/30'
                                : 'border-border/20 bg-surface-container/60 hover:border-primary/20'
                            }`}
                          >
                            <div className="flex items-center justify-center w-10 h-10 rounded-pocket bg-surface-container-high text-xl flex-shrink-0">
                              {p.emoji}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-display text-body-lg font-bold text-text-primary truncate">
                                {p.name}
                              </div>
                              <div className="text-[11px] text-text-muted">
                                Saldo: {formatRupiah(balance)}
                              </div>
                            </div>
                            {isSelected && (
                              <span className="material-symbols-rounded text-primary text-xl flex-shrink-0">
                                check_circle
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            ) : (
              <Card variant="flat" className="py-6 text-center text-text-muted text-body-sm">
                {pockets.filter(p => p.isActive && !p.isArchived && !excludedPocketIds.includes(p.id)).length === 0
                  ? 'Tidak ada pocket tujuan yang tersedia.'
                  : 'Pocket tidak ditemukan.'}
              </Card>
            )}
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
