import Database from 'better-sqlite3'
import { randomUUID } from 'crypto'

const db = new Database('local.db')
db.pragma('journal_mode = WAL')

db.exec(`
CREATE TABLE IF NOT EXISTS access_requests (
  id TEXT PRIMARY KEY,
  facility_name TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  submitted_at TEXT DEFAULT CURRENT_TIMESTAMP
)`)

db.exec(`
CREATE TABLE IF NOT EXISTS blood_inventory (
  id TEXT PRIMARY KEY,
  blood_type TEXT NOT NULL UNIQUE CHECK (blood_type IN ('A+','A-','B+','B-','O+','O-','AB+','AB-')),
  quantity_units INTEGER NOT NULL DEFAULT 0,
  collection_date TEXT,
  expiry_date TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
)`)

// Seed blood inventory if empty
const checkEmpty = db.prepare('SELECT COUNT(*) as count FROM blood_inventory').get() as { count: number }
if (checkEmpty.count === 0) {
  const insert = db.prepare('INSERT OR IGNORE INTO blood_inventory (id, blood_type, quantity_units) VALUES (?, ?, 0)')
  const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']
  const runTransaction = db.transaction(() => {
    for (const type of bloodTypes) {
      insert.run(randomUUID(), type)
    }
  })
  runTransaction()
}

db.exec(`
CREATE TABLE IF NOT EXISTS medicines (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('tablet','syrup','injection','capsule')),
  arrival_date TEXT NOT NULL,
  stock_arrived INTEGER NOT NULL,
  stock_left INTEGER NOT NULL,
  expiry_date TEXT NOT NULL,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
)`)

// Seed medicines if empty
const medCheck = db.prepare('SELECT COUNT(*) as count FROM medicines').get() as { count: number }
if (medCheck.count === 0) {
  const seed: [string, string, string, number, number, string][] = [
    // name, category, arrival_date, stock_arrived, stock_left, expiry_date
    ['Paracetamol 500mg', 'tablet', '2025-01-10', 5000, 1200, '2027-01-10'],
    ['Amoxicillin 250mg', 'capsule', '2025-02-15', 3000, 150, '2026-08-15'],
    ['Azithromycin 500mg', 'tablet', '2025-03-01', 2000, 40, '2026-09-01'],
    ['Vitamin B Complex', 'capsule', '2024-11-20', 4000, 2600, '2027-05-20'],
    ['ORS Sachets', 'syrup', '2025-04-05', 6000, 300, '2026-07-15'],
    ['Insulin Glargine', 'injection', '2025-05-10', 800, 25, '2026-07-25'],
    ['Ibuprofen 400mg', 'tablet', '2025-01-25', 3500, 900, '2027-01-25'],
    ['Cetirizine 10mg', 'tablet', '2024-12-12', 2500, 1800, '2026-12-12'],
    ['Metformin 500mg', 'tablet', '2025-02-08', 4500, 60, '2027-02-08'],
    ['Amlodipine 5mg', 'tablet', '2025-03-18', 2200, 1100, '2026-11-18'],
    ['Cough Syrup (Dextromethorphan)', 'syrup', '2024-10-30', 1500, 200, '2026-06-10'],
    ['Ceftriaxone 1g', 'injection', '2025-04-22', 1000, 35, '2026-10-22'],
    ['Omeprazole 20mg', 'capsule', '2025-01-05', 3000, 1400, '2027-01-05'],
    ['Salbutamol Inhaler', 'injection', '2024-09-15', 600, 18, '2026-05-01'],
    ['Doxycycline 100mg', 'capsule', '2025-02-28', 1800, 500, '2026-09-28'],
    ['Diclofenac 50mg', 'tablet', '2025-03-12', 2800, 70, '2027-03-12'],
    ['Iron + Folic Acid', 'tablet', '2024-11-08', 5000, 3200, '2027-06-08'],
    ['Ranitidine Syrup', 'syrup', '2024-08-20', 1200, 90, '2026-06-20'],
    ['Hydrocortisone', 'injection', '2025-05-01', 500, 12, '2026-08-01'],
    ['Ciprofloxacin 500mg', 'tablet', '2025-01-18', 2600, 1300, '2027-01-18'],
    ['Multivitamin Syrup', 'syrup', '2024-12-01', 2000, 850, '2026-12-01'],
    ['Pantoprazole 40mg', 'capsule', '2025-02-14', 2400, 45, '2027-02-14'],
    ['Tetanus Toxoid', 'injection', '2024-10-05', 900, 400, '2026-07-05'],
    ['Loratadine 10mg', 'tablet', '2025-03-25', 1700, 1000, '2027-03-25'],
    ['Calcium + Vit D3', 'tablet', '2024-11-15', 3300, 2100, '2027-05-15'],
    ['Metronidazole 400mg', 'tablet', '2025-01-30', 2900, 55, '2026-10-30'],
    ['Cefixime Syrup', 'syrup', '2024-09-25', 1400, 130, '2026-06-25'],
    ['Vitamin C 500mg', 'tablet', '2025-04-10', 4200, 2800, '2027-04-10'],
  ]
  const insertMed = db.prepare(
    'INSERT INTO medicines (id, name, category, arrival_date, stock_arrived, stock_left, expiry_date) VALUES (?, ?, ?, ?, ?, ?, ?)'
  )
  const seedMeds = db.transaction(() => {
    for (const [name, category, arrival, arrived, left, expiry] of seed) {
      insertMed.run(randomUUID(), name, category, arrival, arrived, left, expiry)
    }
  })
  seedMeds()
}

