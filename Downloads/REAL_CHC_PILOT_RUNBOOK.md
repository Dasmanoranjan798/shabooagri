# ShabooAgri — Real CHC Pilot Operational Runbook

**Production Application URL:** [https://shabooagri.com](https://shabooagri.com)  
**Target Pilot User:** Agricultural Equipment Service Provider / Custom Hiring Center (CHC) Operator  
**Purpose:** A step-by-step practical operational runbook for executing a live pilot on ShabooAgri using real agricultural equipment, farmers, drivers, and field jobs.

---

## 1. Overview & Data Safety Guidelines

### 1.1 Pilot Data Isolation
To ensure real-world pilot activities do not corrupt existing demonstration or system records:
- All pilot operations must be conducted under a dedicated **Pilot Company Tenant** (e.g., `ShabooAgri CHC Pilot Center`).
- Pilot users (Owner, Manager, Drivers, Farmers) must be registered with their real operational contact details under the pilot tenant.
- Credentials, initial passwords, and access tokens must never be written into public documentation or commit logs.

### 1.2 Pilot Roles & Account Credentials
- **Owner**: Admin level. Manages staff, equipment fleet, financial parameters, and business settings.
- **Manager**: Field coordinator. Creates bookings, schedules equipment, dispatches drivers, executes jobs, and records payments.
- **Driver / Operator**: Field worker. Views assigned daily schedules, equipment details, and customer field locations on mobile web (`/driver`).
- **Farmer / Customer**: Equipment hirer. Views booking status, job execution hours, invoices, receipts, and balance due on mobile portal (`/portal`).

---

## 2. Step-by-Step Pilot Execution Procedure

### Step 1: Owner Authentication & System Setup
1. Open [https://shabooagri.com/login](https://shabooagri.com/login) in a desktop browser.
2. Enter the Owner email/mobile and password. Click **Log In**.
3. Verify that the **Owner Operations Dashboard** loads, displaying KPI metric cards (Today's Revenue, This Month Revenue, Pending Collection, Machines Working, Active Drivers, Completed Jobs).

### Step 2: Register Field Manager Account
1. In the left navigation menu, click **Employees / Staff Directory** (`/employees`).
2. Click **➕ Register Staff Member**.
3. Enter Name (e.g., `Suresh Mohanty`), Role Title (`Field Operations Manager`), and Phone Number.
4. Check the box **`🔑 Grant ShabooAgri Login Account`**.
5. Select Account Role: **Manager / Field Coordinator**.
6. Set Initial Password (e.g., `PilotPass123!`). Click **Register Staff Member**.

### Step 3: Register Machine Driver / Operator Account
1. In **Employees / Staff Directory** (`/employees`), click **➕ Register Staff Member**.
2. Enter Driver Name (e.g., `Rajesh Behera`), Role Title (`Harvester & Tractor Operator`), and Phone Number.
3. Select Compensation Model:
   - **Hourly Wage**: Enter rate (e.g., `₹250/hr`).
   - **Monthly Salary**: Enter fixed monthly salary (e.g., `₹22,000/month`).
   - **Yearly Salary**: Enter fixed annual salary (e.g., `₹3,00,000/year`).
4. Check the box **`🔑 Grant ShabooAgri Login Account`**.
5. Select Account Role: **Driver / Operator**. Click **Register Staff Member**.

### Step 4: Register Farmer / Customer
1. In the navigation menu, click **Customers / Farmers** (`/customers`).
2. Click **➕ Register New Farmer**.
3. Enter Farmer Name (e.g., `Manoranjan Sahoo`), Select Village (e.g., `Puri Central`), and Mobile Number.
4. Enter Farm Address / Plot Location (e.g., `Plot #42, Canal Road, Puri`).
5. Check the box **`🌾 Grant Farmer Portal Login Account`**.
6. Set Initial Password (e.g., `FarmerPass123!`). Click **Register Farmer**.

### Step 5: Register Agricultural Machine / Equipment
1. In the navigation menu, click **Machines & Equipment** (`/machines`).
2. Click **➕ Register Equipment**.
3. Enter Registration Number (e.g., `OD-02-AG-1984`), Equipment Category (e.g., `Paddy Combine Harvester` or `Tractor 55 HP`), Brand (`John Deere`), and Model (`5310`).
4. Enter Purchase Year (`2024`), Fuel Type (`Diesel`), Hour Meter Reading (`350.5 hrs`), and Next Service Due Hours (`400 hrs`).
5. Select Default Assigned Operator (`Rajesh Behera`). Click **Save Equipment**.

### Step 6: Create Field Equipment Booking
1. In the navigation menu, click **Bookings** (`/bookings`).
2. Click **➕ New Booking**.
3. Select Farmer (`Manoranjan Sahoo`), Village (`Puri Central`), Equipment (`OD-02-AG-1984`), and Assigned Driver (`Rajesh Behera`).
4. Select Scheduled Date & Time.
5. Select **Pricing Method**:
   - **Per Hour**: Rate `₹1,200/hr`, Estimated Hours `3.0`.
   - **Per Acre**: Rate `₹1,800/acre`, Estimated Acres `2.5`.
   - **Per Minute**: Rate `₹20/min`.
   - **Per Job (Fixed)**: Flat Rate `₹4,500`.
6. Click **Create Booking**. Verify that an auto-generated Booking Number (`BK-XXXXXX`) is assigned.

### Step 7: Manager Live Job Execution (Start, Pause, Resume, Complete)
1. In the navigation menu, click **Live Jobs** (`/jobs`).
2. Locate the scheduled booking card. Click **🚀 Start Job**.
   - Verify status changes to **`WORKING`** and live running counter begins tracking duration.
3. During field rest/refueling, click **⏸️ Pause Job**.
   - Verify status changes to **`PAUSED`** and pause duration is logged.
4. Click **▶️ Resume Job**.
   - Verify status returns to **`WORKING`**.
5. Upon finishing field work, click **✅ Complete Job**.
   - Enter Completed Acres (e.g., `2.5 acres`), Fuel Used (e.g., `18 Litres`), and Field Notes.
   - Click **Finalize & Complete**. Verify invoice auto-generation.

### Step 8: Alternative Manual / After-Work Job Entry
1. If work was completed without live phone interaction, click **📝 Log After-Work Entry** on `/jobs`.
2. Select Farmer, Village, Machine, Driver, Work Date, Start Time (e.g., `08:00 AM`), and End Time (e.g., `11:30 AM`).
3. System automatically calculates worked duration (`3.5 hrs`).
4. Enter Fuel Used & Acres worked. Click **Save After-Work Entry**. Verify invoice creation.

### Step 9: Machine Analytics Verification
1. Click **Machines & Equipment** (`/machines`) and open the registered machine detail modal.
2. Verify live metrics:
   - **Hour Meter Reading**: Updated with worked hours.
   - **Today's Hours**: Displays worked duration for today.
   - **Today's Income**: Displays revenue generated today.
   - **This Month Income**: Displays total monthly earnings for this equipment.
   - **Next Service Due Countdown**: Renders countdown (e.g., `"46.5 hrs left"`).

### Step 10: Billing & Invoice Verification
1. Click **Invoices & Billing** (`/invoices`).
2. Verify that a monotonic sequential Invoice (`INV-XXXXXX`) has been created.
3. Confirm invoice details: Customer Name, Village, Equipment, Total Amount (calculated via the active pricing method), Paid Amount (`₹0.00`), and Balance Amount Due.

### Step 11: Receive Partial & Full Payment
1. Click **Receive Payment** on the invoice or navigate to `/payments`.
2. Select Payment Method (**Cash**, **UPI**, **Bank Transfer**, or **Credit**).
3. **Partial Payment Test**:
   - Total Invoice Amount: `₹3,600`.
   - Enter Received Amount: `₹2,000`. Click **Receive Payment**.
   - Verify invoice status updates to **`PARTIALLY_PAID`** and Balance Amount Due displays **`₹1,600`**.
4. **Full Payment Test**:
   - Click **Receive Payment** again.
   - Enter Remaining Amount: `₹1,600`. Click **Receive Payment**.
   - Verify invoice status updates to **`PAID`** and Balance Amount Due displays **`₹0.00`**.
5. Click **📄 Print / View Receipt** to inspect the structured receipt (`REC-INV-XXXXXX`).

### Step 12: Driver Mobile View Verification
1. Open a mobile browser at [https://shabooagri.com/driver](https://shabooagri.com/driver).
2. Log in using the Driver credentials (`Rajesh Behera`).
3. Verify that the mobile dashboard renders assigned equipment (`OD-02-AG-1984`), scheduled jobs, farmer location (`Plot #42, Canal Road`), and work history without exposing company financial reports or administrative settings.

### Step 13: Farmer Portal Verification
1. Open a mobile browser at [https://shabooagri.com/portal](https://shabooagri.com/portal).
2. Log in using the Farmer credentials (`Manoranjan Sahoo`).
3. Verify that the customer portal displays own bookings, job status (`COMPLETED`), total invoices, payment history, and current balance due (`₹0.00`).
4. Verify that attempting to navigate directly to `/` or `/employees` is blocked with HTTP 403 / redirect to `/portal`.

---

## 3. Pilot Success Criteria

A pilot is formally classified as **SUCCESSFUL** when the real-world agricultural business completes the following independent workflow using actual field data:
1. Owner & Manager log in and configure business settings.
2. Manager registers real equipment fleet, drivers, and hiring farmers.
3. Manager creates bookings and executes live or manual field jobs.
4. Invoices auto-calculate accurately using the configured pricing method.
5. Customer payments are received, updating financial ledgers and generating receipts.
6. Equipment hour meters and service countdowns update in real time.
7. Drivers and Farmers access their respective view-only portals cleanly.
