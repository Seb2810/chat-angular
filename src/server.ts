import 'dotenv/config';

import { AngularNodeAppEngine, createNodeRequestHandler,isMainModule,writeResponseToNodeResponse} from '@angular/ssr/node';

import express, {NextFunction,Request,Response} from 'express';

import multer from 'multer';

import cors from 'cors';
import cookieParser from 'cookie-parser';
import jwt, { JwtPayload } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import type { Prisma } from '@prisma/client';
import { DateTime } from 'luxon';
import sharp from 'sharp';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { yoga } from './server/graphql/yoga';
import { prisma } from './server/prisma';
import { createServer } from 'node:http';
import { createChatServer } from './server/websocket/chat.server';
import { safeParseDate } from './server/utils/safeparse';
import { generatePassword } from './server/utils/generate-password';
import z from 'zod';


declare global {
  namespace Express {
    interface Request {
      user: JwtPayload;
    }
  }
}


const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = resolve(serverDistFolder, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();


/**
 * ---------------------------------------------------------
 * MIDDLEWARES
 * ---------------------------------------------------------
 */

app.use(
  cors({
    origin: 'http://localhost:4200',
    credentials: true,
  }),
);

app.use(express.json());

app.use(cookieParser());


/**
 * ---------------------------------------------------------
 * ENV
 * ---------------------------------------------------------
 */

const ACCESS_SECRET = process.env['JWT_SECRET'];
const REFRESH_SECRET = process.env['JWT_REFRESH_SECRET']!;
const ACCESS_MODE = process.env['NODE_ENV'];
//const  REFRESH_SECRET = "mon_refresh_secret_super_long_5846697" ;

/**
 * Vérification du secret JWT
 */

if (!ACCESS_SECRET) {

  throw new Error('JWT_SECRET est manquant dans le fichier .env' );

}


if (!REFRESH_SECRET) {

  throw new Error( 'JWT_REFRESH_SECRET est manquant dans le fichier .env' );

}

/**
 * ---------------------------------------------------------
 * UPLOAD
 * ---------------------------------------------------------
 */
// Configuration de Multer pour conserver le fichier en mémoire sous forme de Buffer (Blob)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Écriture de l'API d'enregistrement (Placer impérativement AVANT les routes Angular)
app.post('/api/upload', authenticateJWT, upload.single('file'), async (req, res) => {

try {

const file = req.file;

if (!file) {

return res.status(400).json({ error: 'Aucun fichier fourni.' });
}


const buffer = file.buffer;

    console.log('BUFFER SIZE:', buffer.length);
//forcer la conversion en jpeg  .jpeg({ quality: 80 })
    const resizedImageBuffer = await sharp(buffer)
      .resize(328, 328)
      .jpeg({ quality: 80 })
      .toBuffer();

    console.log('RESIZED BUFFER:', resizedImageBuffer.length);

    // Générer un nom de fichier cohérent (ex: "image.png" devient "image.jpg")
const originalNameWithoutExt = file.originalname.substring(0, file.originalname.lastIndexOf('.')) || file.originalname;
const newFilename = `${originalNameWithoutExt}.jpg`;

// Enregistrement dans la base de données via Prisma
const checkDoc = await prisma.document.findMany({

  where: { userId: Number(req.user.sub) },

select: {
  id: true,
  },

  });

  if (checkDoc.length === 3) {

  const firstDocId = checkDoc[0].id;

 await prisma.document.updateMany({
    where: { id: Number(firstDocId) },
    data: {
    filename: newFilename,    // 👈 Forcer l'extension .jpg
    mimetype: 'image/jpeg',  // 👈 Forcer le bon MimeType
    // file.buffer est un Buffer Node.js, directement accepté par le type 'Bytes' de Prisma
    fileData: resizedImageBuffer,
    userId: Number(req.user.sub),
    },
  });

  console.log("Documents mis à jour avec succès.");
return res.status(201).json({
message: 'Fichier enregistré avec succès sous forme de BLOB !',

});

  }else{

const savedDocument = await prisma.document.create({
data: {
 filename: newFilename,
mimetype: 'image/jpeg',
// file.buffer est un Buffer Node.js, directement accepté par le type 'Bytes' de Prisma
fileData: resizedImageBuffer,
userId: Number(req.user.sub),
},
});
return res.status(201).json({
message: 'Fichier enregistré avec succès sous forme de BLOB !',
documentId: savedDocument.id
});
  }

} catch (error) {
console.error("Erreur serveur lors de l'enregistrement :", error);
return res.status(500).json({ error: 'Erreur interne du serveur.' });
}
});

/**
 * ---------------------------------------------------------
 * IMAGE
 * ---------------------------------------------------------
 */

app.get('/api/show', authenticateJWT, async (req, res) => {
  try {
    const documents = await prisma.document.findMany({
      where: { userId: Number(req.user.sub) },
      select: {
        id: true,
        filename: true,
        mimetype: true,
      },
    });

    return res.json(documents);
  } catch (error) {
    console.error('Erreur lors de la récupération des images :', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération des images.' });
  }
});

app.get('/api/chat-avatar/:userId', authenticateJWT, async (req, res) => {
  const userId = Number(req.params['userId']);

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ error: 'Identifiant utilisateur invalide.' });
  }

  try {
    const document = await prisma.document.findFirst({
      where: {
        userId,
        mimetype: { startsWith: 'image/' },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        fileData: true,
        mimetype: true,
      },
    });

    if (!document) {
      return res.status(404).json({ error: 'Avatar introuvable.' });
    }

    const imageBuffer = Buffer.from(document.fileData);

    res.setHeader('Content-Type', document.mimetype);
    res.setHeader('Content-Length', imageBuffer.length);
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Cache-Control', 'private, no-store');
    return res.send(imageBuffer);
  } catch (error) {
    console.error('Erreur lors de la récupération de l’avatar :', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération de l’avatar.' });
  }
});

