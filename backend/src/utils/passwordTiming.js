import bcrypt from 'bcryptjs';

// A real hash of a throwaway string, so comparing against it costs exactly what comparing against a stored one does.
const DUMMY_HASH = bcrypt.hashSync('maroon-timing-equaliser', 10);

/**
 * Called when a sign-in names an account that doesn't exist. Doing the same bcrypt work as for a real account keeps the
 * response time from telling an attacker which phone numbers / emails have accounts. Always resolves false.
 */
export async function burnPasswordCheck(candidate) {
  await bcrypt.compare(String(candidate), DUMMY_HASH);
  return false;
}
