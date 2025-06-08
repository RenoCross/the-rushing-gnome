// isbn-script.js

// Initialiser Supabase
const supabaseUrl = 'https://dvzqvjmaavtvqzeilmcg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2enF2am1hYXZ0dnF6ZWlsbWNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc1OTM0OTMsImV4cCI6MjA2MzE2OTQ5M30.rZjwxo4YW6W4ZC2pvm0TGBvTLTkmSpZ8mJCOF3KAdzo';
const supabase = createClient(supabaseUrl, supabaseKey);
let currentUser = null;
let finalRecord = {};

// Attendre que le DOM soit prêt
document.addEventListener("DOMContentLoaded", function () {

	const authSection = document.getElementById('auth-section');
	const loginBtn = document.getElementById('login-btn');
	const signupBtn = document.getElementById('signup-btn');
	const authStatus = document.getElementById('auth-status');
	const bookFormSection = document.getElementById('book-form-section');
	const logoutBtn = document.getElementById('logout-btn');
	logoutBtn?.addEventListener('click', async () => {
		await supabase.auth.signOut();
		location.reload();
	});
	
	// Vérifie si l'utilisateur est déjà connecté
	supabase.auth.getSession().then(({ data: { session } }) => {
		if (session) {
			currentUser = session.user;
			authStatus.textContent = `Connecté en tant que ${session.user.email}`;
			authSection.style.display = 'none';
			bookFormSection.style.display = 'block';
		}
	});
	
	supabase.auth.getSession().then(({ data: { session } }) => {
		if (session) {
			currentUser = session.user;
			authStatus.textContent = `Connecté en tant que ${session.user.email}`;
			authSection.style.display = 'none';
			bookFormSection.style.display = 'block';
		}
	});


	loginBtn?.addEventListener('click', async () => {
		const email = document.getElementById('email').value;
		const password = document.getElementById('password').value;
		const { error, data } = await supabase.auth.signInWithPassword({ email, password });
		
		if (error) {
			authStatus.textContent = "Erreur de connexion : " + error.message;
		} else {
			currentUser = data.user;
			currentUser = session.user;			
			authStatus.textContent = `Connecté en tant que ${data.user.email}`;
			authSection.style.display = 'none';
			bookFormSection.style.display = 'block';
		}
	});
	
	signupBtn?.addEventListener('click', async () => {
		const email = document.getElementById('email').value;
		const password = document.getElementById('password').value;
		const { error, data } = await supabase.auth.signUp({ email, password });
		
		if (error) {
			authStatus.textContent = "Erreur d'inscription : " + error.message;
		} else {
			authStatus.textContent = "Inscription réussie ! Veuillez vérifier votre email.";
		}
	});
	
	// --- Variables DOM principales ---	
	const form = document.getElementById("isbn-form");
	const resultsDiv = document.getElementById("results");
	const jsonOutput = document.getElementById("jsonOutput");
	const loader = document.getElementById("loader");
	let finalRecord = {};
	
	// Créer le bouton Enregistrer
	let saveBtn; // ← déclaration accessible dans tout le scope	
	if (!document.getElementById("saveRecord")) {
		saveBtn = document.createElement("button");
		saveBtn.id = "saveRecord";
		saveBtn.textContent = "Enregistrer dans Supabase";
		saveBtn.style.marginTop = "1rem";
		document.body.appendChild(saveBtn);
	} else {
		saveBtn = document.getElementById("saveRecord");
	}

	// Fonction utilitaire pour sécuriser les liens URL
	function isSafeUrl(url) {
		try {
			const parsed = new URL(url);
			return ['http:', 'https:'].includes(parsed.protocol);
		} catch (e) {
			return false;
		}
	}
	
	// Fonction utilitaire : strip HTML
	function stripHTML(html) {
		const div = document.createElement("div");
		div.innerHTML = html;
		return div.textContent || div.innerText || "";
	}
		
	// Fonction principale de récupération
	async function fetchBookData() {
		const isbn = document.getElementById("isbn").value.trim();
		const selectedApis = Array.from(document.querySelectorAll('input[name="api"]:checked')).map(input => input.value);
		const reqs={};
		const allData = {};
		
		resultsDiv.innerHTML = "";
		jsonOutput.textContent = "";
	
		if (!isbn || selectedApis.length === 0 || !isbn.match(/^\d{10}(\d{3})?$/)) {
			resultsDiv.innerHTML = "<p>Veuillez entrer un ISBN conforme et sélectionner au moins une API.</p>";
			return;
		}
		for (const api of selectedApis) {
			try {
				let data, req;
				if (api === "OpenLibrary_data") {
					req = `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`;
					const res = await fetch(req);
					const jsonData = await res.json();
					data = jsonData[`ISBN:${isbn}`];
					if (!data) {
						throw new Error("ISBN non trouvé dans OpenLibrary (data)");
					}
					jsonOutput.textContent += `\n[OpenLibrary data]\n` + JSON.stringify(data, null, 2);
				} else if (api === "OpenLibrary_details") {
					req = `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=details`;
					const res = await fetch(req);			
					const jsonData = await res.json();
					data = jsonData[`ISBN:${isbn}`];
					if (!data) {
						throw new Error("ISBN non trouvé dans OpenLibrary (details)");
					}				
					jsonOutput.textContent += `\n[OpenLibrary details]\n` + JSON.stringify(data, null, 2);				
				} else if (api === "GoogleBooks") {
					req = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`
					const res = await fetch(req);
					const jsonData = await res.json();
					if (!jsonData.items?.[0]) {
						throw new Error("ISBN non trouvé dans Google Books");
					}				
					data = jsonData.items?.[0]?.volumeInfo;
					jsonOutput.textContent += `\n[Google Books]\n` + JSON.stringify(data, null, 2);
				}
				reqs[api] = req;
				allData[api] = data || {};
			} catch (err) {
				console.error(`Erreur API ${api}:`, err);
				allData[api] = {error: err.message || "Erreur lors de la récupération des données." };
			}
		}
		
		renderUnifiedTable(allData, reqs);
	}

	// Fonction de rendu du tableau fusionné	
	function renderUnifiedTable(allData, req) {
		const table = document.createElement("table");
		resultsDiv.innerHTML = ""; // nettoie avant d’ajouter
		
		// Entêtes
		const headerRow = document.createElement("tr");
		headerRow.innerHTML = `<th>Champ</th>${
			Object.keys(allData).map(api => 
				`<th>${api}
    					<br>    
					<details>
						<summary style="cursor: pointer;">Voir JSON</summary>
						<pre style="max-width: 300px; overflow-x: auto; white-space: pre-wrap;">${JSON.stringify(allData[api], null, 2)}</pre>
					</details>
				</th>`			
						).join("")
		}`;
		table.appendChild(headerRow);
	
		finalRecord = {};
		const apiPriority = ["GoogleBooks", "OpenLibrary_data", "OpenLibrary_details"];
	
		function getBestValue(fieldFn, data, priority) {
			for (const api of priority) {
				if (data[api] && !data[api].error) {
					try {
						return fieldFn.length === 2 ? fieldFn(data[api], api) : fieldFn(data[api]);
					} catch {}
				}
			}
			return "-";
		}
	
		const fields = {
			"Requête": (d, api) => reqs[api] || "-",
			"ISBN_13": d => {
				const isbnList =
					d.identifiers?.isbn_13
					|| d.details?.isbn_13
					|| d.industryIdentifiers?.filter(id => id.type === "ISBN_13").map(id => id.identifier);		
				if (Array.isArray(isbnList)) {
					return isbnList.join(", ");
				}
				return isbnList || "-";
			},
			"ISBN_10": d => {
				const isbnList =
					d.identifiers?.isbn_10
					|| d.details?.isbn_10
					|| d.industryIdentifiers?.filter(id => id.type === "ISBN_10").map(id => id.identifier);		
				if (Array.isArray(isbnList)) {
					return isbnList.join(", ");
				}
				return isbnList || "-";
			},	
			"Titre": d => d.title || d.details?.title || "-",
			"Sous-titre": d => d.subtitle || d.details?.subtitle || "-",
			"Auteur": d =>
				(d.authors?.map(a => a.name).join(", "))
				|| (d.details?.authors?.map(a => a.name).join(", "))
				|| d.authors?.[0]
				|| "-",
			"Éditeur": d => 
				(d.publishers?.map(a => a.name).join(", "))
				|| d.details?.publishers
				|| d.publisher
				|| "-",
			"Lieu d'édition": d => 
				(d.publish_places?.map(a => a.name).join(", "))
				|| d.details?.publish_places 
				|| "-",		
			"Date": d => 
				d.publish_date 
				|| d.details?.publish_date 
				|| d.publishedDate 
				|| "-",
			"Description": d => {
				const desc = d.description || d.details?.description || "-";
				return typeof desc === "string" ? desc : desc?.value || "-";
			},			
			"Pages": d => 
				d.number_of_pages 
				|| d.details?.number_of_pages 
				|| d.pageCount 
				|| "-",
			"Type d'impression": d =>
				d.details?.printType
				|| d.details?.type?.key?.replace("/type/", "")
				|| d.printType
				|| "-",
			"Langue": d => {
				return d.language?.code
					|| d.details?.languages?.[0]?.key?.replace("/languages/", "")
					|| d.language
					|| "-";
			},	
			"Format numérique (eBook)": d => {
				const is_ebook =
					(d.accessInfo?.isEbook === true || d.saleInfo?.isEbook === true) ? "Oui" :
					(d.accessInfo?.epub?.isAvailable === true || d.accessInfo?.pdf?.isAvailable === true) ? "Oui" :
					"Non";
				return is_ebook || "-";
			},
			"Lien eBook (si disponible)": d => {
				const fromGoogle = d.accessInfo?.webReaderLink || d.accessInfo?.epub?.acsTokenLink;
				const fromOL = d.ebooks?.[0]?.preview_url || (d.details?.ocaid ? `https://archive.org/details/${d.details.ocaid}` : null);
				const link = fromGoogle || fromOL;
				return isSafeUrl(link) ? `<a href="${link}" target="_blank" rel="noopener noreferrer">Lire / Télécharger</a>` : "-";
			},
			"Prix": d => 
				d.saleInfo?.listPrice?.amount
				? `${d.saleInfo.listPrice.amount} ${d.saleInfo.listPrice.currencyCode}`
				: d.saleInfo?.retailPrice?.amount
				? `${d.saleInfo.retailPrice.amount} ${d.saleInfo.retailPrice.currencyCode}`
				: "-",
			"Library of Congress Classification": d => 
				d.classifications?.lc_classifications 
				|| d.details?.lc_classifications 
				|| "-",	
			"Classification décimale Dewey": d =>
				d.classifications?.dewey_decimal_class 
				|| d.details?.dewey_decimal_class 
				|| "-",
			"Catégories": d => 
				Array.isArray(d.categories) ? d.categories.join(", ") : 
				d.categories || "-",
			"Couverture": d => {
				const url_cover =
					d.cover?.medium
					|| d.cover?.large
					|| d.cover?.small
					|| d.thumbnail_url
					|| d.imageLinks?.Thumbnail
					|| d.imageLinks?.thumbnail					
					|| d.imageLinks?.smallThumbnail;
				if (url_cover) {
					return `<img src="${url_cover}" alt="cover" style="max-height:150px;">`;
				}
				return "-";
			}
		};
	
		for (const label in fields) {
			const row = document.createElement("tr");
			const cells = Object.entries(allData).map(([api, data]) => {
				if (data?.error) return `<td style="color:red;">${data.error}</td>`;
				try {
					const value = fields[label].length === 2 ? fields[label](data, api) : fields[label](data);
					return `<td class="api-cell">${value}</td>`;
				} catch {
					return `<td>-</td>`;
				}
			});
			
			finalRecord[label] = getBestValue(fields[label], allData, apiPriority);
	
			row.innerHTML = `<th>${label}</th>${cells.join("")}`;
	
			const finalCell = document.createElement("td");
			finalCell.classList.add("final-cell");
			finalCell.contentEditable = true;
			finalCell.dataset.field = label;
			finalCell.innerHTML = finalRecord[label] ?? "-";
			row.appendChild(finalCell);
			table.appendChild(row);
	
			row.querySelectorAll("td.api-cell").forEach((cell, index) => {
				cell.style.cursor = "pointer";
				cell.title = "Cliquer pour copier dans la colonne finale";
				cell.addEventListener("click", () => {
					finalCell.innerHTML = cell.innerHTML;
					finalRecord[label] = stripHTML(cell.innerHTML);
				});
			});
		}
		
		resultsDiv.appendChild(table);
	}

	// Enregistrement Supabase avec user
	saveBtn.onclick = async () => {
		if (!currentUser) {
			alert("Veuillez vous connecter avant d’enregistrer.");
			return;
		}
		const possede = document.getElementById("possede")?.value || "non";
		const format = document.getElementById("format")?.value || null;
		const lieu = document.getElementById("lieu")?.value || null;
		const pret = document.getElementById("pret")?.value || null;

		const recordToInsert = {
			user_id: currentUser.id,
			email: currentUser.email,
			...finalRecord,
			possede,
			format,
			lieu,
			pret
		};

		const { error } = await supabase.from("livres").insert(recordToInsert);
		if (error) {
			alert("Erreur lors de l'enregistrement : " + error.message);
			console.error(error);
		} else {
			alert("Livre enregistré avec succès !");
		}
	};
	
	// Gestion du formulaire
	form.addEventListener("submit", async function (e) {
		e.preventDefault();
		saveBtn.style.display = "none";
		document.getElementById("loader").style.display = "block";
		await fetchBookData();
		saveBtn.style.display = "block";
		document.getElementById("loader").style.display = "none";
	});
});
