import React, { useState } from "react";
import "../saas.css";
import { HelpCircle, ChevronDown, ChevronUp } from "lucide-react";
import { SaasHeader } from "../components/SaasHeader";
import { SaasFooter } from "../components/SaasFooter";

export const SaasFaqPage: React.FC = () => {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const faqs = [
    {
      q: "What is ShabooAgri?",
      a: "ShabooAgri is a dedicated commercial Business Operating System built specifically for agricultural machinery owners, tractor fleets, Custom Hiring Centres (CHCs), and field-operation contractors across India.",
    },
    {
      q: "Who can use ShabooAgri?",
      a: "Tractor fleet owners, Custom Hiring Centres (CHCs), combine harvester contractors, JCB earthmover operators, equipment rental businesses, FPOs, and multi-machine agricultural service providers.",
    },
    {
      q: "What businesses are supported?",
      a: "Both small independent equipment owners (1-3 tractors/implements) and large commercial enterprises (20+ harvesters, CHCs, and multi-district contract operators).",
    },
    {
      q: "What machinery can be managed?",
      a: "Tractors (all HP classes), rotavators, cultivators, combine harvesters (paddy/wheat), JCBs & backhoes, boom sprayers, paddy transplanters, laser land levellers, and straw balers.",
    },
    {
      q: "How much does it cost?",
      a: "ShabooAgri costs ₹4,999 / year INCLUDING 18% GST. There are no per-machine surcharges or hidden fees.",
    },
    {
      q: "Is GST included in the ₹4,999 pricing?",
      a: "Yes! The total customer payment is strictly ₹4,999.00. This includes ₹4,236.44 taxable value and ₹762.56 statutory GST (CGST+SGST or IGST).",
    },
    {
      q: "How long is the software license valid?",
      a: "The commercial license is valid for 1 full calendar year (365 days) from the date of license issuance.",
    },
    {
      q: "What happens after registration?",
      a: "After creating your account on shabooagri.com, you are logged into your commercial Customer Portal where you can view your account status, license key, payment receipts, and software access status.",
    },
    {
      q: "How does the customer access their operational software?",
      a: "Once commercial provisioning is initialized for your business, your dedicated operational software environment is assigned (target architecture: [your-business-slug].shabooagri.com). You can launch it directly from the Customer Portal.",
    },
    {
      q: "Can multiple machines be managed simultaneously?",
      a: "Yes. Unlimited machinery cataloging is included in your standard annual license.",
    },
    {
      q: "Can businesses manage drivers and operators?",
      a: "Yes! ShabooAgri supports driver profile logs, assigned machine pairings, and flexible compensation models (hourly wages vs monthly/yearly fixed salaries).",
    },
    {
      q: "Can businesses manage farmer/customer payment balances?",
      a: "Yes! Every grower/customer has a digital profile ledger tracking job work history, total invoiced amounts, cash/UPI payments received, and remaining uncollected balances.",
    },
    {
      q: "Does ShabooAgri support GST invoices and receipts?",
      a: "Yes. Invoices feature monotonic sequential numbering, GST breakdown, partial payment logs, and formatted digital receipts.",
    },
    {
      q: "Can customers provide product feedback and feature requests?",
      a: "Yes! Inside your Customer Portal, you can submit feature requests and feedback directly to our product engineering team.",
    },
    {
      q: "How can customer support be contacted?",
      a: "You can reach out via the Contact Support form inside your Customer Portal, submit an enquiry on shabooagri.com/contact, or email support@shabooagri.com.",
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--saas-bg)] text-slate-900 flex flex-col font-sans">
      <SaasHeader />

      {/* Hero Section */}
      <section className="py-16 sm:py-20 bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[var(--saas-primary)] text-xs font-bold uppercase tracking-wider">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Frequently Asked Questions</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Everything You Need to Know About ShabooAgri
          </h1>
          <p className="text-slate-600 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
            Got questions about pricing, licenses, machinery support, or software access? We have clear answers.
          </p>
        </div>
      </section>

      {/* Accordion FAQ */}
      <section className="py-16 sm:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openIdx === idx;
              return (
                <div
                  key={idx}
                  className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-all"
                >
                  <button
                    onClick={() => setOpenIdx(isOpen ? null : idx)}
                    className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 font-bold text-slate-900 text-sm sm:text-base hover:text-[var(--saas-primary)] focus:outline-none"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-[var(--saas-primary)] shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 animate-fadeIn">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <SaasFooter />
    </div>
  );
};
