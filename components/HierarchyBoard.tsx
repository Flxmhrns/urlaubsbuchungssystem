"use client";
/**
 * HierarchyBoard – Drag-&-Drop-Teamhierarchie für Admins.
 *
 * Features:
 *  • Abteilungen als Spalten, Mitarbeiter als Karten
 *  • Karten per Drag & Drop zwischen Abteilungen verschieben
 *  • Abteilungsleiter zuweisen (⭐ Button auf Karten)
 *  • Neuen Mitarbeiter anlegen (Modal)
 *  • Neue Abteilung anlegen (Modal)
 *  • Mitarbeiter und Abteilungen löschen
 */
import React, { useState, useCallback } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

// ── Typen ────────────────────────────────────────────────────────────────────

interface HUser {
  id:                number;
  name:              string;
  email:             string;
  role:              string;
  departmentId:      number | null;
  vacationDaysTotal: number;
  vacationDaysUsed:  number;
}

interface HDepartment {
  id:        number;
  name:      string;
  managerId: number | null;
  employees: HUser[];
}

interface Props {
  initialDepartments: HDepartment[];
  initialUnassigned:  HUser[];
}

// ── Hilfsfunktion ─────────────────────────────────────────────────────────────

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

// ── Draggable UserCard ────────────────────────────────────────────────────────

function UserCard({
  user,
  isManager,
  deptId,
  onSetManager,
  onDelete,
  onEdit,
  overlay = false,
}: {
  user:         HUser;
  isManager:    boolean;
  deptId:       number | "unassigned";
  onSetManager: (userId: number, deptId: number) => void;
  onDelete:     (userId: number) => void;
  onEdit:       (user: HUser) => void;
  overlay?:     boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: user.id });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  const card = (
    <div
      className={`group relative rounded-xl border p-3 cursor-grab active:cursor-grabbing select-none transition-all duration-150 ${
        overlay
          ? "shadow-2xl rotate-1 opacity-95 scale-105 bg-white border-primary-300"
          : isDragging
          ? "opacity-30"
          : isManager
          ? "bg-amber-50 border-amber-200 shadow-sm hover:shadow-md"
          : "bg-white border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300"
      }`}
    >
      <div className="flex items-center gap-2.5">
        {/* Avatar */}
        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
          isManager ? "bg-amber-400 text-amber-900" : "bg-primary-100 text-primary-700"
        }`}>
          {initials(user.name)}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {isManager && (
              <span title="Abteilungsleiter" className="text-amber-500 text-xs">👑</span>
            )}
            <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
          </div>
          <p className="text-xs text-gray-400 truncate">{user.email}</p>
        </div>

        {/* Aktionen (erscheinen bei Hover) */}
        {!overlay && (
          <div className="opacity-0 group-hover:opacity-100 flex gap-1 flex-shrink-0 transition-opacity">
            {/* Zum Abteilungsleiter machen – nur wenn in einer echten Abteilung */}
            {!isManager && typeof deptId === "number" && (
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); onSetManager(user.id, deptId); }}
                title="Zum Abteilungsleiter machen"
                className="w-6 h-6 rounded-md bg-amber-100 hover:bg-amber-200 text-amber-700 flex items-center justify-center text-xs transition-colors"
              >
                ⭐
              </button>
            )}
            {/* Bearbeiten */}
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onEdit(user); }}
              title="Benutzer bearbeiten"
              className="w-6 h-6 rounded-md bg-gray-100 hover:bg-blue-100 text-gray-400 hover:text-blue-600 flex items-center justify-center transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            {/* Löschen */}
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onDelete(user.id); }}
              title="Benutzer löschen"
              className="w-6 h-6 rounded-md bg-gray-100 hover:bg-red-100 text-gray-400 hover:text-red-600 flex items-center justify-center transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Urlaubstage (kleine Info-Zeile) */}
      <div className="mt-2 pl-[2.875rem] flex items-center gap-2">
        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
          isManager ? "bg-amber-100 text-amber-700" : "bg-primary-50 text-primary-600"
        }`}>
          {isManager ? "Manager" : "Mitarbeiter"}
        </span>
        <span className="text-xs text-gray-400">
          {user.vacationDaysTotal - user.vacationDaysUsed} / {user.vacationDaysTotal} Tage frei
        </span>
      </div>
    </div>
  );

  if (overlay) return card;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      {card}
    </div>
  );
}

