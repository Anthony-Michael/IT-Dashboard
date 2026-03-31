"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { Category, createCategory, fetchCategories, Queue, updateCategory } from "../../lib/api";
import { AppShell } from "../../components/layout/app-shell";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [newName, setNewName] = useState("");
  const [newQueue, setNewQueue] = useState<Queue>("it");

  async function loadCategories(): Promise<void> {
    setLoading(true);
    try {
      const data = await fetchCategories(true);
      setCategories(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load categories");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCategories();
  }, []);

  async function handleCreate(e: FormEvent): Promise<void> {
    e.preventDefault();
    if (!newName.trim()) return;

    setSaving(true);
    setError("");
    try {
      await createCategory({ name: newName.trim(), queue: newQueue });
      setNewName("");
      setNewQueue("it");
      await loadCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create category");
    } finally {
      setSaving(false);
    }
  }

  async function handleInlineUpdate(category: Category, updates: { name?: string; queue?: Queue; is_active?: boolean }) {
    setSaving(true);
    setError("");
    try {
      await updateCategory(category.id, updates);
      await loadCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update category");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <main className="mx-auto max-w-5xl p-4 md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Categories</h1>
        <Link href="/" className="text-sm text-slate-700 underline-offset-2 hover:underline">
          Back to tickets
        </Link>
      </div>

      <section className="mb-4 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-base font-semibold text-slate-900">Add Category</h2>
        <form className="grid grid-cols-1 gap-3 md:grid-cols-3" onSubmit={handleCreate}>
          <input
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="Category name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <select
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={newQueue}
            onChange={(e) => setNewQueue(e.target.value as Queue)}
          >
            <option value="it">IT</option>
            <option value="operations">Operations</option>
          </select>
          <button
            type="submit"
            disabled={saving || !newName.trim()}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            Add Category
          </button>
        </form>
      </section>

      {error ? <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div> : null}

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-base font-semibold text-slate-900">Category List</h2>

        {loading ? (
          <p className="text-sm text-slate-600">Loading categories...</p>
        ) : categories.length === 0 ? (
          <p className="text-sm text-slate-600">No categories found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs uppercase tracking-wide text-slate-600">
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Queue</th>
                  <th className="px-3 py-2">Active</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr key={category.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">
                      <input
                        className="w-full rounded-md border border-slate-300 px-2 py-1"
                        value={category.name}
                        onChange={(e) =>
                          setCategories((prev) =>
                            prev.map((c) => (c.id === category.id ? { ...c, name: e.target.value } : c))
                          )
                        }
                        onBlur={() => handleInlineUpdate(category, { name: category.name })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        className="rounded-md border border-slate-300 px-2 py-1"
                        value={category.queue}
                        onChange={(e) => handleInlineUpdate(category, { queue: e.target.value as Queue })}
                      >
                        <option value="it">IT</option>
                        <option value="operations">Operations</option>
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={category.is_active}
                          onChange={(e) => handleInlineUpdate(category, { is_active: e.target.checked })}
                        />
                        <span>{category.is_active ? "Active" : "Inactive"}</span>
                      </label>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      </main>
    </AppShell>
  );
}
