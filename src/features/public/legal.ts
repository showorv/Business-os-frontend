// The terms and privacy pages, in plain language. Kept here rather than in the i18n files because
// they are long passages, not interface words. Have them checked by a lawyer before going live.

export interface LegalSection {
  title: string;
  body: string[];
}

export interface LegalDocument {
  // The day this text last changed, as YYYY-MM-DD.
  updated: string;
  sections: { en: LegalSection[]; bn: LegalSection[] };
}

export const TERMS: LegalDocument = {
  updated: "2026-11-08",
  sections: {
    en: [
      {
        title: "What this is",
        body: [
          "These terms cover your use of this service: an online tool for keeping a small business's money, invoices, tasks and documents. By signing up or using it, you agree to them.",
        ],
      },
      {
        title: "Your account",
        body: [
          "Give a real name and an email you can read, and keep your password to yourself. Turn on two-step sign-in if you can.",
          "You are responsible for what happens under your account, and for the people you invite into your businesses and the roles you give them.",
        ],
      },
      {
        title: "Your data is yours",
        body: [
          "Everything you enter or upload stays yours. We use it only to run the service for you, as the privacy policy explains.",
          "Owners can download all of a business's data at any time, on any plan.",
        ],
      },
      {
        title: "Plans and payment",
        body: [
          "The Free plan costs nothing. Pro is paid for a month or a year at a time, in advance, at the price shown on the pricing page when you pay. It does not renew by itself.",
          "When a paid plan ends, it keeps working for a few days of grace, then moves to Free. Nothing is deleted.",
          "We will tell you before a price changes. A change never affects a period you have already paid for.",
          "If you think you were charged by mistake, contact us and we will look into it.",
        ],
      },
      {
        title: "Fair use",
        body: [
          "Don't use the service for anything illegal, to store others' data without the right to, to try to get into accounts that aren't yours, or to overload or break it.",
          "We may suspend an account that does, and will tell the owner why.",
        ],
      },
      {
        title: "Not professional advice",
        body: [
          "Reports, the VAT summary and the AI assistant's answers are there to help you. They are not accounting, tax or legal advice. Check figures before you file a return or make a big decision.",
        ],
      },
      {
        title: "Keeping it running",
        body: [
          "We work to keep the service available and your data backed up, but we can't promise it will never be down. We may improve or change features over time, and will give notice before removing something important.",
        ],
      },
      {
        title: "Responsibility",
        body: [
          "As far as the law allows, we are not responsible for indirect losses, such as lost profit, that come from using the service or from it being unavailable.",
        ],
      },
      {
        title: "Ending",
        body: [
          "You can stop using the service at any time. Download your data first if you want to keep it. To have your account deleted, contact us.",
        ],
      },
      {
        title: "Law and changes",
        body: [
          "These terms follow the laws of Bangladesh. If we change them, we will update the date at the top and tell you in the app before the change matters.",
        ],
      },
    ],
    bn: [
      {
        title: "এটি কী",
        body: [
          "এই শর্তাবলি এই সেবা ব্যবহারের ক্ষেত্রে প্রযোজ্য: ছোট ব্যবসার টাকা, চালান, কাজ ও ডকুমেন্টের হিসাব রাখার একটি অনলাইন টুল। সাইন আপ বা ব্যবহার করলে আপনি এগুলো মেনে নিচ্ছেন।",
        ],
      },
      {
        title: "আপনার অ্যাকাউন্ট",
        body: [
          "আসল নাম আর এমন একটি ইমেইল দিন যা আপনি পড়তে পারেন, আর পাসওয়ার্ড নিজের কাছে রাখুন। সম্ভব হলে দুই ধাপে সাইন ইন চালু করুন।",
          "আপনার অ্যাকাউন্টে যা ঘটে, আর যাদের আপনার ব্যবসায় আমন্ত্রণ জানান ও যে ভূমিকা দেন, তার দায় আপনার।",
        ],
      },
      {
        title: "আপনার তথ্য আপনারই",
        body: [
          "আপনি যা লেখেন বা আপলোড করেন সব আপনারই থাকে। আমরা তা শুধু আপনার জন্য সেবাটি চালাতে ব্যবহার করি, যেমনটি গোপনীয়তা নীতিতে বলা আছে।",
          "মালিকেরা যেকোনো সময়, যেকোনো প্ল্যানে, একটি ব্যবসার সব তথ্য ডাউনলোড করতে পারেন।",
        ],
      },
      {
        title: "প্ল্যান ও পেমেন্ট",
        body: [
          "ফ্রি প্ল্যানে কোনো খরচ নেই। প্রো-র জন্য এক মাস বা এক বছরের টাকা আগে দিতে হয়, টাকা দেওয়ার সময় মূল্য পাতায় যে দাম দেখানো থাকে সেই দামে। এটি নিজে থেকে নবায়ন হয় না।",
          "পেইড প্ল্যান শেষ হলে কয়েক দিন অতিরিক্ত সময় চলে, তারপর ফ্রি প্ল্যানে চলে যায়। কিছুই মুছে যায় না।",
          "দাম বদলানোর আগে আমরা জানাব। যে সময়ের টাকা আগেই দিয়েছেন তাতে কোনো পরিবর্তন হবে না।",
          "ভুল করে টাকা কাটা হয়েছে মনে হলে আমাদের জানান, আমরা দেখব।",
        ],
      },
      {
        title: "ন্যায্য ব্যবহার",
        body: [
          "বেআইনি কাজে, অধিকার ছাড়া অন্যের তথ্য রাখতে, অন্যের অ্যাকাউন্টে ঢোকার চেষ্টায়, বা সেবাটি ভারাক্রান্ত বা নষ্ট করতে এটি ব্যবহার করবেন না।",
          "এমন করলে আমরা অ্যাকাউন্ট স্থগিত করতে পারি, আর মালিককে কারণ জানাব।",
        ],
      },
      {
        title: "পেশাদার পরামর্শ নয়",
        body: [
          "রিপোর্ট, ভ্যাট সারাংশ ও AI সহকারীর উত্তর আপনাকে সাহায্য করার জন্য। এগুলো হিসাব, কর বা আইনি পরামর্শ নয়। রিটার্ন জমা বা বড় সিদ্ধান্তের আগে হিসাব মিলিয়ে নিন।",
        ],
      },
      {
        title: "সেবা চালু রাখা",
        body: [
          "আমরা সেবাটি চালু রাখতে ও আপনার তথ্যের ব্যাকআপ রাখতে চেষ্টা করি, তবে কখনো বন্ধ থাকবে না এমন প্রতিশ্রুতি দিতে পারি না। সময়ের সাথে সুবিধা উন্নত বা পরিবর্তন হতে পারে, আর গুরুত্বপূর্ণ কিছু সরানোর আগে জানানো হবে।",
        ],
      },
      {
        title: "দায়",
        body: [
          "আইন যতটা অনুমতি দেয়, সেবা ব্যবহার বা সেবা বন্ধ থাকার কারণে পরোক্ষ ক্ষতির, যেমন লাভ হারানোর, দায় আমাদের নয়।",
        ],
      },
      {
        title: "বন্ধ করা",
        body: [
          "যেকোনো সময় সেবা ব্যবহার বন্ধ করতে পারেন। তথ্য রাখতে চাইলে আগে ডাউনলোড করে নিন। অ্যাকাউন্ট মুছতে চাইলে আমাদের জানান।",
        ],
      },
      {
        title: "আইন ও পরিবর্তন",
        body: [
          "এই শর্তাবলি বাংলাদেশের আইন অনুযায়ী চলে। পরিবর্তন করলে উপরের তারিখ হালনাগাদ করব, আর পরিবর্তন কার্যকর হওয়ার আগে অ্যাপে জানাব।",
        ],
      },
    ],
  },
};

