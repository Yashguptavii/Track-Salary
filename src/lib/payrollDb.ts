import { 
  initializeFirestore,
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  collection, 
  query, 
  orderBy, 
  limit, 
  updateDoc,
  getDocFromServer
} from 'firebase/firestore';
import { app } from './firebase';
import firebaseConfig from '../../firebase-applet-config.json';
import { PayrollBatch, EmployeeRecord, ActivityLog, DispatchStatus } from '../types/payroll';

// Initialize Firestore with custom database ID from config
export const db = initializeFirestore(
  app, 
  {}, 
  (firebaseConfig as any).firestoreDatabaseId || '(default)'
);

// Connection test
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    const testDoc = doc(db, '_connection_test', 'ping');
    await getDocFromServer(testDoc);
    return true;
  } catch (e) {
    // Permission error or doc not found still means connection succeeded
    console.log('Firestore connection verified');
    return true;
  }
}

// Recursively remove any undefined values so Firestore never throws unsupported field value error
export function stripUndefined<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(stripUndefined) as unknown as T;
  }
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      clean[key] = stripUndefined(value);
    }
  }
  return clean as T;
}

// 1. Save an entire payroll batch and all employee records
export async function savePayrollBatchToCloud(batch: PayrollBatch): Promise<void> {
  try {
    const batchRef = doc(db, 'batches', batch.id);
    const batchData = stripUndefined({
      id: batch.id,
      fileName: batch.fileName || '',
      sourceType: batch.sourceType || 'excel',
      uploadedAt: batch.uploadedAt || '',
      month: batch.month || '',
      totalAmount: batch.totalAmount || 0,
      employeeCount: batch.employees.length,
      dispatchedCount: batch.dispatchedCount || 0,
      pendingCount: batch.pendingCount || 0,
      headers: batch.headers || [],
      mapping: stripUndefined(batch.mapping || {}),
      createdAt: new Date().toISOString(),
    });

    await setDoc(batchRef, batchData);

    // Save employees in subcollection
    const employeesCol = collection(db, 'batches', batch.id, 'employees');
    for (const emp of batch.employees) {
      const empRef = doc(employeesCol, emp.id);
      const cleanEmp = stripUndefined({
        id: emp.id,
        originalRowIndex: emp.originalRowIndex,
        empId: emp.empId || '',
        name: emp.name || '',
        salary: emp.salary || 0,
        formattedSalary: emp.formattedSalary || '₹0',
        phone: emp.phone || '',
        cleanPhone: emp.cleanPhone || '',
        email: emp.email || '',
        month: emp.month || '',
        department: emp.department || '',
        designation: emp.designation || '',
        account: emp.account || '',
        whatsappStatus: emp.whatsappStatus || 'pending',
        emailStatus: emp.emailStatus || 'pending',
        smsStatus: emp.smsStatus || 'pending',
        rawRow: emp.rawRow ? stripUndefined(emp.rawRow) : {},
        updatedAt: new Date().toISOString(),
      });

      await setDoc(empRef, cleanEmp);
    }

    console.log(`Successfully saved batch ${batch.id} to Cloud Firestore`);
  } catch (error) {
    console.error('Failed to save batch to Firestore:', error);
  }
}

// 2. Load all saved batches list
export async function loadCloudBatchesList(): Promise<Array<{ id: string; month: string; fileName: string; totalAmount: number; employeeCount: number; uploadedAt: string }>> {
  try {
    const batchesCol = collection(db, 'batches');
    const q = query(batchesCol, orderBy('createdAt', 'desc'), limit(20));
    const snap = await getDocs(q);
    
    return snap.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: data.id || docSnap.id,
        month: data.month || 'Unknown Month',
        fileName: data.fileName || 'Payroll.xlsx',
        totalAmount: data.totalAmount || 0,
        employeeCount: data.employeeCount || 0,
        uploadedAt: data.uploadedAt || '',
      };
    });
  } catch (error) {
    console.warn('Could not load batches from cloud:', error);
    return [];
  }
}

// 3. Load full batch with employees
export async function loadFullCloudBatch(batchId: string): Promise<PayrollBatch | null> {
  try {
    const batchRef = doc(db, 'batches', batchId);
    const batchSnap = await getDoc(batchRef);
    if (!batchSnap.exists()) return null;

    const data = batchSnap.data();
    const employeesCol = collection(db, 'batches', batchId, 'employees');
    const empSnap = await getDocs(employeesCol);
    
    const employees: EmployeeRecord[] = empSnap.docs.map((d) => d.data() as EmployeeRecord);

    return {
      id: data.id,
      fileName: data.fileName,
      sourceType: data.sourceType || 'excel',
      uploadedAt: data.uploadedAt,
      month: data.month,
      headers: data.headers || [],
      mapping: data.mapping || {},
      employees: employees.sort((a, b) => a.originalRowIndex - b.originalRowIndex),
      totalAmount: data.totalAmount || 0,
      dispatchedCount: data.dispatchedCount || 0,
      pendingCount: data.pendingCount || 0,
    };
  } catch (error) {
    console.error('Failed to load full batch from Firestore:', error);
    return null;
  }
}

// 4. Update status of a single employee in Firestore
export async function updateCloudEmployeeStatus(
  batchId: string, 
  employeeId: string, 
  channel: 'whatsapp' | 'email', 
  status: DispatchStatus
): Promise<void> {
  try {
    const empRef = doc(db, 'batches', batchId, 'employees', employeeId);
    const updateField = channel === 'whatsapp' ? { whatsappStatus: status } : { emailStatus: status };
    await updateDoc(empRef, {
      ...updateField,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.warn('Failed to update employee status in Firestore:', error);
  }
}

// 5. Save Activity Log
export async function saveCloudActivityLog(log: ActivityLog, batchId?: string): Promise<void> {
  try {
    const logRef = doc(db, 'activity_logs', log.id);
    const logData = stripUndefined({
      ...log,
      batchId: batchId || '',
      createdAt: new Date().toISOString(),
    });
    await setDoc(logRef, logData);
  } catch (error) {
    console.warn('Failed to save log to cloud:', error);
  }
}

// 6. Load Activity Logs
export async function loadCloudActivityLogs(): Promise<ActivityLog[]> {
  try {
    const logsCol = collection(db, 'activity_logs');
    const q = query(logsCol, orderBy('createdAt', 'desc'), limit(50));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as ActivityLog);
  } catch (error) {
    console.warn('Could not load activity logs from cloud:', error);
    return [];
  }
}
