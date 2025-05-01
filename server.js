//Import le module mysql2
const mysql = require('mysql2');
// Importe le module Express
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
// Charge les variables d'environnement à partir du fichier .env (si présent)
dotenv.config();

// Crée un pool de connexions à la base de données MySQL
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: process.env.DB_PORT || 3306, // Utilise le port défini dans .env ou 3306 par défaut
    waitForConnections: true,
    connectionLimit: 10, // Nombre maximal de connexions dans le pool
    queueLimit: 0       // Nombre maximal de requêtes en attente si toutes les connexions sont utilisées
});

// Vérifie la connexion au pool (optionnel)
pool.getConnection((err, connection) => {
    if (err) {
        console.error('Erreur lors de la connexion à la base de données :', err);
        return;
    }
    console.log('Connecté à la base de données MySQL !');
    connection.release(); // Libère la connexion pour qu'elle puisse être réutilisée par le pool
});


// Crée une instance de l'application Express
const app = express();
const port = process.env.PORT || 5000; // Utilisez le port défini dans .env ou 5000 par défaut

// Utilise le middleware cors pour gérer les requêtes cross-origin
app.use(cors());

// Utilise le middleware express.json() pour pouvoir lire les corps de requête au format JSON
app.use(express.json());


//PRODUIT
// Afficher tous les produit
app.get('/api/produit/affiche', (req, res) => {
    pool.query('SELECT * FROM produit', (err, results) => {
        if (err) {
            console.error('Erreur lors de la requête à la base de données :', err);
            res.status(500).json({ error: 'Erreur lors de la récupération des visiteurs' });
            return;
        }
        res.json(results);
    });
});

// Route pour ajouter un nouveau produit avec audit//Triggers pas de nom
app.post('/api/produit/ajout', (req, res) => {
    const { num_produit, design, stock } = req.body;

    if (num_produit === undefined || !design || stock === undefined) {
        return res.status(400).json({ error: 'Veuillez fournir toutes les informations nécessaires pour un produit.' });
    }

    const query = 'INSERT INTO produit (num_produit, design, stock) VALUES (?, ?, ?)';

    pool.query(query, [num_produit, design, stock], (err, result) => {
        if (err) {
            console.error('Erreur lors de l\'ajout du produit :', err);
            return res.status(500).json({ error: 'Erreur lors de l\'ajout du produit' });
        }

        // Enregistrement dans la table d'audit après l'ajout réussi du produit
        const auditQuery = 'INSERT INTO audit_vente (type_operation, design) VALUES (?, ?)';
        pool.query(auditQuery, ['ajout', design], (errAudit) => {
            if (errAudit) {
                console.error('Erreur lors de l\'enregistrement de l\'audit d\'ajout de produit :', errAudit);
                // Il est important de décider comment gérer les erreurs d'audit.
                // Ici, nous loguons l'erreur mais considérons que l'ajout du produit a réussi.
                console.log('Produit ajouté avec succès, mais une erreur est survenue lors de l\'enregistrement de l\'audit.');
            } else {
                console.log('Audit d\'ajout de produit enregistré avec succès.');
            }
            res.status(201).json({ message: 'Produit ajouté avec succès', insertId: result.insertId });
        });
    });
});
// Route pour lire un produit spécifique par son numéro
app.get('/api/produit/:num_produit', (req, res) => {
    const num_produit = req.params.num_produit;

    const query = 'SELECT * FROM produit WHERE num_produit = ?';

    pool.query(query, [num_produit], (err, results) => {
        if (err) {
            console.error('Erreur lors de la récupération du produit :', err);
            return res.status(500).json({ error: 'Erreur serveur lors de la récupération du produit.' });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: 'Produit non trouvé.' });
        }

        res.json(results[0]);
    });
});