app.get('/api/profil/:id', authenticateJWT, async (req, res) => {
 try {
    const id = parseInt(req.params['id']);

    console.log('id de la requete ', id);

        console.log('id de la requete sub ', req.user.sub);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Identifiant d’image invalide.' });
    }

    const profilUser = await prisma.user.findFirst({

        where: { id: Number(req.user.sub) },
        include: {
        documents: true,
        info:true,
        },
       })

        if (!profilUser) {
      return res.status(404).json({ error: 'Profil introuvable.' });
    }

   /* if(profilUser.documents.length > 1){}*/

   console.log('data envoyée --> ' , profilUser);

        return res.status(200).json(profilUser);


     } catch (error) {
    console.error('Erreur lors de la récupération du profil :', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération du profil.' });
  }

})


app.get('/api/profil-user/:id', authenticateJWT, async (req, res) => {

  try {

    const id = parseInt(req.params['id']);

    console.log('id de la requete ', id);



    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Identifiant d’image invalide.' });
    }

    const profilUser = await prisma.user.findFirst({

        where: { id: Number(id) },
        include: {
        documents: true,
        info:true,
        },
       })

        if (!profilUser) {
      return res.status(404).json({ error: 'Profil introuvable.' });
    }

   /* if(profilUser.documents.length > 1){}*/

   console.log('data envoyée --> ' , profilUser);

        return res.status(200).json(profilUser);


     } catch (error) {
    console.error('Erreur lors de la récupération du profil :', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération du profil.' });
  }

})

