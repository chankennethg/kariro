'use client';

import { useState } from 'react';
import type { Tag } from '@kariro/shared';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

const COLOR_PRESETS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
];

interface TagListDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly tags: readonly Tag[];
  readonly onCreateTag: (name: string, color?: string) => Promise<void>;
  readonly onDeleteTag: (tagId: string) => Promise<void>;
}

export function TagListDialog({
  open,
  onOpenChange,
  tags,
  onCreateTag,
  onDeleteTag,
}: TagListDialogProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(COLOR_PRESETS[0]);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleCreate() {
    if (!name.trim()) return;
    setIsCreating(true);
    try {
      await onCreateTag(name.trim(), color);
      setName('');
    } finally {
      setIsCreating(false);
    }
  }

  async function handleDelete(tagId: string) {
    setDeletingId(tagId);
    try {
      await onDeleteTag(tagId);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Tags</DialogTitle>
          <DialogDescription>Create and manage tags for your applications.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="flex gap-2">
            <Input
              placeholder="Tag name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCreate();
                }
              }}
            />
            <Button size="sm" onClick={handleCreate} disabled={isCreating || !name.trim()}>
              {isCreating ? 'Adding...' : 'Add'}
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {COLOR_PRESETS.map((c) => (
              <button
                key={c}
                type="button"
                className="size-6 rounded-full border-2 transition-transform hover:scale-110"
                style={{
                  backgroundColor: c,
                  borderColor: c === color ? 'currentColor' : 'transparent',
                }}
                onClick={() => setColor(c)}
                aria-label={`Select color ${c}`}
              />
            ))}
          </div>
        </div>

        <Separator />

        <div className="max-h-60 space-y-1 overflow-y-auto">
          {tags.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No tags yet. Create one above.
            </p>
          ) : (
            tags.map((tag) => (
              <div key={tag.id} className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted">
                <div className="flex items-center gap-2">
                  <span
                    className="size-3 rounded-full"
                    style={{ backgroundColor: tag.color ?? '#6B7280' }}
                  />
                  <span className="text-sm">{tag.name}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="size-7 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDelete(tag.id)}
                  disabled={deletingId === tag.id}
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