export const PRIVACY: LegalDocument = {
  updated: "2026-11-08",
  sections: {
    en: [
      {
        title: "What we keep",
        body: [
          "Your account: name, email, language and display choices, and your password, stored only in scrambled (hashed) form.",
          "Your businesses: everything you and your team enter, such as accounts, transactions, invoices, customers and suppliers, tasks, and the files you upload.",
          "Technical records: sign-ins, the device and browser used, IP addresses and error reports, to keep accounts safe and fix problems.",
          "Payments: what you paid, when and for which plan. Card and mobile wallet details go straight to the payment provider; we never see or keep them.",
        ],
      },
      {
        title: "Why we keep it",
        body: [
          "To run the service: show your books, make reports and PDFs, send the emails you ask for (invoices, invitations, receipts and reminders), and keep your account safe.",
          "We don't sell your data, and we don't use it for advertising.",
        ],
      },
      {
        title: "The AI assistant",
        body: [
          "When you ask the assistant something (on plans that include it), your question and the business figures needed to answer it are sent to the AI service we use, only to produce the answer. The conversation is kept so you can read it again.",
        ],
      },
      {
        title: "Who can see it",
        body: [
          "People you invite into a business see what their role allows. Each business is kept apart from every other in the database itself.",
          "Companies that host and run parts of the service for us (servers, database, file storage, email, payments, error tracking) handle data only to do that job.",
          "We share data with authorities only when the law requires it.",
        ],
      },
      {
        title: "How it is kept safe",
        body: [
          "Connections are encrypted, passwords are hashed, two-step sign-in is available, sensitive actions such as exports ask for it again, and changes are recorded in an activity history.",
        ],
      },
      {
        title: "How long we keep it",
        body: [
          "For as long as your account is open. If you ask us to delete your account, we delete its data, except records the law requires us to keep, such as payment records.",
        ],
      },
      {
        title: "Your choices",
        body: [
          "You can see and correct your details in your profile, choose which notifications you get, download a business's data (owners and admins), and ask us to delete your account.",
        ],
      },
      {
        title: "Cookies and storage",
        body: [
          "We store only what is needed to keep you signed in and to remember your choices, such as language and light or dark mode. There are no advertising trackers.",
        ],
      },
      {
        title: "Changes",
        body: ["If this policy changes, we will update the date at the top and tell you in the app."],
      },
    ],
    bn: [
      {
        title: "আমরা কী রাখি",
        body: [
          "আপনার অ্যাকাউন্ট: নাম, ইমেইল, ভাষা ও দেখার পছন্দ, আর পাসওয়ার্ড, যা শুধু এলোমেলো (হ্যাশ) রূপে রাখা হয়।",
          "আপনার ব্যবসা: আপনি ও আপনার দল যা লেখেন সব, যেমন অ্যাকাউন্ট, লেনদেন, চালান, গ্রাহক ও সরবরাহকারী, কাজ, আর আপলোড করা ফাইল।",
          "কারিগরি রেকর্ড: সাইন ইন, ব্যবহৃত ডিভাইস ও ব্রাউজার, IP ঠিকানা ও ত্রুটির রিপোর্ট, অ্যাকাউন্ট নিরাপদ রাখতে ও সমস্যা ঠিক করতে।",
          "পেমেন্ট: কী, কখন ও কোন প্ল্যানের জন্য টাকা দিয়েছেন। কার্ড ও মোবাইল ওয়ালেটের তথ্য সরাসরি পেমেন্ট প্রতিষ্ঠানের কাছে যায়; আমরা তা দেখি না বা রাখি না।",
        ],
      },
      {
        title: "কেন রাখি",
        body: [
          "সেবা চালাতে: আপনার হিসাব দেখাতে, রিপোর্ট ও PDF বানাতে, আপনি যে ইমেইল পাঠাতে বলেন (চালান, আমন্ত্রণ, রসিদ ও রিমাইন্ডার) তা পাঠাতে, আর অ্যাকাউন্ট নিরাপদ রাখতে।",
          "আমরা আপনার তথ্য বিক্রি করি না, বিজ্ঞাপনেও ব্যবহার করি না।",
        ],
      },
      {
        title: "AI সহকারী",
        body: [
          "সহকারীকে কিছু জিজ্ঞেস করলে (যে প্ল্যানে এটি আছে), আপনার প্রশ্ন আর উত্তর দিতে দরকারি ব্যবসার হিসাব আমরা যে AI সেবা ব্যবহার করি সেখানে পাঠানো হয়, শুধু উত্তর তৈরির জন্য। কথোপকথন রাখা হয় যাতে আবার পড়তে পারেন।",
        ],
      },
      {
        title: "কারা দেখতে পারে",
        body: [
          "যাদের আপনার ব্যবসায় আমন্ত্রণ জানান, তারা তাদের ভূমিকা অনুযায়ী দেখেন। ডেটাবেসেই প্রতিটি ব্যবসা অন্যগুলো থেকে আলাদা রাখা হয়।",
          "যেসব প্রতিষ্ঠান আমাদের হয়ে সেবার অংশ চালায় (সার্ভার, ডেটাবেস, ফাইল সংরক্ষণ, ইমেইল, পেমেন্ট, ত্রুটি শনাক্তকরণ), তারা শুধু সেই কাজের জন্য তথ্য ব্যবহার করে।",
          "আইন বাধ্য করলেই কেবল কর্তৃপক্ষকে তথ্য দিই।",
        ],
      },
      {
        title: "কীভাবে নিরাপদ রাখা হয়",
        body: [
          "সংযোগ এনক্রিপ্ট করা, পাসওয়ার্ড হ্যাশ করা, দুই ধাপে সাইন ইন আছে, এক্সপোর্টের মতো সংবেদনশীল কাজে আবার তা চাওয়া হয়, আর পরিবর্তনগুলো কার্যক্রমের ইতিহাসে লেখা থাকে।",
        ],
      },
      {
        title: "কত দিন রাখি",
        body: [
          "অ্যাকাউন্ট যতদিন খোলা থাকে। অ্যাকাউন্ট মুছতে বললে আমরা তার তথ্য মুছে ফেলি, তবে আইন যা রাখতে বলে, যেমন পেমেন্টের রেকর্ড, তা ছাড়া।",
        ],
      },
      {
        title: "আপনার পছন্দ",
        body: [
          "প্রোফাইলে নিজের তথ্য দেখতে ও ঠিক করতে পারেন, কোন নোটিফিকেশন পাবেন বেছে নিতে পারেন, ব্যবসার তথ্য ডাউনলোড করতে পারেন (মালিক ও অ্যাডমিন), আর অ্যাকাউন্ট মুছতে বলতে পারেন।",
        ],
      },
      {
        title: "কুকি ও সংরক্ষণ",
        body: [
          "শুধু সাইন ইন রাখতে আর আপনার পছন্দ, যেমন ভাষা ও লাইট বা ডার্ক মোড, মনে রাখতে যা দরকার তাই রাখি। কোনো বিজ্ঞাপনী ট্র্যাকার নেই।",
        ],
      },
      {
        title: "পরিবর্তন",
        body: ["এই নীতি বদলালে উপরের তারিখ হালনাগাদ করব আর অ্যাপে জানাব।"],
      },
    ],
  },
};