const infoUpdateSchema = z.object({
  civility: z.string().min(2).max(3).trim(),
  name: z.string().min(2).max(30).trim(),
  surname: z.string().min(2).max(30).trim(),
  sex: z.string().max(7).nullable().optional(),
  birthdate: z.string()
    .regex(/^\d{2}\/\d{2}\/\d{4}$/, 'Format de date invalide (jj/mm/aaaa)')
    .refine((value) => {
      const [day, month, year] = value.split('/').map(Number);
      const date = new Date(year, month - 1, day);
      return date.getFullYear() === year
        && date.getMonth() === month - 1
        && date.getDate() === day;
    }, 'Date invalide')
    .refine((value) => {
      const [day, month, year] = value.split('/').map(Number);
      const today = new Date();
      const age = today.getFullYear() - year
        - (today.getMonth() < month - 1
          || (today.getMonth() === month - 1 && today.getDate() < day) ? 1 : 0);
      return age >= 18;
    }, 'Vous devez avoir au moins 18 ans'),
  numero: z.string().min(1).max(5).trim(),
  street: z.string().min(3).trim(),
  city: z.string().min(2).trim(),
  zipCode: z.string().min(5).max(6).trim(),
  message: z.string().trim(),
  interest: z.string().trim().min(1),
});

app.put('/api/info-update/:id', authenticateJWT, async (req, res) => {

    try {

   const id = parseInt(req.params['id']);

     const userId =  Number(req.user.sub)

    if (!Number.isInteger(id) || id <= 0) {

      return res.status(400).json({ error: 'Identifiant id invalide.' });
    }

    if (id !== userId)
      {
      return res.status(400).json({ error: 'Identifiant id invalide.' });
    }

     // 2. Validation stricte des données reçues avec Zod
    // (Garantit que personne n'envoie de données malveillantes ou mal formées au serveur)
    const validatedData = infoUpdateSchema.parse(req.body);

    const [day, month, year] = validatedData.birthdate.split('/').map(Number);
    const updatedInfo = await prisma.info.update({
      where: { userId },
      data: {
        civility: validatedData.civility,
        name: validatedData.name,
        surname: validatedData.surname,
        sex: validatedData.sex ?? undefined,
        birthdate: new Date(year, month - 1, day),
        numero: validatedData.numero,
        street: validatedData.street,
        town: validatedData.city,
        zipCode: validatedData.zipCode,
        words: validatedData.message,
        interest: validatedData.interest.split('-'),
      },
    });

    return res.status(200).json({ message: 'Profil mis à jour !', info: updatedInfo });

 } catch (error) {
    if (error instanceof z.ZodError) {

      return res.status(400).json({ errors: error.issues });
    }

    console.error('Erreur lors de la mise à jour du profil :', error);
    return res.status(500).json({ message: 'Une erreur est survenue côté serveur.' });
  }

})

app.post('/api/info/:id', authenticateJWT, async (req, res) => {
 try {
    const id = parseInt(req.params['id']);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Identifiant d’image invalide.' });
    }

    const profiInfo = await prisma.info.findFirst({

        where: { id, userId: Number(req.user.sub) }
    })

        if (!profiInfo) {
      return res.status(404).json({ error: 'Infos introuvables.' });
    }

        return res.status(200).json(profiInfo);


     } catch (error) {
    console.error('Erreur lors de la récupération du profil infi :', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération du profil info.' });
  }

})



