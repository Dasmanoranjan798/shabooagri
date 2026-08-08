import React, { useEffect, useState } from "react";
import type { CreateExpensePayload, Expense, ExpenseCategory } from "../../types/expense";
import type { Machine } from "../../types/machine";
import { api } from "../../lib/api";
import { getTerm } from "../../lib/terminology";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";

interface ExpenseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  expenseToEdit?: Expense | null;
}

export const ExpenseFormModal: React.FC<ExpenseFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  expenseToEdit,
}) => {
  const machineTerm = getTerm("machine");

  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);

  const [categoryId, setCategoryId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [machineId, setMachineId] = useState<string>("");
  const [expenseDate, setExpenseDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState<string>("");

  const [isLoadingOptions, setIsLoadingOptions] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    async function loadOptions() {
      setIsLoadingOptions(true);
      try {
        const [catList, mList] = await Promise.all([
          api.listExpenseCategories(),
          api.listMachines(),
        ]);
        setCategories(catList);
        setMachines(mList);

        if (!expenseToEdit && catList.length > 0 && !categoryId) {
          setCategoryId(catList[0].id);
        }
      } catch (err: any) {
        console.error("Failed to load expense form options:", err);
      } finally {
        setIsLoadingOptions(false);
      }
    }

    loadOptions();
  }, [isOpen, expenseToEdit]);

  useEffect(() => {
    if (expenseToEdit) {
      setCategoryId(expenseToEdit.categoryId);
      setAmount(expenseToEdit.amount.toString());
      setMachineId(expenseToEdit.machineId || "");
      setExpenseDate(
        expenseToEdit.expenseDate ? expenseToEdit.expenseDate.slice(0, 10) : new Date().toISOString().slice(0, 10)
      );
      setDescription(expenseToEdit.description || "");
    } else {
      setAmount("");
      setMachineId("");
      setExpenseDate(new Date().toISOString().slice(0, 10));
      setDescription("");
    }
  }, [expenseToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId) {
      setError("Please select an expense category");
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Please enter a valid expense amount greater than 0");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const payload: CreateExpensePayload = {
      categoryId,
      amount: parsedAmount,
      machineId: machineId || undefined,
      expenseDate: expenseDate || undefined,
      description: description.trim() || undefined,
    };

    try {
      if (expenseToEdit) {
        await api.updateExpense(expenseToEdit.id, payload);
      } else {
        await api.createExpense(payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save expense record");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={expenseToEdit ? "Edit Expense Record" : "Record New Business Expense"}
      maxWidth="500px"
    >
      <form onSubmit={handleSubmit} className="sa-booking-form">
        {error && <div className="sa-alert sa-alert-danger">{error}</div>}
        {isLoadingOptions && <div className="sa-alert sa-alert-info">Loading expense categories & machines...</div>}

        {/* 1. Category & Amount */}
        <div className="sa-form-grid-2">
          <div className="sa-input-group">
            <label className="sa-input-label">Expense Category *</label>
            <select
              className="sa-input"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
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
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            autoFocus
          />
        </div>

        {/* 2. Linked Machine & Expense Date */}
        <div className="sa-form-grid-2">
          <div className="sa-input-group">
            <label className="sa-input-label">Linked {machineTerm} (Optional)</label>
            <select
              className="sa-input"
              value={machineId}
              onChange={(e) => setMachineId(e.target.value)}
            >
              <option value="">-- General Operational Expense --</option>
              {machines.map((m) => (
                <option key={m.id} value={m.id}>
                  🚜 {m.registrationNumber} ({m.brand || "Machine"})
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Expense Date"
            type="date"
            value={expenseDate}
            onChange={(e) => setExpenseDate(e.target.value)}
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
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Actions */}
        <div className="sa-form-actions" style={{ marginTop: "1.5rem" }}>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            {expenseToEdit ? "Save Expense" : "Record Expense"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
