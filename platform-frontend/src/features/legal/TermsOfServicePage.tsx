import React from "react";
import { Link } from "react-router-dom";
import { LegalLayout, Section } from "./LegalLayout";

export const TermsOfServicePage: React.FC = () => {
  return (
    <LegalLayout title="Terms of Service" effectiveDate="August 17, 2026">
      <p style={{ marginBottom: 28, fontSize: "0.95rem", lineHeight: 1.7 }}>
        These Terms of Service ("Terms") are a binding agreement between you ("you," "User," or "Customer") and
        ShabooAgri ("ShabooAgri," "we," "us," or "our") governing your access to and use of the ShabooAgri
        software-as-a-service platform, including our website, dashboards, mobile-optimized web applications, and
        any related services (collectively, the "Service"). By creating an account, accessing, or using the
        Service, you agree to be bound by these Terms. If you do not agree, do not access or use the Service.
      </p>

      <Section number="1" title="Acceptance of Terms &amp; Eligibility">
        <p>
          By registering for an account, clicking "I Agree," or otherwise accessing the Service, you confirm that
          you have read, understood, and agree to be bound by these Terms, along with our Privacy Policy and Refund
          Policy, each of which is incorporated into these Terms by reference.
        </p>
        <p>To use the Service, you must:</p>
        <ul>
          <li>Be at least 18 years of age and have the legal capacity to enter into a binding contract under Indian law;</li>
          <li>Be registering on behalf of a genuine agricultural equipment rental, custom hiring, or allied business, or be duly authorized to act on such a business's behalf;</li>
          <li>Provide accurate, current, and complete information during registration and keep it up to date; and</li>
          <li>Not be barred from using the Service under any applicable law.</li>
        </ul>
        <p>
          If you are registering on behalf of a company, firm, proprietorship, or other entity, you represent that
          you have the authority to bind that entity to these Terms, and "you" in these Terms refers to both you
          individually and that entity.
        </p>
      </Section>

      <Section number="2" title="Description of the Service">
        <p>
          ShabooAgri is a cloud-based software-as-a-service platform purpose-built for agricultural equipment
          rental and custom hiring center (CHC) businesses. The Service enables owners and their teams to manage
          bookings, machines, drivers, employees, customers/farmers, jobs, pricing, invoicing, payments, and related
          business operations from a single dashboard, along with a driver-facing mobile-optimized interface for
          field staff.
        </p>
        <p>
          We may add, modify, or discontinue features of the Service from time to time in order to improve it,
          respond to user needs, or comply with legal or technical requirements. We will make reasonable efforts to
          notify you of material changes that affect your use of the Service, but minor feature changes,
          improvements, and bug fixes may be made without prior notice.
        </p>
      </Section>

      <Section number="3" title="Subscription Plans, Pricing, Billing &amp; Auto-Renewal">
        <p>
          <strong>3.1 Plans.</strong> ShabooAgri offers subscription plans differentiated primarily by the number of
          machines you may register on your account. Current plans, machine limits, and pricing are published on our{" "}
          <Link to="/pricing">Pricing page</Link> and may be updated by us from time to time; changes to pricing
          will not retroactively affect a subscription period you have already paid for.
        </p>
        <p>
          <strong>3.2 Billing cycle.</strong> Subscriptions are billed on an annual basis unless otherwise stated at
          the time of purchase. The subscription fee covers the plan's machine limit; additional machines beyond
          your plan's limit may be added for an additional annual fee per machine, as displayed at checkout and on
          the Pricing page.
        </p>
        <p>
          <strong>3.3 Payment.</strong> All fees are quoted and payable in Indian Rupees (INR) and are processed
          through our third-party payment gateway. You authorize us (via our payment gateway) to charge your chosen
          payment method for all applicable fees, including applicable taxes such as GST.
        </p>
        <p>
          <strong>3.4 Renewal.</strong> Unless cancelled by you before the end of the current subscription period in
          accordance with Section 3.6, your subscription will be presented for renewal at the then-current price for
          the plan, and you will need to complete payment to continue uninterrupted access. We do not currently
          store card details for automatic recurring charges without your active confirmation at each renewal;
          where auto-renewal via saved payment instruments is enabled for a given payment method, we will provide
          advance notice as required under applicable Reserve Bank of India (RBI) recurring-payment regulations.
        </p>
        <p>
          <strong>3.5 Taxes.</strong> All fees are exclusive of applicable taxes unless stated otherwise. Goods and
          Services Tax (GST) and any other applicable statutory levies will be added to your invoice in accordance
          with applicable Indian law, based on your registered billing address and GSTIN (where provided).
        </p>
        <p>
          <strong>3.6 Non-renewal / cancellation.</strong> You may choose not to renew your subscription at any time
          by simply not completing the renewal payment before your current license expires. See our{" "}
          <Link to="/refund-policy">Refund Policy</Link> for details on refund eligibility and the effect of
          cancellation on your data and access.
        </p>
      </Section>

      <Section number="4" title="User Responsibilities &amp; Acceptable Use">
        <p>You agree that you will:</p>
        <ul>
          <li>Provide accurate business, contact, and billing information and keep your account credentials confidential;</li>
          <li>Be responsible for all activity that occurs under your account, including actions taken by staff, drivers, or other users you invite;</li>
          <li>Use the Service only for lawful business purposes related to equipment rental, custom hiring, and directly related operations;</li>
          <li>Ensure that any customer, farmer, employee, or driver data you upload to the Service has been collected lawfully and that you have the right to process it as you do;</li>
          <li>Promptly notify us of any unauthorized use of your account or any other breach of security.</li>
        </ul>
        <p>You agree that you will <strong>not</strong>, and will not permit any user of your account to:</p>
        <ul>
          <li>Use the Service to transmit unlawful, defamatory, fraudulent, or infringing content;</li>
          <li>Attempt to gain unauthorized access to the Service, other users' accounts or data, or our underlying systems and infrastructure;</li>
          <li>Reverse engineer, decompile, disassemble, or otherwise attempt to derive the source code of the Service, except to the extent such restriction is prohibited by applicable law;</li>
          <li>Use automated means (bots, scrapers, or similar) to access the Service outside of the interfaces we provide, or to circumvent usage or plan limits;</li>
          <li>Introduce viruses, malware, or other harmful code, or attempt to disrupt, overload, or impair the Service's availability or performance;</li>
          <li>Resell, sublicense, or provide the Service to third parties as a standalone product without our prior written consent; or</li>
          <li>Use the Service in a manner that violates any applicable local, state, national, or international law or regulation.</li>
        </ul>
        <p>
          We reserve the right to investigate and take appropriate action against anyone who, in our sole
          discretion, violates this policy, including removing content, suspending or terminating accounts, and
          reporting matters to law enforcement authorities where warranted.
        </p>
      </Section>

      <Section number="5" title="Data Ownership">
        <p>
          As between you and ShabooAgri, you retain all ownership rights in the business data you input into the
          Service — including but not limited to your customer and farmer records, booking and job data, machine
          and driver information, pricing configurations, invoices, and any files or documents you upload
          (collectively, "Customer Data"). We do not claim ownership of your Customer Data.
        </p>
        <p>
          You grant ShabooAgri a limited, non-exclusive, worldwide license to host, store, process, transmit, and
          display your Customer Data solely to the extent necessary to provide, maintain, secure, and improve the
          Service to you, and as otherwise described in our <Link to="/privacy">Privacy Policy</Link>.
        </p>
        <p>
          You are solely responsible for the accuracy, quality, legality, and appropriateness of Customer Data you
          submit to the Service, and for obtaining any consents required from third parties (such as your customers
          or employees) whose data you input.
        </p>
      </Section>

      <Section number="6" title="Intellectual Property Rights">
        <p>
          The Service, including its software, source code, user interface, design, "ShabooAgri" name and logo,
          documentation, and all underlying technology, is and remains the exclusive property of ShabooAgri and its
          licensors. These Terms do not grant you any right, title, or interest in the Service, its intellectual
          property, or the ShabooAgri brand, except for the limited right to access and use the Service as
          expressly permitted under these Terms.
        </p>
        <p>
          You may not copy, modify, distribute, sell, or lease any part of the Service, nor may you use our
          trademarks, logos, or branding without our prior written permission.
        </p>
        <p>
          Any feedback, suggestions, or ideas you voluntarily submit to us about the Service may be used by us
          without restriction or obligation to you, and will not be treated as confidential.
        </p>
      </Section>

      <Section number="7" title="Service Availability &amp; Disclaimers">
        <p>
          We aim to keep the Service available and performing reliably at all times, and we take reasonable
          measures — including regular backups and monitoring — to support that goal. However, the Service is
          provided on an "as is" and "as available" basis. We do not guarantee that the Service will be
          uninterrupted, error-free, or completely secure, and we do not warrant any specific uptime percentage
          unless separately agreed to in writing (such as under a distinct enterprise service-level agreement).
        </p>
        <p>
          Scheduled maintenance, third-party infrastructure outages (including our hosting and payment gateway
          providers), internet connectivity issues, or events beyond our reasonable control may result in temporary
          unavailability of the Service. We will make reasonable efforts to minimize disruption and to provide
          advance notice of planned maintenance where practical.
        </p>
        <p>
          Except as expressly stated in these Terms, we disclaim all warranties, express or implied, including
          implied warranties of merchantability, fitness for a particular purpose, and non-infringement, to the
          maximum extent permitted by applicable law.
        </p>
      </Section>

      <Section number="8" title="Limitation of Liability">
        <p>
          To the maximum extent permitted by applicable law, ShabooAgri and its officers, employees, and agents
          shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including
          loss of profits, revenue, data, business opportunity, or goodwill, arising out of or in connection with
          your use of, or inability to use, the Service, even if we have been advised of the possibility of such
          damages.
        </p>
        <p>
          To the maximum extent permitted by applicable law, our total aggregate liability arising out of or
          relating to these Terms or the Service, whether in contract, tort, or otherwise, shall not exceed the
          total subscription fees actually paid by you to ShabooAgri in the twelve (12) months immediately
          preceding the event giving rise to the claim.
        </p>
        <p>
          Nothing in these Terms limits or excludes liability that cannot be limited or excluded under applicable
          Indian law, including liability arising from our fraud or willful misconduct.
        </p>
      </Section>

      <Section number="9" title="Account Suspension &amp; Termination">
        <p>
          <strong>9.1 By you.</strong> You may stop using the Service and let your subscription lapse at any time.
          You may also request account deletion by contacting us as described in Section 13, subject to our data
          retention obligations described in our <Link to="/privacy">Privacy Policy</Link>.
        </p>
        <p>
          <strong>9.2 By us.</strong> We may suspend or terminate your access to the Service, with or without
          notice, if:
        </p>
        <ul>
          <li>You breach these Terms, including the Acceptable Use provisions in Section 4;</li>
          <li>Your subscription payment fails, is reversed, or your subscription period expires without renewal;</li>
          <li>Your use of the Service poses a security risk to us or other users;</li>
          <li>We are required to do so by law or by a competent governmental or regulatory authority; or</li>
          <li>We discontinue the Service generally, in which case we will provide reasonable advance notice where practicable.</li>
        </ul>
        <p>
          Upon termination, your right to access the Service will cease. We will handle any Customer Data
          associated with a terminated account in accordance with our <Link to="/privacy">Privacy Policy</Link> and
          applicable law. Sections of these Terms that by their nature should survive termination (including
          Sections 5, 6, 8, 10, and 11) will survive.
        </p>
      </Section>

      <Section number="10" title="Governing Law &amp; Jurisdiction">
        <p>
          These Terms and any dispute arising out of or in connection with them, the Service, or your use of it,
          shall be governed by and construed in accordance with the laws of India, without regard to its conflict
          of law principles.
        </p>
        <p>
          Subject to Section 11 (Dispute Resolution), the courts of competent jurisdiction at Balasore, Odisha,
          India shall have exclusive jurisdiction over any disputes arising out of or relating to these Terms or
          the Service, and you consent to the exclusive jurisdiction of such courts.
        </p>
      </Section>

      <Section number="11" title="Dispute Resolution">
        <p>
          We encourage you to first contact us at{" "}
          <a href="mailto:support.shaboo@gmail.com">support.shaboo@gmail.com</a> to attempt to resolve any dispute,
          claim, or controversy arising out of or relating to these Terms or the Service informally. We will make
          good-faith efforts to resolve the matter within thirty (30) days of receiving your written complaint.
        </p>
        <p>
          If a dispute is not resolved informally within a reasonable time, either party may refer the dispute to
          arbitration under the Arbitration and Conciliation Act, 1996 (as amended), conducted by a sole arbitrator
          mutually appointed by the parties, seated in Balasore, Odisha, India, with proceedings conducted in
          English. The arbitration award shall be final and binding on both parties, subject to any rights of
          appeal available under applicable law. Nothing in this Section prevents either party from seeking
          interim or injunctive relief from a court of competent jurisdiction where necessary.
        </p>
      </Section>

      <Section number="12" title="Changes to These Terms">
        <p>
          We may update these Terms from time to time to reflect changes in our Service, legal or regulatory
          requirements, or business practices. When we make material changes, we will notify you by email to your
          registered address, through an in-product notice, or via an announcement on our website, at least seven
          (7) days before the changes take effect, unless a shorter period is required by law or by the nature of
          the change (for example, changes required for security or legal compliance).
        </p>
        <p>
          Your continued use of the Service after the effective date of updated Terms constitutes your acceptance
          of those changes. If you do not agree to the updated Terms, you must stop using the Service and may
          cancel your subscription in accordance with Section 9.1.
        </p>
      </Section>

      <Section number="13" title="Contact Information">
        <p>For any questions about these Terms, legal notices, or general queries, please contact us at:</p>
        <p>
          <strong>ShabooAgri Support</strong>
          <br />
          Email: <a href="mailto:support.shaboo@gmail.com">support.shaboo@gmail.com</a>
          <br />
          Or via our <Link to="/contact">Contact Us</Link> page.
        </p>
      </Section>
    </LegalLayout>
  );
};