app.get('/api/info-user/:id', authenticateJWT, async (req, res) => {
 try {
    const id = parseInt(req.params['id']);

    if (!Number.isInteger(id) || id <= 0) {

      return res.status(400).json({ error: 'Identifiant d’image invalide.' });
    }

    const profiInfo = await prisma.info.findFirst({

        where: { userId: id }
    })

        if (!profiInfo) {
          
      return res.status(404).json({ error: 'Infos introuvables.' });
    }

        return res.status(200).json(profiInfo);


     } catch (error) {
    console.error('Erreur lors de la récupération du profil infi :', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération du profil info.' });
  }

})

app.get('/api/image/:id', authenticateJWT, async (req, res) => {
  //pour un seul utilisateur
  try {
    const id = parseInt(req.params['id']);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Identifiant d’image invalide.' });
    }

    const document = await prisma.document.findFirst({
      where: { id, userId: Number(req.user.sub) },
      select: {
        fileData: true,
        mimetype: true,
      },
    });

    if (!document) {
      return res.status(404).json({ error: 'Image introuvable.' });
    }
// Convertir explicitement en Buffer si Prisma renvoie un type binaire encapsulé
    const imageBuffer = Buffer.from(document.fileData);

    res.setHeader('Content-Type', document.mimetype);
    res.setHeader('Content-Length', imageBuffer.length); // Optionnel mais recommandé
    res.setHeader('Content-Disposition', 'inline');

    // Envoyer le buffer brut
    return res.end(imageBuffer);
  } catch (error) {
    console.error('Erreur lors de la récupération de l’image :', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération de l’image.' });
  }
});



app.get('/api/image-user/:id', authenticateJWT, async (req, res) => {
  //pour tous les utilisateur
  try {
    const id = parseInt(req.params['id']);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Identifiant d’image invalide.' });
    }

    const document = await prisma.document.findFirst({
      where: { id },
      select: {
        fileData: true,
        mimetype: true,
      },
    });

    if (!document) {
      return res.status(404).json({ error: 'Image introuvable.' });
    }
// Convertir explicitement en Buffer si Prisma renvoie un type binaire encapsulé
    const imageBuffer = Buffer.from(document.fileData);

    res.setHeader('Content-Type', document.mimetype);
    res.setHeader('Content-Length', imageBuffer.length); // Optionnel mais recommandé
    res.setHeader('Content-Disposition', 'inline');

    // Envoyer le buffer brut
    return res.end(imageBuffer);
  } catch (error) {
    console.error('Erreur lors de la récupération de l’image :', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération de l’image.' });
  }
});

app.get('/api/avatar/:id', authenticateJWT , async (req, res) => {

  try {

const id = Number(req.params['id']);
console.log('id send ,' , id);

const document = await prisma.document.findUnique({ where: { id } });

if (!document) {
return res.status(404).json({ error: 'Document introuvable.' });
}

// Configuration des en-têtes HTTP pour forcer le téléchargement du binaire
res.setHeader('Content-Type', document.mimetype);

res.setHeader('Content-Disposition', `attachment; filename="${document.filename}"`);
// Envoi du buffer binaire au client
return res.send(document.fileData);

} catch (error) {

return res.status(500).json({ error: 'Erreur lors de la récupération du fichier.' });
}

})


app.get('/api/document/:id', async (req, res) => {
try {
const id = parseInt(req.params['id'], 10);
console.log('id send ,' , id);

const document = await prisma.document.findUnique({ where: { id } });

if (!document) {
return res.status(404).json({ error: 'Document introuvable.' });
}
// Configuration des en-têtes HTTP pour forcer le téléchargement du binaire
res.setHeader('Content-Type', document.mimetype);

res.setHeader('Content-Disposition', `attachment; filename="${document.filename}"`);
// Envoi du buffer binaire au client
return res.send(document.fileData);

} catch (error) {

return res.status(500).json({ error: 'Erreur lors de la récupération du fichier.' });
}


});

app.post('/api/delete/:id', authenticateJWT, async (req, res) => {
  try {
    const id = parseInt(req.params['id']);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Identifiant d’image invalide.' });
    }

    const document = await prisma.document.delete({
      where: { id: id }

    });

    if (!document) {
      return res.status(404).json({ error: 'Image introuvable.' });
    }

    return res.status(200).json({ message : 'Suppression effectuée avec succès.' });

  } catch (error) {
    console.error('Erreur lors de la récupération de l’image :', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération de l’image.' });
  }
});

/**
 * ---------------------------------------------------------
 * TEST
 * ---------------------------------------------------------
 */

app.get('/test', (req, res) => {
  res.send('Express fonctionne !');
});


/**
 * ---------------------------------------------------------
 * LOGIN
 * ---------------------------------------------------------
 */

app.post('/api/auth/login', async (req, res) => {

  try {

    console.log("BASE DE DONNÉES UTILISÉE :", process.env['DATABASE_URL']);

    const { email, password } = req.body;

    console.log('request bodu login --> ' , req.body);

    const user = await authenticateUser(
      email,
      password,

    );

    if (!user) {
      return res.status(401).json({
        message: 'Identifiants invalides',
      });
    }

    console.log('user form  auth login --->' , user);

   /**
     * TOKEN COOKIE
     */
    const token = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
      },
      ACCESS_SECRET,
      {
        expiresIn: '15m',
      },
    );

       /**
     * TOKEN COOKIE REFRESH
     */

    const refreshToken = jwt.sign(
      {
        sub: user.id,
      },
      REFRESH_SECRET,
      {
        expiresIn: '7d',
      },
    );

   /**
     * ACCESS TOKEN COOKIE
     */
  res.cookie('access_token', token, {
  httpOnly: true,
  secure: false,
  sameSite: 'lax',
  path: '/',
  maxAge: 15 * 60 * 1000,
   });

   /**
     * REFRESH TOKEN COOKIE
     */
 res.cookie('refresh_token', refreshToken, {
  httpOnly: true,
  secure: ACCESS_MODE === 'production',
  sameSite: 'lax',
  path: '/api/auth/refresh',
  maxAge: 7 * 24 * 60 * 60 * 1000,
});

console.log('🍪 LOGIN - Set-Cookie envoyé');

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });

  } catch (error) {

    console.error('Erreur login :', error);

    return res.status(500).json({
      message: 'Erreur serveur',
    });
  }
});


