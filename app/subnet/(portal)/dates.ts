/** Tanggal hari ini (YYYY-MM-DD) menurut WITA, zona waktu kantor di Bulukumba. */
export const todayWita = () => new Date(Date.now() + 8 * 3_600_000).toISOString().slice(0, 10);

/** Selisih hari dari `today` ke `date` (keduanya YYYY-MM-DD); negatif bila sudah lewat. */
export const daysUntil = (date: string, today: string) => Math.round((Date.parse(date) - Date.parse(today)) / 86_400_000);
