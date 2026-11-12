 export function generatePassword(): string {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    const allChars = uppercase + lowercase + numbers + specialChars;

    // Ensure at least one of each required type
    let password = '';
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += specialChars[Math.floor(Math.random() * specialChars.length)];

    // Fill remaining 7 characters with random characters from all sets
    for (let i = password.length; i < 10; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Shuffle to randomize character positions
    return password
      .split('')
      .sort(() => Math.random() - 0.5)
      .join('');
  }
