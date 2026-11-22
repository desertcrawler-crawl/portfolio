"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useId, type ReactNode } from "react";

type ListProps<T> = {
  items: T[];
  getId: (item: T) => string;
  onReorder: (next: T[]) => void;
  layout: "list" | "grid";
  className?: string;
  children: (item: T, index: number) => ReactNode;
  /** something shown after the items that is not draggable, e.g. an "add" button */
  after?: ReactNode;
};

// Drag-and-drop list. Works with mouse, touch (press and hold briefly) and keyboard.
export function SortableList<T>({ items, getId, onReorder, layout, className, children, after }: ListProps<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const ids = items.map(getId);
  const dndId = useId(); // stable id so server and browser render the same markup

  function onDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    const from = ids.indexOf(String(e.active.id));
    const to = ids.indexOf(String(e.over.id));
    if (from < 0 || to < 0) return;
    onReorder(arrayMove(items, from, to));
  }

  const Tag = layout === "list" ? "ul" : "div";
  return (
    <DndContext id={dndId} sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={ids} strategy={layout === "list" ? verticalListSortingStrategy : rectSortingStrategy}>
        <Tag className={className}>
          {items.map((item, i) => children(item, i))}
          {after}
        </Tag>
      </SortableContext>
    </DndContext>
  );
}

type ItemProps = {
  id: string;
  as?: "li" | "figure";
  className?: string;
  children: ReactNode;
  /** when set, only elements with data-drag-handle start a drag */
  handle?: boolean;
};

export function SortableItem({ id, as = "li", className, children, handle }: ItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, setActivatorNodeRef } =
    useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    opacity: isDragging ? 0.85 : 1,
    boxShadow: isDragging ? "0 8px 24px rgba(0,0,0,0.15)" : undefined,
    background: "#fff",
    touchAction: handle ? undefined : "none",
  };
  const Tag = as;
  if (handle) {
    return (
      <Tag ref={setNodeRef as never} style={style} className={className}>
        <button
          ref={setActivatorNodeRef}
          className="drag-handle"
          aria-label="Drag to reorder"
          {...attributes}
          {...listeners}
        >
          ⠿
        </button>
        {children}
      </Tag>
    );
  }
  return (
    <Tag ref={setNodeRef as never} style={style} className={className} {...attributes} {...listeners}>
      {children}
    </Tag>
  );
}
