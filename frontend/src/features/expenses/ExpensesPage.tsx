import React, { useEffect, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import "./expenses.css";
import type { Expense, ExpenseCategory } from "../../types/expense";
import { api } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { getTerm } from "../../lib/terminology";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import { ExpenseFormModal } from "./ExpenseFormModal";
import { ExpenseDetailModal } from "./ExpenseDetailModal";

export const ExpensesPage: React.FC = () => {
 const { roleKey, hasPermission } = useAuth();
 const machineTerm = getTerm("machine");

 const [expenses, setExpenses] = useState<Expense[]>([]);
 const [categories, setCategories] = useState<ExpenseCategory[]>([]);
 const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>("ALL");
 const [searchQuery, setSearchQuery] = useState<string>("");

 const [isLoading, setIsLoading] = useState<boolean>(true);
 const [error, setError] = useState<string | null>(null);

 const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);
 const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

 const [selectedDetailExpense, setSelectedDetailExpense] = useState<Expense | null>(null);
 const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);

 const [deletingId, setDeletingId] = useState<string | null>(null);

 const canManage = roleKey === "owner" || hasPermission("expense.manage");

 const loadData = async () => {
 setIsLoading(true);
 setError(null);
 try {
 const [expList, catList] = await Promise.all([
 api.listExpenses(),
 api.listExpenseCategories(),
 ]);
 setExpenses(expList);
 setCategories(catList);

 // Refresh detail modal if open
 if (selectedDetailExpense) {
 const updated = expList.find((e) => e.id === selectedDetailExpense.id);
 if (updated) setSelectedDetailExpense(updated);
 }
 } catch (err: any) {
 setError(err.message || "Failed to load expenses");
 } finally {
 setIsLoading(false);
 }
 };

 useEffect(() => {
 loadData();
 }, []);

 const handleOpenCreate = () => {
 setEditingExpense(null);
 setIsFormModalOpen(true);
 };

 const handleOpenEdit = (expense: Expense, e?: React.MouseEvent) => {
 if (e) e.stopPropagation();
 setEditingExpense(expense);
 setIsDetailModalOpen(false);
 setIsFormModalOpen(true);
 };

 const handleOpenDetail = (expense: Expense) => {
 setSelectedDetailExpense(expense);
 setIsDetailModalOpen(true);
 };

 const handleDelete = async (id: string, e?: React.MouseEvent) => {
 if (e) e.stopPropagation();
 if (!window.confirm("Are you sure you want to delete this expense record?")) {
 return;
 }
 setDeletingId(id);
 try {
 await api.deleteExpense(id);
 setIsDetailModalOpen(false);
 loadData();
 } catch (err: any) {
 alert(err.message || "Failed to delete expense record");
 } finally {
 setDeletingId(null);
 }
 };

 // Authoritative financial totals
 const totalExpensesAmount = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
 const machineryExpensesAmount = expenses
 .filter((e) => !!e.machineId)
 .reduce((sum, exp) => sum + Number(exp.amount), 0);
 const generalExpensesAmount = totalExpensesAmount - machineryExpensesAmount;

 // Filter expenses by category & search query
 const filteredExpenses = expenses.filter((exp) => {
 if (activeCategoryFilter !== "ALL" && exp.categoryId !== activeCategoryFilter) return false;
 if (!searchQuery.trim()) return true;

 const q = searchQuery.toLowerCase();
 const catName = (exp.category?.name || "").toLowerCase();
 const desc = (exp.description || "").toLowerCase();
 const machineReg = (exp.machine?.registrationNumber || "").toLowerCase();
 const userName = (exp.incurredByUser?.fullName || "").toLowerCase();

 return (
 catName.includes(q) ||
 desc.includes(q) ||
 machineReg.includes(q) ||
 userName.includes(q)
 );
 });

 return (
 <div className="sa-expenses-page">
 {/* Page Header */}
 <div className="sa-page-header">
 <div className="sa-page-header-text">
 <h2>Expenses & Outflow</h2>
 <p>Track business operational costs, spare parts, maintenance & machine expenditure</p>
 </div>

 {canManage && (
 <Button variant="primary" size="md" onClick={handleOpenCreate}>
 + Record Expense
 </Button>
 )}
 </div>

 {/* Financial KPI Summary Cards */}
 <div className="sa-kpi-grid" style={{ marginBottom: "1.5rem" }}>
 <Card className="sa-kpi-card">
 <div className="sa-kpi-icon"></div>
 <div className="sa-kpi-content">
 <span className="sa-kpi-label">Total Outflow</span>
 <span className="sa-kpi-value" style={{ color: "#dc2626" }}>
 ₹{totalExpensesAmount.toLocaleString("en-IN")}
 </span>
 </div>
 </Card>

 <Card className="sa-kpi-card">
 <div className="sa-kpi-icon"></div>
 <div className="sa-kpi-content">
 <span className="sa-kpi-label">Machinery Expenses</span>
 <span className="sa-kpi-value">₹{machineryExpensesAmount.toLocaleString("en-IN")}</span>
 </div>
 </Card>

 <Card className="sa-kpi-card">
 <div className="sa-kpi-icon"></div>
 <div className="sa-kpi-content">
 <span className="sa-kpi-label">General Operations</span>
 <span className="sa-kpi-value">₹{generalExpensesAmount.toLocaleString("en-IN")}</span>
 </div>
 </Card>

 <Card className="sa-kpi-card">
 <div className="sa-kpi-icon"></div>
 <div className="sa-kpi-content">
 <span className="sa-kpi-label">Expense Entries</span>
 <span className="sa-kpi-value">{expenses.length}</span>
 </div>
 </Card>
 </div>

 {/* Filter Toolbar */}
 <div className="sa-toolbar">
 <div className="sa-filter-tabs">
 <button
 className={`sa-tab-btn ${activeCategoryFilter === "ALL" ? "is-active" : ""}`}
 onClick={() => setActiveCategoryFilter("ALL")}
 >
 All Categories <span className="sa-tab-count">({expenses.length})</span>
 </button>

 {categories.map((cat) => (
 <button
 key={cat.id}
 className={`sa-tab-btn ${activeCategoryFilter === cat.id ? "is-active" : ""}`}
 onClick={() => setActiveCategoryFilter(cat.id)}
 >
 {cat.name}
 <span className="sa-tab-count">
 ({expenses.filter((e) => e.categoryId === cat.id).length})
 </span>
 </button>
 ))}
 </div>

 <div className="sa-toolbar-search">
 <input
 type="text"
 className="sa-input sa-search-input"
 placeholder={`Search Category, ${machineTerm}, Details...`}
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 />
 </div>
 </div>

 {/* Main Content Area */}
 {isLoading ? (
 <div className="sa-center-viewport">
 <Spinner size="lg" label="Loading expense records..." />
 </div>
 ) : error ? (
 <div className="sa-error-container">
 <div className="sa-error-card">
 <span className="sa-error-icon"></span>
 <h3>Error Loading Expenses</h3>
 <p>{error}</p>
 <Button variant="primary" onClick={loadData}>
 Retry
 </Button>
 </div>
 </div>
 ) : filteredExpenses.length === 0 ? (
 <Card>
 <div className="sa-empty-state">
 <span className="sa-empty-icon"></span>
 <h3>No Expenses Found</h3>
 <p>
 {searchQuery || activeCategoryFilter !== "ALL"
 ? "No expense records match the selected filter criteria."
 : "No operational expenses recorded yet."}
 </p>
 {canManage && (
 <Button variant="primary" size="md" onClick={handleOpenCreate} style={{ marginTop: "1rem" }}>
 + Record First Expense
 </Button>
 )}
 </div>
 </Card>
 ) : (
 <>
 {/* Desktop Table View */}
 <div className="sa-desktop-only">
 <Card>
 <div className="sa-table-responsive">
 <table className="sa-table">
 <thead>
 <tr>
 <th>Expense Date</th>
 <th>Category</th>
 <th>Amount</th>
 <th>Linked {machineTerm}</th>
 <th>Recorded By</th>
 <th>Description</th>
 <th>Actions</th>
 </tr>
 </thead>
 <tbody>
 {filteredExpenses.map((exp) => (
 <tr
 key={exp.id}
 onClick={() => handleOpenDetail(exp)}
 className="sa-clickable-row"
 >
 <td> {new Date(exp.expenseDate).toLocaleDateString("en-IN")}</td>
 <td>
 <Badge variant="neutral" size="sm">
 {exp.category?.name || "Expense"}
 </Badge>
 </td>
 <td className="sa-amount-bold sa-text-danger">
 ₹{Number(exp.amount).toLocaleString("en-IN")}
 </td>
 <td>
 {exp.machine?.registrationNumber ? (
 <span className="sa-cell-title"> {exp.machine.registrationNumber}</span>
 ) : (
 <span className="sa-text-muted">General</span>
 )}
 </td>
 <td>
 <div className="sa-cell-title">{exp.incurredByUser?.fullName || "Staff"}</div>
 </td>
 <td>
 <div className="sa-cell-title">{exp.description || "—"}</div>
 </td>
 <td>
 <div className="sa-table-actions" onClick={(e) => e.stopPropagation()}>
 {canManage && (
 <button
 className="sa-icon-action"
 title="Edit Expense"
 onClick={(e) => handleOpenEdit(exp, e)}
 >
 <Pencil size={15} />
 </button>
 )}
 {canManage && (
 <button
 className="sa-icon-action"
 title="Delete Expense"
 disabled={deletingId === exp.id}
 onClick={(e) => handleDelete(exp.id, e)}
 >
 <Trash2 size={15} />
 </button>
 )}
 </div>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </Card>
 </div>

 {/* Mobile Card List View */}
 <div className="sa-mobile-only">
 <div className="sa-mobile-booking-list">
 {filteredExpenses.map((exp) => (
 <div
 key={exp.id}
 className="sa-mobile-booking-card"
 onClick={() => handleOpenDetail(exp)}
 >
 <div className="sa-booking-card-top">
 <Badge variant="neutral" size="sm">
 {exp.category?.name || "Expense"}
 </Badge>
 <span className="sa-amount-bold sa-text-danger" style={{ fontSize: "1.1rem" }}>
 ₹{Number(exp.amount).toLocaleString("en-IN")}
 </span>
 </div>

 <div className="sa-booking-card-main">
 <div className="sa-bcard-row">
 <span className="sa-bcard-label"> Date:</span>
 <span className="sa-bcard-val">
 {new Date(exp.expenseDate).toLocaleDateString("en-IN")}
 </span>
 </div>

 {exp.machine?.registrationNumber && (
 <div className="sa-bcard-row">
 <span className="sa-bcard-label"> {machineTerm}:</span>
 <span className="sa-bcard-val">{exp.machine.registrationNumber}</span>
 </div>
 )}

 {exp.description && (
 <div className="sa-bcard-row">
 <span className="sa-bcard-label"> Details:</span>
 <span className="sa-bcard-val">{exp.description}</span>
 </div>
 )}
 </div>
 </div>
 ))}
 </div>
 </div>
 </>
 )}

 {/* Form Modal (Create / Edit) */}
 <ExpenseFormModal
 isOpen={isFormModalOpen}
 onClose={() => setIsFormModalOpen(false)}
 onSuccess={loadData}
 expenseToEdit={editingExpense}
 />

 {/* Detail Inspection Modal */}
 <ExpenseDetailModal
 isOpen={isDetailModalOpen}
 onClose={() => setIsDetailModalOpen(false)}
 expense={selectedDetailExpense}
 onEdit={(exp) => handleOpenEdit(exp)}
 onDelete={(id) => handleDelete(id)}
 />
 </div>
 );
};