// Route pour mettre à jour un produit existant avec audit
app.put('/api/produit/:num_produit', async (req, res) => {
    const num_produit = req.params.num_produit;
    const { design, stock } = req.body;

    if (!design && stock === undefined) {
        return res.status(400).json({ error: 'Veuillez fournir au moins le design ou le stock à mettre à jour.' });
    }

    try {
        // Récupérer l'état actuel du produit avant la modification
        const [rows] = await pool.promise().query('SELECT design, stock FROM produit WHERE num_produit = ?', [num_produit]);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Produit non trouvé.' });
        }

        const ancienDesign = rows[0].design;
        const ancienStock = rows[0].stock;

        // Effectuer la mise à jour du produit
        const query = 'UPDATE produit SET design = ?, stock = ? WHERE num_produit = ?';
        const [result] = await pool.promise().query(query, [design || ancienDesign, stock !== undefined ? stock : ancienStock, num_produit]);

        if (result.affectedRows > 0) {
             // Enregistrer l'audit de la modification
             const auditQuery = 'INSERT INTO audit_vente (type_operation, design, qtesortie_ancien, qtesortie_nouv) VALUES (?, ?, ?, ?)';
             await pool.promise().query(auditQuery, ['modification', `${ancienDesign} -> ${design}`, ancienStock, stock]);

            res.json({ message: 'Produit mis à jour avec succès.' });
        } else {
            res.status(404).json({ message: 'Produit non trouvé.' }); // Redondant mais pour la clarté
        }

    } catch (err) {
        console.error('Erreur lors de la mise à jour du produit :', err);
        res.status(500).json({ error: 'Erreur lors de la mise à jour du produit' });
    }
});
// Route pour supprimer un produit avec audit
app.delete('/api/produit/:num_produit', async (req, res) => {
    const num_produit = req.params.num_produit;

    try {
        // Récupérer l'état actuel du produit avant la suppression
        const [rows] = await pool.promise().query('SELECT design FROM produit WHERE num_produit = ?', [num_produit]);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Produit non trouvé.' });
        }

        const designProduitSupprime = rows[0].design;

        // Effectuer la suppression du produit
        const query = 'DELETE FROM produit WHERE num_produit = ?';
        const [result] = await pool.promise().query(query, [num_produit]);

        if (result.affectedRows > 0) {
            // Enregistrer l'audit de la suppression
            const auditQuery = 'INSERT INTO audit_vente (type_operation, design) VALUES (?, ?)';
            await pool.promise().query(auditQuery, ['suppression', designProduitSupprime]);

            res.json({ message: 'Produit supprimé avec succès.' });
        } else {
            res.status(404).json({ message: 'Produit non trouvé.' }); // Redondant mais pour la clarté
        }

    } catch (err) {
        console.error('Erreur lors de la suppression du produit :', err);
        res.status(500).json({ error: 'Erreur lors de la suppression du produit' });
    }
});

//CLIENT
// Route pour lire tous les clients
app.get('/api/client/affiche', (req, res) => {
    pool.query('SELECT * FROM client', (err, results) => {
        if (err) {
            console.error('Erreur lors de la requête à la base de données :', err);
            res.status(500).json({ error: 'Erreur lors de la récupération des clients' });
            return;
        }
        res.json(results);
    });
  });
// Route pour ajouter un nouveau client avec audit
app.post('/api/client/ajout', (req, res) => {
    const { num_client, nom } = req.body;

    if (num_client === undefined || !nom) {
        return res.status(400).json({ error: 'Veuillez fournir toutes les informations nécessaires pour un client.' });
    }

    const query = 'INSERT INTO client (num_client, nom) VALUES (?, ?)';

    pool.query(query, [num_client, nom], (err, result) => {
        if (err) {
            console.error('Erreur lors de l\'ajout du client :', err);
            return res.status(500).json({ error: 'Erreur lors de l\'ajout du client' });
        }

        // Enregistrement dans la table d'audit après l'ajout réussi du client
        const auditQuery = 'INSERT INTO audit_vente (type_operation, nom) VALUES (?, ?)';
        pool.query(auditQuery, ['ajout', nom], (errAudit) => {
            if (errAudit) {
                console.error('Erreur lors de l\'enregistrement de l\'audit d\'ajout de client :', errAudit);
                // Gérer l'erreur d'audit (log, etc.)
                console.log('Client ajouté avec succès, mais une erreur est survenue lors de l\'enregistrement de l\'audit.');
            } else {
                console.log('Audit d\'ajout de client enregistré avec succès.');
            }
            res.status(201).json({ message: 'Client ajouté avec succès', insertId: result.insertId });
        });
    });
});
//Route pour lire un client spécifique par son numéro
app.get('/api/client/:num_client', (req, res) => {
    const num_client = req.params.num_client;

    const query = 'SELECT * FROM client WHERE num_client = ?';

    pool.query(query, [num_client], (err, results) => {
        if (err) {
            console.error('Erreur lors de la récupération du client :', err);
            return res.status(500).json({ error: 'Erreur serveur.' });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: 'Client non trouvé.' });
        }

        res.json(results[0]);
    });
});
// Route pour mettre à jour un client existant avec audit
app.put('/api/client/:num_client', async (req, res) => {
    const num_client = req.params.num_client;
    const { nom } = req.body;

    if (!nom) {
        return res.status(400).json({ error: 'Le nom du client est requis.' });
    }

    try {
        // Récupérer l'état actuel du client avant la modification
        const [rows] = await pool.promise().query('SELECT nom FROM client WHERE num_client = ?', [num_client]);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Client non trouvé.' });
        }

        const ancienNomClient = rows[0].nom;

        // Effectuer la mise à jour du client
        const query = 'UPDATE client SET nom = ? WHERE num_client = ?';
        const [result] = await pool.promise().query(query, [nom, num_client]);

        if (result.affectedRows > 0) {
            // Enregistrer l'audit de la modification
            const auditQuery = 'INSERT INTO audit_vente (type_operation, nom) VALUES (?, ?)';
            await pool.promise().query(auditQuery, ['modification', `${ancienNomClient} -> ${nom}`]);

            res.json({ message: 'Client mis à jour avec succès.' });
        } else {
            res.status(404).json({ message: 'Client non trouvé.' }); // Redondant mais pour la clarté
        }

    } catch (err) {
        console.error('Erreur lors de la mise à jour du client :', err);
        res.status(500).json({ error: 'Erreur lors de la mise à jour du client.' });
    }
});
// Route pour supprimer un client avec audit
app.delete('/api/client/:num_client', async (req, res) => {
    const num_client = req.params.num_client;

    try {
        // Récupérer le nom du client avant la suppression pour l'audit
        const [rows] = await pool.promise().query('SELECT nom FROM client WHERE num_client = ?', [num_client]);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Client non trouvé.' });
        }

        const nomClientSupprime = rows[0].nom;

        // Effectuer la suppression du client
        const query = 'DELETE FROM client WHERE num_client = ?';
        const [result] = await pool.promise().query(query, [num_client]);

        if (result.affectedRows > 0) {
            // Enregistrer l'audit de la suppression
            const auditQuery = 'INSERT INTO audit_vente (type_operation, nom) VALUES (?, ?)';
            await pool.promise().query(auditQuery, ['suppression', nomClientSupprime]);

            res.json({ message: 'Client supprimé avec succès.' });
        } else {
            res.status(404).json({ message: 'Client non trouvé.' }); // Redondant mais pour la clarté
        }

    } catch (err) {
        console.error('Erreur lors de la suppression du client :', err);
        res.status(500).json({ error: 'Erreur lors de la suppression du client.' });
    }
});

