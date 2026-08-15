import React, { useEffect, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import "./employees.css";
import type { Employee } from "../../types/employee";
import { api } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { Card } from "../../components/ui/Card";
import { Badge, getStatusBadgeVariant } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import { EmployeeFormModal } from "./EmployeeFormModal";
import { EmployeeDetailModal } from "./EmployeeDetailModal";

const EMPLOYEE_STATUS_FILTERS: Array<{ label: string; value: string }> = [
 { label: "All", value: "ALL" },
 { label: "Active", value: "ACTIVE" },
 { label: "Inactive", value: "INACTIVE" },
];

export const EmployeesPage: React.FC = () => {
 const { roleKey, hasPermission } = useAuth();

 const [employees, setEmployees] = useState<Employee[]>([]);
 const [activeFilter, setActiveFilter] = useState<string>("ALL");
 const [searchQuery, setSearchQuery] = useState<string>("");

 const [isLoading, setIsLoading] = useState<boolean>(true);
 const [error, setError] = useState<string | null>(null);

 const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);
 const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

 const [selectedDetailEmployee, setSelectedDetailEmployee] = useState<Employee | null>(null);
 const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);

 const [deletingId, setDeletingId] = useState<string | null>(null);

 const canManage = roleKey === "owner" || hasPermission("employee.manage");

 const loadEmployees = async () => {
 setIsLoading(true);
 setError(null);
 try {
 const list = await api.listEmployees();
 setEmployees(list);

 // Refresh detail modal if open
 if (selectedDetailEmployee) {
 const updated = list.find((e) => e.id === selectedDetailEmployee.id);
 if (updated) setSelectedDetailEmployee(updated);
 }
 } catch (err: any) {
 setError(err.message || "Failed to load employees");
 } finally {
 setIsLoading(false);
 }
 };

 useEffect(() => {
 loadEmployees();
 }, []);

 const handleOpenCreate = () => {
 setEditingEmployee(null);
 setIsFormModalOpen(true);
 };

 const handleOpenEdit = (employee: Employee, e?: React.MouseEvent) => {
 if (e) e.stopPropagation();
 setEditingEmployee(employee);
 setIsDetailModalOpen(false);
 setIsFormModalOpen(true);
 };

 const handleOpenDetail = (employee: Employee) => {
 setSelectedDetailEmployee(employee);
 setIsDetailModalOpen(true);
 };

 const handleDelete = async (id: string, e?: React.MouseEvent) => {
 if (e) e.stopPropagation();
 if (!window.confirm("Are you sure you want to delete this staff record?")) {
 return;
 }
 setDeletingId(id);
 try {
 await api.deleteEmployee(id);
 setIsDetailModalOpen(false);
 loadEmployees();
 } catch (err: any) {
 alert(err.message || "Failed to delete employee record");
 } finally {
 setDeletingId(null);
 }
 };

 // Filter employees by status tab & search query
 const filteredEmployees = employees.filter((e) => {
 if (activeFilter !== "ALL" && e.employmentStatus !== activeFilter) return false;
 if (!searchQuery.trim()) return true;

 const q = searchQuery.toLowerCase();
 const name = e.name.toLowerCase();
 const role = (e.roleTitle || "").toLowerCase();
 const phone = (e.phone || "").toLowerCase();

 return name.includes(q) || role.includes(q) || phone.includes(q);
 });

 return (
 <div className="sa-employees-page">
 {/* Page Header */}
 <div className="sa-page-header">
 <div className="sa-page-header-text">
 <h2>Staff Directory</h2>
 <p>Manage company employees, staff roles, contact info & employment status</p>
 </div>

 {canManage && (
 <Button variant="primary" size="md" onClick={handleOpenCreate}>
 + Register Staff Member
 </Button>
 )}
 </div>

 {/* Filter Tabs & Search Bar */}
 <div className="sa-toolbar">
 <div className="sa-filter-tabs">
 {EMPLOYEE_STATUS_FILTERS.map((tab) => (
 <button
 key={tab.value}
 className={`sa-tab-btn ${activeFilter === tab.value ? "is-active" : ""}`}
 onClick={() => setActiveFilter(tab.value)}
 >
 {tab.label}
 {tab.value === "ALL" ? (
 <span className="sa-tab-count">({employees.length})</span>
 ) : (
 <span className="sa-tab-count">
 ({employees.filter((e) => e.employmentStatus === tab.value).length})
 </span>
 )}
 </button>
 ))}
 </div>

 <div className="sa-toolbar-search">
 <input
 type="text"
 className="sa-input sa-search-input"
 placeholder="Search by Name, Role Title, Phone..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 />
 </div>
 </div>

 {/* Main Content Area */}
 {isLoading ? (
 <div className="sa-center-viewport">
 <Spinner size="lg" label="Loading staff directory..." />
 </div>
 ) : error ? (
 <div className="sa-error-container">
 <div className="sa-error-card">
 <span className="sa-error-icon"></span>
 <h3>Error Loading Staff Directory</h3>
 <p>{error}</p>
 <Button variant="primary" onClick={loadEmployees}>
 Retry
 </Button>
 </div>
 </div>
 ) : filteredEmployees.length === 0 ? (
 <Card>
 <div className="sa-empty-state">
 <span className="sa-empty-icon"></span>
 <h3>No Staff Records Found</h3>
 <p>
 {searchQuery || activeFilter !== "ALL"
 ? "No employee records match the selected filter criteria."
 : "No company employees registered yet."}
 </p>
 {canManage && (
 <Button variant="primary" size="md" onClick={handleOpenCreate} style={{ marginTop: "1rem" }}>
 + Register First Staff Member
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
 <th>Employee Name</th>
 <th>Designation / Role</th>
 <th>Phone Number</th>
 <th>Joined Date</th>
 <th>Status</th>
 <th>Actions</th>
 </tr>
 </thead>
 <tbody>
 {filteredEmployees.map((emp) => (
 <tr
 key={emp.id}
 onClick={() => handleOpenDetail(emp)}
 className="sa-clickable-row"
 >
 <td className="sa-td-bold"> {emp.name}</td>
 <td>
 <div className="sa-cell-title">{emp.roleTitle || "Staff"}</div>
 </td>
 <td>{emp.phone || <span className="sa-text-muted">N/A</span>}</td>
 <td>
 {emp.joinedDate ? emp.joinedDate.slice(0, 10) : "N/A"}
 </td>
 <td>
 <Badge variant={getStatusBadgeVariant(emp.employmentStatus)} size="sm">
 {emp.employmentStatus}
 </Badge>
 </td>
 <td>
 <div className="sa-table-actions" onClick={(e) => e.stopPropagation()}>
 {canManage && (
 <button
 className="sa-icon-action"
 title="Edit Employee"
 onClick={(e) => handleOpenEdit(emp, e)}
 >
 <Pencil size={15} />
 </button>
 )}
 {canManage && (
 <button
 className="sa-icon-action"
 title="Delete Employee"
 disabled={deletingId === emp.id}
 onClick={(e) => handleDelete(emp.id, e)}
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
 {filteredEmployees.map((emp) => (
 <div
 key={emp.id}
 className="sa-mobile-booking-card"
 onClick={() => handleOpenDetail(emp)}
 >
 <div className="sa-booking-card-top">
 <div className="sa-booking-num"> {emp.name}</div>
 <Badge variant={getStatusBadgeVariant(emp.employmentStatus)} size="sm">
 {emp.employmentStatus}
 </Badge>
 </div>

 <div className="sa-booking-card-main">
 <div className="sa-bcard-row">
 <span className="sa-bcard-label"> Title:</span>
 <span className="sa-bcard-val">{emp.roleTitle || "Staff"}</span>
 </div>

 <div className="sa-bcard-row">
 <span className="sa-bcard-label"> Phone:</span>
 <span className="sa-bcard-val">{emp.phone || "N/A"}</span>
 </div>
 </div>
 </div>
 ))}
 </div>
 </div>
 </>
 )}

 {/* Form Modal (Create / Edit) */}
 <EmployeeFormModal
 isOpen={isFormModalOpen}
 onClose={() => setIsFormModalOpen(false)}
 onSuccess={loadEmployees}
 employeeToEdit={editingEmployee}
 />

 {/* Detail Inspection Modal */}
 <EmployeeDetailModal
 isOpen={isDetailModalOpen}
 onClose={() => setIsDetailModalOpen(false)}
 employee={selectedDetailEmployee}
 onEdit={(emp) => handleOpenEdit(emp)}
 onDelete={(id) => handleDelete(id)}
 />
 </div>
 );
};
