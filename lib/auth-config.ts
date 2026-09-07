export const ALLOWED_EMAILS = [
  "fiqrin1805@gmail.com",
  "ahasanch@gmail.com",
];

export function isAuthorizedEmail(email?: string | null): boolean {
  if (!email) return false;
  return ALLOWED_EMAILS.map((e) => e.toLowerCase().trim()).includes(
    email.toLowerCase().trim()
  );
}