/**
 * ---------------------------------------------------------
 * ME
 * ---------------------------------------------------------
 */

app.get('/api/auth/me', authenticateJWT, async (req, res) => {

     console.log('🍪 COOKIE /me :',req.headers.cookie, );

    console.log( '🍪 req.cookies :',req.cookies, );

    try {

      const user = await getUser(String(req.user.sub));


      if (!user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }


      return res.json({
        id: user.id,
        email: user.email,
        role : user.role,
      });

    } catch (error) {

      console.error('Erreur /me :', error);

      return res.status(500).json({ message: 'Erreur serveur' });
    }
  },
);

/**
 * ---------------------------------------------------------
 * REFRESH
 * ---------------------------------------------------------
 */

app.post('/api/auth/refresh', async (req, res) => {

    try {

      const refreshToken =  req.cookies?.['refresh_token'];


      console.log(  '🔄 REFRESH TOKEN'  );

      console.log('Refresh cookie :', refreshToken ? 'PRÉSENT' : 'ABSENT');


      if (!refreshToken) {

        return res.status(401).json({ message: 'Refresh token manquant' });

      }


      /**
       * Vérification du refresh token
       */
      const payload =jwt.verify(refreshToken, REFRESH_SECRET!);


      if (
        typeof payload === 'string'
      ) {

        return res.status(401).json({ message: 'Refresh token invalide' });

      }


      /**
       * Récupération de l'utilisateur
       */
      const user = await getUser( String(payload.sub));


      if (!user) {

        return res.status(401).json({ message: 'Utilisateur introuvable'});

      }


      /**
       * Nouveau access token
       */
      const newAccessToken =
        jwt.sign(
          {
            sub: String(user.id),
            email: user.email,
          },
          ACCESS_SECRET!,
          {
            expiresIn: '15m',
          },
        );


      /**
       * Remplacement du cookie
       */
      res.cookie(
        'access_token',
        newAccessToken,
        {

          httpOnly: true,

          secure: ACCESS_MODE === 'production',

          sameSite: 'lax',

          path: '/',

          maxAge: 15 * 60 * 1000,

        },
      );


      console.log('✅ Nouveau access token créé',);


      return res.json({

        user: {
          id: String(user.id),
          email: user.email,
        },

      });


    } catch (error) {

      console.error('❌ Refresh token invalide : ', error);


      return res.status(401).json({message: 'Refresh token invalide ou expiré'});

    }

  },
);


/**
 * ---------------------------------------------------------
 * LOGOUT
 * ---------------------------------------------------------
 */