// ── Droppable DepartmentColumn ────────────────────────────────────────────────

function DepartmentColumn({
  dept,
  onSetManager,
  onDeleteUser,
  onEditUser,
  onDeleteDept,
  onRenameDept,
}: {
  dept:          HDepartment;
  onSetManager:  (userId: number, deptId: number) => void;
  onDeleteUser:  (userId: number) => void;
  onEditUser:    (user: HUser) => void;
  onDeleteDept:  (deptId: number) => void;
  onRenameDept:  (deptId: number, name: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: dept.id });
  const [renaming, setRenaming] = useState(false);
  const [nameInput, setNameInput] = useState(dept.name);

  function submitRename() {
    if (nameInput.trim() && nameInput.trim() !== dept.name) {
      onRenameDept(dept.id, nameInput.trim());
    }
    setRenaming(false);
  }

  const managerUser = dept.employees.find((u) => u.id === dept.managerId);
  const regularUsers = dept.employees.filter((u) => u.id !== dept.managerId);

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-2xl border-2 transition-all duration-150 min-w-[260px] max-w-[300px] flex-shrink-0 ${
        isOver
          ? "border-primary-400 bg-primary-50 shadow-lg shadow-primary-100"
          : "border-gray-200 bg-gray-50"
      }`}
    >
      {/* Spalten-Header */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-200">
        <div className="flex items-start justify-between gap-2">
          {renaming ? (
            <input
              autoFocus
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onBlur={submitRename}
              onKeyDown={(e) => { if (e.key === "Enter") submitRename(); if (e.key === "Escape") setRenaming(false); }}
              className="form-input text-sm font-semibold flex-1 py-0.5"
            />
          ) : (
            <h3
              className="font-bold text-gray-800 text-base cursor-pointer hover:text-primary-600 transition-colors flex-1 truncate"
              title="Doppelklick zum Umbenennen"
              onDoubleClick={() => { setRenaming(true); setNameInput(dept.name); }}
            >
              🏢 {dept.name}
            </h3>
          )}
          <button
            onClick={() => onDeleteDept(dept.id)}
            title="Abteilung löschen"
            className="w-6 h-6 rounded-md hover:bg-red-100 text-gray-300 hover:text-red-500 flex items-center justify-center transition-colors flex-shrink-0"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-0.5">{dept.employees.length} Mitglieder</p>
      </div>

      {/* Karten */}
      <div className="flex flex-col gap-2 p-3 min-h-[120px]">
        {dept.employees.length === 0 && !isOver && (
          <div className="flex-1 flex items-center justify-center text-xs text-gray-300 py-6 border-2 border-dashed border-gray-200 rounded-xl">
            Hierher ziehen…
          </div>
        )}

        {/* Manager zuerst */}
        {managerUser && (
          <UserCard
            key={managerUser.id}
            user={managerUser}
            isManager
            deptId={dept.id}
            onSetManager={onSetManager}
            onDelete={onDeleteUser}
            onEdit={onEditUser}
          />
        )}

        {/* Reguläre Mitarbeiter */}
        {regularUsers.map((u) => (
          <UserCard
            key={u.id}
            user={u}
            isManager={false}
            deptId={dept.id}
            onSetManager={onSetManager}
            onDelete={onDeleteUser}
            onEdit={onEditUser}
          />
        ))}
      </div>
    </div>
  );
}

// ── Droppable UnassignedColumn ────────────────────────────────────────────────

function UnassignedColumn({
  users,
  onDeleteUser,
  onEditUser,
}: {
  users:        HUser[];
  onDeleteUser: (userId: number) => void;
  onEditUser:   (user: HUser) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: "unassigned" });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-2xl border-2 border-dashed transition-all duration-150 min-w-[260px] max-w-[300px] flex-shrink-0 ${
        isOver ? "border-gray-400 bg-gray-100" : "border-gray-300 bg-gray-50/50"
      }`}
    >
      <div className="px-4 pt-4 pb-3 border-b border-gray-200">
        <h3 className="font-bold text-gray-500 text-base">📭 Nicht zugewiesen</h3>
        <p className="text-xs text-gray-400 mt-0.5">{users.length} Mitglieder</p>
      </div>
      <div className="flex flex-col gap-2 p-3 min-h-[120px]">
        {users.length === 0 && !isOver && (
          <div className="flex-1 flex items-center justify-center text-xs text-gray-300 py-6">
            Keine nicht-zugewiesenen Mitarbeiter
          </div>
        )}
        {users.map((u) => (
          <UserCard
            key={u.id}
            user={u}
            isManager={false}
            deptId="unassigned"
            onSetManager={() => {}}
            onDelete={onDeleteUser}
            onEdit={onEditUser}
          />
        ))}
      </div>
    </div>
  );
}

