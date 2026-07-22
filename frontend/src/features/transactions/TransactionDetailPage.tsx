import { useState, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { TopBar } from '@/components/layout/TopBar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { usePocketStore } from '@/features/pockets/usePocketStore';
import { useCategoryStore } from '@/features/categories/useCategoryStore';
import { useTransactionStore } from '@/features/transactions/useTransactionStore';
import { TransactionConfirmationSheet } from '@/features/transactions/components/TransactionConfirmationSheet';
import { formatRupiah } from '@/lib/currency';
import { INCOME_SOURCE_LABELS, TRANSFER_TYPE_LABELS } from '@/data/constants';

interface TransactionDetailLocationState {
  from?: string;
}

type PendingAction = null | 'archive' | 'restore' | 'delete';

export function TransactionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const archiveTransaction = useTransactionStore((s) => s.archiveTransaction);
  const restoreTransaction = useTransactionStore((s) => s.restoreTransaction);
  const deleteTransaction = useTransactionStore((s) => s.deleteTransaction);
  const getPocketById = usePocketStore((s) => s.getPocketById);
  const getCategoryById = useCategoryStore((s) => s.getCategoryById);

  // Action state
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [showArchiveSheet, setShowArchiveSheet] = useState(false);
  const [showDeleteSheet, setShowDeleteSheet] = useState(false);

  // Load transaction safely reactively
  const transaction = useTransactionStore((state) =>
    id ? state.transactions.find((item) => item.id === id) : undefined
  );

  // Compute safe origin path from location state
  const safeOrigin = useMemo(() => {
    const state = location.state as TransactionDetailLocationState | null;
    const fromPath = state?.from;

    if (
      fromPath &&
      typeof fromPath === 'string' &&
      (fromPath === '/' ||
       fromPath === '/transactions' ||
       fromPath === '/transactions?status=archived' ||
       fromPath.startsWith('/pockets/'))
    ) {
      return fromPath;
    }
    return '/transactions';
  }, [location.state]);

  // Safe back navigation logic
  const handleBack = () => {
    navigate(safeOrigin);
  };

  // Date formatter
  const formattedDate = useMemo(() => {
    if (!transaction) return '';
    try {
      const dateObj = new Date(`${transaction.date}T00:00:00`);
      return new Intl.DateTimeFormat('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(dateObj);
    } catch {
      return transaction.date;
    }
  }, [transaction]);

  // System metadata formatter
  const formatTimestamp = (isoString: string) => {
    try {
      const dateObj = new Date(isoString);
      return new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(dateObj);
    } catch {
      return isoString;
    }
  };

  // Archive handler
  const handleArchiveConfirm = () => {
    if (!transaction || transaction.isArchived || pendingAction) {
      return;
    }
    setPendingAction('archive');
    archiveTransaction(transaction.id);
    setShowArchiveSheet(false);
    setPendingAction(null);
  };

  // Restore handler
  const handleRestore = () => {
    if (!transaction || !transaction.isArchived || pendingAction) {
      return;
    }
    setPendingAction('restore');
    restoreTransaction(transaction.id);
    setPendingAction(null);
  };

  // Delete handler
  const handleDeleteConfirm = () => {
    if (!transaction || !transaction.isArchived || pendingAction) {
      return;
    }
    setPendingAction('delete');
    deleteTransaction(transaction.id);
    setShowDeleteSheet(false);

    // Navigate away — prefer archived history
    const deleteDestination = '/transactions?status=archived';

    navigate(deleteDestination, { replace: true });
  };

  // Transaction not found view
  if (!transaction) {
    return (
      <>
        <TopBar title="Transaksi tidak ditemukan" showBack onBack={() => navigate('/transactions')} />
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-safe text-center px-6 bg-background">
          <span className="text-5xl mb-4" role="img" aria-label="Not found">🔎</span>
          <h2 className="font-display text-headline-md text-text-primary mb-2">
            Transaksi tidak ditemukan.
          </h2>
          <p className="text-body-sm text-text-secondary max-w-[280px] mb-6">
            Transaksi mungkin telah dihapus atau alamat yang dibuka tidak valid.
          </p>
          <Button onClick={() => navigate('/transactions')} variant="primary" size="md">
            Kembali ke Riwayat
          </Button>
        </div>
      </>
    );
  }

  // Resolve metadata properties
  const pocket = transaction.pocketId ? getPocketById(transaction.pocketId) : undefined;
  const fromPocket = transaction.fromPocketId ? getPocketById(transaction.fromPocketId) : undefined;
  const toPocket = transaction.toPocketId ? getPocketById(transaction.toPocketId) : undefined;

  let title = 'Detail Transaksi';
  let heroAmount = '';
  let amountColor = '';
  let typeLabel = '';
  let typeIcon = '';
  let typeIconColor = '';

  if (transaction.type === 'expense') {
    title = 'Detail Pengeluaran';
    heroAmount = `-${formatRupiah(transaction.amount)}`;
    amountColor = 'text-bahaya';
    typeLabel = 'Pengeluaran';
    typeIcon = 'remove_circle';
    typeIconColor = 'text-bahaya';
  } else if (transaction.type === 'income') {
    title = 'Detail Pemasukan';
    heroAmount = `+${formatRupiah(transaction.amount)}`;
    amountColor = 'text-aman';
    typeLabel = 'Pemasukan';
    typeIcon = 'add_circle';
    typeIconColor = 'text-aman';
  } else if (transaction.type === 'transfer') {
    title = transaction.transferType === 'budget-reallocation' ? 'Detail Pindah Alokasi' : 'Detail Transfer';
    heroAmount = formatRupiah(transaction.amount);
    amountColor = 'text-text-primary';
    typeLabel = transaction.transferType ? (TRANSFER_TYPE_LABELS[transaction.transferType] || 'Transfer') : 'Transfer';
    typeIcon = transaction.transferType === 'budget-reallocation' ? 'published_with_changes' : 'swap_horiz';
    typeIconColor = 'text-primary';
  }

  // Transaction summary for confirmation sheets
  const txnSummaryPocket =
    transaction.type === 'transfer'
      ? `${fromPocket?.name || '?'} → ${toPocket?.name || '?'}`
      : pocket?.name || 'Pocket tidak tersedia';

  return (
    <>
      <TopBar title={title} showBack onBack={handleBack} />

      <div className="flex flex-col gap-5 px-safe py-4 bg-background min-h-[calc(100vh-3.5rem)] pb-12">
        {/* Hero Amount Card */}
        <Card variant="flat" className="flex flex-col items-center py-6 gap-2">
          {transaction.isArchived && (
            <Badge variant="neutral" className="mb-1">
              Diarsipkan
            </Badge>
          )}
          <span className={`font-display text-amount-lg font-bold leading-none ${amountColor}`}>
            {heroAmount}
          </span>
          <div className="flex items-center gap-1.5 mt-1 text-xs text-text-secondary">
            <span className={`material-symbols-rounded text-base ${typeIconColor}`}>{typeIcon}</span>
            <span className="font-semibold">{typeLabel}</span>
          </div>
        </Card>

        {/* Main Details Card */}
        <Card variant="flat" className="flex flex-col gap-3">
          {transaction.type === 'expense' && (
            <>
              <div className="flex justify-between items-center py-1">
                <span className="text-body-sm text-text-secondary">Kategori</span>
                <span className="font-display text-body-sm font-bold text-text-primary">
                  {(() => {
                    const cat = transaction.categoryId ? getCategoryById(transaction.categoryId) : undefined;
                    return cat ? `${cat.emoji} ${cat.name}` : 'Tanpa kategori';
                  })()}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-t border-border/40">
                <span className="text-body-sm text-text-secondary">Pocket Pembayaran</span>
                <span className="font-display text-body-sm font-bold text-text-primary">
                  {pocket ? `${pocket.emoji} ${pocket.name}` : 'Pocket tidak tersedia'}
                </span>
              </div>
              {transaction.budgetPocketId && transaction.budgetPocketId !== transaction.pocketId && (
                <div className="flex justify-between items-center py-1 border-t border-border/40">
                  <span className="text-body-sm text-text-secondary">Diambil dari Budget</span>
                  <span className="font-display text-body-sm font-bold text-primary">
                    {(() => {
                      const budgetP = getPocketById(transaction.budgetPocketId);
                      return budgetP ? `${budgetP.emoji} ${budgetP.name}` : 'Pocket tidak tersedia';
                    })()}
                  </span>
                </div>
              )}
            </>
          )}

          {transaction.type === 'income' && (
            <>
              <div className="flex justify-between items-center py-1">
                <span className="text-body-sm text-text-secondary">Sumber Pemasukan</span>
                <span className="font-display text-body-sm font-bold text-text-primary">
                  {transaction.incomeSource ? (INCOME_SOURCE_LABELS[transaction.incomeSource] || 'Pemasukan') : 'Pemasukan'}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-t border-border/40">
                <span className="text-body-sm text-text-secondary">Masuk ke Pocket</span>
                <span className="font-display text-body-sm font-bold text-text-primary">
                  {pocket ? `${pocket.emoji} ${pocket.name}` : 'Pocket tidak tersedia'}
                </span>
              </div>
            </>
          )}

          {transaction.type === 'transfer' && (
            <>
              <div className="flex justify-between items-center py-1">
                <span className="text-body-sm text-text-secondary">Jenis Transfer</span>
                <span className="font-display text-body-sm font-bold text-text-primary">
                  {transaction.transferType ? (TRANSFER_TYPE_LABELS[transaction.transferType] || 'Transfer') : 'Transfer'}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-t border-border/40">
                <span className="text-body-sm text-text-secondary">Dari Pocket (Sumber)</span>
                <span className="font-display text-body-sm font-bold text-text-primary">
                  {fromPocket ? `${fromPocket.emoji} ${fromPocket.name}` : 'Pocket tidak tersedia'}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-t border-border/40">
                <span className="text-body-sm text-text-secondary">Ke Pocket (Tujuan)</span>
                <span className="font-display text-body-sm font-bold text-text-primary">
                  {toPocket ? `${toPocket.emoji} ${toPocket.name}` : 'Pocket tidak tersedia'}
                </span>
              </div>
              {transaction.transferType === 'budget-reallocation' && (
                <div className="mt-1 p-2.5 bg-primary-soft/30 rounded-lg border border-primary/20 text-xs text-text-secondary">
                  Saldo dan alokasi budget periode aktif dipindahkan. Transaksi ini bukan pengeluaran.
                </div>
              )}
            </>
          )}

          <div className="flex justify-between items-center py-1 border-t border-border/40">
            <span className="text-body-sm text-text-secondary">Tanggal</span>
            <span className="font-body text-body-sm font-semibold text-text-primary">
              {formattedDate}
            </span>
          </div>

          <div className="flex justify-between items-center py-1 border-t border-border/40">
            <span className="text-body-sm text-text-secondary">Waktu</span>
            <span className="font-body text-body-sm font-semibold text-text-primary">
              {transaction.time}
            </span>
          </div>
        </Card>

        {/* Transfer Balance Impact Section */}
        {transaction.type === 'transfer' && fromPocket && toPocket && (
          <div className="flex flex-col gap-2">
            <span className="text-label-caps text-text-secondary font-bold px-1">
              Dampak Perpindahan Saldo
            </span>
            <Card variant="flat" className="flex flex-col gap-2.5 p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-secondary font-semibold">
                  {fromPocket.emoji} {fromPocket.name} (Sumber)
                </span>
                <span className="font-display font-bold text-bahaya">
                  -{formatRupiah(transaction.amount)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs border-t border-border/30 pt-2">
                <span className="text-text-secondary font-semibold">
                  {toPocket.emoji} {toPocket.name} (Tujuan)
                </span>
                <span className="font-display font-bold text-aman">
                  +{formatRupiah(transaction.amount)}
                </span>
              </div>
            </Card>
          </div>
        )}

        {/* Note Section (only if note is present and not empty) */}
        {transaction.note && transaction.note.trim() !== '' && (
          <div className="flex flex-col gap-2">
            <span className="text-label-caps text-text-secondary font-bold px-1">
              Catatan
            </span>
            <Card variant="flat" className="p-3 text-body-sm text-text-primary font-body whitespace-pre-wrap break-words">
              {transaction.note}
            </Card>
          </div>
        )}

        {/* System Metadata Card */}
        <div className="flex flex-col gap-2">
          <span className="text-label-caps text-text-secondary font-bold px-1">
            Informasi Sistem
          </span>
          <Card variant="flat" className="flex flex-col gap-2 text-[11px] text-text-muted">
            <div className="flex justify-between items-center">
              <span>ID Transaksi</span>
              <span className="font-mono font-semibold select-all text-text-secondary">{transaction.id}</span>
            </div>
            <div className="flex justify-between items-center border-t border-border/40 pt-2 mt-1">
              <span>Dibuat</span>
              <span className="font-semibold text-text-secondary">{formatTimestamp(transaction.createdAt)}</span>
            </div>
            <div className="flex justify-between items-center border-t border-border/40 pt-2 mt-1">
              <span>Terakhir diperbarui</span>
              <span className="font-semibold text-text-secondary">{formatTimestamp(transaction.updatedAt)}</span>
            </div>
          </Card>
        </div>

        {/* Active transaction actions: Edit + Archive */}
        {!transaction.isArchived && (
          <div className="flex flex-col gap-3 pt-2">
            <Button
              onClick={() => {
                const currentState = location.state as { from?: string } | null;
                const originalReturnTo =
                  currentState?.from === '/' ||
                  currentState?.from === '/transactions' ||
                  currentState?.from?.startsWith('/pockets/')
                    ? currentState.from
                    : '/transactions';

                navigate(`/transactions/${transaction.id}/edit`, {
                  state: {
                    from: location.pathname,
                    returnTo: originalReturnTo,
                  },
                });
              }}
              variant="secondary"
              size="lg"
              fullWidth
              icon={<span className="material-symbols-rounded text-xl">edit</span>}
            >
              Edit Transaksi
            </Button>

            <Button
              onClick={() => setShowArchiveSheet(true)}
              variant="secondary"
              size="lg"
              fullWidth
              disabled={pendingAction !== null}
              className="border-bahaya/30 text-bahaya hover:bg-bahaya-soft/20"
              icon={<span className="material-symbols-rounded text-xl">archive</span>}
            >
              Arsipkan Transaksi
            </Button>
          </div>
        )}

        {/* Archived transaction actions: Restore + Delete Permanently */}
        {transaction.isArchived && (
          <div className="flex flex-col gap-3 pt-2">
            <Button
              onClick={handleRestore}
              variant="primary"
              size="lg"
              fullWidth
              disabled={pendingAction !== null}
              loading={pendingAction === 'restore'}
              icon={<span className="material-symbols-rounded text-xl">unarchive</span>}
            >
              Pulihkan Transaksi
            </Button>

            <Button
              onClick={() => setShowDeleteSheet(true)}
              variant="secondary"
              size="lg"
              fullWidth
              disabled={pendingAction !== null}
              className="border-bahaya/30 text-bahaya hover:bg-bahaya-soft/20"
              icon={<span className="material-symbols-rounded text-xl">delete_forever</span>}
            >
              Hapus Permanen
            </Button>
          </div>
        )}
      </div>

      {/* Archive Confirmation Sheet */}
      <TransactionConfirmationSheet
        isOpen={showArchiveSheet}
        title="Arsipkan transaksi?"
        description="Transaksi akan dihapus dari riwayat aktif dan dampaknya pada saldo akan dibatalkan. Transaksi masih dapat dipulihkan."
        confirmLabel="Arsipkan Transaksi"
        confirmVariant="danger"
        isProcessing={pendingAction === 'archive'}
        onConfirm={handleArchiveConfirm}
        onClose={() => setShowArchiveSheet(false)}
      >
        <div className="flex flex-col gap-1.5 text-body-sm">
          <div className="flex justify-between items-center">
            <span className="text-text-secondary">Tipe</span>
            <span className="font-semibold text-text-primary">{typeLabel}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-text-secondary">Nominal</span>
            <span className={`font-display font-bold ${amountColor}`}>{heroAmount}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-text-secondary">Pocket</span>
            <span className="font-semibold text-text-primary">{txnSummaryPocket}</span>
          </div>
        </div>
      </TransactionConfirmationSheet>

      {/* Delete Confirmation Sheet */}
      <TransactionConfirmationSheet
        isOpen={showDeleteSheet}
        title="Hapus transaksi secara permanen?"
        description="Transaksi akan dihapus selamanya dan tidak dapat dipulihkan. Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Hapus Permanen"
        confirmVariant="danger"
        isProcessing={pendingAction === 'delete'}
        onConfirm={handleDeleteConfirm}
        onClose={() => setShowDeleteSheet(false)}
      >
        <div className="flex flex-col gap-1.5 text-body-sm">
          <div className="flex justify-between items-center">
            <span className="text-text-secondary">Tipe</span>
            <span className="font-semibold text-text-primary">{typeLabel}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-text-secondary">Nominal</span>
            <span className={`font-display font-bold ${amountColor}`}>{heroAmount}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-text-secondary">Tanggal</span>
            <span className="font-semibold text-text-primary">{transaction.date}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-text-secondary">Pocket</span>
            <span className="font-semibold text-text-primary">{txnSummaryPocket}</span>
          </div>
        </div>
      </TransactionConfirmationSheet>
    </>
  );
}
