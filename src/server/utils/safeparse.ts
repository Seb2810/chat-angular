export function safeParseDate(dateStr: any | string | undefined): Date | null {
  console.log('Date from safeParse Server --> ', dateStr);

  if (!dateStr) return null;
  console.log(`Parsing date: ${dateStr}`);

  // FIX : Retrait de l'antislash devant le \(if (/^\d{1,2}\/\d{1,2}\/\d{4}\)/.test(dateStr)) {
    const [day, month, year] = dateStr.split('/').map(Number);
    const date = new Date(year, month - 1, day);
    console.log('nouvelle date from server ', date);
    if (!isNaN(date.getTime())) {
      return date; // Retourne l'objet Date directement
    }


  // FIX : Retrait de l'antislash devant le \$
  // Note additionnelle : Les formats ISO utilisent généralement des tirets (YYYY-MM-DD)
  // mais si vous utilisez des slashes (YYYY/MM/DD), l'expression ci-dessous est correcte.
  if (/^\d{4}\/\d{1,2}\/\d{1,2}\$/.test(dateStr)) {
    console.log('la date est déjà au bon format');
    return new Date(dateStr); // Il est préférable de retourner un objet Date à Prisma
  }

  console.warn(`Format de date non reconnu : ${dateStr}`);
  return null;
}