//VENTE
// Route pour afficher toutes les ventes
app.get('/api/vente', (req, res) => {
    const query = 'SELECT * FROM ventes';
  
    pool.query(query, (err, results) => {
      if (err) {
        console.error('Erreur lors de la récupération de toutes les ventes:', err);
        return res.status(500).json({ message: 'Erreur lors de la récupération des ventes.' });
      }
  
      if (results.length === 0) {
        return res.status(200).json({ message: 'Aucune vente enregistrée pour le moment.', ventes: [] });
      }
  
      res.status(200).json({ ventes: results });
    });
  });
// Route pour créer une nouvelle vente avec audit (nom du client) et mise à jour du stock
app.post('/api/vente/ajout', async (req, res) => {
    const { num_client, num_produit, quantite_sortie } = req.body;

    if (!num_client || !num_produit || quantite_sortie === undefined) {
        return res.status(400).json({ message: 'Le num_client, le num_produit et la quantite_sortie sont requis.' });
    }

    try {
        // Vérifier l'existence du client et obtenir son nom
        const [clientRows] = await pool.promise().query('SELECT nom FROM client WHERE num_client = ?', [num_client]);

        if (clientRows.length === 0) {
            return res.status(400).json({ message: `Le client avec l'ID ${num_client} n'existe pas.` });
        }

        const nomClient = clientRows[0].nom;

        // Vérifier l'existence du produit et obtenir son design et stock
        const [produitRows] = await pool.promise().query('SELECT design, stock FROM produit WHERE num_produit = ?', [num_produit]);

        if (produitRows.length === 0) {
            return res.status(400).json({ message: `Le produit avec l'ID ${num_produit} n'existe pas.` });
        }

        const { design, stock } = produitRows[0];

        // Vérifier si le stock est suffisant
        if (stock < quantite_sortie) {
            return res.status(400).json({ message: `Stock insuffisant pour le produit ${design}. Stock actuel : ${stock}, quantité demandée : ${quantite_sortie}.` });
        }

        // Insérer la nouvelle vente
        const [venteResult] = await pool.promise().query(
            'INSERT INTO ventes (num_client, num_produit, quantite_sortie) VALUES (?, ?, ?)',
            [num_client, num_produit, quantite_sortie]
        );
        const venteId = venteResult.insertId;

        // Mettre à jour le stock du produit
        await pool.promise().query('UPDATE produit SET stock = stock - ? WHERE num_produit = ?', [quantite_sortie, num_produit]);

        // Enregistrer l'audit de la vente avec le nom du client
        const auditQuery = 'INSERT INTO audit_vente (type_operation, nom, design, qtesortie_nouv) VALUES (?, ?, ?, ?)';
        await pool.promise().query(auditQuery, ['ajout_vente', nomClient, design, quantite_sortie]);

        res.status(201).json({ message: 'Vente enregistrée avec succès!', id: venteId });

    } catch (err) {
        console.error('Erreur lors de l\'ajout de la vente :', err);
        res.status(500).json({ message: 'Erreur lors de l\'enregistrement de la vente.' });
    }
});
// Route pour lire une vente spécifique par son ID
app.get('/api/vente/:id', (req, res) => {
    const venteId = req.params.id; // Récupère l'ID de la vente depuis les paramètres de l'URL
  
    if (!venteId) {
      return res.status(400).json({ message: 'L\'ID de la vente est requis.' });
    }
  
    const query = 'SELECT * FROM ventes WHERE num_vente = ?';
    const values = [venteId];
  
    pool.query(query, values, (err, results) => {
      if (err) {
        console.error('Erreur lors de la récupération de la vente:', err);
        return res.status(500).json({ message: 'Erreur lors de la récupération de la vente.' });
      }
  
      if (results.length === 0) {
        return res.status(404).json({ message: `Vente avec l'ID ${venteId} non trouvée.` });
      }
  
      res.status(200).json(results[0]); // Renvoie la première (et unique) vente trouvée
    });
  });

