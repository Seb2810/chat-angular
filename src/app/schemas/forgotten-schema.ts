import { z } from 'zod';

// Schéma de validation pour l'inscription
export const forgottenSchema = z.object({


   email: z
      .string()
      .regex(/^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/, { message: "Format d'e-mail non autorisé"} )
      .trim(),

  birthdate: z
    .string()
    .regex(/^\d{2}\/\d{2}\/\d{4}$/, { message: 'Format de date invalide (jj/mm/aaaa)' })
    .refine(
      (val) => {
        const [day, month, year] = val.split('/').map(Number);
        const date = new Date(year, month - 1, day);
        return date instanceof Date && !isNaN(date.getTime());
      },
      { message: 'Date invalide' }
    )




})


// Type inféré automatiquement à partir du schéma (très utile !)
export type ForgottenFormData = z.infer<typeof forgottenSchema>;
