import React, { useState } from "react";
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <SaasHeader />

      {/* HEADER SECTION */}
      <section className="py-16 bg-gradient-to-b from-slate-900 to-slate-950 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950 border border-emerald-500/30 text-emerald-300 text-xs font-bold uppercase tracking-wider">
            <HelpCircle className="w-4 h-4" />
            <span>Frequently Asked Questions</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white">
            Everything You Need to Know About ShabooAgri
          </h1>
          <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto">
            Got questions about pricing, licenses, machinery support, or software access? We have clear answers.
          </p>
        </div>
      </section>

      {/* ACCORDION FAQ */}
      <section className="py-16 lg:py-24 bg-slate-950">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-4">
            {faqs.map((faq, idx) => {
              const isOpen = openIdx === idx;
              return (
                <div
                  key={idx}
                  className="bg-slate-900/80 rounded-2xl border border-slate-800 overflow-hidden transition-colors"
                >
                  <button
                    onClick={() => setOpenIdx(isOpen ? null : idx)}
                    className="w-full px-6 py-5 text-left flex items-center justify-between gap-4 font-bold text-white text-base sm:text-lg hover:text-emerald-400 focus:outline-none"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? (
                      <ChevronUp className="w-5 h-5 text-emerald-400 shrink-0" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-500 shrink-0" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="px-6 pb-6 pt-1 text-sm text-slate-300 leading-relaxed border-t border-slate-800/60 animate-fadeIn">
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
