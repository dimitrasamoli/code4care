// Lightweight bilingual (GR/EN) helper for patient-facing pages.
// Persisted in localStorage so the choice is kept across navigation
// (intake → waiting page).
import { useEffect, useState } from "react";

export type Lang = "gr" | "en";

const STORAGE_KEY = "c4c.lang";

export function getLang(): Lang {
  if (typeof window === "undefined") return "gr";
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === "en" ? "en" : "gr";
}

export function setLang(l: Lang) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, l);
    window.dispatchEvent(new Event("c4c-lang-change"));
  }
}

export function useLang(): [Lang, (l: Lang) => void] {
  const [lang, setLangState] = useState<Lang>(getLang());
  useEffect(() => {
    const onChange = () => setLangState(getLang());
    window.addEventListener("c4c-lang-change", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("c4c-lang-change", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);
  return [lang, (l) => setLang(l)];
}

export const T = {
  // Intake form
  patientForm: { gr: "Φόρμα Ασθενή", en: "Patient Form" },
  intakeSubtitle: {
    gr: "Συμπληρώστε τα στοιχεία σας για να μπείτε στην ουρά. Δεν απαιτείται σύνδεση.",
    en: "Fill in your details to join the queue. No login required.",
  },
  fullName: { gr: "Πλήρες ονοματεπώνυμο", en: "Full name" },
  fullNamePh: { gr: "π.χ. Μαρία Παπαδοπούλου", en: "e.g. Maria Smith" },
  age: { gr: "Ηλικία", en: "Age" },
  amka: { gr: "ΑΜΚΑ", en: "AMKA" },
  amkaPh: { gr: "11 ψηφία", en: "11 digits" },
  symptoms: { gr: "Συμπτώματα (επιλέξτε όσα ισχύουν)", en: "Symptoms (select all that apply)" },
  chronic: {
    gr: "Έχω χρόνια πάθηση (καρδιολογική, διαβήτη κ.λπ.)",
    en: "I have a chronic condition (cardiac, diabetes, etc.)",
  },
  description: { gr: "Σύντομη περιγραφή (προαιρετικό)", en: "Brief description (optional)" },
  descriptionPh: {
    gr: "Κάτι άλλο που πρέπει να γνωρίζει το ιατρικό προσωπικό;",
    en: "Anything else the medical staff should know?",
  },
  submit: { gr: "Υποβολή & Είσοδος στην ουρά", en: "Submit & Join the queue" },
  disclaimer: {
    gr: "Δεν χρειάζεται σύνδεση. Μετά την υποβολή θα λάβετε μοναδικό Patient ID και θα μεταβείτε στη σελίδα αναμονής σας.",
    en: "No login required. After submission you will receive a unique Patient ID and be taken to your waiting page.",
  },
  // Validation
  errName: {
    gr: "Παρακαλώ συμπληρώστε πλήρες ονοματεπώνυμο (όνομα και επώνυμο)",
    en: "Please enter your full name (first and last name)",
  },
  errAge: { gr: "Η ηλικία πρέπει να είναι μεταξύ 0 και 120", en: "Age must be between 0 and 120" },
  errAmka: {
    gr: "Ο ΑΜΚΑ πρέπει να περιέχει ακριβώς 11 ψηφία.",
    en: "AMKA must contain exactly 11 digits.",
  },
  errSymptoms: { gr: "Επιλέξτε τουλάχιστον ένα σύμπτωμα", en: "Select at least one symptom" },
  errSubmit: { gr: "Δεν ήταν δυνατή η υποβολή", en: "Submission failed" },
  okSubmit: { gr: "Καταχωρήθηκε — Patient ID:", en: "Registered — Patient ID:" },
  // Symptoms
  sym_chest_pain: { gr: "Πόνος στο στήθος", en: "Chest pain" },
  sym_fever: { gr: "Υψηλός πυρετός", en: "High fever" },
  sym_breathing: { gr: "Δυσκολία αναπνοής", en: "Breathing difficulty" },
  sym_dizziness: { gr: "Ζάλη", en: "Dizziness" },
  sym_bleeding: { gr: "Έντονη αιμορραγία", en: "Severe bleeding" },
  sym_headache: { gr: "Πονοκέφαλος", en: "Headache" },
  sym_abdominal: { gr: "Κοιλιακό άλγος", en: "Abdominal pain" },
  sym_severe_pain: { gr: "Έντονος πόνος", en: "Severe pain" },
  sym_other: { gr: "Άλλο", en: "Other" },
  // Waiting page
  patientId: { gr: "Patient ID", en: "Patient ID" },
  status: { gr: "Κατάσταση", en: "Status" },
  st_waiting: { gr: "Σε αναμονή", en: "Waiting" },
  st_in_progress: { gr: "Εξετάζεστε", en: "In progress" },
  st_treated: { gr: "Ολοκληρώθηκε", en: "Completed" },
  estWait: { gr: "Εκτιμώμενη αναμονή", en: "Estimated wait" },
  minutes: { gr: "λεπτά", en: "minutes" },
  queuePos: { gr: "Θέση στην ουρά", en: "Queue position" },
  hospital: { gr: "Εφημερεύον Νοσοκομείο", en: "On-call hospital" },
  caseRegistered: { gr: "Η περίπτωσή σας έχει καταχωρηθεί", en: "Your case has been registered" },
  keepCode: {
    gr: "Κρατήστε αυτόν τον αριθμό — είναι μοναδικός για εσάς",
    en: "Keep this number — it is unique to you",
  },
  ambulanceTransfer: { gr: "Διακομιδή με ασθενοφόρο", en: "Ambulance transfer" },
  waitingPage: { gr: "Σελίδα Αναμονής", en: "Waiting Page" },
  notFound: { gr: "Δεν βρέθηκε η περίπτωση", en: "Case not found" },
  waitDisclaimer: {
    gr: "Ο χρόνος αναμονής είναι εκτίμηση. Επείγοντα περιστατικά μπορούν να αλλάξουν τη σειρά ανά πάσα στιγμή. Το ιατρικό προσωπικό θα σας καλέσει όταν είναι έτοιμο.",
    en: "Waiting time is an estimate. Emergencies may change the order at any time. The medical staff will call you when ready.",
  },
} as const;

export function tr(key: keyof typeof T, lang: Lang): string {
  return T[key][lang];
}

export function LangToggleClasses(active: boolean) {
  return active
    ? "bg-primary text-primary-foreground"
    : "bg-transparent text-foreground hover:bg-muted";
}