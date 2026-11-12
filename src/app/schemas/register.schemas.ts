import { z } from 'zod';

// Schéma de validation pour l'inscription
export const registerSchema = z.object({

    civility: z
    .string()
    .min(2, { message: 'Le prénom doit contenir au moins 2 caractères' })
    .max(3, { message: 'Le prénom est trop long (max 3 caractères)' })
    .trim(),


    sex: z
    .string()
    .min(4, { message: 'Le sexe doit contenir au moins 4 caractères' })
    .max(7, { message: 'Le sexe est trop long (max 6 caractères)' })
    .trim(),

  name: z
    .string()
    .min(2, { message: 'Le prénom doit contenir au moins 2 caractères' })
    .max(30, { message: 'Le prénom est trop long (max 30 caractères)' })
    .trim(),

  surname: z
    .string()
    .min(2, { message: 'Le nom doit contenir au moins 2 caractères' })
    .max(30, { message: 'Le nom est trop long (max 30 caractères)' })
    .trim(),

  email: z
    .string()
    .email({ message: 'Veuillez entrer une adresse email valide' })
    .trim(),

  username: z
    .string()
    .min(4, { message: 'L username  doit contenir au moins 4 caractères' })
    .max(15, { message: 'Le prénom est trop long (max 15 caractères)' })
    .trim(),


  password: z
    .string()
    .min(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
    .max(100, { message: 'Mot de passe trop long' })
    .regex(/[A-Z]/, { message: 'Le mot de passe doit contenir au moins une majuscule' })
    .regex(/[0-9]/, { message: 'Le mot de passe doit contenir au moins un chiffre' })
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
    .refine(
      (val) => {
        console.log('Validation de la date de naissance :', val);
        const [day, month, year] = val.split('/').map(Number);
        const birthDate = new Date(year, month - 1, day);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        return age >= 18; // exemple : minimum 18 ans
      },
      { message: 'Vous devez avoir au moins 18 ans' }
    ),

  zipCode: z
    .string()
    .min(5, { message: 'Code postal trop court' })
    .max(6, { message: 'Code postal trop long' })
    .trim(),

  numero: z.string().min(1, { message: 'Adresse trop courte' }).max(5, { message: 'Adresse trop longue' }).trim(),
  street: z.string().min(3, { message: 'Rue trop courte' }).trim(),
  town: z.string().min(2, { message: 'Ville trop courte' }).trim(),
  country: z.string().min(2, { message: 'Pays trop court' }).max(30, { message: 'Pays trop long' }).trim(),
  message: z
    .string()
    .min(50, { message: 'Message trop court' })
    .trim(),

  interest: z
    .string()
   .regex(/^[a-zA-Z]+(-[a-zA-Z]+){1,8}$/, { message: 'Format invalide (max 8 répétitions, ex: WORD-WORD)' })
   .refine(
    (val) => {
      const mots = val.split('-');
      // Un Set élimine les doublons. Si sa taille est de 1, tous les mots sont identiques.
      return new Set(mots).size > 1;
    },
    { message: 'Les mots ne doivent pas tous être identiques' }
  )
});

// Type inféré automatiquement à partir du schéma (très utile !)
export type RegisterFormData = z.infer<typeof registerSchema>;
