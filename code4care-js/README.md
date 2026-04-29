# Code4Care — Vanilla JavaScript Edition

Πλήρης αυτόνομη υλοποίηση του Code4Care σε καθαρό JavaScript (χωρίς TypeScript, χωρίς build step, χωρίς framework).

## Δομή

```
code4care-js/
├── lib/
│   ├── hash.js       # SHA-256 (Web Crypto)
│   ├── risk.js       # Risk scoring engine
│   ├── audit.js      # Blockchain-inspired audit chain
│   └── store.js      # In-memory database (mock)
├── pages/
│   ├── index.html       # Landing
│   ├── intake.html      # Patient intake
│   ├── reception.html   # Reception dashboard
│   ├── doctor.html      # Doctor queue
│   ├── admin.html       # Audit chain viewer
│   └── patient.html     # Patient waiting view
├── verify-chain.js   # Node.js script: επαληθεύει την ακεραιότητα της αλυσίδας
└── app.js            # Κοινό client-side glue
```

## Πώς τρέχει

### Στον browser
Άνοιξε οποιοδήποτε `pages/*.html` αρχείο απευθείας. Όλη η state αποθηκεύεται σε `localStorage`.

Ή σέρβιρε τον φάκελο με τοπικό server:
```bash
cd code4care-js && python3 -m http.server 8000
# http://localhost:8000/pages/index.html
```

### Επαλήθευση blockchain (Node.js)
```bash
node code4care-js/verify-chain.js
```
Διαβάζει το dump της αλυσίδας από `chain-dump.json` (μπορείς να το εξάγεις από το /admin) και επαληθεύει ότι κάθε `previousHash` ταιριάζει με το `currentHash` του προηγούμενου block.

## Σχέση με το υπόλοιπο project

Το κανονικό app (TanStack Start + Supabase) παραμένει αμετάβλητο στα `src/`. Αυτό το `code4care-js/` είναι μια standalone JavaScript έκδοση/demo για παρουσίαση της λογικής χωρίς εξαρτήσεις.