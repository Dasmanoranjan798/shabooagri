import { useEffect, useState } from "react";
import type { CreateExpensePayload, Expense, ExpenseCategory } from "../../types/expense";
import type { Machine } from "../../types/machine";
import { api } from "../../lib/api";
import { getTerm } from "../../lib/terminology";
import { notifyDataRefresh } from "../../lib/dataRefreshBus";
import { useTaskDraft, type TaskContentComponent } from "../../context/TaskTrayContext";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { SearchableSelect } from "../../components/ui/SearchableSelect/SearchableSelect";

// Migrated onto the shared task-tray system (Pass 2, Batch 2) — see
// BookingFormModal.tsx for the full explanation of the new contract.

export interface ExpenseFormInitProps {
  expenseToEdit: Expense | null;
}

export interface ExpenseFormDraft {
  categoryId: string;
  amount: string;
  machineId: string;
  expenseDate: string;
  description: string;
}

export function defaultExpenseDraft(expenseToEdit: Expense | null): ExpenseFormDraft {
  if (expenseToEdit) {
    return {
      categoryId: expenseToEdit.categoryId,
      amount: expenseToEdit.amount.toString(),
      machineId: expenseToEdit.machineId || "",
      expenseDate: expenseToEdit.expenseDate ? expenseToEdit.expenseDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
      description: expenseToEdit.description || "",
    };
  }
  return {
    categoryId: "",
    amount: "",
    machineId: "",
    expenseDate: new Date().toISOString().slice(0, 10),
    description: "",
  };
}

export const ExpenseFormTask: TaskContentComponent<ExpenseFormInitProps> = ({
  taskId,
  initProps,
  onRequestClose,
}) => {
  const { expenseToEdit } = initProps;
  const machineTerm = getTerm("machine");
  const [draft, setDraft] = useTaskDraft<ExpenseFormDraft>(taskId, defaultExpenseDraft(expenseToEdit));

  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);

  const [isLoadingOptions, setIsLoadingOptions] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadOptions() {
      setIsLoadingOptions(true);
      try {
        const [catList, mList] = await Promise.all([
          api.listExpenseCategories(),
          api.listMachines(),
        ]);
        setCategories(catList);
        setMachines(mList);

        if (!expenseToEdit && catList.length > 0) {
          setDraft((prev) => (prev.categoryId ? {} : { categoryId: catList[0].id }));
        }
      } catch (err: any) {
        console.error("Failed to load expense form options:", err);
      } finally {
        setIsLoadingOptions(false);
      }
    }
    loadOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.categoryId) {
      setError("Please select an expense category");
      return;
    }

    const parsedAmount = parseFloat(draft.amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Please enter a valid expense amount greater than 0");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const payload: CreateExpensePayload = {
      categoryId: draft.categoryId,
      amount: parsedAmount,
      machineId: draft.machineId || undefined,
      expenseDate: draft.expenseDate || undefined,
      description: draft.description.trim() || undefined,
    };

    try {
      if (expenseToEdit) {
        await api.updateExpense(expenseToEdit.id, payload);
      } else {
        await api.createExpense(payload);
      }

      notifyDataRefresh("expenses");
      onRequestClose();
    } catch (err: any) {
      setError(err.message || "Failed to save expense record");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="sa-booking-form" style={{ padding: "1.5rem" }}>
      {error && <div className="sa-alert sa-alert-danger">{error}</div>}
      {isLoadingOptions && <div className="sa-alert sa-alert-info">Loading expense categories & machines...</div>}

      {/* 1. Category & Amount */}
      <div className="sa-form-grid-2">
        <div className="sa-input-group">
          <label className="sa-input-label">Expense Category *</label>
          <select
            className="sa-input"
            value={draft.categoryId}
            onChange={(e) => setDraft({ categoryId: e.target.value })}
            required
          >
            <option value="">-- Select Category --</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <Input
          label="Amount (₹) *"
          type="number"
          min="1"
          step="1"
          placeholder="e.g. 2500"
          value={draft.amount}
          onChange={(e) => setDraft({ amount: e.target.value })}
          required
          autoFocus
        />
      </div>

      {/* 2. Linked Machine & Expense Date */}
      <div className="sa-form-grid-2">
        <div className="sa-input-group">
          <label className="sa-input-label">Linked {machineTerm} (Optional)</label>
          <SearchableSelect
            placeholder="-- General Operational Expense --"
            value={draft.machineId}
            onChange={(v) => setDraft({ machineId: v })}
            options={[
              { value: "", label: "-- General Operational Expense --" },
              ...machines.map((m) => ({
                value: m.id,
                label: `${m.registrationNumber} (${m.brand || "Machine"})`,
              })),
            ]}
          />
        </div>

        <Input
          label="Expense Date"
          type="date"
          value={draft.expenseDate}
          onChange={(e) => setDraft({ expenseDate: e.target.value })}
          required
        />
      </div>

      {/* 3. Description / Reason */}
      <div className="sa-input-group">
        <label className="sa-input-label">Description / Remarks</label>
        <textarea
          className="sa-input sa-textarea"
          rows={3}
          placeholder="Details of spare parts purchased, oil change, maintenance vendor..."
          value={draft.description}
          onChange={(e) => setDraft({ description: e.target.value })}
        />
      </div>

      {/* Actions */}
      <div className="sa-form-actions" style={{ marginTop: "1.5rem" }}>
        <Button type="button" variant="secondary" onClick={onRequestClose}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" isLoading={isSubmitting}>
          {expenseToEdit ? "Save Expense" : "Record Expense"}
        </Button>
      </div>
    </form>
  );
};
