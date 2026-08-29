import React from "react";
import { Link } from "react-router-dom";
import { LegalLayout, Section } from "./LegalLayout";

export const PrivacyPolicyPage: React.FC = () => {
  return (
    <LegalLayout title="Privacy Policy" effectiveDate="August 24, 2026">
      <p style={{ marginBottom: 28, fontSize: "0.95rem", lineHeight: 1.7 }}>
        This Privacy Policy explains how ShabooAgri ("ShabooAgri," "we," "us," or "our") collects, uses, discloses,
        and protects information when you use our website, our software-as-a-service platform, and our mobile and
        desktop applications — including the ShabooAgri Android application distributed through Google Play
        (collectively, the "Service"). It applies to business owners who register for the Service, their staff,
        drivers and farmers who are granted access, and visitors to our marketing website. The same practices
        described here govern the Service whether you access it from a web browser or from the ShabooAgri app. By
        using the Service, you agree to the collection and use of information as described in this Policy.
      </p>

      <Section number="1" title="Information We Collect">
        <p><strong>1.1 Account &amp; business information.</strong> When you register, we collect information such as your business name, contact person name, email address, phone number, business address, city, state, PIN code, and — where you provide them — GSTIN and PAN, for billing and tax-compliance purposes.</p>
        <p><strong>1.2 Customer/farmer &amp; operational records.</strong> As part of using the Service — whether from the website or the ShabooAgri app — you and your staff may input records relating to your own customers or farmers (such as name, contact details, and village/location), your machines, drivers, employees, bookings, jobs, payments, advances, and invoices. This data is your Customer Data, as described in our <Link to="/terms">Terms of Service</Link>, and we process it on your behalf and at your direction. Payment and advance records captured in the app are operational accounting entries (amount, method such as cash/UPI, date, and reference) — the app does not collect or store cardholder data (see Section 1.3).</p>
        <p><strong>1.3 Payment information.</strong> When you make a payment, your card, UPI, or other payment instrument details are collected and processed directly by our third-party payment gateway. We do not store your full card numbers or payment credentials on our own servers — we retain only transaction references, amounts, status, and metadata needed for invoicing, reconciliation, and support.</p>
        <p><strong>1.4 Usage &amp; technical data.</strong> When you use the Service, our servers automatically log certain technical information, including IP address, browser type and version, device/operating-system information, pages or endpoints accessed, timestamps, and general usage patterns, to help us operate, secure, troubleshoot, and improve the Service. The ShabooAgri app does <strong>not</strong> contain any third-party advertising, analytics, or tracking SDKs, and does not collect advertising identifiers; website analytics are limited to our marketing website as described in Section 6.</p>
        <p><strong>1.5 Communications.</strong> When you contact us through our Feedback form, Contact Us / support form, or by email, we collect the information you provide, including your name, email address, and the content of your message.</p>
        <p><strong>1.6 Camera &amp; photos (app).</strong> The ShabooAgri app can, at your initiative, use your device camera or let you select an existing photo to attach images to bookings and jobs for operational documentation. Images are accessed only when you choose to add a photo, and are uploaded to and stored on our servers as part of the associated record. The app requests camera access for this purpose; it does not request device-location or background access.</p>
        <p><strong>1.7 On-device storage (app).</strong> The ShabooAgri app is offline-first: your operational data and your authentication session are stored locally on your device (in an on-device database and in the platform's encrypted secure storage) so the app works without a connection, and are synchronized with our servers over an encrypted connection when you are online. This on-device data remains on your device until you log out or uninstall the app, or it is cleared by you or your device.</p>
      </Section>

      <Section number="2" title="How and Why We Use Your Data">
        <p>We use the information described above for the following purposes:</p>
        <ul>
          <li>To create and administer your account, and to provide, operate, and maintain the Service;</li>
          <li>To process payments, generate invoices, and comply with tax and accounting obligations;</li>
          <li>To communicate with you about your account, transactions, service updates, and security notices;</li>
          <li>To respond to feedback, support requests, and other communications you send us;</li>
          <li>To monitor, secure, troubleshoot, and improve the performance and reliability of the Service;</li>
          <li>To detect, investigate, and prevent fraud, abuse, or violations of our Terms of Service;</li>
          <li>To comply with applicable legal, regulatory, and law-enforcement obligations; and</li>
          <li>With your consent, to send you product updates, tips, or promotional communications, which you may opt out of at any time.</li>
        </ul>
        <p>
          We do not sell your personal data, or your Customer Data, to third parties, and we do not use your
          Customer Data for advertising purposes.
        </p>
      </Section>

      <Section number="3" title="Data Storage, Security &amp; Retention">
        <p>
          Your data is stored on secured servers, protected using industry-standard measures including encrypted
          connections (HTTPS/TLS) for data in transit, access controls limiting who within ShabooAgri can access
          production data, and regular backups. Passwords are never stored in plain text — they are hashed using
          industry-standard cryptographic algorithms.
        </p>
        <p>
          While we take reasonable and appropriate technical and organizational measures to protect your data, no
          method of transmission over the internet or electronic storage is 100% secure, and we cannot guarantee
          absolute security.
        </p>
        <p>
          We retain your account and Customer Data for as long as your account remains active, and for a reasonable
          period thereafter (typically up to 12 months following account termination or non-renewal) to allow for
          account reactivation, comply with legal/tax record-keeping obligations, and resolve disputes, after which
          it will be securely deleted or anonymized, except where a longer retention period is required by
          applicable law (for example, financial and tax records, which may need to be retained for the period
          mandated under Indian tax law).
        </p>
      </Section>

      <Section number="4" title="Third-Party Services">
        <p>Your data may pass through, or be processed by, the following categories of third-party service providers acting on our behalf, strictly for the purposes of operating the Service:</p>
        <ul>
          <li><strong>Payment gateway:</strong> to process subscription and machine add-on payments securely, in compliance with RBI and PCI-DSS requirements.</li>
          <li><strong>Cloud hosting &amp; infrastructure providers:</strong> to host our application, databases, and backups.</li>
          <li><strong>Email/SMTP and SMS delivery providers:</strong> to send transactional messages such as one-time passwords (OTPs) for login, password resets, invoices, and support notifications, using the email address or mobile number associated with the relevant account.</li>
          <li><strong>Website analytics providers:</strong> to understand aggregate traffic and usage patterns on our marketing website (see Section 6, Cookies). These are used on the website only and are not present in the ShabooAgri app.</li>
        </ul>
        <p>
          These providers are only given access to the data necessary to perform their function for us, and are
          contractually or otherwise required to protect your data and use it solely for the purposes we specify.
          We do not permit these providers to use your data for their own independent purposes. We do not sell your
          personal or operational data.
        </p>
        <p>
          Separately, the ShabooAgri app includes convenience actions that, only when you tap them, hand off to
          other apps you have installed — for example, opening WhatsApp to share an invoice or message, or opening a
          maps application to navigate to a job location. When you use these actions, the information you send (such
          as a phone number, message, or address) is passed to that third-party app and is then governed by that
          app's own privacy policy. These hand-offs never happen automatically or in the background.
        </p>
      </Section>

      <Section number="5" title="Your Rights Regarding Your Data">
        <p>Subject to applicable law, you have the right to:</p>
        <ul>
          <li><strong>Access</strong> the personal data we hold about you;</li>
          <li><strong>Correct</strong> inaccurate or incomplete personal data (most account details can be updated directly from your dashboard);</li>
          <li><strong>Request deletion</strong> of your personal data, subject to our legitimate retention needs described in Section 3 and any legal obligations that require us to keep certain records;</li>
          <li><strong>Withdraw consent</strong> for optional processing (such as promotional communications) at any time; and</li>
          <li><strong>Raise a grievance</strong> regarding how your data is handled, as described in Section 9.</li>
        </ul>
        <p>
          To exercise any of these rights, please contact us at{" "}
          <a href="mailto:support.shaboo@gmail.com">support.shaboo@gmail.com</a>. We will respond within a
          reasonable time and in accordance with applicable law. Where your data was submitted to us by a business
          you interact with (for example, if you are a farmer/customer whose details were entered by an equipment
          rental business using ShabooAgri), such requests should generally be directed to that business as the
          data controller, and we will assist them in fulfilling valid requests.
        </p>
        <p>
          <strong>Account &amp; data deletion.</strong> If you hold a ShabooAgri account (including an account used
          in the ShabooAgri app), you may request deletion of your account and its associated personal data at any
          time by emailing <a href="mailto:support.shaboo@gmail.com">support.shaboo@gmail.com</a> from, or
          identifying, the email address or mobile number on the account, or by using our{" "}
          <Link to="/contact">Contact Us</Link> page. After we verify the request, we will delete or anonymize the
          personal data associated with your account — such as your name, email, phone number, PIN/password
          credentials, and profile — and any images you uploaded. Operational and financial records that we are
          required to retain for legal, tax, or accounting purposes (for example, invoice and payment records under
          Indian tax law), and Customer Data that belongs to a business you work for rather than to you personally,
          may be retained for the period described in Section 3 or as required by law, after which it is securely
          deleted or anonymized. Uninstalling the app or logging out clears the app's locally stored data from your
          device, but does not by itself delete your account on our servers — use the deletion request above for
          that.
        </p>
      </Section>

      <Section number="6" title="Cookies &amp; Similar Technologies">
        <p>
          Our marketing website uses a limited number of cookies and similar technologies to keep you signed in,
          remember your preferences, and understand aggregate visitor traffic through analytics. We do not use
          cookies for third-party advertising or cross-site tracking.
        </p>
        <p>
          You can control or disable cookies through your browser settings; however, disabling essential cookies
          may affect your ability to log in or use certain features of the Service.
        </p>
      </Section>

      <Section number="7" title="Compliance with Indian Data Protection Law">
        <p>
          We process personal data in accordance with applicable Indian law, including the Information Technology
          Act, 2000 and the Information Technology (Reasonable Security Practices and Procedures and Sensitive
          Personal Data or Information) Rules, 2011, and, as it comes into force and applies to us, the Digital
          Personal Data Protection Act, 2023 ("DPDP Act").
        </p>
        <p>
          Under the DPDP Act framework, we act as a "Data Fiduciary" with respect to the account and business
          contact information you provide us directly, and largely as a "Data Processor" acting on the instructions
          of the equipment rental business (our Customer) with respect to the Customer Data — such as farmer/customer
          records — that business inputs into the Service. We process such Customer Data solely to provide the
          Service to our Customer and do not independently determine the purposes for which that data is used.
        </p>
        <p>
          We will update this Policy and our internal practices as needed to remain compliant as DPDP Act rules and
          guidance are finalized and take effect.
        </p>
      </Section>

      <Section number="8" title="Children's Data">
        <p>
          The Service is intended for business use by adults operating or working within an agricultural equipment
          rental or custom hiring business, and is not directed at, or intended for use by, individuals under the
          age of 18. We do not knowingly collect personal data from children. If we become aware that we have
          inadvertently collected personal data from a child without appropriate consent, we will take steps to
          delete such data promptly.
        </p>
      </Section>

      <Section number="9" title="Policy Updates &amp; Grievance Redressal">
        <p>
          We may update this Privacy Policy from time to time to reflect changes in our practices, the Service, or
          applicable law. When we make material changes, we will notify you by email or through an in-product or
          website notice, at least seven (7) days before the changes take effect where practicable. The "Effective
          date" at the top of this page indicates when it was last revised.
        </p>
        <p>
          If you have a grievance regarding the processing of your personal data, please contact our Grievance
          Officer using the details in Section 10. We will acknowledge and address grievances within the timelines
          prescribed under applicable Indian law.
        </p>
      </Section>

      <Section number="10" title="Contact Information">
        <p>For privacy-related questions, data requests, or grievances, please contact:</p>
        <p>
          <strong>ShabooAgri — Grievance Officer / Support</strong>
          <br />
          Email: <a href="mailto:support.shaboo@gmail.com">support.shaboo@gmail.com</a>
          <br />
          Or via our <Link to="/contact">Contact Us</Link> page.
        </p>
      </Section>
    </LegalLayout>
  );
};
