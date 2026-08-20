import 'package:flutter/material.dart';

class PrivacyPolicyScreen extends StatelessWidget {
  const PrivacyPolicyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Privacy Policy'),
        backgroundColor: Colors.green,
        foregroundColor: Colors.white,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: const Text(
          '''Privacy Policy

App purpose
This application is designed to help farmers, machine owners, and drivers manage agricultural operations, bookings, jobs, and related workflows efficiently.

Account/user information
We collect and store your basic profile information (such as name, role, email, and mobile number) to facilitate account creation, authentication, and role-based access control within the app.

Company/business information
Information regarding your agricultural company or business is stored to logically separate tenant data and provide relevant operational metrics and dashboards.

Farmer/customer information
We collect details about farmers and customers (names, contact details) to associate them with bookings, jobs, and payments.

Machine/driver/job/booking information
Data related to machines, drivers, jobs, and bookings are collected and processed to ensure smooth operations, scheduling, and tracking.

Payment and transaction information
We log payment records, invoices, and advance transactions for accounting and reconciliation purposes.

Profile pictures and uploaded images
Any profile pictures or images uploaded are stored locally on your device or securely on our servers solely for identification and operational documentation.

Device/app information where applicable
We may collect minimal device-specific information (such as operating system version) to help troubleshoot issues and optimize application performance.

Authentication and security
We employ standard security protocols, including secure token-based authentication (JWT) and encrypted local storage, to protect your session and data from unauthorized access.

Offline-first/local storage and synchronization
The app is designed with an offline-first architecture. Your data is stored locally on your device using encrypted databases/storage and will synchronize with our servers automatically when internet connectivity is available.

Server/API communication
All communication between the application and our servers is transmitted over secure, encrypted channels (HTTPS).

Data synchronization when internet connectivity is available
When connected to the internet, locally stored changes are pushed to our backend, and any new data from the server is pulled to keep your local records up to date.

Data retention
We retain your operational data as long as your account is active or as needed to provide our services and comply with legal obligations.

Data deletion/account deletion where applicable
You can request account deletion or data removal by contacting our support team. Upon verification, we will securely erase your data in accordance with our retention policies.

Data sharing/disclosure
We do not sell your personal or operational data. Data is only shared with authorized personnel within your organization or as required by law.

Third-party services where actually used
We do not use unnecessary third-party tracking or advertising services. We only use essential third-party services required for foundational app functionality, such as crash reporting or mapping, if explicitly integrated.

Permissions used by the application
The app may request access to your device's camera or photo library (for profile pictures or documentation), and local storage (for offline data). These permissions are strictly used for documented features.

Security practices
We continuously monitor and update our security practices to protect against data breaches, unauthorized access, and other vulnerabilities.

User responsibilities
You are responsible for maintaining the confidentiality of your login credentials and for all activities that occur under your account.

Policy updates
We may update this Privacy Policy from time to time. Significant changes will be communicated through the application or via email.

Contact information & Support
For any questions or concerns regarding this Privacy Policy or your data, please contact us at:
Support email: support.shaboo@gmail.com
''',
          style: TextStyle(fontSize: 14, height: 1.5),
        ),
      ),
    );
  }
}
