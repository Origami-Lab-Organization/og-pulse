import { useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { TagBadge } from '@/components/projects/activities/TagBadge';
import {
  usePersonalTags,
  useCreatePersonalTag,
  useAddTagToCard,
  useRemoveTagFromCard,
} from '@/hooks/usePersonalKanban';
import { PersonalKanbanCardTagWithTag } from '@/types/personalKanban';

const PRESET_COLORS = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#14b8a6',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#64748b',
  '#a16207',
  '#166534',
  '#1e40af',
];

interface PersonalTagInputProps {
  cardId: string;
  cardTags: PersonalKanbanCardTagWithTag[];
}

export function PersonalTagInput({ cardId, cardTags }: PersonalTagInputProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[8]);

  const { data: allTags = [] } = usePersonalTags();
  const createTag = useCreatePersonalTag();
  const addTag = useAddTagToCard(cardId);
  const removeTag = useRemoveTagFromCard(cardId);

  const cardTagIds = new Set(cardTags.map((ct) => ct.tag_id));

  const filteredTags = allTags.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()),
  );
  const showCreate =
    search.trim().length > 0 &&
    !allTags.some((t) => t.name.toLowerCase() === search.trim().toLowerCase());

  const handleToggleTag = (tagId: string) => {
    if (cardTagIds.has(tagId)) {
      removeTag.mutate(tagId);
    } else {
      addTag.mutate(tagId);
    }
  };

  const handleCreateTag = () => {
    const name = search.trim();
    if (!name) return;
    createTag.mutate(
      { name, color: selectedColor },
      {
        onSuccess: (newTag) => {
          addTag.mutate(newTag.id);
          setSearch('');
        },
      },
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 min-h-8">
      {cardTags.map((ct) => (
        <div key={ct.tag_id} className="flex items-center gap-0.5 group">
          <TagBadge tag={ct.tag} />
          <button
            type="button"
            onClick={() => removeTag.mutate(ct.tag_id)}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground rounded-full"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            type="button"
            className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
          >
            <Plus className="h-3 w-3" />
            Tag
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Buscar ou criar tag..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              {filteredTags.length === 0 && !showCreate && (
                <CommandEmpty>Nenhuma tag encontrada.</CommandEmpty>
              )}

              {filteredTags.length > 0 && (
                <CommandGroup>
                  {filteredTags.map((tag) => (
                    <CommandItem
                      key={tag.id}
                      onSelect={() => handleToggleTag(tag.id)}
                      className="flex items-center gap-2"
                    >
                      <div
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className="flex-1 text-sm">{tag.name}</span>
                      {cardTagIds.has(tag.id) && (
                        <Check className="h-3.5 w-3.5 text-primary" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {showCreate && (
                <>
                  {filteredTags.length > 0 && <CommandSeparator />}
                  <CommandGroup heading="Criar nova tag">
                    <div className="flex flex-wrap gap-1.5 px-2 py-1.5">
                      {PRESET_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setSelectedColor(color)}
                          className="h-5 w-5 rounded-full border-2 transition-all"
                          style={{
                            backgroundColor: color,
                            borderColor: selectedColor === color ? color : 'transparent',
                            boxShadow:
                              selectedColor === color
                                ? `0 0 0 1px white, 0 0 0 2px ${color}`
                                : 'none',
                          }}
                        />
                      ))}
                    </div>
                    <CommandItem
                      onSelect={handleCreateTag}
                      disabled={createTag.isPending}
                      className="flex items-center gap-2"
                    >
                      <div
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{ backgroundColor: selectedColor }}
                      />
                      <span className="text-sm">Criar &ldquo;{search.trim()}&rdquo;</span>
                      <Plus className="h-3.5 w-3.5 ml-auto" />
                    </CommandItem>
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
