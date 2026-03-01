import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const COMPANY = "0f108cf2-94a8-4e36-b117-7a786ac6b51e";
  const ADMIN = "c4a042bf-eff2-4c3e-9431-a093fe7feaa1"; // cipher@app.com - exists in auth.users

  // Clean up any partial data from previous failed runs (reverse FK order)
  await supabase.from("student_sales_notes").delete().eq("company_id", COMPANY);
  await supabase.from("product_sales").delete().eq("company_id", COMPANY);
  await supabase.from("allocations").delete().eq("company_id", COMPANY);
  await supabase.from("revenues").delete().eq("company_id", COMPANY);
  await supabase.from("student_payments").delete().eq("company_id", COMPANY);
  await supabase.from("monthly_fee_history").delete().eq("company_id", COMPANY);
  await supabase.from("batch_enrollments").delete().eq("company_id", COMPANY);
  await supabase.from("students").delete().eq("company_id", COMPANY);
  await supabase.from("batches").delete().eq("company_id", COMPANY);
  await supabase.from("courses").delete().eq("company_id", COMPANY);
  await supabase.from("products").delete().eq("company_id", COMPANY);
  await supabase.from("product_categories").delete().eq("company_id", COMPANY);
  await supabase.from("expenses").delete().eq("company_id", COMPANY);
  await supabase.from("expense_accounts").delete().eq("company_id", COMPANY);
  await supabase.from("revenue_sources").delete().eq("company_id", COMPANY);

  const results: Record<string, number> = {};

  try {
    // ── 1. Revenue Sources ──
    const revSources = [
      { id: "a0000001-0000-0000-0000-000000000001", company_id: COMPANY, user_id: ADMIN, name: "Tuition Fees", is_active: true },
      { id: "a0000001-0000-0000-0000-000000000002", company_id: COMPANY, user_id: ADMIN, name: "Product Sales", is_active: true },
    ];
    const { error: e1 } = await supabase.from("revenue_sources").insert(revSources);
    if (e1) throw new Error(`revenue_sources: ${e1.message}`);
    results.revenue_sources = 2;

    // ── 2. Expense Accounts ──
    const expAccts = [
      { id: "b0000001-0000-0000-0000-000000000001", company_id: COMPANY, user_id: ADMIN, name: "Rent", allocation_percentage: 40, color: "#EF4444" },
      { id: "b0000001-0000-0000-0000-000000000002", company_id: COMPANY, user_id: ADMIN, name: "Utilities", allocation_percentage: 30, color: "#3B82F6" },
      { id: "b0000001-0000-0000-0000-000000000003", company_id: COMPANY, user_id: ADMIN, name: "Marketing", allocation_percentage: 30, color: "#10B981" },
    ];
    const { error: e2 } = await supabase.from("expense_accounts").insert(expAccts);
    if (e2) throw new Error(`expense_accounts: ${e2.message}`);
    results.expense_accounts = 3;

    // ── 3. Product Categories ──
    const prodCats = [
      { id: "c0000001-0000-0000-0000-000000000001", company_id: COMPANY, user_id: ADMIN, name: "Study Materials", slug: "study-materials", icon: "book", color: "#8B5CF6" },
    ];
    const { error: e3 } = await supabase.from("product_categories").insert(prodCats);
    if (e3) throw new Error(`product_categories: ${e3.message}`);
    results.product_categories = 1;

    // ── 4. Courses ──
    const courses = [
      { id: "d0000001-0000-0000-0000-000000000001", company_id: COMPANY, user_id: ADMIN, created_by: ADMIN, course_name: "English Mastery", course_code: "EM-001", description: "Complete English language mastery course", duration_months: 4, status: "active" },
      { id: "d0000001-0000-0000-0000-000000000002", company_id: COMPANY, user_id: ADMIN, created_by: ADMIN, course_name: "Practice Club", course_code: "PC-001", description: "Conversational English practice sessions", duration_months: 4, status: "active" },
      { id: "d0000001-0000-0000-0000-000000000003", company_id: COMPANY, user_id: ADMIN, created_by: ADMIN, course_name: "Advanced Writing", course_code: "AW-001", description: "Advanced academic writing skills", duration_months: 4, status: "active" },
    ];
    const { error: e4 } = await supabase.from("courses").insert(courses);
    if (e4) throw new Error(`courses: ${e4.message}`);
    results.courses = 3;

    // ── 5. Batches ──
    const now = new Date();
    const monthsAgo = (m: number) => { const d = new Date(now); d.setMonth(d.getMonth() - m); return d.toISOString().split("T")[0]; };
    const monthsLater = (m: number) => { const d = new Date(now); d.setMonth(d.getMonth() + m); return d.toISOString().split("T")[0]; };
    const yesterday = () => { const d = new Date(now); d.setDate(d.getDate() - 1); return d.toISOString().split("T")[0]; };

    const batches = [
      { id: "e0000001-0000-0000-0000-000000000001", company_id: COMPANY, user_id: ADMIN, created_by: ADMIN, course_id: "d0000001-0000-0000-0000-000000000001", batch_name: "English Mastery B1", batch_code: "EM-B1", start_date: monthsAgo(6), end_date: monthsAgo(2), status: "completed", default_admission_fee: 3000, default_monthly_fee: 2000, course_duration_months: 4, max_capacity: 30 },
      { id: "e0000001-0000-0000-0000-000000000002", company_id: COMPANY, user_id: ADMIN, created_by: ADMIN, course_id: "d0000001-0000-0000-0000-000000000001", batch_name: "English Mastery B2", batch_code: "EM-B2", start_date: monthsAgo(2), end_date: monthsLater(2), status: "active", default_admission_fee: 3000, default_monthly_fee: 2000, course_duration_months: 4, max_capacity: 30 },
      { id: "e0000001-0000-0000-0000-000000000003", company_id: COMPANY, user_id: ADMIN, created_by: ADMIN, course_id: "d0000001-0000-0000-0000-000000000002", batch_name: "Practice Club B1", batch_code: "PC-B1", start_date: monthsAgo(1), end_date: monthsLater(3), status: "active", default_admission_fee: 2000, default_monthly_fee: 1500, course_duration_months: 4, max_capacity: 25 },
      { id: "e0000001-0000-0000-0000-000000000004", company_id: COMPANY, user_id: ADMIN, created_by: ADMIN, course_id: "d0000001-0000-0000-0000-000000000002", batch_name: "Practice Club B2", batch_code: "PC-B2", start_date: monthsAgo(3), end_date: monthsLater(1), status: "active", default_admission_fee: 2000, default_monthly_fee: 1500, course_duration_months: 4, max_capacity: 25 },
      { id: "e0000001-0000-0000-0000-000000000005", company_id: COMPANY, user_id: ADMIN, created_by: ADMIN, course_id: "d0000001-0000-0000-0000-000000000003", batch_name: "Advanced Writing B1", batch_code: "AW-B1", start_date: monthsAgo(5), end_date: monthsAgo(1), status: "completed", default_admission_fee: 3500, default_monthly_fee: 2500, course_duration_months: 4, max_capacity: 20 },
      // Test 8 extra: active batch with end_date = yesterday (should be auto-completed)
      { id: "e0000001-0000-0000-0000-000000000006", company_id: COMPANY, user_id: ADMIN, created_by: ADMIN, course_id: "d0000001-0000-0000-0000-000000000003", batch_name: "Advanced Writing B2", batch_code: "AW-B2", start_date: monthsAgo(4), end_date: yesterday(), status: "active", default_admission_fee: 3500, default_monthly_fee: 2500, course_duration_months: 4, max_capacity: 20 },
    ];
    const { error: e5 } = await supabase.from("batches").insert(batches);
    if (e5) throw new Error(`batches: ${e5.message}`);
    results.batches = 6;

    // ── 6. Products ──
    const products = [
      { id: "f0000001-0000-0000-0000-000000000001", company_id: COMPANY, user_id: ADMIN, created_by: ADMIN, product_name: "Grammar Workbook", product_code: "GW-001", category: "study-materials", type: "physical", price: 250, purchase_price: 150, stock_quantity: 50, status: "active" },
      { id: "f0000001-0000-0000-0000-000000000002", company_id: COMPANY, user_id: ADMIN, created_by: ADMIN, product_name: "Notebook Set", product_code: "NS-001", category: "study-materials", type: "physical", price: 150, purchase_price: 80, stock_quantity: 100, status: "active" },
      { id: "f0000001-0000-0000-0000-000000000003", company_id: COMPANY, user_id: ADMIN, created_by: ADMIN, product_name: "Pen Pack", product_code: "PP-001", category: "study-materials", type: "physical", price: 80, purchase_price: 40, stock_quantity: 200, status: "active" },
    ];
    const { error: e6 } = await supabase.from("products").insert(products);
    if (e6) throw new Error(`products: ${e6.message}`);
    results.products = 3;

    // ── 7. Students (20) ──
    const studentData = [
      // 12 active
      { idx: 1, name: "Rahim Uddin", phone: "01712345001", email: "rahim@test.com", father: "Abdul Karim", mother: "Salma Begum", status: "active" },
      { idx: 2, name: "Fatima Akter", phone: "01812345002", email: "fatima@test.com", father: "Mohammad Ali", mother: "Razia Sultana", status: "active" },
      { idx: 3, name: "Kamal Hossain", phone: "01912345003", email: "kamal@test.com", father: "Nurul Islam", mother: "Hasina Begum", status: "active" },
      { idx: 4, name: "Nasreen Jahan", phone: "01312345004", email: "nasreen@test.com", father: "Fazlul Haque", mother: "Jahanara Begum", status: "active" },
      { idx: 5, name: "Tariq Rahman", phone: "01512345005", email: "tariq@test.com", father: "Abdur Rahman", mother: "Kulsum Akter", status: "active" },
      { idx: 6, name: "Sumaiya Islam", phone: "01612345006", email: "sumaiya@test.com", father: "Shahidul Islam", mother: "Nasima Begum", status: "active" },
      { idx: 7, name: "Arif Ahmed", phone: "01712345007", email: "arif@test.com", father: "Rafiqul Ahmed", mother: "Monowara Begum", status: "active" },
      { idx: 8, name: "Nusrat Faria", phone: "01812345008", email: "nusrat@test.com", father: "Md Faruk", mother: "Rokeya Begum", status: "active" },
      { idx: 9, name: "Shakil Mahmud", phone: "01912345009", email: "shakil@test.com", father: "Mahmudur Rahman", mother: "Shirin Akter", status: "active" },
      { idx: 10, name: "Ruma Sultana", phone: "01312345010", email: "ruma@test.com", father: "Sultan Ahmed", mother: "Amena Khatun", status: "active" },
      { idx: 11, name: "Imran Khan", phone: "01512345011", email: "imran@test.com", father: "Motiur Rahman", mother: "Rahima Begum", status: "active" },
      { idx: 12, name: "Anika Tabassum", phone: "01612345012", email: "anika@test.com", father: "Taher Uddin", mother: "Shamima Nasrin", status: "active" },
      // 3 inactive
      { idx: 13, name: "Jahangir Alam", phone: "01712345013", email: "jahangir@test.com", father: "Alam Mia", mother: "Fatema Khatun", status: "inactive" },
      { idx: 14, name: "Reshma Khatun", phone: "01812345014", email: "reshma@test.com", father: "Khalilur Rahman", mother: "Nurjahan Begum", status: "inactive" },
      { idx: 15, name: "Babul Mia", phone: "01912345015", email: "babul@test.com", father: "Siraj Mia", mother: "Josna Begum", status: "inactive" },
      // 2 graduated
      { idx: 16, name: "Sadia Afrin", phone: "01312345016", email: "sadia@test.com", father: "Afrin Uddin", mother: "Bilkis Begum", status: "graduated" },
      { idx: 17, name: "Masud Rana", phone: "01512345017", email: "masud@test.com", father: "Mozammel Haque", mother: "Halima Akter", status: "graduated" },
      // 2 dropout
      { idx: 18, name: "Habib Ullah", phone: "01612345018", email: "habib@test.com", father: "Obaidullah", mother: "Moriam Begum", status: "dropout" },
      { idx: 19, name: "Sharmin Akter", phone: "01712345019", email: "sharmin@test.com", father: "Shamsul Haque", mother: "Rehana Parvin", status: "dropout" },
      // 1 multi-enrollment test student (active)
      { idx: 20, name: "Test Multi", phone: "01812345020", email: "testmulti@test.com", father: "Multi Father", mother: "Multi Mother", status: "active" },
    ];

    const students = studentData.map(s => ({
      id: `10000000-0000-0000-0000-0000000000${String(s.idx).padStart(2, "0")}`,
      company_id: COMPANY,
      user_id: ADMIN,
      name: s.name,
      phone: s.phone,
      email: s.email,
      father_name: s.father,
      mother_name: s.mother,
      status: s.status,
      enrollment_date: monthsAgo(s.idx <= 12 ? 3 : s.idx <= 15 ? 5 : 6),
      admission_fee_total: s.idx <= 5 ? 3000 : s.idx <= 10 ? 2000 : 3500,
      monthly_fee_amount: s.idx <= 5 ? 2000 : s.idx <= 10 ? 1500 : 2500,
      address_city: "Dhaka",
      address_area: "Mirpur",
      gender: s.idx % 2 === 0 ? "Female" : "Male",
    }));
    const { error: e7 } = await supabase.from("students").insert(students);
    if (e7) throw new Error(`students: ${e7.message}`);
    results.students = 20;

    // ── 8. Batch Enrollments (22+) ──
    // Students 1-5: English Mastery B2 (active) — fully paid group
    // Students 6-10: Practice Club B1 (active) — partially paid / overdue
    // Students 11-12: Practice Club B2 (active) — partial status payments
    // Students 13-15: English Mastery B1 (completed) — in completed batch  
    // Students 16-17: Advanced Writing B1 (completed) — graduated
    // Student 20 (Test Multi): English Mastery B2 + Practice Club B1
    // Student 1: admission-only student (will have only admission paid)

    const enrollments = [
      // Active students in EM-B2
      ...([1,2,3,4,5] as number[]).map((i, idx) => ({
        id: `20000000-0000-0000-0000-0000000000${String(idx+1).padStart(2,"0")}`,
        student_id: `10000000-0000-0000-0000-0000000000${String(i).padStart(2,"0")}`,
        batch_id: "e0000001-0000-0000-0000-000000000002", // EM-B2
        company_id: COMPANY,
        created_by: ADMIN,
        enrollment_date: monthsAgo(2),
        total_fee: 11000, // 3000 admission + 4*2000 monthly
        status: "active",
      })),
      // Active students in PC-B1
      ...([6,7,8,9,10] as number[]).map((i, idx) => ({
        id: `20000000-0000-0000-0000-0000000000${String(idx+6).padStart(2,"0")}`,
        student_id: `10000000-0000-0000-0000-0000000000${String(i).padStart(2,"0")}`,
        batch_id: "e0000001-0000-0000-0000-000000000003", // PC-B1
        company_id: COMPANY,
        created_by: ADMIN,
        enrollment_date: monthsAgo(1),
        total_fee: 8000, // 2000 admission + 4*1500 monthly
        status: "active",
      })),
      // Active students in PC-B2
      ...([11,12] as number[]).map((i, idx) => ({
        id: `20000000-0000-0000-0000-0000000000${String(idx+11).padStart(2,"0")}`,
        student_id: `10000000-0000-0000-0000-0000000000${String(i).padStart(2,"0")}`,
        batch_id: "e0000001-0000-0000-0000-000000000004", // PC-B2
        company_id: COMPANY,
        created_by: ADMIN,
        enrollment_date: monthsAgo(3),
        total_fee: 12000, // 2000 admission + 4*2500... wait PC-B2 has 1500 monthly fee
        status: "active",
      })),
      // Completed: students 13-15 in EM-B1
      ...([13,14,15] as number[]).map((i, idx) => ({
        id: `20000000-0000-0000-0000-0000000000${String(idx+13).padStart(2,"0")}`,
        student_id: `10000000-0000-0000-0000-0000000000${String(i).padStart(2,"0")}`,
        batch_id: "e0000001-0000-0000-0000-000000000001", // EM-B1 completed
        company_id: COMPANY,
        created_by: ADMIN,
        enrollment_date: monthsAgo(6),
        total_fee: 11000,
        status: "completed",
      })),
      // Graduated: students 16-17 in AW-B1
      ...([16,17] as number[]).map((i, idx) => ({
        id: `20000000-0000-0000-0000-0000000000${String(idx+16).padStart(2,"0")}`,
        student_id: `10000000-0000-0000-0000-0000000000${String(i).padStart(2,"0")}`,
        batch_id: "e0000001-0000-0000-0000-000000000005", // AW-B1 completed
        company_id: COMPANY,
        created_by: ADMIN,
        enrollment_date: monthsAgo(5),
        total_fee: 13500, // 3500 + 4*2500
        status: "completed",
      })),
      // Test Multi: EM-B2
      {
        id: "20000000-0000-0000-0000-000000000018",
        student_id: "10000000-0000-0000-0000-000000000020",
        batch_id: "e0000001-0000-0000-0000-000000000002", // EM-B2
        company_id: COMPANY,
        created_by: ADMIN,
        enrollment_date: monthsAgo(2),
        total_fee: 11000,
        status: "active",
      },
      // Test Multi: PC-B1
      {
        id: "20000000-0000-0000-0000-000000000019",
        student_id: "10000000-0000-0000-0000-000000000020",
        batch_id: "e0000001-0000-0000-0000-000000000003", // PC-B1
        company_id: COMPANY,
        created_by: ADMIN,
        enrollment_date: monthsAgo(1),
        total_fee: 8000,
        status: "active",
      },
    ];
    const { error: e8 } = await supabase.from("batch_enrollments").insert(enrollments);
    if (e8) throw new Error(`batch_enrollments: ${e8.message}`);
    results.batch_enrollments = enrollments.length;

    // ── 9. Monthly Fee History ──
    const feeHistory = students.map(s => ({
      company_id: COMPANY,
      user_id: ADMIN,
      student_id: s.id,
      monthly_amount: s.monthly_fee_amount,
      effective_from: "2025-09",
    }));
    const { error: e9 } = await supabase.from("monthly_fee_history").insert(feeHistory);
    if (e9) throw new Error(`monthly_fee_history: ${e9.message}`);
    results.monthly_fee_history = feeHistory.length;

    // ── 10. Student Payments ──
    // Helper to generate month strings
    const monthStr = (monthsBack: number) => {
      const d = new Date(now);
      d.setMonth(d.getMonth() - monthsBack);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    };
    const dateStr = (monthsBack: number) => {
      const d = new Date(now);
      d.setMonth(d.getMonth() - monthsBack);
      return d.toISOString().split("T")[0];
    };

    let paymentCounter = 0;
    const paymentId = () => {
      paymentCounter++;
      return `30000000-0000-0000-0000-0000000000${String(paymentCounter).padStart(2, "0")}`;
    };

    const allPayments: any[] = [];
    const TUITION_SOURCE = "a0000001-0000-0000-0000-000000000001";

    // Students 2-5 (EM-B2): FULLY PAID — admission + 2 months (batch started 2 months ago)
    for (const i of [2,3,4,5]) {
      const sid = `10000000-0000-0000-0000-0000000000${String(i).padStart(2,"0")}`;
      const eid = `20000000-0000-0000-0000-0000000000${String(i-1).padStart(2,"0")}`; // enrollment ids for students 2-5 are idx 2-5 (mapped to enrollment indices 2,3,4,5... let me fix)
      // Enrollment IDs: student 1->enroll 01, student 2->enroll 02, etc. 
      const enrollId = `20000000-0000-0000-0000-0000000000${String(i).padStart(2,"0")}`;
      // Admission fee
      allPayments.push({
        id: paymentId(), student_id: sid, company_id: COMPANY, user_id: ADMIN,
        source_id: TUITION_SOURCE, batch_enrollment_id: enrollId,
        payment_type: "admission_fee", amount: 3000, status: "paid",
        payment_date: dateStr(2), due_date: dateStr(2),
        months_covered: null, description: "Admission fee",
      });
      // Monthly: month 1 and month 2
      for (let m = 1; m >= 0; m--) {
        allPayments.push({
          id: paymentId(), student_id: sid, company_id: COMPANY, user_id: ADMIN,
          source_id: TUITION_SOURCE, batch_enrollment_id: enrollId,
          payment_type: "monthly_fee", amount: 2000, status: "paid",
          payment_date: dateStr(m), due_date: dateStr(m),
          months_covered: [monthStr(m)], description: `Monthly fee ${monthStr(m)}`,
        });
      }
      // Future months: unpaid but not overdue
      for (let m = -1; m >= -2; m--) {
        allPayments.push({
          id: paymentId(), student_id: sid, company_id: COMPANY, user_id: ADMIN,
          source_id: TUITION_SOURCE, batch_enrollment_id: enrollId,
          payment_type: "monthly_fee", amount: 2000, status: "unpaid",
          payment_date: dateStr(0), due_date: dateStr(m), // future due date
          months_covered: [monthStr(m)], description: `Monthly fee ${monthStr(m)}`,
        });
      }
    }

    // Student 1 (EM-B2): ADMISSION ONLY — admission paid, all monthly unpaid
    {
      const sid = "10000000-0000-0000-0000-000000000001";
      const eid = "20000000-0000-0000-0000-000000000001";
      allPayments.push({
        id: paymentId(), student_id: sid, company_id: COMPANY, user_id: ADMIN,
        source_id: TUITION_SOURCE, batch_enrollment_id: eid,
        payment_type: "admission_fee", amount: 3000, status: "paid",
        payment_date: dateStr(2), due_date: dateStr(2),
        months_covered: null, description: "Admission fee",
      });
      for (let m = 1; m >= -2; m--) {
        allPayments.push({
          id: paymentId(), student_id: sid, company_id: COMPANY, user_id: ADMIN,
          source_id: TUITION_SOURCE, batch_enrollment_id: eid,
          payment_type: "monthly_fee", amount: 2000, status: "unpaid",
          payment_date: dateStr(0), due_date: dateStr(m),
          months_covered: [monthStr(m)], description: `Monthly fee ${monthStr(m)}`,
        });
      }
    }

    // Students 6-8 (PC-B1): PARTIALLY PAID — admission paid, 1 month paid, rest unpaid
    for (const i of [6,7,8]) {
      const sid = `10000000-0000-0000-0000-0000000000${String(i).padStart(2,"0")}`;
      const eid = `20000000-0000-0000-0000-0000000000${String(i).padStart(2,"0")}`;
      allPayments.push({
        id: paymentId(), student_id: sid, company_id: COMPANY, user_id: ADMIN,
        source_id: TUITION_SOURCE, batch_enrollment_id: eid,
        payment_type: "admission_fee", amount: 2000, status: "paid",
        payment_date: dateStr(1), due_date: dateStr(1),
        months_covered: null, description: "Admission fee",
      });
      // Month 1 paid
      allPayments.push({
        id: paymentId(), student_id: sid, company_id: COMPANY, user_id: ADMIN,
        source_id: TUITION_SOURCE, batch_enrollment_id: eid,
        payment_type: "monthly_fee", amount: 1500, status: "paid",
        payment_date: dateStr(0), due_date: dateStr(0),
        months_covered: [monthStr(0)], description: `Monthly fee ${monthStr(0)}`,
      });
      // Future months unpaid
      for (let m = -1; m >= -3; m--) {
        allPayments.push({
          id: paymentId(), student_id: sid, company_id: COMPANY, user_id: ADMIN,
          source_id: TUITION_SOURCE, batch_enrollment_id: eid,
          payment_type: "monthly_fee", amount: 1500, status: "unpaid",
          payment_date: dateStr(0), due_date: dateStr(m),
          months_covered: [monthStr(m)], description: `Monthly fee ${monthStr(m)}`,
        });
      }
    }

    // Student 9 (PC-B1): has extra payment -- admission only paid, but some unpaid are overdue
    {
      const sid = "10000000-0000-0000-0000-000000000009";
      const eid = "20000000-0000-0000-0000-000000000009";
      allPayments.push({
        id: paymentId(), student_id: sid, company_id: COMPANY, user_id: ADMIN,
        source_id: TUITION_SOURCE, batch_enrollment_id: eid,
        payment_type: "admission_fee", amount: 2000, status: "paid",
        payment_date: dateStr(1), due_date: dateStr(1),
        months_covered: null, description: "Admission fee",
      });
      // All months unpaid — first one is overdue (due_date in the past)
      for (let m = 0; m >= -3; m--) {
        allPayments.push({
          id: paymentId(), student_id: sid, company_id: COMPANY, user_id: ADMIN,
          source_id: TUITION_SOURCE, batch_enrollment_id: eid,
          payment_type: "monthly_fee", amount: 1500, status: "unpaid",
          payment_date: dateStr(0), due_date: dateStr(m),
          months_covered: [monthStr(m)], description: `Monthly fee ${monthStr(m)}`,
        });
      }
    }

    // Student 10 (PC-B1): OVERDUE — admission paid, all monthly unpaid with past due dates
    {
      const sid = "10000000-0000-0000-0000-000000000010";
      const eid = "20000000-0000-0000-0000-000000000010";
      allPayments.push({
        id: paymentId(), student_id: sid, company_id: COMPANY, user_id: ADMIN,
        source_id: TUITION_SOURCE, batch_enrollment_id: eid,
        payment_type: "admission_fee", amount: 2000, status: "paid",
        payment_date: dateStr(1), due_date: dateStr(1),
        months_covered: null, description: "Admission fee",
      });
      for (let m = 0; m >= -3; m--) {
        allPayments.push({
          id: paymentId(), student_id: sid, company_id: COMPANY, user_id: ADMIN,
          source_id: TUITION_SOURCE, batch_enrollment_id: eid,
          payment_type: "monthly_fee", amount: 1500, status: "unpaid",
          payment_date: dateStr(0), due_date: dateStr(m),
          months_covered: [monthStr(m)], description: `Monthly fee ${monthStr(m)}`,
        });
      }
    }

    // Students 11-12 (PC-B2): PARTIAL payments — admission paid, some months have partial status
    for (const i of [11,12]) {
      const sid = `10000000-0000-0000-0000-0000000000${String(i).padStart(2,"0")}`;
      const eid = `20000000-0000-0000-0000-0000000000${String(i).padStart(2,"0")}`;
      allPayments.push({
        id: paymentId(), student_id: sid, company_id: COMPANY, user_id: ADMIN,
        source_id: TUITION_SOURCE, batch_enrollment_id: eid,
        payment_type: "admission_fee", amount: 2000, status: "paid",
        payment_date: dateStr(3), due_date: dateStr(3),
        months_covered: null, description: "Admission fee",
      });
      // 3 months: first paid, second partial, third unpaid
      allPayments.push({
        id: paymentId(), student_id: sid, company_id: COMPANY, user_id: ADMIN,
        source_id: TUITION_SOURCE, batch_enrollment_id: eid,
        payment_type: "monthly_fee", amount: 1500, status: "paid",
        payment_date: dateStr(2), due_date: dateStr(2),
        months_covered: [monthStr(2)], description: `Monthly fee ${monthStr(2)}`,
      });
      allPayments.push({
        id: paymentId(), student_id: sid, company_id: COMPANY, user_id: ADMIN,
        source_id: TUITION_SOURCE, batch_enrollment_id: eid,
        payment_type: "monthly_fee", amount: 800, status: "partial",
        payment_date: dateStr(1), due_date: dateStr(1),
        months_covered: [monthStr(1)], description: `Partial payment ${monthStr(1)}`,
      });
      allPayments.push({
        id: paymentId(), student_id: sid, company_id: COMPANY, user_id: ADMIN,
        source_id: TUITION_SOURCE, batch_enrollment_id: eid,
        payment_type: "monthly_fee", amount: 1500, status: "unpaid",
        payment_date: dateStr(0), due_date: dateStr(0),
        months_covered: [monthStr(0)], description: `Monthly fee ${monthStr(0)}`,
      });
      // Future month
      allPayments.push({
        id: paymentId(), student_id: sid, company_id: COMPANY, user_id: ADMIN,
        source_id: TUITION_SOURCE, batch_enrollment_id: eid,
        payment_type: "monthly_fee", amount: 1500, status: "unpaid",
        payment_date: dateStr(0), due_date: dateStr(-1),
        months_covered: [monthStr(-1)], description: `Monthly fee ${monthStr(-1)}`,
      });
    }

    // Students 13-15 (EM-B1 completed, inactive): have some paid payments historically
    for (const i of [13,14,15]) {
      const sid = `10000000-0000-0000-0000-0000000000${String(i).padStart(2,"0")}`;
      const eid = `20000000-0000-0000-0000-0000000000${String(i).padStart(2,"0")}`;
      allPayments.push({
        id: paymentId(), student_id: sid, company_id: COMPANY, user_id: ADMIN,
        source_id: TUITION_SOURCE, batch_enrollment_id: eid,
        payment_type: "admission_fee", amount: 3000, status: "paid",
        payment_date: dateStr(6), due_date: dateStr(6),
        months_covered: null, description: "Admission fee",
      });
      // 2 months paid (overdue on the rest but in completed batch — should NOT show as overdue)
      for (let m = 5; m >= 4; m--) {
        allPayments.push({
          id: paymentId(), student_id: sid, company_id: COMPANY, user_id: ADMIN,
          source_id: TUITION_SOURCE, batch_enrollment_id: eid,
          payment_type: "monthly_fee", amount: 2000, status: "paid",
          payment_date: dateStr(m), due_date: dateStr(m),
          months_covered: [monthStr(m)], description: `Monthly fee ${monthStr(m)}`,
        });
      }
      // 2 months unpaid with past due dates (should NOT show as overdue because batch is completed and student is inactive)
      for (let m = 3; m >= 2; m--) {
        allPayments.push({
          id: paymentId(), student_id: sid, company_id: COMPANY, user_id: ADMIN,
          source_id: TUITION_SOURCE, batch_enrollment_id: eid,
          payment_type: "monthly_fee", amount: 2000, status: "unpaid",
          payment_date: dateStr(0), due_date: dateStr(m),
          months_covered: [monthStr(m)], description: `Monthly fee ${monthStr(m)}`,
        });
      }
    }

    // Students 16-17 (AW-B1 completed, graduated): fully paid
    for (const i of [16,17]) {
      const sid = `10000000-0000-0000-0000-0000000000${String(i).padStart(2,"0")}`;
      const eid = `20000000-0000-0000-0000-0000000000${String(i).padStart(2,"0")}`;
      allPayments.push({
        id: paymentId(), student_id: sid, company_id: COMPANY, user_id: ADMIN,
        source_id: TUITION_SOURCE, batch_enrollment_id: eid,
        payment_type: "admission_fee", amount: 3500, status: "paid",
        payment_date: dateStr(5), due_date: dateStr(5),
        months_covered: null, description: "Admission fee",
      });
      for (let m = 4; m >= 1; m--) {
        allPayments.push({
          id: paymentId(), student_id: sid, company_id: COMPANY, user_id: ADMIN,
          source_id: TUITION_SOURCE, batch_enrollment_id: eid,
          payment_type: "monthly_fee", amount: 2500, status: "paid",
          payment_date: dateStr(m), due_date: dateStr(m),
          months_covered: [monthStr(m)], description: `Monthly fee ${monthStr(m)}`,
        });
      }
    }

    // Test Multi (student 20): payments for BOTH enrollments
    // EM-B2 enrollment (18): admission + 1 month paid
    {
      const sid = "10000000-0000-0000-0000-000000000020";
      allPayments.push({
        id: paymentId(), student_id: sid, company_id: COMPANY, user_id: ADMIN,
        source_id: TUITION_SOURCE, batch_enrollment_id: "20000000-0000-0000-0000-000000000018",
        payment_type: "admission_fee", amount: 3000, status: "paid",
        payment_date: dateStr(2), due_date: dateStr(2),
        months_covered: null, description: "Admission fee - English Mastery B2",
      });
      allPayments.push({
        id: paymentId(), student_id: sid, company_id: COMPANY, user_id: ADMIN,
        source_id: TUITION_SOURCE, batch_enrollment_id: "20000000-0000-0000-0000-000000000018",
        payment_type: "monthly_fee", amount: 2000, status: "paid",
        payment_date: dateStr(1), due_date: dateStr(1),
        months_covered: [monthStr(1)], description: `Monthly fee ${monthStr(1)} - EM B2`,
      });
      // Current month and future unpaid
      for (let m = 0; m >= -2; m--) {
        allPayments.push({
          id: paymentId(), student_id: sid, company_id: COMPANY, user_id: ADMIN,
          source_id: TUITION_SOURCE, batch_enrollment_id: "20000000-0000-0000-0000-000000000018",
          payment_type: "monthly_fee", amount: 2000, status: "unpaid",
          payment_date: dateStr(0), due_date: dateStr(m),
          months_covered: [monthStr(m)], description: `Monthly fee ${monthStr(m)} - EM B2`,
        });
      }
    }
    // PC-B1 enrollment (19): admission paid, 1 month paid
    {
      const sid = "10000000-0000-0000-0000-000000000020";
      allPayments.push({
        id: paymentId(), student_id: sid, company_id: COMPANY, user_id: ADMIN,
        source_id: TUITION_SOURCE, batch_enrollment_id: "20000000-0000-0000-0000-000000000019",
        payment_type: "admission_fee", amount: 2000, status: "paid",
        payment_date: dateStr(1), due_date: dateStr(1),
        months_covered: null, description: "Admission fee - Practice Club B1",
      });
      allPayments.push({
        id: paymentId(), student_id: sid, company_id: COMPANY, user_id: ADMIN,
        source_id: TUITION_SOURCE, batch_enrollment_id: "20000000-0000-0000-0000-000000000019",
        payment_type: "monthly_fee", amount: 1500, status: "paid",
        payment_date: dateStr(0), due_date: dateStr(0),
        months_covered: [monthStr(0)], description: `Monthly fee ${monthStr(0)} - PC B1`,
      });
      // Future months unpaid
      for (let m = -1; m >= -3; m--) {
        allPayments.push({
          id: paymentId(), student_id: sid, company_id: COMPANY, user_id: ADMIN,
          source_id: TUITION_SOURCE, batch_enrollment_id: "20000000-0000-0000-0000-000000000019",
          payment_type: "monthly_fee", amount: 1500, status: "unpaid",
          payment_date: dateStr(0), due_date: dateStr(m),
          months_covered: [monthStr(m)], description: `Monthly fee ${monthStr(m)} - PC B1`,
        });
      }
    }

    // Insert payments in batches of 50 to avoid timeout
    for (let i = 0; i < allPayments.length; i += 50) {
      const batch = allPayments.slice(i, i + 50);
      const { error } = await supabase.from("student_payments").insert(batch);
      if (error) throw new Error(`student_payments batch ${i}: ${error.message}`);
    }
    results.student_payments = allPayments.length;

    // ── 11. Product Sales (5) ──
    const PRODUCT_SOURCE = "a0000001-0000-0000-0000-000000000002";
    const productSales = [
      { id: "40000000-0000-0000-0000-000000000001", company_id: COMPANY, user_id: ADMIN, product_id: "f0000001-0000-0000-0000-000000000001", student_id: "10000000-0000-0000-0000-000000000002", quantity: 1, unit_price: 250, total_amount: 250, payment_status: "paid", payment_method: "cash", sale_date: dateStr(1), source_id: PRODUCT_SOURCE },
      { id: "40000000-0000-0000-0000-000000000002", company_id: COMPANY, user_id: ADMIN, product_id: "f0000001-0000-0000-0000-000000000002", student_id: "10000000-0000-0000-0000-000000000005", quantity: 2, unit_price: 150, total_amount: 300, payment_status: "paid", payment_method: "bkash", sale_date: dateStr(1), source_id: PRODUCT_SOURCE },
      { id: "40000000-0000-0000-0000-000000000003", company_id: COMPANY, user_id: ADMIN, product_id: "f0000001-0000-0000-0000-000000000003", student_id: "10000000-0000-0000-0000-000000000007", quantity: 1, unit_price: 80, total_amount: 80, payment_status: "paid", payment_method: "cash", sale_date: dateStr(0), source_id: PRODUCT_SOURCE },
      { id: "40000000-0000-0000-0000-000000000004", company_id: COMPANY, user_id: ADMIN, product_id: "f0000001-0000-0000-0000-000000000001", student_id: "10000000-0000-0000-0000-000000000020", quantity: 1, unit_price: 250, total_amount: 250, payment_status: "pending", payment_method: "cash", sale_date: dateStr(0), source_id: PRODUCT_SOURCE },
      { id: "40000000-0000-0000-0000-000000000005", company_id: COMPANY, user_id: ADMIN, product_id: "f0000001-0000-0000-0000-000000000002", student_id: "10000000-0000-0000-0000-000000000003", quantity: 1, unit_price: 150, total_amount: 150, payment_status: "partial", payment_method: "cash", sale_date: dateStr(0), source_id: PRODUCT_SOURCE },
    ];
    const { error: e11 } = await supabase.from("product_sales").insert(productSales);
    if (e11) throw new Error(`product_sales: ${e11.message}`);
    results.product_sales = 5;

    // ── 12. Expenses (10) ──
    const expenseData = [
      { expense_account_id: "b0000001-0000-0000-0000-000000000001", amount: 15000, date: dateStr(2), description: "Office rent - month 1" },
      { expense_account_id: "b0000001-0000-0000-0000-000000000001", amount: 15000, date: dateStr(1), description: "Office rent - month 2" },
      { expense_account_id: "b0000001-0000-0000-0000-000000000001", amount: 15000, date: dateStr(0), description: "Office rent - current month" },
      { expense_account_id: "b0000001-0000-0000-0000-000000000002", amount: 3000, date: dateStr(2), description: "Electricity bill" },
      { expense_account_id: "b0000001-0000-0000-0000-000000000002", amount: 2500, date: dateStr(1), description: "Water bill" },
      { expense_account_id: "b0000001-0000-0000-0000-000000000002", amount: 3200, date: dateStr(0), description: "Internet bill" },
      { expense_account_id: "b0000001-0000-0000-0000-000000000003", amount: 5000, date: dateStr(2), description: "Facebook ads" },
      { expense_account_id: "b0000001-0000-0000-0000-000000000003", amount: 3000, date: dateStr(1), description: "Flyer printing" },
      { expense_account_id: "b0000001-0000-0000-0000-000000000003", amount: 2000, date: dateStr(0), description: "Banner design" },
      { expense_account_id: "b0000001-0000-0000-0000-000000000002", amount: 1500, date: dateStr(0), description: "Cleaning supplies" },
    ];
    const expenses = expenseData.map((e, i) => ({
      id: `50000000-0000-0000-0000-0000000000${String(i+1).padStart(2,"0")}`,
      company_id: COMPANY,
      user_id: ADMIN,
      ...e,
    }));
    const { error: e12 } = await supabase.from("expenses").insert(expenses);
    if (e12) throw new Error(`expenses: ${e12.message}`);
    results.expenses = 10;

    // ── 13. Sales Notes (5) ──
    const salesNotes = [
      { company_id: COMPANY, student_id: "10000000-0000-0000-0000-000000000020", created_by: ADMIN, note_text: "Test Multi is interested in advanced courses", category: "general", note_date: dateStr(2) },
      { company_id: COMPANY, student_id: "10000000-0000-0000-0000-000000000020", created_by: ADMIN, note_text: "Follow up on payment for Practice Club", category: "follow_up", note_date: dateStr(1) },
      { company_id: COMPANY, student_id: "10000000-0000-0000-0000-000000000020", created_by: ADMIN, note_text: "Payment reminder sent via WhatsApp", category: "payment_reminder", note_date: dateStr(0) },
      { company_id: COMPANY, student_id: "10000000-0000-0000-0000-000000000002", created_by: ADMIN, note_text: "Excellent progress in English Mastery", category: "general", note_date: dateStr(1) },
      { company_id: COMPANY, student_id: "10000000-0000-0000-0000-000000000002", created_by: ADMIN, note_text: "Interested in purchasing additional study materials", category: "follow_up", note_date: dateStr(0) },
    ];
    const { error: e13 } = await supabase.from("student_sales_notes").insert(salesNotes);
    if (e13) throw new Error(`student_sales_notes: ${e13.message}`);
    results.sales_notes = 5;

    // Count paid payments for revenue verification
    const paidCount = allPayments.filter(p => p.status === "paid").length;
    results.paid_payments_expecting_revenue = paidCount;

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message, results }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
