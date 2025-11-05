// === Serveur Node.js basique avec Express ===

const express = require("express");
const app = express();

// Middleware pour lire le JSON envoyé par le client
app.use(express.json());

// Route GET (simple)
app.get("/", (req, res) => {
  res.send("✅ Serveur Node opérationnel !");
});

// Route POST : renvoie le contenu reçu
app.post("/echo", (req, res) => {
  console.log("📩 Requête reçue :", req.body);
  res.json({
    message: "Voici les données que tu as envoyées :",
    data: req.body,
  });
});

// Route dynamique : renvoie les paramètres de l'URL
app.get("/user/:id", (req, res) => {
  res.json({
    userId: req.params.id,
    query: req.query,
  });
});

// Lancer le serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Serveur lancé sur http://localhost:${PORT}`));