db.exec(`
CREATE TABLE IF NOT EXISTS departments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
)`)

db.exec(`
CREATE TABLE IF NOT EXISTS patients (
  id TEXT PRIMARY KEY,
  registration_date TEXT NOT NULL,
  visit_type TEXT NOT NULL CHECK (visit_type IN ('New Registration','Follow-up Visit')),
  name TEXT NOT NULL,
  age INTEGER NOT NULL,
  gender TEXT NOT NULL,
  department_id TEXT NOT NULL REFERENCES departments(id),
  consulting_doctor TEXT NOT NULL,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
)`)

// Seed departments if empty (fixed ids so patients can reference them)
const DEPT_IDS: Record<string, string> = {
  'General OPD': 'dept-general-opd',
  Dental: 'dept-dental',
  Maternity: 'dept-maternity',
  Immunization: 'dept-immunization',
}
const deptCheck = db.prepare('SELECT COUNT(*) as count FROM departments').get() as { count: number }
if (deptCheck.count === 0) {
  const insertDept = db.prepare('INSERT OR IGNORE INTO departments (id, name) VALUES (?, ?)')
  const seedDepts = db.transaction(() => {
    for (const [name, id] of Object.entries(DEPT_IDS)) insertDept.run(id, name)
  })
  seedDepts()
}

