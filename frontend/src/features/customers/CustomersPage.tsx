import React, { useEffect, useState } from "react";
import type { Customer } from "../../types/customer";
import { api } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { getTerm } from "../../lib/terminology";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import { CustomerFormModal } from "./CustomerFormModal";
import { CustomerDetailModal } from "./CustomerDetailModal";

export const CustomersPage: React.FC = () => {
 const { roleKey, hasPermission } = useAuth();
 const customerTerm = getTerm("customer", true);
 const villageTerm = getTerm("village");

 const [customers, setCustomers] = useState<Customer[]>([]);
 const [searchQuery, setSearchQuery] = useState<string>("");

 const [isLoading, setIsLoading] = useState<boolean>(true);
 const [error, setError] = useState<string | null>(null);

 const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);
 const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

 const [selectedDetailCustomer, setSelectedDetailCustomer] = useState<Customer | null>(null);
 const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);

 const [deletingId, setDeletingId] = useState<string | null>(null);

 const canManage = roleKey === "owner" || hasPermission("customer.manage");

 const loadCustomers = async () => {
 setIsLoading(true);
 setError(null);
 try {
 const list = await api.listCustomers();
 setCustomers(list);

 // Refresh detail modal if open
 if (selectedDetailCustomer) {
 const updated = list.find((c) => c.id === selectedDetailCustomer.id);
 if (updated) setSelectedDetailCustomer(updated);
 }
 } catch (err: any) {
 setError(err.message || `Failed to load ${customerTerm.toLowerCase()}`);
 } finally {
 setIsLoading(false);
 }
 };

 useEffect(() => {
 loadCustomers();
 }, []);

 const handleOpenCreate = () => {
 setEditingCustomer(null);
 setIsFormModalOpen(true);
 };

 const handleOpenEdit = (customer: Customer, e?: React.MouseEvent) => {
 if (e) e.stopPropagation();
 setEditingCustomer(customer);
 setIsDetailModalOpen(false);
 setIsFormModalOpen(true);
 };

 const handleOpenDetail = (customer: Customer) => {
 setSelectedDetailCustomer(customer);
 setIsDetailModalOpen(true);
 };

 const handleDelete = async (id: string, e?: React.MouseEvent) => {
 if (e) e.stopPropagation();
 if (!window.confirm(`Are you sure you want to delete this ${getTerm("customer")} record?`)) {
 return;
 }
 setDeletingId(id);
 try {
 await api.deleteCustomer(id);
 setIsDetailModalOpen(false);
 loadCustomers();
 } catch (err: any) {
 alert(err.message || `Failed to delete ${getTerm("customer")} record`);
 } finally {
 setDeletingId(null);
 }
 };

 // Filter customers by search query
 const filteredCustomers = customers.filter((c) => {
 if (!searchQuery.trim()) return true;

 const q = searchQuery.toLowerCase();
 const name = c.name.toLowerCase();
 const village = (c.village?.name || "").toLowerCase();
 const phone = (c.phone || "").toLowerCase();
 const address = (c.address || "").toLowerCase();

 return name.includes(q) || village.includes(q) || phone.includes(q) || address.includes(q);
 });

 return (
 <div className="sa-customers-page">
 {/* Page Header */}
 <div className="sa-page-header">
 <div className="sa-page-header-text">
 <h2>{customerTerm} Directory</h2>
 <p>Manage customer profiles, village linkages, locations & contact records</p>
 </div>

 {canManage && (
 <Button variant="primary" size="md" onClick={handleOpenCreate}>
 + Register {getTerm("customer")}
 </Button>
 )}
 </div>

 {/* Toolbar Search Bar */}
 <div className="sa-toolbar">
 <div className="sa-toolbar-search" style={{ minWidth: "300px" }}>
 <input
 type="text"
 className="sa-input sa-search-input"
 placeholder={`Search by Name, ${villageTerm}, Phone, Address...`}
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 />
 </div>
 </div>

 {/* Main Content Area */}
 {isLoading ? (
 <div className="sa-center-viewport">
 <Spinner size="lg" label={`Loading ${customerTerm.toLowerCase()}...`} />
 </div>
 ) : error ? (
 <div className="sa-error-container">
 <div className="sa-error-card">
 <span className="sa-error-icon"></span>
 <h3>Error Loading Customers</h3>
 <p>{error}</p>
 <Button variant="primary" onClick={loadCustomers}>
 Retry
 </Button>
 </div>
 </div>
 ) : filteredCustomers.length === 0 ? (
 <Card>
 <div className="sa-empty-state">
 <span className="sa-empty-icon"></span>
 <h3>No {customerTerm} Found</h3>
 <p>
 {searchQuery
 ? "No customer records match the search query."
 : `No ${customerTerm.toLowerCase()} registered yet.`}
 </p>
 {canManage && (
 <Button variant="primary" size="md" onClick={handleOpenCreate} style={{ marginTop: "1rem" }}>
 + Register First {getTerm("customer")}
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
 <th>{getTerm("customer")} Name</th>
 <th>{villageTerm}</th>
 <th>Phone Number</th>
 <th>Address / Location</th>
 <th>Portal Access</th>
 <th>Actions</th>
 </tr>
 </thead>
 <tbody>
 {filteredCustomers.map((c) => (
 <tr
 key={c.id}
 onClick={() => handleOpenDetail(c)}
 className="sa-clickable-row"
 >
 <td className="sa-td-bold"> {c.name}</td>
 <td>
 <div className="sa-cell-title">{c.village?.name || "Village"}</div>
 </td>
 <td>{c.phone || <span className="sa-text-muted">N/A</span>}</td>
 <td>
 <div className="sa-cell-title">{c.address || <span className="sa-text-muted">N/A</span>}</div>
 </td>
 <td>
 {c.userId ? (
 <span className="sa-badge sa-badge-sm sa-badge-success">Linked</span>
 ) : (
 <span className="sa-text-muted" style={{ fontSize: "0.8rem" }}>Standard</span>
 )}
 </td>
 <td>
 <div className="sa-table-actions" onClick={(e) => e.stopPropagation()}>
 {canManage && (
 <button
 className="sa-icon-action"
 title="Edit Customer"
 onClick={(e) => handleOpenEdit(c, e)}
 >
 
 </button>
 )}
 {canManage && (
 <button
 className="sa-icon-action"
 title="Delete Customer"
 disabled={deletingId === c.id}
 onClick={(e) => handleDelete(c.id, e)}
 >
 
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
 {filteredCustomers.map((c) => (
 <div
 key={c.id}
 className="sa-mobile-booking-card"
 onClick={() => handleOpenDetail(c)}
 >
 <div className="sa-booking-card-top">
 <div className="sa-booking-num"> {c.name}</div>
 <span className="sa-cell-sub">{c.village?.name}</span>
 </div>

 <div className="sa-booking-card-main">
 <div className="sa-bcard-row">
 <span className="sa-bcard-label"> Phone:</span>
 <span className="sa-bcard-val">{c.phone || "N/A"}</span>
 </div>

 {c.address && (
 <div className="sa-bcard-row">
 <span className="sa-bcard-label"> Address:</span>
 <span className="sa-bcard-val">{c.address}</span>
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
 <CustomerFormModal
 isOpen={isFormModalOpen}
 onClose={() => setIsFormModalOpen(false)}
 onSuccess={loadCustomers}
 customerToEdit={editingCustomer}
 />

 {/* Detail Inspection Modal */}
 <CustomerDetailModal
 isOpen={isDetailModalOpen}
 onClose={() => setIsDetailModalOpen(false)}
 customer={selectedDetailCustomer}
 onEdit={(c) => handleOpenEdit(c)}
 onDelete={(id) => handleDelete(id)}
 />
 </div>
 );
};
