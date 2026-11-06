import { currentLocale } from "@/i18n";

// Choices shared by the set-up form and the settings screen.
export const CURRENCIES = ["BDT", "USD", "EUR", "GBP", "INR"];
export const COMMON_TIMEZONES = ["Asia/Dhaka", "Asia/Kolkata", "Asia/Dubai", "Asia/Singapore", "Europe/London", "America/New_York", "UTC"];

// "July", or "জুলাই", for a month number from 1 to 12.
export const monthName = (month: number) => new Intl.DateTimeFormat(currentLocale(), { month: "long" }).format(new Date(2026, month - 1, 1));
