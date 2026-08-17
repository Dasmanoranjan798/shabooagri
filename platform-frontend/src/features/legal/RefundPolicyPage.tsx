import React from "react";
import { Link } from "react-router-dom";
import { LegalLayout, Section } from "./LegalLayout";

export const RefundPolicyPage: React.FC = () => {
  return (
    <LegalLayout title="Refund Policy" effectiveDate="August 17, 2026">
      <p style={{ marginBottom: 28, fontSize: "0.95rem", lineHeight: 1.7 }}>
        This Refund Policy explains when and how you may be eligible for a refund of fees paid for a ShabooAgri
        subscription, and how cancellations are handled. It forms part of, and should be read together with, our{" "}
        <Link to="/terms">Terms of Service</Link>. Nothing in this Policy limits any right you may separately have
        under applicable Indian consumer protection law.
      </p>

      <Section number="1" title="Subscription Refund Eligibility">
        <p>
          <strong>1.1 First-time subscribers.</strong> If you are purchasing a ShabooAgri subscription for the
          first time and are not satisfied with the Service, you may request a full refund within{" "}
          <strong>7 calendar days</strong> of your initial payment, provided that your usage of the Service during
          that period is consistent with reasonable evaluation of the product (for example, exploring features and
          setting up your account) rather than substantial ongoing business use (such as extensive customer,
          booking, or invoicing activity spanning the full evaluation window).
        </p>
        <p>
          <strong>1.2 Renewals.</strong> Renewal payments (for continuing an existing subscription into a new annual
          period) are refundable only if requested within <strong>48 hours</strong> of the renewal charge and before
          any material use of the Service in the new subscription period, or where the renewal charge resulted from
          a clear billing error on our part.
        </p>
        <p>
          <strong>1.3 Additional machine add-ons and upgrades.</strong> Fees paid to add extra machines to your plan
          or to upgrade to a higher plan are refundable within <strong>7 calendar days</strong> of the relevant
          payment, provided the added capacity has not been substantially used.
        </p>
        <p>
          <strong>1.4 Duplicate or erroneous charges.</strong> If you are charged twice for the same subscription
          period due to a technical or payment gateway error, or charged an incorrect amount due to an error on our
          part, we will refund the erroneous amount in full, regardless of the timelines above.
        </p>
      </Section>

      <Section number="2" title="Refund Request Process &amp; Timeline">
        <p>To request a refund, please contact us with your registered email address, the payment/order reference, and the reason for your request, via:</p>
        <ul>
          <li>Email: <a href="mailto:support.shaboo@gmail.com">support.shaboo@gmail.com</a>; or</li>
          <li>Our <Link to="/contact">Contact Us</Link> page, selecting a refund-related subject.</li>
        </ul>
        <p>
          We will acknowledge your request within <strong>2 business days</strong> and inform you of the outcome
          within <strong>7 business days</strong> of acknowledgment, after verifying the eligibility criteria in
          Section 1. We may request additional information from you to process your request.
        </p>
      </Section>

      <Section number="3" title="Non-Refundable Circumstances">
        <p>Except where required otherwise by applicable law, fees are not refundable in the following circumstances:</p>
        <ul>
          <li>Requests made after the applicable eligibility window described in Section 1 has passed;</li>
          <li>Subscriptions terminated or suspended due to your breach of our Terms of Service, including violation of the Acceptable Use provisions;</li>
          <li>Partial-period cancellations initiated by you outside of an eligible refund window — see Section 4 on the effect of mid-cycle cancellation;</li>
          <li>Dissatisfaction arising from a lack of a specific feature that was not represented as included in your plan at the time of purchase;</li>
          <li>Circumstances outside our reasonable control, such as your own internet connectivity issues or a lapse in payment on your end; and</li>
          <li>Any GST or other statutory taxes already remitted to the government in respect of the transaction, to the extent such amounts cannot be recovered by us.</li>
        </ul>
      </Section>

      <Section number="4" title="Cancellation Policy">
        <p>
          You may choose not to renew your subscription at any time; there is no long-term lock-in beyond the
          annual period you have already paid for. Because ShabooAgri subscriptions are billed annually and provide
          access for the full paid period, cancelling mid-cycle does <strong>not</strong> automatically entitle you
          to a pro-rated refund for the unused portion of your term, except where you qualify for a refund under
          Section 1.
        </p>
        <p>
          If your subscription lapses (is not renewed) or is cancelled and refunded, your access to the dashboard
          will be restricted at the end of your paid period. Your Customer Data is not deleted immediately — it is
          retained in accordance with our <Link to="/privacy">Privacy Policy</Link> for a reasonable period,
          allowing you to reactivate your account by subscribing again without losing your historical records.
          After the retention period, data may be permanently deleted.
        </p>
      </Section>

      <Section number="5" title="Refund Processing Time">
        <p>
          Once a refund is approved, we initiate it to your original payment method through our payment gateway
          within <strong>5 business days</strong>. Depending on your bank, card network, or UPI provider, it may
          take an additional <strong>5–10 business days</strong> for the refunded amount to reflect in your account
          or statement. We are not responsible for delays caused by your bank or payment provider once the refund
          has been initiated on our end.
        </p>
      </Section>

      <Section number="6" title="Contact Information">
        <p>For refund requests or billing questions, please contact:</p>
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
