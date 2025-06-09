// isbn-script.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Clé et URL Supabase
const SUPABASE_URL = 'https://xyzcompany.supabase.co'; // à remplacer par le tien
const SUPABASE_KEY = 'ey...'; // à remplacer par ta clé publique (anon)

// Créer l'instance Supabase
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let finalRecord = {};
let currentUser = null;

document.addEventListener("DOMContentLoaded", async () => {
  // Vérification de session existante
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    currentUser = session.user;
    document.getElementById("login-section").style.display = "none";
    document.getElementById("logout-section").style.display = "block";
    document.getElementById("save-button").style.display = "inline-block";
  }

  // Gestion de l'inscription
  document.getElementById("signup-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("signup-email").value;
    const password = document.getElementById("signup-password").value;

    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      alert("Erreur inscription : " + error.message);
    } else {
      alert("Inscription réussie ! Vérifie tes mails.");
    }
  });

  // Gestion de la connexion
  document.getElementById("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      alert("Erreur de connexion : " + error.message);
    } else {
      currentUser = data.user;
      document.getElementById("login-section").style.display = "none";
      document.getElementById("logout-section").style.display = "block";
      document.getElementById("save-button").style.display = "inline-block";
    }
  });

  // Déconnexion
  document.getElementById("logout-button").addEventListener("click", async () => {
    await supabase.auth.signOut();
    currentUser = null;
    document.getElementById("login-section").style.display = "block";
    document.getElementById("logout-section").style.display = "none";
    document.getElementById("save-button").style.display = "none";
  });

  // Recherche ISBN
  document.getElementById("isbn-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const isbn = document.getElementById("isbn").value.trim();
    if (!isbn) return;

    document.getElementById("loader").style.display = "block";
    document.getElementById("results").innerHTML = "";

    const googleBooksUrl = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`;
    const openLibraryUrl = `https://openlibrary.org/isbn/${isbn}.json`;

    try {
      const [googleRes, openLibRes] = await Promise.all([
        fetch(googleBooksUrl),
        fetch(openLibraryUrl)
      ]);

      const googleData = await googleRes.json();
      const openLibData = await openLibRes.json();

      const book = googleData.items?.[0]?.volumeInfo || {};
      const sale = googleData.items?.[0]?.saleInfo || {};
      const access = googleData.items?.[0]?.accessInfo || {};

      finalRecord = {
        isbn,
        titre: book.title || openLibData.title || "",
        auteur: (book.authors && book.authors.join(", ")) || openLibData.authors?.map(a => a.name).join(", ") || "",
        éditeur: book.publisher || openLibData.publishers?.[0] || "",
        année: book.publishedDate || openLibData.publish_date || "",
        pages: book.pageCount || openLibData.number_of_pages || "",
        langue: book.language || openLibData.languages?.[0]?.key?.split("/").pop() || "",
        description: book.description || "",
        couverture: book.imageLinks?.thumbnail || "",
        is_ebook: access.isEbook || sale.isEbook || false,
        format: "",  // à remplir manuellement
        possession: "",
        lieu: "",
        user_id: currentUser?.id || null,
      };

      afficherTableau(finalRecord);
    } catch (err) {
      console.error("Erreur : ", err);
      alert("Impossible de récupérer les données.");
    } finally {
      document.getElementById("loader").style.display = "none";
    }
  });

  // Enregistrement Supabase
  document.getElementById("save-button").addEventListener("click", async () => {
    if (!currentUser) {
      alert("Veuillez vous connecter.");
      return;
    }

    const saveBtn = document.getElementById("save-button");
    saveBtn.disabled = true;

    try {
      finalRecord.user_id = currentUser.id;
      const { error } = await supabase.from("livres").insert([finalRecord]);
      if (error) {
        throw error;
      }
      alert("Livre enregistré !");
    } catch (err) {
      alert("Erreur d'enregistrement : " + err.message);
    } finally {
      saveBtn.disabled = false;
    }
  });
});

// Affichage tableau
function afficherTableau(data) {
  const table = document.createElement("table");
  table.className = "book-table";
  for (let [key, value] of Object.entries(data)) {
    if (["user_id", "isbn"].includes(key)) continue;

    const row = document.createElement("tr");
    const keyCell = document.createElement("td");
    keyCell.textContent = key;
    const valueCell = document.createElement("td");

    if (["format", "possession", "lieu"].includes(key)) {
      const input = document.createElement("input");
      input.value = value || "";
      input.addEventListener("input", () => (finalRecord[key] = input.value));
      valueCell.appendChild(input);
    } else if (key === "couverture" && value) {
      const img = document.createElement("img");
      img.src = value;
      img.alt = "Couverture";
      img.style.maxHeight = "200px";
      valueCell.appendChild(img);
    } else {
      valueCell.textContent = value;
    }

    row.appendChild(keyCell);
    row.appendChild(valueCell);
    table.appendChild(row);
  }

  document.getElementById("results").appendChild(table);
}