// ── Modal-Komponente ──────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in-0 zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

// ── HierarchyBoard (Hauptkomponente) ─────────────────────────────────────────

export default function HierarchyBoard({ initialDepartments, initialUnassigned }: Props) {
  const [departments,  setDepartments]  = useState<HDepartment[]>(initialDepartments);
  const [unassigned,   setUnassigned]   = useState<HUser[]>(initialUnassigned);
  const [activeUser,   setActiveUser]   = useState<HUser | null>(null);
  const [toast,        setToast]        = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  // Modals
  const [showNewUser,  setShowNewUser]  = useState(false);
  const [showNewDept,  setShowNewDept]  = useState(false);
  const [editingUser,  setEditingUser]  = useState<HUser | null>(null);
  const [editForm,     setEditForm]     = useState({ name: "", email: "", password: "" });
  const [editLoading,  setEditLoading]  = useState(false);

  // Neuer-Nutzer-Formular
  const [form, setForm] = useState({
    name: "", email: "", password: "", role: "EMPLOYEE",
    departmentId: "" as string | number, vacationDaysTotal: 30,
  });
  const [formLoading, setFormLoading] = useState(false);

  // Neue-Abteilung-Formular
  const [deptName, setDeptName]         = useState("");
  const [deptLoading, setDeptLoading]   = useState(false);

  // ── DnD Sensors ────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  // ── Hilfsfunktionen ────────────────────────────────────────

  function showToast(msg: string, type: "ok" | "err") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  function findUser(id: number): HUser | undefined {
    for (const d of departments) {
      const u = d.employees.find((e) => e.id === id);
      if (u) return u;
    }
    return unassigned.find((u) => u.id === id);
  }

  function getUserDeptId(userId: number): number | "unassigned" {
    for (const d of departments) {
      if (d.employees.some((e) => e.id === userId)) return d.id;
    }
    return "unassigned";
  }

  // Nutzer aus allen Spalten entfernen (gibt ihn zurück)
  function removeUserFromAll(userId: number): HUser | null {
    let found: HUser | null = null;
    setDepartments((prev) =>
      prev.map((d) => {
        const idx = d.employees.findIndex((e) => e.id === userId);
        if (idx === -1) return d;
        found = d.employees[idx];
        return { ...d, employees: d.employees.filter((e) => e.id !== userId) };
      }),
    );
    setUnassigned((prev) => {
      const idx = prev.findIndex((u) => u.id === userId);
      if (idx === -1) return prev;
      found = prev[idx];
      return prev.filter((u) => u.id !== userId);
    });
    return found;
  }

  // ── DnD Handlers ───────────────────────────────────────────

  function handleDragStart(event: DragStartEvent) {
    setActiveUser(findUser(Number(event.active.id)) ?? null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveUser(null);
    const { active, over } = event;
    if (!over) return;

    const userId     = Number(active.id);
    const newDeptId  = over.id === "unassigned" ? null : Number(over.id);
    const oldDeptId  = getUserDeptId(userId);
    const oldDeptNum = oldDeptId === "unassigned" ? null : oldDeptId;

    if (oldDeptNum === newDeptId) return; // keine Änderung

    // Optimistisches Update
    const user = findUser(userId);
    if (!user) return;
    const updatedUser = { ...user, departmentId: newDeptId };

    removeUserFromAll(userId);
    if (newDeptId === null) {
      setUnassigned((prev) => [...prev, updatedUser].sort((a, b) => a.name.localeCompare(b.name)));
    } else {
      setDepartments((prev) =>
        prev.map((d) =>
          d.id === newDeptId
            ? { ...d, employees: [...d.employees, updatedUser].sort((a, b) => a.name.localeCompare(b.name)) }
            : d,
        ),
      );
    }

    // API-Aufruf
    const res = await fetch(`/api/admin/users/${userId}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ departmentId: newDeptId }),
    });
    if (!res.ok) {
      showToast("Fehler beim Verschieben.", "err");
      // Rollback: Seite neu laden wäre die sichere Option
      window.location.reload();
    }
  }

  // ── Manager setzen ─────────────────────────────────────────

  const handleSetManager = useCallback(async (userId: number, deptId: number) => {
    const prevManager = departments.find((d) => d.id === deptId)?.managerId;

    // Optimistisches Update
    setDepartments((prev) =>
      prev.map((d) => (d.id === deptId ? { ...d, managerId: userId } : d)),
    );

    const res = await fetch(`/api/admin/departments/${deptId}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ managerId: userId }),
    });
    if (!res.ok) {
      showToast("Fehler beim Setzen des Abteilungsleiters.", "err");
      setDepartments((prev) =>
        prev.map((d) => (d.id === deptId ? { ...d, managerId: prevManager ?? null } : d)),
      );
    } else {
      showToast("Abteilungsleiter aktualisiert.", "ok");
    }
  }, [departments]);

  // ── Benutzer löschen ───────────────────────────────────────

  const handleDeleteUser = useCallback(async (userId: number) => {
    if (!confirm("Benutzer wirklich löschen? Alle Urlaubsanträge werden ebenfalls gelöscht.")) return;
    const user = findUser(userId);

    removeUserFromAll(userId);

    const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
    if (!res.ok) {
      showToast("Fehler beim Löschen.", "err");
      window.location.reload();
    } else {
      showToast(`${user?.name ?? "Benutzer"} gelöscht.`, "ok");
    }
  }, [departments, unassigned]);

  // ── Abteilung löschen ──────────────────────────────────────

  const handleDeleteDept = useCallback(async (deptId: number) => {
    const dept = departments.find((d) => d.id === deptId);
    if ((dept?.employees.length ?? 0) > 0) {
      showToast("Bitte zuerst alle Mitglieder aus der Abteilung verschieben.", "err");
      return;
    }
    if (!confirm(`Abteilung "${dept?.name}" löschen?`)) return;

    setDepartments((prev) => prev.filter((d) => d.id !== deptId));

    const res = await fetch(`/api/admin/departments/${deptId}`, { method: "DELETE" });
    if (!res.ok) {
      const json = await res.json();
      showToast(json.error ?? "Fehler beim Löschen.", "err");
      window.location.reload();
    } else {
      showToast(`Abteilung "${dept?.name}" gelöscht.`, "ok");
    }
  }, [departments]);

  // ── Benutzer bearbeiten (Admin) ────────────────────────────

  function openEditUser(user: HUser) {
    setEditingUser(user);
    setEditForm({ name: user.name, email: user.email, password: "" });
  }

  async function submitEditUser(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser) return;
    setEditLoading(true);

    const body: Record<string, unknown> = {
      name:  editForm.name.trim(),
      email: editForm.email.trim(),
    };
    if (editForm.password.trim()) body.password = editForm.password;

    const res  = await fetch(`/api/admin/users/${editingUser.id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    });
    const json = await res.json();
    setEditLoading(false);

    if (!res.ok) {
      showToast(json.error ?? "Fehler beim Speichern.", "err");
      return;
    }

    const updated: HUser = { ...editingUser, name: json.data.name, email: json.data.email };

    // Optimistisches Update in Abteilung oder Unzugewiesen
    setDepartments((prev) =>
      prev.map((d) => ({
        ...d,
        employees: d.employees.map((u) => (u.id === updated.id ? updated : u)),
      })),
    );
    setUnassigned((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));

    showToast(`${updated.name} aktualisiert.`, "ok");
    setEditingUser(null);
  }

  // ── Abteilung umbenennen ────────────────────────────────────

  const handleRenameDept = useCallback(async (deptId: number, name: string) => {
    setDepartments((prev) =>
      prev.map((d) => (d.id === deptId ? { ...d, name } : d)),
    );
    const res = await fetch(`/api/admin/departments/${deptId}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ name }),
    });
    if (!res.ok) {
      showToast("Fehler beim Umbenennen.", "err");
      window.location.reload();
    }
  }, []);

  // ── Neuer Benutzer ─────────────────────────────────────────

  async function submitNewUser(e: React.FormEvent) {
    e.preventDefault();
    setFormLoading(true);
    const res = await fetch("/api/admin/users", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        ...form,
        departmentId: form.departmentId === "" ? null : Number(form.departmentId),
      }),
    });
    const json = await res.json();
    setFormLoading(false);

    if (!res.ok) {
      showToast(json.error ?? "Fehler.", "err");
      return;
    }

    const newUser: HUser = json.data;
    if (newUser.departmentId) {
      setDepartments((prev) =>
        prev.map((d) =>
          d.id === newUser.departmentId
            ? { ...d, employees: [...d.employees, newUser].sort((a, b) => a.name.localeCompare(b.name)) }
            : d,
        ),
      );
    } else {
      setUnassigned((prev) => [...prev, newUser].sort((a, b) => a.name.localeCompare(b.name)));
    }

    showToast(`${newUser.name} angelegt.`, "ok");
    setShowNewUser(false);
    setForm({ name: "", email: "", password: "", role: "EMPLOYEE", departmentId: "", vacationDaysTotal: 30 });
  }

  // ── Neue Abteilung ─────────────────────────────────────────

  async function submitNewDept(e: React.FormEvent) {
    e.preventDefault();
    setDeptLoading(true);
    const res = await fetch("/api/admin/departments", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ name: deptName }),
    });
    const json = await res.json();
    setDeptLoading(false);

    if (!res.ok) {
      showToast(json.error ?? "Fehler.", "err");
      return;
    }

    setDepartments((prev) => [...prev, json.data].sort((a, b) => a.name.localeCompare(b.name)));
    showToast(`Abteilung "${json.data.name}" erstellt.`, "ok");
    setShowNewDept(false);
    setDeptName("");
  }

  // ── Render ─────────────────────────────────────────────────

  const totalUsers = departments.reduce((s, d) => s + d.employees.length, 0) + unassigned.length;

  return (
    <>
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm text-white font-medium ${
          toast.type === "ok" ? "bg-green-600" : "bg-red-600"
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={() => setShowNewUser(true)} className="btn-primary">
          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          Neuer Mitarbeiter
        </button>
        <button onClick={() => setShowNewDept(true)} className="btn-secondary">
          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          Neue Abteilung
        </button>

        {/* Statistik-Chips */}
        <div className="ml-auto flex items-center gap-2 text-xs text-gray-500">
          <span className="bg-gray-100 px-2.5 py-1 rounded-full font-medium">
            {departments.length} Abteilungen
          </span>
          <span className="bg-gray-100 px-2.5 py-1 rounded-full font-medium">
            {totalUsers} Mitarbeiter
          </span>
          <span className="bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-medium">
            {departments.filter((d) => d.managerId).length} Manager zugewiesen
          </span>
        </div>
      </div>

      {/* Legende */}
      <div className="flex items-center gap-4 text-xs text-gray-400">
        <span>💡 <strong className="text-gray-500">Karten ziehen</strong> zum Umverteilen</span>
        <span>⭐ <strong className="text-gray-500">Zum Abteilungsleiter</strong> machen (Hover)</span>
        <span>✏️ <strong className="text-gray-500">Doppelklick</strong> auf Spaltenname zum Umbenennen</span>
      </div>

      {/* Board */}
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 pt-1 -mx-4 px-4">
          {departments.map((dept) => (
            <DepartmentColumn
              key={dept.id}
              dept={dept}
              onSetManager={handleSetManager}
              onDeleteUser={handleDeleteUser}
              onEditUser={openEditUser}
              onDeleteDept={handleDeleteDept}
              onRenameDept={handleRenameDept}
            />
          ))}
          <UnassignedColumn
            users={unassigned}
            onDeleteUser={handleDeleteUser}
            onEditUser={openEditUser}
          />
        </div>

        {/* Drag Overlay */}
        <DragOverlay dropAnimation={{ duration: 200, easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)" }}>
          {activeUser && (
            <UserCard
              user={activeUser}
              isManager={false}
              deptId="unassigned"
              onSetManager={() => {}}
              onDelete={() => {}}
              overlay
            />
          )}
        </DragOverlay>
      </DndContext>

      {/* ── Modal: Neuer Mitarbeiter ─────────────────────────── */}
      {showNewUser && (
        <Modal title="Neuen Mitarbeiter anlegen" onClose={() => setShowNewUser(false)}>
          <form onSubmit={submitNewUser} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">Name *</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="form-input text-sm"
                  placeholder="Max Mustermann"
                />
              </div>
              <div>
                <label className="form-label">E-Mail *</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="form-input text-sm"
                  placeholder="m.mustermann@firma.de"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">Passwort *</label>
                <input
                  type="password"
                  required
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  className="form-input text-sm"
                  placeholder="Mindestens 8 Zeichen"
                />
              </div>
              <div>
                <label className="form-label">Rolle</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                  className="form-input text-sm"
                >
                  <option value="EMPLOYEE">Mitarbeiter</option>
                  <option value="MANAGER">Abteilungsleiter</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">Abteilung</label>
                <select
                  value={form.departmentId}
                  onChange={(e) => setForm((f) => ({ ...f, departmentId: e.target.value }))}
                  className="form-input text-sm"
                >
                  <option value="">Keine (unzugewiesen)</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Urlaubstage / Jahr</label>
                <input
                  type="number"
                  min={0}
                  max={365}
                  value={form.vacationDaysTotal}
                  onChange={(e) => setForm((f) => ({ ...f, vacationDaysTotal: Number(e.target.value) }))}
                  className="form-input text-sm"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={formLoading} className="btn-primary flex-1">
                {formLoading ? "Wird angelegt…" : "Anlegen"}
              </button>
              <button type="button" onClick={() => setShowNewUser(false)} className="btn-secondary">
                Abbrechen
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Modal: Neue Abteilung ────────────────────────────── */}
      {showNewDept && (
        <Modal title="Neue Abteilung anlegen" onClose={() => setShowNewDept(false)}>
          <form onSubmit={submitNewDept} className="space-y-4">
            <div>
              <label className="form-label">Name der Abteilung *</label>
              <input
                autoFocus
                required
                value={deptName}
                onChange={(e) => setDeptName(e.target.value)}
                className="form-input"
                placeholder="z. B. Vertrieb"
              />
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={deptLoading} className="btn-primary flex-1">
                {deptLoading ? "Wird erstellt…" : "Erstellen"}
              </button>
              <button type="button" onClick={() => setShowNewDept(false)} className="btn-secondary">
                Abbrechen
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Modal: Benutzer bearbeiten ───────────────────────── */}
      {editingUser && (
        <Modal title={`${editingUser.name} bearbeiten`} onClose={() => setEditingUser(null)}>
          <form onSubmit={submitEditUser} className="space-y-4">
            <div>
              <label className="form-label">Name *</label>
              <input
                required
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                className="form-input"
                placeholder="Vor- und Nachname"
              />
            </div>
            <div>
              <label className="form-label">E-Mail-Adresse *</label>
              <input
                type="email"
                required
                value={editForm.email}
                onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                className="form-input"
                placeholder="name@firma.de"
              />
            </div>
            <div>
              <label className="form-label">Neues Passwort <span className="text-gray-400 font-normal">(leer lassen = unverändert)</span></label>
              <input
                type="password"
                value={editForm.password}
                onChange={(e) => setEditForm((f) => ({ ...f, password: e.target.value }))}
                className="form-input"
                placeholder="••••••••"
              />
            </div>
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={editLoading} className="btn-primary flex-1">
                {editLoading ? "Wird gespeichert…" : "Speichern"}
              </button>
              <button type="button" onClick={() => setEditingUser(null)} className="btn-secondary">
                Abbrechen
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