// Seed patients if empty
const patCheck = db.prepare('SELECT COUNT(*) as count FROM patients').get() as { count: number }
if (patCheck.count === 0) {
  const G = DEPT_IDS['General OPD'], D = DEPT_IDS.Dental, M = DEPT_IDS.Maternity, I = DEPT_IDS.Immunization
  const patients: [string, string, string, number, string, string, string][] = [
    // registration_date, visit_type, name, age, gender, department_id, consulting_doctor
    ['2025-06-02', 'New Registration', 'Ramesh Kumar', 45, 'Male', G, 'Dr. Anita Sharma'],
    ['2025-06-03', 'Follow-up Visit', 'Sunita Devi', 38, 'Female', G, 'Dr. Anita Sharma'],
    ['2025-06-05', 'New Registration', 'Aarav Patel', 6, 'Male', I, 'Dr. Rajesh Menon'],
    ['2025-06-07', 'New Registration', 'Priya Nair', 29, 'Female', M, 'Dr. Kavita Reddy'],
    ['2025-06-09', 'Follow-up Visit', 'Mohammed Irfan', 52, 'Male', G, 'Dr. Vikram Singh'],
    ['2025-06-11', 'New Registration', 'Lakshmi Iyer', 34, 'Female', D, 'Dr. Neha Gupta'],
    ['2025-06-12', 'New Registration', 'Deepak Verma', 41, 'Male', G, 'Dr. Vikram Singh'],
    ['2025-06-14', 'Follow-up Visit', 'Anjali Rao', 27, 'Female', M, 'Dr. Kavita Reddy'],
    ['2025-06-16', 'New Registration', 'Baby Kavya', 2, 'Female', I, 'Dr. Rajesh Menon'],
    ['2025-06-18', 'New Registration', 'Suresh Babu', 60, 'Male', G, 'Dr. Anita Sharma'],
    ['2025-06-19', 'Follow-up Visit', 'Fatima Sheikh', 33, 'Female', D, 'Dr. Neha Gupta'],
    ['2025-06-21', 'New Registration', 'Rahul Joshi', 19, 'Male', G, 'Dr. Vikram Singh'],
    ['2025-06-23', 'New Registration', 'Meena Kumari', 46, 'Female', M, 'Dr. Kavita Reddy'],
    ['2025-06-25', 'Follow-up Visit', 'Arjun Reddy', 8, 'Male', I, 'Dr. Rajesh Menon'],
    ['2025-06-27', 'New Registration', 'Geeta Bai', 55, 'Female', G, 'Dr. Anita Sharma'],
    ['2025-06-28', 'New Registration', 'Vijay Kumar', 37, 'Male', D, 'Dr. Neha Gupta'],
    ['2025-06-30', 'Follow-up Visit', 'Pooja Mishra', 24, 'Female', M, 'Dr. Kavita Reddy'],
    ['2025-07-01', 'New Registration', 'Imran Khan', 43, 'Male', G, 'Dr. Vikram Singh'],
  ]
  const insertPat = db.prepare(
    'INSERT INTO patients (id, registration_date, visit_type, name, age, gender, department_id, consulting_doctor) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  )
  const seedPats = db.transaction(() => {
    for (const [reg, visit, name, age, gender, dept, doctor] of patients) {
      insertPat.run(randomUUID(), reg, visit, name, age, gender, dept, doctor)
    }
  })
  seedPats()
}

// Staff & Attendance Schema
db.exec(`
CREATE TABLE IF NOT EXISTS staff_sections (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS staff_departments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS staff_members (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  section_id TEXT NOT NULL REFERENCES staff_sections(id),
  department_id TEXT NOT NULL REFERENCES staff_departments(id),
  shift TEXT NOT NULL CHECK (shift IN ('Morning','Evening','Night'))
);

CREATE TABLE IF NOT EXISTS attendance_records (
  id TEXT PRIMARY KEY,
  staff_id TEXT NOT NULL REFERENCES staff_members(id),
  date TEXT NOT NULL,
  shift TEXT NOT NULL,
  time TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Present','Absent','Half Day','On Leave')),
  UNIQUE(staff_id, date)
);
`)

// Seed staff_sections if empty
const secCheck = db.prepare('SELECT COUNT(*) as count FROM staff_sections').get() as { count: number }
if (secCheck.count === 0) {
  const insertSec = db.prepare('INSERT OR IGNORE INTO staff_sections (id, name) VALUES (?, ?)')
  const sections = [
    ['sec-doctor', 'Doctor'],
    ['sec-nurse', 'Nurse'],
    ['sec-pharmacist', 'Pharmacist'],
    ['sec-lab-tech', 'Lab Technician'],
    ['sec-cleaning', 'Cleaning Staff']
  ]
  db.transaction(() => {
    for (const [id, name] of sections) insertSec.run(id, name)
  })()
}

// Seed staff_departments if empty
const deptCheck2 = db.prepare('SELECT COUNT(*) as count FROM staff_departments').get() as { count: number }
if (deptCheck2.count === 0) {
  const insertDept = db.prepare('INSERT OR IGNORE INTO staff_departments (id, name) VALUES (?, ?)')
  const departments = [
    ['dept-opd', 'OPD'],
    ['dept-ipd', 'IPD'],
    ['dept-emergency', 'Emergency'],
    ['dept-maternity', 'Maternity']
  ]
  db.transaction(() => {
    for (const [id, name] of departments) insertDept.run(id, name)
  })()
}

// Seed staff_members if empty
const staffCheck = db.prepare('SELECT COUNT(*) as count FROM staff_members').get() as { count: number }
if (staffCheck.count === 0) {
  const insertStaff = db.prepare('INSERT INTO staff_members (id, name, section_id, department_id, shift) VALUES (?, ?, ?, ?, ?)')
  const staff = [
    ['staff-1', 'Dr. Amit Patel', 'sec-doctor', 'dept-opd', 'Morning'],
    ['staff-2', 'Dr. Sarah Khan', 'sec-doctor', 'dept-emergency', 'Night'],
    ['staff-3', 'Dr. Priya Sharma', 'sec-doctor', 'dept-maternity', 'Evening'],
    ['staff-4', 'Dr. Vikram Rao', 'sec-doctor', 'dept-ipd', 'Morning'],
    ['staff-5', 'Nurse Rajesh Kumar', 'sec-nurse', 'dept-ipd', 'Morning'],
    ['staff-6', 'Nurse Sunita Devi', 'sec-nurse', 'dept-maternity', 'Evening'],
    ['staff-7', 'Nurse John D\'Souza', 'sec-nurse', 'dept-emergency', 'Night'],
    ['staff-8', 'Nurse Mary Lopez', 'sec-nurse', 'dept-opd', 'Morning'],
    ['staff-9', 'Nurse Shalini Sen', 'sec-nurse', 'dept-ipd', 'Evening'],
    ['staff-10', 'Pharmacist Alok Verma', 'sec-pharmacist', 'dept-opd', 'Morning'],
    ['staff-11', 'Pharmacist Deepa Nair', 'sec-pharmacist', 'dept-opd', 'Evening'],
    ['staff-12', 'Tech Ramesh Singh', 'sec-lab-tech', 'dept-emergency', 'Night'],
    ['staff-13', 'Tech Kiran Rao', 'sec-lab-tech', 'dept-opd', 'Morning'],
    ['staff-14', 'Cleaner Sita Ram', 'sec-cleaning', 'dept-ipd', 'Morning'],
    ['staff-15', 'Cleaner Mohan Lal', 'sec-cleaning', 'dept-emergency', 'Night'],
    ['staff-16', 'Cleaner Gita Bai', 'sec-cleaning', 'dept-maternity', 'Evening']
  ]
  db.transaction(() => {
    for (const [id, name, sec, dept, shift] of staff) insertStaff.run(id, name, sec, dept, shift)
  })()
}

// Seed 2 weeks of attendance if empty
const attendanceCheck = db.prepare('SELECT COUNT(*) as count FROM attendance_records').get() as { count: number }
if (attendanceCheck.count === 0) {
  const insertAttendance = db.prepare('INSERT INTO attendance_records (id, staff_id, date, shift, time, status) VALUES (?, ?, ?, ?, ?, ?)')
  const staffIds = ['staff-1', 'staff-2', 'staff-3', 'staff-4', 'staff-5', 'staff-6', 'staff-7', 'staff-8', 'staff-9', 'staff-10', 'staff-11', 'staff-12', 'staff-13', 'staff-14', 'staff-15', 'staff-16']
  
  // Generating last 10 days of attendance
  const dates: string[] = []
  for (let i = 10; i >= 1; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    dates.push(d.toISOString().split('T')[0])
  }

  const shiftsMap: Record<string, string> = {
    'staff-1': 'Morning', 'staff-2': 'Night', 'staff-3': 'Evening', 'staff-4': 'Morning',
    'staff-5': 'Morning', 'staff-6': 'Evening', 'staff-7': 'Night', 'staff-8': 'Morning',
    'staff-9': 'Evening', 'staff-10': 'Morning', 'staff-11': 'Evening', 'staff-12': 'Night',
    'staff-13': 'Morning', 'staff-14': 'Morning', 'staff-15': 'Night', 'staff-16': 'Evening'
  }

  const timesMap: Record<string, string> = {
    'Morning': '09:05 AM', 'Evening': '02:10 PM', 'Night': '10:02 PM'
  }

  const statuses = ['Present', 'Present', 'Present', 'Present', 'Present', 'Present', 'Present', 'Present', 'Absent', 'Half Day', 'On Leave']

  db.transaction(() => {
    for (const date of dates) {
      for (const staffId of staffIds) {
        const status = statuses[Math.floor(Math.random() * statuses.length)]
        const shift = shiftsMap[staffId]
        const checkinTime = status === 'Present' || status === 'Half Day' ? timesMap[shift] : '--:--'
        insertAttendance.run(randomUUID(), staffId, date, shift, checkinTime, status)
      }
    }
  })()
}

export default db