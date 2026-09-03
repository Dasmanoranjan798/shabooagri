// Read-only client models for the Job Execution V2 history/charges — the
// backend remains authoritative. Used to build the Job Timeline, per-resource
// attribution, and the transportation/final breakdown. Never used to
// reconstruct history from the job's current machine/driver.

class JobWorkSession {
  final String id;
  final String machineId;
  final String driverId;
  final DateTime startedAt;
  final DateTime? endedAt;
  final int? durationSec;
  final String? machineRegistration;
  final String? driverName;

  JobWorkSession({
    required this.id,
    required this.machineId,
    required this.driverId,
    required this.startedAt,
    required this.endedAt,
    required this.durationSec,
    required this.machineRegistration,
    required this.driverName,
  });

  factory JobWorkSession.fromJson(Map<String, dynamic> json) {
    final machine = json['machine'] as Map<String, dynamic>?;
    final driver = json['driver'] as Map<String, dynamic>?;
    final employee = driver?['employee'] as Map<String, dynamic>?;
    return JobWorkSession(
      id: json['id'] as String,
      machineId: json['machineId'] as String,
      driverId: json['driverId'] as String,
      startedAt: DateTime.parse(json['startedAt'] as String),
      endedAt: json['endedAt'] == null ? null : DateTime.parse(json['endedAt'] as String),
      durationSec: json['durationSec'] as int?,
      machineRegistration: machine?['registrationNumber'] as String?,
      driverName: employee?['name'] as String?,
    );
  }
}

class JobAssignmentChange {
  final String id;
  final String field; // MACHINE | DRIVER
  final String? oldMachineId;
  final String? newMachineId;
  final String? oldDriverId;
  final String? newDriverId;
  final String reason;
  final DateTime changedAt;

  JobAssignmentChange({
    required this.id,
    required this.field,
    required this.oldMachineId,
    required this.newMachineId,
    required this.oldDriverId,
    required this.newDriverId,
    required this.reason,
    required this.changedAt,
  });

  factory JobAssignmentChange.fromJson(Map<String, dynamic> json) {
    return JobAssignmentChange(
      id: json['id'] as String,
      field: json['field'] as String,
      oldMachineId: json['oldMachineId'] as String?,
      newMachineId: json['newMachineId'] as String?,
      oldDriverId: json['oldDriverId'] as String?,
      newDriverId: json['newDriverId'] as String?,
      reason: json['reason'] as String? ?? '',
      changedAt: DateTime.parse(json['changedAt'] as String),
    );
  }
}

class JobTransportCharge {
  final String id;
  final String? transportTypeId;
  final String transportTypeName;
  final int trips;
  final double ratePerTrip;
  final double totalAmount;

  JobTransportCharge({
    required this.id,
    required this.transportTypeId,
    required this.transportTypeName,
    required this.trips,
    required this.ratePerTrip,
    required this.totalAmount,
  });

  factory JobTransportCharge.fromJson(Map<String, dynamic> json) {
    return JobTransportCharge(
      id: json['id'] as String,
      transportTypeId: json['transportTypeId'] as String?,
      transportTypeName: json['transportTypeName'] as String? ?? 'Transport',
      trips: json['trips'] as int? ?? 0,
      ratePerTrip: double.tryParse(json['ratePerTrip'].toString()) ?? 0,
      totalAmount: double.tryParse(json['totalAmount'].toString()) ?? 0,
    );
  }
}

class TransportType {
  final String id;
  final String name;

  TransportType({required this.id, required this.name});

  factory TransportType.fromJson(Map<String, dynamic> json) =>
      TransportType(id: json['id'] as String, name: json['name'] as String? ?? 'Transport');
}

class ResourceOption {
  final String id;
  final String label;

  ResourceOption({required this.id, required this.label});
}
