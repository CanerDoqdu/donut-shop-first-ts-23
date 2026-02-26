/**
 * HaveIBeenPwned k-Anonymity password breach check.
 *
 * Uses the HIBP Passwords API (range search) to check if a password
 * has appeared in known data breaches — without ever sending the
 * full password or hash over the network.
 *
 * How it works:
 *   1. SHA-1 hash the password
 *   2. Send only the first 5 hex chars (prefix) to the API
 *   3. The API returns all hash suffixes that match that prefix
 *   4. We check locally if our full hash suffix appears in the list
 *
 * Privacy: Only 5 chars of the SHA-1 prefix leave the client.
 * The API cannot determine which suffix we're interested in.
 * Same approach used by 1Password, Firefox Monitor, Supabase Pro, etc.
 *
 * @see https://haveibeenpwned.com/API/v3#PwnedPasswords
 */

/**
 * Check if a password has been found in data breaches.
 * Returns the number of times the password appeared in breaches,
 * or 0 if it hasn't been found.
 *
 * @throws if the API call fails (network error, etc.)
 */
export async function checkPasswordBreach(password: string): Promise<number> {
  // 1. SHA-1 hash the password
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);

  // 2. Convert to uppercase hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();

  // 3. Split into prefix (5 chars) and suffix
  const prefix = hashHex.slice(0, 5);
  const suffix = hashHex.slice(5);

  // 4. Query HIBP API with only the prefix
  const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
    headers: {
      // Add padding to make all responses same size (extra privacy)
      'Add-Padding': 'true',
    },
  });

  if (!response.ok) {
    throw new Error(`HIBP API returned ${response.status}`);
  }

  const text = await response.text();

  // 5. Check if our suffix appears in the response
  // Response format: "SUFFIX:COUNT\r\n" per line
  const lines = text.split('\r\n');
  for (const line of lines) {
    const [lineSuffix, countStr] = line.split(':');
    if (lineSuffix === suffix) {
      return parseInt(countStr, 10);
    }
  }

  return 0; // Not found — password is clean
}

/**
 * User-friendly wrapper that returns a translated error message
 * if the password is breached, or null if it's safe.
 */
export async function getPasswordBreachWarning(
  password: string,
  locale: string = 'en'
): Promise<string | null> {
  try {
    const count = await checkPasswordBreach(password);

    if (count === 0) return null;

    if (locale === 'tr') {
      return count > 100
        ? `Bu şifre ${count.toLocaleString()} veri ihlalinde görülmüştür. Lütfen farklı bir şifre seçin.`
        : 'Bu şifre bilinen veri ihlallerinde bulunmuştur. Lütfen farklı bir şifre seçin.';
    }

    return count > 100
      ? `This password has appeared in ${count.toLocaleString()} data breaches. Please choose a different password.`
      : 'This password has been found in known data breaches. Please choose a different password.';
  } catch {
    // If the API is unreachable, don't block registration
    // This is a best-effort check
    console.warn('[password-check] HIBP API unreachable, skipping breach check');
    return null;
  }
}
