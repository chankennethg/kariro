'use client';

import { useState } from 'react';
import type { Tag } from '@kariro/shared';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface TagManagerProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly applicationId: string;
  readonly tags: readonly Tag[];
  readonly onAttachTags: (applicationId: string, tagIds: string[]) => Promise<void>;
  readonly onRemoveTag: (applicationId: string, tagId: string) => Promise<void>;
}

export function TagManager({
  open,
  onOpenChange,
  applicationId,
  tags,
  onAttachTags,
  onRemoveTag,
}: TagManagerProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  function toggleTag(tagId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(tagId)) {
        next.delete(tagId);
      } else {
        next.add(tagId);
      }
      return next;
    });
  }

  async function handleSave() {
    if (selected.size === 0) return;
    setIsSaving(true);
    try {
      const toAttach = [...selected];
      await onAttachTags(applicationId, toAttach);
      setSelected(new Set());
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRemove(tagId: string) {
    setRemovingId(tagId);
    try {
      await onRemoveTag(applicationId, tagId);
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) setSelected(new Set());
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Tags</DialogTitle>
          <DialogDescription>
            Select tags to attach or click the remove button to detach.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-60 space-y-1 overflow-y-auto">
          {tags.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No tags available. Create tags first via &quot;Manage Tags&quot;.
            </p>
          ) : (
            tags.map((tag) => (
              <div
                key={tag.id}
                className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted"
              >
                <label className="flex flex-1 cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selected.has(tag.id)}
                    onChange={() => toggleTag(tag.id)}
                    className="size-4 rounded border-gray-300"
                  />
                  <span
                    className="size-3 rounded-full"
                    style={{ backgroundColor: tag.color ?? '#6B7280' }}
                  />
                  <span className="text-sm">{tag.name}</span>
                </label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                  onClick={() => handleRemove(tag.id)}
                  disabled={removingId === tag.id}
                >
                  {removingId === tag.id ? 'Removing...' : 'Remove'}
                </Button>
              </div>
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || selected.size === 0}>
            {isSaving ? 'Attaching...' : `Attach (${selected.size})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
