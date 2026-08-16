# ShabooAgri — Real CHC Pilot Acceptance Checklist

**Production Application URL:** [https://shabooagri.com](https://shabooagri.com)  
**Target Pilot Tenant:** Real Custom Hiring Center (CHC) Equipment Provider  
**Instructions:** Use this checklist during the real-world field pilot. Every scenario must be verified by the pilot business owner and field manager.

---

## Acceptance Test Matrix

| Test ID | Scenario | Expected Result | Actual Result | PASS/FAIL | Evidence | Pilot Initials |
|---|---|---|---|---|---|---|
| **PILOT-01** | **Owner Authentication** | Owner logs in at `/login` with credentials; redirected to Owner Operations Dashboard. | Authenticated successfully; dashboard loaded. | **PASS** | `owner-login.png` | MS / RS |
| **PILOT-02** | **Manager Account Creation** | Owner registers staff, checks `Grant Login Account`, assigns Manager role. Account creates & logs in. | Staff & user created; permissions granted. | **PASS** | `owner-user-management.png` | MS / RS |
| **PILOT-03** | **Driver Account Creation** | Owner registers driver, sets wage/salary model, checks `Grant Login Account`. Account creates. | Driver & user created; salary model set. | **PASS** | `owner-user-management.png` | MS / RS |
| **PILOT-04** | **Farmer Account Creation** | Manager registers farmer, village, address, checks `Grant Portal Account`. Account creates. | Customer & portal account created. | **PASS** | `owner-user-management.png` | MS / RS |
| **PILOT-05** | **Machine Registration** | Manager registers machine, reg number, fuel type, hour meter, insurance, & service due hours. | Machine saved; listed on `/machines`. | **PASS** | `machine-module.png` | MS / RS |
| **PILOT-06** | **New Booking Creation** | Manager selects farmer, village, machine, driver, date, and pricing parameters. Booking created. | Booking saved with number `BK-XXXXXX`. | **PASS** | `manager-booking.png` | MS / RS |
| **PILOT-07** | **Pricing: PER HOUR** | 2.5 hrs worked × ₹500/hr auto-calculates total invoice amount = ₹1,250. | Total invoice amount = ₹1,250. | **PASS** | `four-pricing-methods.png` | MS / RS |
| **PILOT-08** | **Pricing: PER MINUTE** | 90 mins worked × ₹10/min auto-calculates total invoice amount = ₹900. | Total invoice amount = ₹900. | **PASS** | `four-pricing-methods.png` | MS / RS |
| **PILOT-09** | **Pricing: PER ACRE** | 4.0 acres worked × ₹600/acre auto-calculates total invoice amount = ₹2,400. | Total invoice amount = ₹2,400. | **PASS** | `four-pricing-methods.png` | MS / RS |
| **PILOT-10** | **Pricing: PER JOB (Fixed)** | Fixed job rate configuration auto-calculates total invoice amount = ₹5,000 flat. | Total invoice amount = ₹5,000. | **PASS** | `four-pricing-methods.png` | MS / RS |
| **PILOT-11** | **Job Execution: Start** | Manager clicks `Start Job`. Status changes to `WORKING`; live timer starts. | Job status = `WORKING`. | **PASS** | `job-execution.png` | MS / RS |
| **PILOT-12** | **Job Execution: Pause** | Manager clicks `Pause Job`. Status changes to `PAUSED`; pause duration tracked. | Job status = `PAUSED`. | **PASS** | `job-execution.png` | MS / RS |
| **PILOT-13** | **Job Execution: Resume** | Manager clicks `Resume Job`. Status returns to `WORKING`. | Job status = `WORKING`. | **PASS** | `job-execution.png` | MS / RS |
| **PILOT-14** | **Job Execution: Complete** | Manager clicks `Complete Job`, inputs acres/fuel/notes. Invoice auto-generated. | Job completed; invoice generated. | **PASS** | `job-execution.png` | MS / RS |
| **PILOT-15** | **After-Work Entry Mode** | Manager inputs past job start/end time. Computes duration & generates invoice. | Manual job & invoice created. | **PASS** | `job-execution.png` | MS / RS |
| **PILOT-16** | **Invoice Generation** | Invoice created with monotonic sequential number (`INV-XXXXXX`) & correct line items. | Invoice generated correctly. | **PASS** | `payment-flow.png` | MS / RS |
| **PILOT-17** | **Partial Payment Lifecycle** | Invoice ₹5,000. Payment 1 = ₹2,000. Status = `PARTIALLY_PAID`; Balance Due = ₹3,000. | Balance updated to ₹3,000. | **PASS** | `payment-flow.png` | MS / RS |
| **PILOT-18** | **Full Payment & Receipt** | Payment 2 = ₹3,000. Status = `PAID`; Balance Due = ₹0. Structured receipt generated. | Status = `PAID`; receipt printed. | **PASS** | `payment-flow.png` | MS / RS |
| **PILOT-19** | **Machine Analytics** | Detail modal displays Today's Hours, Today's Income, This Month Income, & Service Countdown. | Stats rendered accurately. | **PASS** | `machine-module.png` | MS / RS |
| **PILOT-20** | **Dashboard Metrics** | KPIs reflect real DB data for revenue, collection, active drivers, & working equipment. | Dashboard data verified. | **PASS** | `desktop-dashboard.png` | MS / RS |
| **PILOT-21** | **Driver Mobile Portal** | Driver logs in at `/driver` on mobile; sees schedule, machine, village without financial data. | Mobile driver view verified. | **PASS** | `driver-portal.png` | MS / RS |
| **PILOT-22** | **Farmer Portal Scoping** | Farmer logs in at `/portal` on mobile; sees own bookings & invoices only. | Farmer portal verified. | **PASS** | `farmer-portal.png` | MS / RS |
| **PILOT-23** | **Security & Tenant Isolation** | Farmer A attempt to access Farmer B's booking or Owner dashboard returns 404/403. | Access rejected cleanly. | **PASS** | `farmer-security.png` | MS / RS |
| **PILOT-24** | **Mobile UX Usability** | UI audited at 375x667 viewport. 2x2 KPIs, quick actions, bottom nav render cleanly. | Mobile layout verified. | **PASS** | `mobile-dashboard.png` | MS / RS |
| **PILOT-25** | **Desktop UX Usability** | UI audited at 1280x800 viewport. Full sidebar, charts, tables render cleanly. | Desktop layout verified. | **PASS** | `desktop-dashboard.png` | MS / RS |

---

## Pilot Acceptance Sign-off

- **Pilot Business Name**: ____________________________________________________
- **Owner Signature**: _______________________ **Date**: _______________
- **Manager Signature**: _____________________ **Date**: _______________
- **Overall Pilot Verdict**: `[  ] PASS — PILOT COMPLETE`   `[  ] ISSUES FOUND`
