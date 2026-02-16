import { Link } from "react-router-dom";
import { SkipLink } from "@/components/layout/SkipLink";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { motion } from "framer-motion";
import {
  TrendingUp,
  Receipt,
  GraduationCap,
  Building2,
  BarChart3,
  Users,
  ArrowRight,
  CheckCircle2,
  Plus,
  LineChart,
} from "lucide-react";
import gaLogo from "@/assets/GA-LOGO.png";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: "easeOut" as const } },
};

const features = [
  {
    icon: TrendingUp,
    title: "Revenue Allocation",
    description: "Automatically distribute revenue across expense accounts with configurable percentages.",
  },
  {
    icon: Receipt,
    title: "Expense Tracking",
    description: "Track every expense with detailed categorization and real-time balance updates.",
  },
  {
    icon: GraduationCap,
    title: "Student Management",
    description: "Manage student fees, monthly payments, and overdue tracking in one place.",
  },
  {
    icon: Building2,
    title: "Multi-Business Support",
    description: "Run multiple institutions from a single account with isolated financials.",
  },
  {
    icon: BarChart3,
    title: "Real-time Reports",
    description: "Instant profit & loss, monthly breakdowns, and exportable financial reports.",
  },
  {
    icon: Users,
    title: "Team Collaboration",
    description: "Role-based access for admins, moderators, and viewers with granular permissions.",
  },
];

const steps = [
  {
    number: "01",
    icon: Plus,
    title: "Create Your Business",
    description: "Set up your institution in seconds. Configure expense accounts and revenue sources.",
  },
  {
    number: "02",
    icon: TrendingUp,
    title: "Add Revenue & Expenses",
    description: "Record income and expenditures. Revenue is auto-allocated to your expense accounts.",
  },
  {
    number: "03",
    icon: LineChart,
    title: "Track Your Profit",
    description: "Monitor real-time balances, view reports, and export data for informed decisions.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SkipLink targetId="landing-main" />
      {/* Navbar */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg"
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={gaLogo} alt="Addopanto Flow" className="h-9 w-auto" />
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="sm" asChild>
              <Link to="/auth">Login</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/auth">Get Started</Link>
            </Button>
          </div>
        </div>
      </motion.header>

      {/* Hero */}
      <section id="landing-main" tabIndex={-1} className="relative overflow-hidden py-20 sm:py-28 focus:outline-none">
        <div className="pointer-events-none absolute -top-32 left-1/2 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-40 right-0 h-[400px] w-[500px] rounded-full bg-secondary/10 blur-[100px]" />

        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="relative mx-auto max-w-3xl px-4 text-center sm:px-6"
        >
          <motion.span variants={fadeUp} className="mb-4 inline-block rounded-full border border-primary/30 bg-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
            Financial Management for Education
          </motion.span>
          <motion.h1 variants={fadeUp} className="mt-4 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            Smart Revenue Allocation for{" "}
            <span className="text-primary">Educational Institutions</span>
          </motion.h1>
          <motion.p variants={fadeUp} className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
            Allocate revenue, track expenses, manage student fees, and generate reports — all from one powerful dashboard built for schools and academies.
          </motion.p>
          <motion.div variants={fadeUp} className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" className="gap-2 px-8 text-base" asChild>
              <Link to="/auth">
                Get Started Free <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="px-8 text-base" asChild>
              <a href="#features">Learn More</a>
            </Button>
          </motion.div>
        </motion.div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-border bg-muted/30 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={staggerContainer}
            className="text-center"
          >
            <motion.h2 variants={fadeUp} className="text-3xl font-bold tracking-tight sm:text-4xl">Everything You Need</motion.h2>
            <motion.p variants={fadeUp} className="mt-3 text-muted-foreground">
              A complete financial toolkit designed for educational institutions.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={staggerContainer}
            className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            {features.map((f) => (
              <motion.div key={f.title} variants={scaleIn}>
                <Card className="group h-full border-border/60 bg-card transition-shadow duration-200 hover:shadow-lg">
                  <CardContent className="flex flex-col gap-3 p-6">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                      <f.icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg font-semibold">{f.title}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">{f.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={staggerContainer}
            className="text-center"
          >
            <motion.h2 variants={fadeUp} className="text-3xl font-bold tracking-tight sm:text-4xl">How It Works</motion.h2>
            <motion.p variants={fadeUp} className="mt-3 text-muted-foreground">
              Get started in three simple steps.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={staggerContainer}
            className="mt-14 grid gap-8 sm:grid-cols-3"
          >
            {steps.map((s) => (
              <motion.div key={s.number} variants={fadeUp} className="relative text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                  <s.icon className="h-6 w-6" />
                </div>
                <span className="mt-4 block text-xs font-bold uppercase tracking-widest text-primary">
                  Step {s.number}
                </span>
                <h3 className="mt-2 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={fadeUp}
        className="border-t border-border bg-secondary py-16"
      >
        <div className="mx-auto max-w-2xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight text-secondary-foreground sm:text-4xl">
            Start Managing Your Finances Today
          </h2>
          <p className="mt-4 text-secondary-foreground/80">
            Join institutions already using Addopanto Flow to simplify their financial operations.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button size="lg" className="gap-2 px-8 text-base" asChild>
              <Link to="/auth">
                Get Started <CheckCircle2 className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </motion.section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 sm:flex-row sm:justify-between sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <img src={gaLogo} alt="Addopanto Flow" className="h-7 w-auto" />
          </Link>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Grammar Addopanto. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