app.post( '/api/auth/logout', (req, res) => {

    res.clearCookie(
      'access_token',
      {
        httpOnly: true,

        secure: ACCESS_MODE ==='production',

        sameSite: 'lax',

        path: '/',
      },
    );


    res.clearCookie(
      'refresh_token',
      {
        httpOnly: true,

        secure: ACCESS_MODE === 'production',

        sameSite: 'lax',

        path: '/api/auth/refresh',
      },
    );


    console.log(  '🚪 LOGOUT - cookies supprimés');


    return res.json({  message: 'Déconnexion réussie',});

  },
);

app.post('/api/check', async (req, res) => {

 const { email, birthdate} = req.body;

      console.log("→Received renew password data:", req.body);

       if (!email || !birthdate) {
      return res.status(400).json({ error: 'Email et mot de passe requis' });
    }

    // Vérifier si l'email existe déjà
     const existingUser = await prisma.user.findUnique({ where: { email } });
    if (!existingUser) {
      return res.status(409).json({ error: 'Cet email est inconnu' });
    }
    const checked= await prisma.user.findUnique({
  where: { email },
select: {
    info: {
      select: {
        birthdate: true, // Sélectionne uniquement la date de naissance dans la table Info
      },
    },
  },
});
return res.json({success: checked });

})





app.post('/api/forget-password', async (req, res) => {

 try{
    const {
      email,
      birthdate,
    } = req.body;

      console.log("→Received renew password data:", req.body);

  if (!email) {
      return res.status(400).json({ error: 'Email et mot de passe requis' });
    }

     // Vérifier si l'email existe déjà
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (!existingUser) {
      return res.status(409).json({ error: 'Cet email est inconnu' });
    }

        const userdate= await prisma.user.findUnique({
  where: { email },
select: {
    info: {
      select: {
        birthdate: true, // Sélectionne uniquement la date de naissance dans la table Info
      },
    },
  },
});

const bddDate = userdate?.info?.[0]?.birthdate;

const userInput = birthdate;

console.log('1er appel bddDate ' , bddDate);
console.log('1er appel userInput ' , userInput);
// 2. Conversion du format DD/MM/YYYY en objet Date
const [day, month, year] = userInput.split('/').map(Number);
// Attention : les mois commencent à 0 en JavaScript (0 = Janvier, 5 = Juin)
const targetDate = new Date(year, month - 1, day);

// 3. Récupération de la date depuis Prisma (ex: 1994-06-06 22:00:00)
const birthdateFromDb = bddDate;

  console.log('birthdateFromDb ' , birthdateFromDb);
  console.log('targetDate ' , targetDate);

  const dateFormatee = birthdateFromDb ? DateTime.fromJSDate(birthdateFromDb, { zone: 'utc' }).toFormat('dd/MM/yyyy') : '';
console.log("dateFormatee " , dateFormatee);



if (dateFormatee === userInput) {

  console.log('---> Date de naissance vérifié OK');

      const generatedPassword = generatePassword();

        // Hash du mot de passe
    const saltRounds = 10;

    const hashedPassword = await bcrypt.hash(generatedPassword, saltRounds);


    const updatedpswrd =  await prisma.user.updateMany({
      where: { email },
    data: {
      password:hashedPassword
    },
    });
    console.log('NEW updated password ' , generatedPassword);

    return res.json({ password: generatedPassword });

  }else{

      return res.status(401).json({ error: 'Erreur dans la  date anniversaire'});
  }
  }catch (err: any) {
    console.error(err);
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Cet email est déjà utilisé' });
    }
    return res.status(500).json({ error: 'Erreur serveur', message: err.message });
  }

});


