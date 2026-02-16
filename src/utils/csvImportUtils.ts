/**
 * CSV parsing and field mapping utilities for bulk student import.
 */

export interface ParsedCSV {
  headers: string[];
  rows: Record<string, string>[];
}

/**
 * Parse a CSV string into headers + row objects.
 * Handles quoted fields with commas and newlines.
 */
export function parseCSV(text: string): ParsedCSV {
  const lines: string[] = [];
  let current = "";
  let inQuote = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuote && text[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuote = !inQuote;
      }
    } else if ((ch === "\n" || ch === "\r") && !inQuote) {
      if (current.trim() !== "" || lines.length > 0) {
        lines.push(current);
      }
      current = "";
      if (ch === "\r" && text[i + 1] === "\n") i++;
    } else {
      current += ch;
    }
  }
  if (current.trim() !== "") lines.push(current);

  if (lines.length === 0) return { headers: [], rows: [] };

  const splitLine = (line: string): string[] => {
    const result: string[] = [];
    let field = "";
    let q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (q && line[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          q = !q;
        }
      } else if (c === "," && !q) {
        result.push(field.trim());
        field = "";
      } else {
        field += c;
      }
    }
    result.push(field.trim());
    return result;
  };

  const headers = splitLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const values = splitLine(line);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = values[i] || "";
    });
    return obj;
  });

  return { headers, rows };
}

/**
 * All importable student DB columns with display labels.
 */
export const STUDENT_FIELDS: { value: string; label: string; required?: boolean }[] = [
  { value: "name", label: "Full Name", required: true },
  { value: "student_id_number", label: "Student ID" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "enrollment_date", label: "Enrollment Date", required: true },
  { value: "billing_start_month", label: "Billing Start (YYYY-MM)", required: true },
  { value: "course_start_month", label: "Course Start (YYYY-MM)" },
  { value: "course_end_month", label: "Course End (YYYY-MM)" },
  { value: "admission_fee_total", label: "Admission Fee" },
  { value: "monthly_fee_amount", label: "Monthly Fee" },
  { value: "status", label: "Status" },
  { value: "notes", label: "Notes" },
  { value: "date_of_birth", label: "Date of Birth" },
  { value: "gender", label: "Gender" },
  { value: "blood_group", label: "Blood Group" },
  { value: "religion_category", label: "Religion/Category" },
  { value: "nationality", label: "Nationality" },
  { value: "aadhar_id_number", label: "Aadhar/ID Number" },
  { value: "whatsapp_number", label: "WhatsApp Number" },
  { value: "alt_contact_number", label: "Alt Contact" },
  { value: "address_house", label: "Address - House" },
  { value: "address_street", label: "Address - Street" },
  { value: "address_area", label: "Address - Area" },
  { value: "address_city", label: "Address - City" },
  { value: "address_state", label: "Address - State" },
  { value: "address_pin_zip", label: "Address - PIN/ZIP" },
  { value: "father_name", label: "Father's Name" },
  { value: "father_occupation", label: "Father's Occupation" },
  { value: "father_contact", label: "Father's Contact" },
  { value: "father_annual_income", label: "Father's Income" },
  { value: "mother_name", label: "Mother's Name" },
  { value: "mother_occupation", label: "Mother's Occupation" },
  { value: "mother_contact", label: "Mother's Contact" },
  { value: "guardian_name", label: "Guardian Name" },
  { value: "guardian_contact", label: "Guardian Contact" },
  { value: "guardian_relationship", label: "Guardian Relationship" },
  { value: "previous_school", label: "Previous School" },
  { value: "class_grade", label: "Class/Grade" },
  { value: "roll_number", label: "Roll Number" },
  { value: "academic_year", label: "Academic Year" },
  { value: "section_division", label: "Section/Division" },
  { value: "previous_qualification", label: "Previous Qualification" },
  { value: "previous_percentage", label: "Previous Percentage" },
  { value: "board_university", label: "Board/University" },
  { value: "emergency_contact_name", label: "Emergency Contact Name" },
  { value: "emergency_contact_number", label: "Emergency Contact Number" },
  { value: "transportation_mode", label: "Transportation Mode" },
  { value: "special_needs_medical", label: "Special Needs/Medical" },
  { value: "distance_from_institution", label: "Distance from Institution" },
  { value: "extracurricular_interests", label: "Extracurricular Interests" },
  { value: "language_proficiency", label: "Language Proficiency" },
];

/**
 * Auto-detect column mapping using fuzzy matching.
 */
export function autoMapColumns(csvHeaders: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};

  const normalize = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]/g, "");

  const aliases: Record<string, string[]> = {
    name: ["name", "fullname", "studentname", "student"],
    student_id_number: ["studentid", "id", "idnumber", "studentidnumber", "sid", "admissionno"],
    email: ["email", "emailaddress", "emailid"],
    phone: ["phone", "mobile", "phonenumber", "mobilenumber", "contact"],
    enrollment_date: ["enrollmentdate", "dateofenrollment", "admissiondate", "joindate"],
    billing_start_month: ["billingstartmonth", "billingstart", "feestart"],
    admission_fee_total: ["admissionfee", "admissionfeetotal", "admfee"],
    monthly_fee_amount: ["monthlyfee", "monthlyfeeamount", "tuition", "tuitionfee"],
    status: ["status", "studentstatus"],
    date_of_birth: ["dateofbirth", "dob", "birthdate", "birthday"],
    gender: ["gender", "sex"],
    blood_group: ["bloodgroup", "blood"],
    father_name: ["fathername", "fathersname", "father"],
    mother_name: ["mothername", "mothersname", "mother"],
    address_city: ["city", "addresscity"],
    address_state: ["state", "addressstate"],
    class_grade: ["class", "grade", "classgrade"],
    roll_number: ["rollnumber", "rollno", "roll"],
    academic_year: ["academicyear", "year", "session"],
    section_division: ["section", "division", "sectiondivision"],
    whatsapp_number: ["whatsapp", "whatsappnumber", "wa"],
    notes: ["notes", "remarks", "comment", "comments"],
    nationality: ["nationality"],
    religion_category: ["religion", "category", "religioncategory", "caste"],
    previous_school: ["previousschool", "prevschool", "lastschool"],
    guardian_name: ["guardianname", "guardian"],
    batch_id: [], // intentionally empty - should be mapped manually or via UI
  };

  for (const csvHeader of csvHeaders) {
    const norm = normalize(csvHeader);
    for (const [dbCol, aliasList] of Object.entries(aliases)) {
      if (aliasList.includes(norm) || normalize(dbCol) === norm) {
        if (!Object.values(mapping).includes(dbCol)) {
          mapping[csvHeader] = dbCol;
          break;
        }
      }
    }
  }

  return mapping;
}

/**
 * Generate a downloadable CSV template with all field headers.
 */
export function generateTemplate(): string {
  const requiredFields = STUDENT_FIELDS.filter((f) => f.required).map((f) => f.value);
  const optionalFields = STUDENT_FIELDS.filter((f) => !f.required).map((f) => f.value);
  const allFields = [...requiredFields, ...optionalFields];
  return allFields.join(",") + "\n";
}
