import type { ReactNode } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/cn';

interface SortableListProps<T> {
  items: T[];
  getId: (item: T) => string;
  /** A short name for the item, read out to screen-reader users while they reorder ("Phones"). */
  getLabel: (item: T) => string;
  /** Called after a drop with the ids in their new order. Not called when nothing moved. */
  onReorder: (ids: string[]) => void;
  /** Draws one item; `handle` is the grip button that starts a drag (place it wherever it belongs in the row). */
  renderItem: (item: T, handle: ReactNode) => ReactNode;
  className?: string;
}

function SortableRow<T>({ item, id, label, renderItem }: { item: T; id: string; label: string; renderItem: SortableListProps<T>['renderItem'] }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id });

  const handle = (
    <button
      ref={setActivatorNodeRef}
      type="button"
      aria-label={`Reorder ${label}`}
      title="Drag to reorder"
      className="inline-flex h-8 w-6 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700 active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-brand-accent"
      {...attributes}
      {...listeners}
    >
      <GripVertical className="h-4 w-4" />
    </button>
  );

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(isDragging && 'relative z-10 rounded-lg bg-slate-100 shadow-lg ring-1 ring-brand-accent')}
    >
      {renderItem(item, handle)}
    </div>
  );
}

/**
 * A list whose rows can be reordered by dragging the grip, or from the keyboard (focus the grip, press Space, move with
 * the arrow keys, press Space to drop, Escape to cancel). Rows stay inside the list and move only up and down.
 */
export function SortableList<T>({ items, getId, getLabel, onReorder, renderItem, className }: SortableListProps<T>) {
  const sensors = useSensors(
    // A few pixels of movement before a press becomes a drag, so a plain click on the grip never moves anything.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const ids = items.map(getId);

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    onReorder(arrayMove(ids, from, to));
  }

  const nameOf = (id: string | number) => {
    const item = items.find((i) => getId(i) === String(id));
    return item ? getLabel(item) : 'Item';
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      onDragEnd={handleDragEnd}
      accessibility={{
        screenReaderInstructions: {
          draggable: 'To reorder, press Space on the grip, move with the arrow keys, press Space again to drop, or Escape to cancel.',
        },
        announcements: {
          onDragStart: ({ active }) => `Picked up ${nameOf(active.id)}, position ${ids.indexOf(String(active.id)) + 1} of ${ids.length}.`,
          onDragOver: ({ active, over }) => (over ? `${nameOf(active.id)} is over position ${ids.indexOf(String(over.id)) + 1} of ${ids.length}.` : undefined),
          onDragEnd: ({ active, over }) => (over ? `${nameOf(active.id)} dropped at position ${ids.indexOf(String(over.id)) + 1} of ${ids.length}.` : `${nameOf(active.id)} dropped where it was.`),
          onDragCancel: ({ active }) => `Reordering cancelled. ${nameOf(active.id)} is back at position ${ids.indexOf(String(active.id)) + 1}.`,
        },
      }}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className={className}>
          {items.map((item) => (
            <SortableRow key={getId(item)} item={item} id={getId(item)} label={getLabel(item)} renderItem={renderItem} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