app.post('/api/modify-password', async (req, res) => {

   try {

     const {
      email,
      password,
     nouveaupswd,
    } = req.body;


    console.log("→Received registration data:", req.body);

     if (!email || !password || !nouveaupswd) {
      return res.status(400).json({ error: 'Email et mot de passe requis' });
    }

     // Vérifier si l'email existe déjà
    const existingUser = await prisma.user.findFirst({ where: { email } });

    console.log('existingUser ' , existingUser);

    if (!existingUser) {
      return res.status(409).json({ error: 'Cet email est incorrect' });
    }

    // Hash du mot de passe
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(nouveaupswd, saltRounds);

    const modifPswrd =  await prisma.user.updateMany({
      where: { email },
    data: {
      password:hashedPassword
    },
    });
    console.log('NEW updated password ' , modifPswrd);

      return res.status(200).json({

      password : password

    });
    } catch (err: any) {
    console.error(err);

    return res.status(500).json({ error: 'Erreur serveur', message: err.message });
  }
});

app.post('/api/interest',authenticateJWT , async (req, res) => {

  try {
    const interest = req.body?.interest;

    if (typeof interest !== 'string') {
      return res.status(400).json({ error: 'Interest must be a string' });
    }

    const userId = Number(req.user.sub);

    const interests = interest.split('-');

    const update = await prisma.info.updateMany({
      where: { userId },
      data: { interest: interests },
    });

    if (update.count === 0) {
      return res.status(404).json({ error: 'Profile not found for this user' });
    }

    const result = await prisma.info.findUnique({ where: { userId } });
    return res.json({ interest: result });
  } catch (error) {
    console.error('Failed to update user interests:', error);
    return res.status(500).json({ error: 'Failed to update interests' });
  }
});


app.post('/api/register', async (req, res) => {
  try {
    const {
      civility,
      email,
      password,
      name,
      sex,
      username,
      surname,
      birthdate,
      numero,
      zipCode,
      street,
      town,
      country,
      message,
      interest
    } = req.body;

    console.log("→Received registration data:", req.body);

    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis' });
    }

    // Vérifier si l'email existe déjà
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: 'Cet email est déjà utilisé' });
    }

    // Hash du mot de passe
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const parsedBirthdate = safeParseDate(birthdate);

    if (typeof interest !== 'string') {
      return res.status(400).json({ error: 'Interest must be a string' });
    }

    const interests = interest.split('-');

    // Création transactionnelle : User + Consumer
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Créer l'utilisateur
      const user = await tx.user.create({
        data: {
          name: username,
          email,
          password: hashedPassword,
        },
      });

      // 2. Créer le profil consumer lié
      const consumer = await tx.info.create({
        data: {
          civility,
          name,
          surname,
          sex:sex,
          birthdate: parsedBirthdate , // Accepte null désormais car modifié dans Prisma
          numero,
          zipCode,
          street,
          town,
          country,
          words: message,
          interest : interests,
          user: {
            connect: { id: user.id },
          },
        },
      });

      return { user, consumer };
    });

    // On renvoie la réponse ET on ajoute 'return' pour satisfaire TS7030
    return res.status(201).json({
      id: result.user.id,
      email: result.user.email,
      consumer: {
        id: result.consumer.id,
        name: result.consumer.name,
        surname: result.consumer.surname,
      },
    });

  } catch (err: any) {
    console.error(err);
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Cet email est déjà utilisé' });
    }
    return res.status(500).json({ error: 'Erreur serveur', message: err.message });
  }
}); // <-- Parenthèse et accolade fermées correctement ici !

/**
 * ---------------------------------------------------------
 * GRAPHQL / YOGA
 * ---------------------------------------------------------
 */

app.use('/graphql', (req, res, next) => {

  console.log('🔥 REQUÊTE GRAPHQL');

  console.log('METHOD :', req.method);

  console.log('URL :', req.url);

  console.log('ORIGIN :', req.headers.origin);

  console.log('BODY :', req.body);

  next();
});


app.use(
  yoga.graphqlEndpoint,
  yoga,
);


/**
 * ---------------------------------------------------------
 * FICHIERS STATIQUES ANGULAR
 * ---------------------------------------------------------
 */

app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);


/**
 * ---------------------------------------------------------
 * ANGULAR SSR
 * ---------------------------------------------------------
 */

app.use(async (req, res, next) => {

  try {

    const response = await angularApp.handle(req);

    if (response) {

      writeResponseToNodeResponse(response,res);

      return;
    }

    next();

  } catch (error) {

    next(error);
  }
});


