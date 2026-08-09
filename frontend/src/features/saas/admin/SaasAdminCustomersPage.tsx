import React, { useEffect, useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { SaasAdminLayout } from "./SaasAdminLayout";
import { getAdminCustomers } from "../../../lib/saasApi";

export const SaasAdminCustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const loadCustomers = async (searchTerm?: string) => {
    setLoading(true);
    try {
      const data = await getAdminCustomers(searchTerm);
      setCustomers(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadCustomers(search);
  };

  return (
    <SaasAdminLayout>
      <div className="space-y-6">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-white">SaaS Customers & Operational Tenants</h1>
            <p className="text-xs text-slate-400">View registered business entities, tenant slugs, and subscription status</p>
          </div>

          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search business, email, phone..."
                className="pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-emerald-500 w-64"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs"
            >
              Search
            </button>
          </form>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
            <span>Fetching customer records...</span>
          </div>
        ) : customers.length > 0 ? (
          <div className="bg-slate-900/90 rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-800">
                    <th className="py-4 px-6">Business & Contact</th>
                    <th className="py-4 px-6">Email / Phone</th>
                    <th className="py-4 px-6">Location</th>
                    <th className="py-4 px-6">Tenant Slug</th>
                    <th className="py-4 px-6">License Status</th>
                    <th className="py-4 px-6">Registered Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {customers.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-800/40">
                      <td className="py-4 px-6">
                        <div className="font-bold text-white text-sm">{c.businessName}</div>
                        <div className="text-slate-400">Contact: {c.contactPerson}</div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-medium text-slate-200">{c.email}</div>
                        <div className="text-slate-400 font-mono text-[11px]">{c.phone || "N/A"}</div>
                      </td>
                      <td className="py-4 px-6 font-medium">
                        {c.state ? `${c.state}, ${c.city}` : "N/A"}
                      </td>
                      <td className="py-4 px-6 font-mono text-emerald-400 font-bold">
                        {c.tenantSlug ? (
                          <span className="flex items-center gap-1">
                            <span>{c.tenantSlug}.shabooagri.com</span>
                          </span>
                        ) : (
                          <span className="text-slate-500 font-normal">Pending Provisioning</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          c.licenseStatus === "LICENSE_ACTIVE"
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                            : "bg-slate-800 text-slate-400 border border-slate-700"
                        }`}>
                          {c.licenseStatus}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-slate-400">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center text-slate-400 text-xs">
            No customer records matching search filter.
          </div>
        )}

      </div>
    </SaasAdminLayout>
  );
};
