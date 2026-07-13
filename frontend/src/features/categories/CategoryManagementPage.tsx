import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { TopBar } from '@/components/layout/TopBar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { usePocketStore } from '@/features/pockets/usePocketStore';
import { useCategoryStore } from '@/features/categories/useCategoryStore';

export function CategoryManagementPage() {
  const { id: pocketId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const getPocketById = usePocketStore((s) => s.getPocketById);
  const pocket = useMemo(() => (pocketId ? getPocketById(pocketId) : undefined), [pocketId, getPocketById]);

  // Store actions & selectors
  const getCategoriesByPocketId = useCategoryStore((s) => s.getCategoriesByPocketId);
  const addCategory = useCategoryStore((s) => s.addCategory);
  const updateCategory = useCategoryStore((s) => s.updateCategory);
  const archiveCategory = useCategoryStore((s) => s.archiveCategory);

  const activeCategories = useMemo(() => {
    return pocketId ? getCategoriesByPocketId(pocketId) : [];
  }, [pocketId, getCategoriesByPocketId]);

  // Form states for adding category
  const [newName, setNewName] = useState('');
  const [newEmoji, setNewEmoji] = useState('🏷️');
  const [addError, setAddError] = useState('');

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmoji, setEditEmoji] = useState('');
  const [editError, setEditError] = useState('');

  // If pocket does not exist, show friendly not-found view
  if (!pocket || !pocket.isActive || pocket.isArchived) {
    return (
      <AppShell showBottomNav={false}>
        <TopBar title="Pocket tidak ditemukan" showBack onBack={() => navigate('/pockets')} />
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-safe text-center px-6 bg-background">
          <span className="text-5xl mb-4" role="img" aria-label="Not found">🔎</span>
          <h2 className="font-display text-headline-md text-text-primary mb-2">
            Pocket tidak ditemukan
          </h2>
          <p className="text-body-sm text-text-secondary max-w-[280px] mb-6">
            Pocket ini belum aktif atau tidak tersedia.
          </p>
          <Button onClick={() => navigate('/pockets')} variant="primary" size="md">
            Kembali ke Pocket Saya
          </Button>
        </div>
      </AppShell>
    );
  }

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');

    const trimmedName = newName.trim();
    if (!trimmedName) {
      setAddError('Nama kategori tidak boleh kosong.');
      return;
    }

    const isDuplicate = activeCategories.some(
      (c) => c.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (isDuplicate) {
      setAddError('Nama kategori sudah digunakan di pocket ini.');
      return;
    }

    addCategory(pocket.id, trimmedName, newEmoji || '🏷️');
    setNewName('');
    setNewEmoji('🏷️');
  };

  const startEdit = (catId: string, name: string, emoji: string) => {
    setEditingId(catId);
    setEditName(name);
    setEditEmoji(emoji);
    setEditError('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditEmoji('');
    setEditError('');
  };

  const handleEditSave = (catId: string) => {
    setEditError('');
    const trimmedName = editName.trim();
    if (!trimmedName) {
      setEditError('Nama kategori tidak boleh kosong.');
      return;
    }

    const isDuplicate = activeCategories.some(
      (c) => c.id !== catId && c.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (isDuplicate) {
      setEditError('Nama kategori sudah digunakan di pocket ini.');
      return;
    }

    updateCategory(catId, {
      name: trimmedName,
      emoji: editEmoji || '🏷️',
    });
    setEditingId(null);
  };

  const handleArchive = (catId: string, catName: string) => {
    const confirmed = window.confirm(`Arsipkan kategori "${catName}"?`);
    if (confirmed) {
      archiveCategory(catId);
    }
  };

  return (
    <AppShell showBottomNav={false}>
      <TopBar
        title="Kelola Kategori"
        showBack
        onBack={() => navigate(`/pockets/${pocket.id}`)}
      />

      <div className="flex flex-col gap-6 px-safe py-4 bg-background min-h-[calc(100vh-3.5rem)]">
        {/* Subtitle & Pocket Header Info */}
        <div className="px-1">
          <div className="flex items-center gap-2">
            <span className="text-xl">{pocket.emoji}</span>
            <span className="font-display font-bold text-text-primary text-body-lg">
              {pocket.name}
            </span>
          </div>
          <p className="text-body-sm text-text-secondary mt-1">
            Atur kategori untuk pocket ini.
          </p>
        </div>

        {/* Add Category Card */}
        <Card variant="flat" className="flex flex-col gap-4">
          <h3 className="font-display text-body-lg font-bold text-text-primary">
            Tambah Kategori Baru
          </h3>
          <form onSubmit={handleAddSubmit} className="flex flex-col gap-3">
            <div className="grid grid-cols-4 gap-2">
              <div className="col-span-1">
                <label className="text-[11px] font-bold text-text-secondary block mb-1">
                  Emoji
                </label>
                <Input
                  type="text"
                  maxLength={4}
                  value={newEmoji}
                  onChange={(e) => setNewEmoji(e.target.value)}
                  className="text-center font-semibold text-lg"
                  placeholder="🏷️"
                />
              </div>
              <div className="col-span-3">
                <label className="text-[11px] font-bold text-text-secondary block mb-1">
                  Nama Kategori
                </label>
                <Input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Contoh: Sayuran"
                  className="font-semibold"
                />
              </div>
            </div>

            {addError && (
              <p className="text-xs font-semibold text-error px-1">
                {addError}
              </p>
            )}

            <Button type="submit" variant="primary" size="md" className="mt-1">
              Tambah Kategori
            </Button>
          </form>
        </Card>

        {/* Categories List Section */}
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center px-1">
            <span className="text-label-caps text-text-secondary font-bold">
              Kategori Aktif ({activeCategories.length})
            </span>
          </div>

          {activeCategories.length === 0 ? (
            <Card variant="flat" className="py-12 text-center text-text-muted text-body-sm">
              Belum ada kategori di pocket ini.
            </Card>
          ) : (
            <div className="flex flex-col gap-3">
              {activeCategories.map((cat) => {
                const isEditing = editingId === cat.id;

                return (
                  <Card key={cat.id} variant="flat" className="p-3 border border-border/40">
                    {isEditing ? (
                      // Edit Mode view
                      <div className="flex flex-col gap-3">
                        <div className="grid grid-cols-4 gap-2">
                          <div className="col-span-1">
                            <Input
                              type="text"
                              maxLength={4}
                              value={editEmoji}
                              onChange={(e) => setEditEmoji(e.target.value)}
                              className="text-center font-semibold text-lg"
                            />
                          </div>
                          <div className="col-span-3">
                            <Input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="font-semibold"
                            />
                          </div>
                        </div>

                        {editError && (
                          <p className="text-xs font-semibold text-error px-1">
                            {editError}
                          </p>
                        )}

                        <div className="flex gap-2 justify-end">
                          <Button onClick={cancelEdit} variant="ghost" size="sm">
                            Batal
                          </Button>
                          <Button onClick={() => handleEditSave(cat.id)} variant="primary" size="sm">
                            Simpan
                          </Button>
                        </div>
                      </div>
                    ) : (
                      // Read/Active mode view
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-10 h-10 rounded-card bg-surface-container-high text-xl">
                            {cat.emoji}
                          </div>
                          <div>
                            <span className="font-semibold text-text-primary text-body-sm block">
                              {cat.name}
                            </span>
                            <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider">
                              {cat.isDefault ? 'Sistem' : 'Kustom'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => startEdit(cat.id, cat.name, cat.emoji)}
                            className="flex items-center justify-center h-8 px-2.5 rounded-pill text-xs font-bold text-primary hover:bg-primary-soft/30 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleArchive(cat.id, cat.name)}
                            className="flex items-center justify-center h-8 px-2.5 rounded-pill text-xs font-bold text-error hover:bg-error-container/30 transition-colors"
                          >
                            Arsipkan
                          </button>
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
