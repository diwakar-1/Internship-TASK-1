"use client";
import { useState } from "react";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragEndEvent, DragOverlay, useDraggable, useDroppable
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { FIELD_TYPES, getDefaultLabel, getDefaultPlaceholder } from "@/lib/fieldTypes";
import { generateId, cn } from "@/lib/utils";
import { createField } from "@/lib/store";
import { Plus, Trash2, GripVertical, Settings2, Copy, X, Circle, CheckSquare, ChevronDown, Mail, Type, AlignLeft, Hash, Phone, Link, Calendar, Star, Upload, AlertCircle, PenTool, MousePointerClick } from "lucide-react";
import type { FormField, FieldType } from "@/types";

const ICON_MAP: Record<FieldType, React.ComponentType<Record<string, any>>> = {
  text: Type, textarea: AlignLeft, email: Mail, number: Hash, phone: Phone, url: Link,
  date: Calendar, dropdown: ChevronDown, radio: Circle, checkbox: CheckSquare, rating: Star, file: Upload, signature: PenTool,
};

interface FieldEditorProps {
  fields: FormField[];
  onChange: (fields: FormField[]) => void;
  description: string;
  onDescriptionChange: (description: string) => void;
}

export function FieldEditor({ fields, onChange, description, onDescriptionChange }: FieldEditorProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    // Dragging from the left palette library
    if (String(active.id).startsWith("palette-")) {
      const type = String(active.id).replace("palette-", "") as FieldType;
      const newField = createField(type);

      if (over.id === "canvas-drop-zone") {
        onChange([...fields, newField]);
        setSelectedFieldId(newField.id);
      } else {
        const overIdx = fields.findIndex((f) => f.id === over.id);
        if (overIdx >= 0) {
          const newFields = [...fields];
          newFields.splice(overIdx, 0, newField);
          onChange(newFields);
          setSelectedFieldId(newField.id);
        } else {
          onChange([...fields, newField]);
          setSelectedFieldId(newField.id);
        }
      }
      return;
    }

    // Normal reordering
    if (active.id === over.id) return;
    const oldIdx = fields.findIndex((f) => f.id === active.id);
    const newIdx = fields.findIndex((f) => f.id === over.id);
    onChange(arrayMove(fields, oldIdx, newIdx));
  };

  const addField = (type: FieldType) => {
    const newField = createField(type);
    onChange([...fields, newField]);
    setSelectedFieldId(newField.id);
  };

  const updateField = (id: string, updates: Partial<FormField>) => {
    onChange(fields.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  };

  const removeField = (id: string) => {
    onChange(fields.filter((f) => f.id !== id));
    if (selectedFieldId === id) {
      setSelectedFieldId(null);
    }
  };

  const duplicateField = (id: string) => {
    const idx = fields.findIndex((f) => f.id === id);
    if (idx < 0) return;
    const orig = fields[idx];
    const copy: FormField = { ...JSON.parse(JSON.stringify(orig)), id: generateId("f_") };
    onChange([...fields.slice(0, idx + 1), copy, ...fields.slice(idx + 1)]);
    setSelectedFieldId(copy.id);
  };

  const selectedField = fields.find((f) => f.id === selectedFieldId);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col lg:flex-row gap-6 items-start w-full">
        {/* COLUMN 1: LEFT SIDEBAR - Fields Library */}
        <div className="w-full lg:w-64 shrink-0 bg-white border border-black/5 rounded-2xl p-4 shadow-soft space-y-4">
          <div>
            <h3 className="font-bold text-sm text-ink-900">Fields Library</h3>
            <p className="text-[11px] text-black/45 mt-1 leading-normal">
              Drag fields onto the canvas or click them to append to the form.
            </p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-2.5 max-h-[300px] lg:max-h-none overflow-y-auto pr-1">
            {FIELD_TYPES.map((ft) => {
              const Icon = ICON_MAP[ft.type];
              return (
                <DraggablePaletteItem
                  key={ft.type}
                  type={ft.type}
                  label={ft.label}
                  icon={Icon}
                  onClick={() => addField(ft.type)}
                />
              );
            })}
          </div>
        </div>

        {/* COLUMN 2: CENTER - Form Canvas */}
        <div className="flex-1 min-w-0 w-full bg-white border border-black/5 rounded-2xl p-6 shadow-soft space-y-5">
          <div>
            <label className="text-[10px] font-bold text-black/30 uppercase tracking-wider">Form Description</label>
            <input
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder="Add a description for your form..."
              className="w-full text-[15px] text-black/65 bg-transparent border-none outline-none focus:bg-black/[0.02] px-2.5 py-1.5 rounded transition mt-1"
            />
          </div>

          <div className="border-t border-black/5 pt-4">
            <label className="text-[10px] font-bold text-black/30 uppercase tracking-wider block mb-3">Form Fields</label>
            <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3 min-h-[200px]">
                {fields.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 border border-dashed border-black/10 rounded-xl bg-black/[0.01]">
                    <MousePointerClick className="text-black/20 mb-2" size={24} />
                    <p className="text-xs text-black/45 font-medium">Form is empty</p>
                    <p className="text-[11px] text-black/40 mt-0.5">Drag or click fields from the library to begin.</p>
                  </div>
                ) : (
                  fields.map((field) => (
                    <CanvasField
                      key={field.id}
                      field={field}
                      onSelect={() => setSelectedFieldId(field.id)}
                      onRemove={() => removeField(field.id)}
                      onDuplicate={() => duplicateField(field.id)}
                      isSelected={selectedFieldId === field.id}
                      isDraggedActive={activeId === field.id}
                    />
                  ))
                )}
              </div>
            </SortableContext>

            <CanvasDropZone />
          </div>
        </div>

        {/* COLUMN 3: RIGHT SIDEBAR - Field Settings */}
        <div className="w-full lg:w-80 shrink-0 bg-white border border-black/5 rounded-2xl p-5 shadow-soft min-h-[420px] lg:sticky lg:top-[88px]">
          {selectedField ? (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-black/5">
                <div>
                  <h3 className="font-bold text-sm text-ink-900">Field Settings</h3>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="text-[10px] bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                      {FIELD_TYPES.find((ft) => ft.type === selectedField.type)?.label}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedFieldId(null)}
                  className="text-black/40 hover:text-black/70 p-1 hover:bg-black/5 rounded-full transition"
                  title="Close settings"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                <div>
                  <label className="label">Label</label>
                  <input
                    value={selectedField.label}
                    onChange={(e) => updateField(selectedField.id, { label: e.target.value })}
                    placeholder={getDefaultLabel(selectedField.type)}
                    className="input"
                  />
                </div>

                {selectedField.type !== "rating" && selectedField.type !== "date" && selectedField.type !== "checkbox" && selectedField.type !== "signature" && (
                  <div>
                    <label className="label">Placeholder</label>
                    <input
                      value={selectedField.placeholder ?? ""}
                      onChange={(e) => updateField(selectedField.id, { placeholder: e.target.value })}
                      placeholder={getDefaultPlaceholder(selectedField.type)}
                      className="input"
                    />
                  </div>
                )}

                <div>
                  <label className="label">Help text</label>
                  <input
                    value={selectedField.helpText ?? ""}
                    onChange={(e) => updateField(selectedField.id, { helpText: e.target.value })}
                    placeholder="Optional helper text below the field"
                    className="input"
                  />
                </div>

                {(selectedField.type === "dropdown" || selectedField.type === "radio" || selectedField.type === "checkbox") && (
                  <div>
                    <label className="label">Options</label>
                    <div className="space-y-2">
                      {selectedField.options?.map((opt, i) => (
                        <div key={opt.id} className="flex items-center gap-2">
                          <input
                            value={opt.label}
                            onChange={(e) => {
                              const newOpts = [...(selectedField.options ?? [])];
                              newOpts[i] = { ...opt, label: e.target.value, value: e.target.value.toLowerCase().replace(/\s+/g, "_") };
                              updateField(selectedField.id, { options: newOpts });
                            }}
                            placeholder={`Option ${i + 1}`}
                            className="input"
                          />
                          <button
                            onClick={() => {
                              const newOpts = (selectedField.options ?? []).filter((_, idx) => idx !== i);
                              updateField(selectedField.id, { options: newOpts });
                            }}
                            className="p-1.5 text-black/30 hover:text-red-600 hover:bg-red-50 rounded transition"
                            disabled={(selectedField.options?.length ?? 0) <= 1}
                          >
                            <Trash2 size={14} strokeWidth={2} />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => {
                          const newOpts = [
                            ...(selectedField.options ?? []),
                            { id: generateId("o_"), label: `Option ${(selectedField.options?.length ?? 0) + 1}`, value: `option_${(selectedField.options?.length ?? 0) + 1}` }
                          ];
                          updateField(selectedField.id, { options: newOpts });
                        }}
                        className="btn-secondary text-xs w-full flex items-center justify-center gap-1 py-1.5 rounded-lg border border-black/5 bg-black/[0.02]"
                      >
                        <Plus size={12} strokeWidth={2} /> Add option
                      </button>
                    </div>
                  </div>
                )}

                <div className="pt-3.5 border-t border-black/5 space-y-3">
                  <label className="label flex items-center gap-1.5"><AlertCircle size={14} strokeWidth={2} className="text-black/50" /> Validation</label>
                  
                  <label className="flex items-center gap-2 text-xs font-semibold text-black/70 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={!!selectedField.validation.required}
                      onChange={(e) => updateField(selectedField.id, { validation: { ...selectedField.validation, required: e.target.checked } })}
                      className="rounded border-black/15 text-brand-600 focus:ring-brand-500"
                    />
                    Required
                  </label>

                  {(selectedField.type === "text" || selectedField.type === "textarea") && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="text-[10px] font-bold text-black/45 block mb-1">Min length</label>
                        <input
                          type="number"
                          value={selectedField.validation.minLength ?? ""}
                          onChange={(e) => updateField(selectedField.id, { validation: { ...selectedField.validation, minLength: e.target.value ? Number(e.target.value) : undefined } })}
                          className="input text-xs py-1"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-black/45 block mb-1">Max length</label>
                        <input
                          type="number"
                          value={selectedField.validation.maxLength ?? ""}
                          onChange={(e) => updateField(selectedField.id, { validation: { ...selectedField.validation, maxLength: e.target.value ? Number(e.target.value) : undefined } })}
                          className="input text-xs py-1"
                        />
                      </div>
                    </div>
                  )}

                  {selectedField.type === "rating" && (
                    <div className="pt-1">
                      <label className="text-[10px] font-bold text-black/45 block mb-1">Max stars</label>
                      <input
                        type="number"
                        min={3}
                        max={10}
                        value={selectedField.validation.max ?? 5}
                        onChange={(e) => updateField(selectedField.id, { validation: { ...selectedField.validation, max: Number(e.target.value) } })}
                        className="input text-xs py-1"
                      />
                    </div>
                  )}

                  {selectedField.type === "number" && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="text-[10px] font-bold text-black/45 block mb-1">Min value</label>
                        <input
                          type="number"
                          value={selectedField.validation.min ?? ""}
                          onChange={(e) => updateField(selectedField.id, { validation: { ...selectedField.validation, min: e.target.value ? Number(e.target.value) : undefined } })}
                          className="input text-xs py-1"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-black/45 block mb-1">Max value</label>
                        <input
                          type="number"
                          value={selectedField.validation.max ?? ""}
                          onChange={(e) => updateField(selectedField.id, { validation: { ...selectedField.validation, max: e.target.value ? Number(e.target.value) : undefined } })}
                          className="input text-xs py-1"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-black/5">
                <button
                  onClick={() => removeField(selectedField.id)}
                  className="w-full py-2 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5"
                >
                  <Trash2 size={13} /> Delete Field
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center h-[340px] border border-dashed border-black/10 rounded-2xl p-4 bg-black/[0.005]">
              <Settings2 className="text-black/20 mb-3" size={32} />
              <h4 className="font-bold text-xs text-ink-900 uppercase tracking-wider">No field selected</h4>
              <p className="text-[11px] text-black/45 mt-1.5 max-w-[190px] leading-normal">
                Click on any field in the form canvas to configure its settings.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* DRAG OVERLAY FOR GORGEOUS PREVIEWS */}
      <DragOverlay>
        {activeId ? (
          activeId.startsWith("palette-") ? (
            <div className="flex items-center gap-2.5 p-3 rounded-xl border border-brand-500 bg-white shadow-xl text-left select-none w-48 opacity-90 cursor-grabbing">
              {(() => {
                const type = activeId.replace("palette-", "") as FieldType;
                const ft = FIELD_TYPES.find((f) => f.type === type);
                const Icon = ICON_MAP[type];
                return (
                  <>
                    <div className="w-6 h-6 rounded bg-brand-50 flex items-center justify-center shrink-0">
                      <Icon size={14} className="text-brand-600" />
                    </div>
                    <span className="text-xs font-semibold text-brand-700 truncate">{ft?.label}</span>
                  </>
                );
              })()}
            </div>
          ) : (
            <div className="bg-white border border-brand-500 rounded-xl p-4 shadow-xl flex items-center gap-2.5 opacity-90 w-full max-w-lg cursor-grabbing">
              {(() => {
                const field = fields.find((f) => f.id === activeId);
                if (!field) return null;
                const Icon = ICON_MAP[field.type];
                const fieldTypeLabel = FIELD_TYPES.find((f) => f.type === field.type)?.label ?? field.type;
                return (
                  <>
                    <GripVertical size={16} className="text-black/30 shrink-0" />
                    <div className="w-8 h-8 rounded-lg bg-black/[0.03] flex items-center justify-center shrink-0">
                      <Icon size={16} className="text-black/70" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-ink-900 truncate">{field.label || "Untitled Field"}</div>
                      <div className="text-xs text-black/45">{fieldTypeLabel}</div>
                    </div>
                  </>
                );
              })()}
            </div>
          )
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

/* Left Sidebar Draggable Field Item */
function DraggablePaletteItem({ type, label, icon: Icon, onClick }: { type: FieldType; label: string; icon: any; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `palette-${type}`,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 999,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 p-3 rounded-xl border border-black/5 bg-white hover:border-brand-300 hover:shadow-sm text-left transition cursor-grab active:cursor-grabbing select-none relative group",
        isDragging && "opacity-50 border-brand-500 border-dashed"
      )}
    >
      <div className="w-7 h-7 rounded-lg bg-black/[0.03] group-hover:bg-brand-50 flex items-center justify-center shrink-0 transition">
        <Icon size={14} className="text-black/60 group-hover:text-brand-600 transition" />
      </div>
      <span className="text-xs font-semibold text-ink-900 truncate">{label}</span>
    </div>
  );
}

/* Center Canvas Sorting Field Item */
function CanvasField({
  field, onSelect, onRemove, onDuplicate, isSelected, isDraggedActive,
}: {
  field: FormField;
  onSelect: () => void;
  onRemove: () => void;
  onDuplicate: () => void;
  isSelected: boolean;
  isDraggedActive: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id } as any);
  const style = { transform: CSS.Transform.toString(transform), transition };
  const Icon = ICON_MAP[field.type];
  const fieldTypeLabel = FIELD_TYPES.find((f) => f.type === field.type)?.label ?? field.type;

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={cn(
        "bg-white border rounded-xl transition-all duration-200 cursor-pointer select-none relative group",
        isSelected
          ? "border-brand-500 ring-2 ring-brand-500/20 shadow-md"
          : isDragging || isDraggedActive
          ? "border-brand-300 shadow-md"
          : "border-black/5 hover:border-black/15 hover:shadow-sm"
      )}
    >
      <div className="flex items-center gap-2.5 p-4">
        {/* Drag Handle */}
        <button
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="text-black/30 hover:text-black/60 cursor-grab active:cursor-grabbing p-1 shrink-0"
        >
          <GripVertical size={16} strokeWidth={2} />
        </button>

        {/* Icon representation */}
        <div className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition",
          isSelected ? "bg-brand-50 text-brand-600" : "bg-black/[0.03] text-black/70"
        )}>
          <Icon size={16} strokeWidth={1.8} />
        </div>

        {/* Label and Meta Info */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-ink-900 truncate">
            {field.label || <span className="italic text-black/30">Untitled Field</span>}
          </div>
          <div className="text-xs text-black/45 flex items-center gap-1.5 mt-0.5">
            <span>{fieldTypeLabel}</span>
            {field.validation.required && (
              <span className="text-[9px] font-bold text-brand-600 bg-brand-50 px-1.5 py-0.2 rounded uppercase tracking-wider shrink-0">Required</span>
            )}
          </div>
        </div>

        {/* Quick Duplicate/Delete Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
            className="p-1.5 text-black/45 hover:bg-black/[0.04] rounded-lg transition"
            title="Duplicate field"
          >
            <Copy size={13} strokeWidth={2} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="p-1.5 text-black/45 hover:bg-red-50 hover:text-red-600 rounded-lg transition"
            title="Delete field"
          >
            <Trash2 size={13} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* Center Canvas Drop Zone Target */
function CanvasDropZone() {
  const { setNodeRef, isOver } = useDroppable({
    id: "canvas-drop-zone",
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "py-4 border-2 border-dashed rounded-xl text-center transition-all duration-200 mt-3 select-none",
        isOver
          ? "border-brand-500 bg-brand-50/50 text-brand-600 scale-[1.01]"
          : "border-black/10 text-black/35 hover:border-brand-400/50"
      )}
    >
      <p className="text-xs font-semibold">Drag fields here, or click them on the left to append</p>
    </div>
  );
}