/**
 * ---------------------------------------------------------
 * SERVEUR
 * ---------------------------------------------------------
 */
if (isMainModule(import.meta.url)) {

const port = 4000;

/**

* Serveur HTTP Node
  */

const httpServer = createServer(app);

/**

* Socket.IO
  */

createChatServer(httpServer,);

/**

* Démarrage
  */

httpServer.listen(port, () => {

  console.log(`🚀 Serveur Express & WebSockets actif sur : http://localhost:${port}`);

console.log( `🚀 Server : http://localhost:${port}`,);

  console.log(`🚀 GraphQL : http://localhost:${port}/graphql`,);

  console.log(`🚀 WebSocket : ws://localhost:${port}`,);

},


);

}



export const reqHandler = createNodeRequestHandler(app);


/**
 * ---------------------------------------------------------
 * AUTHENTIFICATION JWT
 * ---------------------------------------------------------
 */
function authenticateJWT(
  req: Request,
  res: Response,
  next: NextFunction,
): void {

    console.log('=================================');
  console.log('🔐 AUTHENTICATE JWT');
  console.log('Cookie header :', req.headers.cookie);
  console.log('Parsed cookies :', req.cookies);
  const token = req.cookies?.['access_token'];

  if (!token) {
    res.status(401).json({ message: 'Token manquant' });
    return;
  }

  try {
    const payload = jwt.verify(token, ACCESS_SECRET!);

    if (typeof payload === 'string') {
      res.status(401).json({ message: 'Token invalide' });
      return;
    }

    req.user = payload;
    next();
  } catch (error) {
    console.error('JWT invalide :', error);
    res.status(401).json({ message: 'Token invalide ou expiré' });
  }
}
/**
 * ---------------------------------------------------------
 * DATABASE
 * ---------------------------------------------------------
 */

async function getUser(id: string) {

  const user= prisma.user.findUnique({
    where: {
      id: Number(id),
    },
  });

  console.log('User from server : ' , user);

  return user ;
}


/**
 * ---------------------------------------------------------
 * AUTHENTIFICATION USER
 * ---------------------------------------------------------
 */

async function authenticateUser(
  email: unknown,
  password: unknown,
): Promise<{
  id: string;
  email: string;
  role: string;
} | null> {

  if (
    typeof email !== 'string' ||
    typeof password !== 'string'
  ) {
    return null;
  }


  try {

  const query = `SELECT id, email, password, role FROM "User" WHERE email = $1`;

  // 💡 Utilisation de $queryRawUnsafe pour passer une chaîne SQL classique
  const rows = await prisma.$queryRawUnsafe(query, email) as any[];


  console.log('--- TEST SQL BRUT ---');
  console.log('Nombre de lignes trouvées :', rows.length);
  console.log('Contenu brut renvoyé par PostgreSQL :', rows);
  console.log("DATABASE_URL configurée :", process.env['DATABASE_URL']);
console.log("NODE_ENV actuel :", process.env['NODE_ENV']);

    const client = await prisma.user.findUnique({
  where: { email },
  select: {
    id: true,
    email: true,
    password:true,
    role: true,
  },
});


    if (!client) {
      return null;
    }

 console.log('client du login ╝╝╝' , client);


  console.log('--- DIAGNOSTIC ID ---');
  console.log('Valeur brute de l\'ID :', client.id);
  console.log('Type de l\'ID selon Prisma :', typeof client.id);
  console.log("DATABASE_URL configurée :", process.env['DATABASE_URL']);
console.log("NODE_ENV actuel :", process.env['NODE_ENV']);
  console.log('----------------------');

    const isMatch = await bcrypt.compare( password,client.password! );


    if (!isMatch) {
      return null;
    }


    return {
      id: String(client.id),
      email: client.email ?? '',
      role : client.role,
    };

  } catch (error) {

    console.error( 'Erreur authenticateUser :',error  );

    return null;
  }
}