// Route pour modifier une vente spécifique par son ID
app.put('/api/vente/:id', (req, res) => {
    const venteId = req.params.id; // Récupère l'ID de la vente depuis les paramètres de l'URL
    const { num_client, num_produit, quantite_sortie } = req.body; // Récupère les nouvelles informations de la vente depuis le corps de la requête
  
    if (!venteId) {
      return res.status(400).json({ message: 'L\'ID de la vente est requis.' });
    }
  
    // Vérifiez si au moins un champ à mettre à jour est présent
    if (!num_client && !num_produit && quantite_sortie === undefined) {
      return res.status(400).json({ message: 'Au moins un champ (num_client, num_produit, quantite_sortie) doit être fourni pour la mise à jour.' });
    }
  
    // Construction dynamique de la requête SQL UPDATE
    const updates = [];
    const values = [];
  
    if (num_client) {
      updates.push('num_client = ?');
      values.push(num_client);
    }
    if (num_produit) {
      updates.push('num_produit = ?');
      values.push(num_produit);
    }
    if (quantite_sortie !== undefined) {
      updates.push('quantite_sortie = ?');
      values.push(quantite_sortie);
    }
  
    const query = `UPDATE ventes SET ${updates.join(', ')} WHERE num_vente = ?`;
    values.push(venteId);
  
    pool.query(query, values, (err, result) => {
      if (err) {
        console.error('Erreur lors de la mise à jour de la vente:', err);
        return res.status(500).json({ message: 'Erreur lors de la mise à jour de la vente.' });
      }
  
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: `Vente avec l'ID ${venteId} non trouvée.` });
      }
  
      res.status(200).json({ message: `Vente avec l'ID ${venteId} mise à jour avec succès!` });
    });
  });
// Route pour supprimer une vente spécifique par son ID
app.delete('/api/vente/:id', async (req, res) => {
    const venteId = req.params.id;

    if (!venteId) {
        return res.status(400).json({ message: 'L\'ID de la vente est requis pour la suppression.' });
    }

    try {
        // 1. Récupérer les informations de la vente avant suppression
        const [venteRows] = await pool.promise().query('SELECT * FROM ventes WHERE num_vente = ?', [venteId]);
        if (venteRows.length === 0) {
            return res.status(404).json({ message: `Vente avec l'ID ${venteId} non trouvée.` });
        }

        const vente = venteRows[0];

        // 2. Récupérer les infos client et produit
        const [clientRows] = await pool.promise().query('SELECT nom FROM client WHERE num_client = ?', [vente.num_client]);
        const [produitRows] = await pool.promise().query('SELECT design FROM produit WHERE num_produit = ?', [vente.num_produit]);

        const nomClient = clientRows[0]?.nom || 'inconnu';
        const design = produitRows[0]?.design || 'inconnu';

        // 3. Supprimer la vente
        await pool.promise().query('DELETE FROM ventes WHERE num_vente = ?', [venteId]);

        // 4. Restaurer le stock
        await pool.promise().query('UPDATE produit SET stock = stock + ? WHERE num_produit = ?', [vente.quantite_sortie, vente.num_produit]);

        // 5. Insérer dans audit
        await pool.promise().query(
            'INSERT INTO audit_vente (type_operation, nom, design, qtesortie_nouv) VALUES (?, ?, ?, ?)',
            ['suppression_vente', nomClient, design, vente.quantite_sortie]
        );

        res.status(200).json({ message: `Vente avec l'ID ${venteId} supprimée avec succès!` });

    } catch (err) {
        console.error('Erreur lors de la suppression de la vente:', err);
        res.status(500).json({ message: 'Erreur lors de la suppression de la vente.' });
    }
});


// Démarre le serveur et écoute les requêtes sur le port spécifié
app.listen(port, () => {
    console.log(`Serveur backend écoutant sur le port http://localhost:${port}`);
});