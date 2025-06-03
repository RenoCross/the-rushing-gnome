// isbn-script.js

// Attendre que le DOM soit prêt
document.addEventListener("DOMContentLoaded", function () {
	const form = document.getElementById("isbn-form");

	form.addEventListener("submit", async function (e) {
		e.preventDefault();
		document.getElementById("loader").style.display = "block";
		await fetchBookData();
		document.getElementById("loader").style.display = "none";
	});

	async function fetchBookData() {
		const isbn = document.getElementById("isbn").value.trim();
		const selectedApis = Array.from(document.querySelectorAll('input[name="api"]:checked')).map(input => input.value);
		const resultsDiv = document.getElementById("results");
		const jsonOutput = document.getElementById("jsonOutput");
		resultsDiv.innerHTML = "";
		jsonOutput.textContent = "";
		if (!isbn || selectedApis.length === 0) {
			resultsDiv.innerHTML = "<p>Veuillez entrer un ISBN et sélectionner au moins une API.</p>";
			return;
		}
		for (const api of selectedApis) {
			let data;
			try {
				if (api === "openlibrary") {
					const res = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`);
					const jsonData = await res.json();
					data = jsonData[`ISBN:${isbn}`];
					jsonOutput.textContent += `\n[OpenLibrary - Raw result]\n` + JSON.stringify(jsonData, null, 2) + ` <br>` ;
					jsonOutput.textContent += `\n[OpenLibrary]\n` + JSON.stringify(data, null, 2);
				} else if (api === "google") {
					const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`);
					const jsonData = await res.json();
					data = jsonData.items?.[0]?.volumeInfo;
					jsonOutput.textContent += `\n[Google Books - Raw result]\n` + JSON.stringify(jsonData, null, 2) + ` <br>` ;
					jsonOutput.textContent += `\n[Google Books]\n` + JSON.stringify(data, null, 2);					
				} else if (api === "isbndb") {
					const res = await fetch(`https://api.isbndb.com/book/${isbn}`, {
						headers: {
							"Authorization": "YOUR_ISBNDB_API_KEY"
						}
					});
					const json = await res.json();
					data = json.book;
					jsonOutput.textContent += `\n[ISBNdb]\n` + JSON.stringify(data, null, 2);
				}

				if (data) {
					renderTable(api, data);
				} else {
					renderError(api, "Aucune donnée trouvée.");
				}
			} catch (err) {
				console.error(`Erreur API ${api}:`, err);
				renderError(api, "Erreur lors de la récupération des données.");
			}
		}
	}

	function renderTable(api, book) {
		const resultsDiv = document.getElementById("results");
		const table = document.createElement("table");
		table.border = "1";
		table.style.marginTop = "1rem";
		table.innerHTML = `
			<caption><strong>Résultats via ${api}</strong></caption>
   			<tr><th>ISBN</th><td>${book.identifiers?.isbn_13?.[0] || book.industryIdentifiers.map(a => a.identifier).join(", ") || "-"}</td></tr>
			<tr><th>Titre</th><td>${book.title || "-"}</td></tr>
			<tr><th>Sous-titre</th><td>${book.subtitle || "-"}</td></tr>   
			<tr><th>Auteur</th><td>${(book.authors.map(a => a.name).join(", ") || book.authors?.[0] || "-")}</td></tr>
			<tr><th>Éditeur</th><td>${book.publishers?.[0]?.name || book.publisher || "-"}</td></tr>
			<tr><th>Date</th><td>${book.publish_date || book.publishedDate || "-"}</td></tr>
			<tr><th>Description</th><td>${book.description || "-"}</td></tr>
			<tr><th>Nombre de pages</th><td>${book.number_of_pages || book.pageCount || "-"}</td></tr>
			<tr><th>Type d'impression</th><td>${book.number_of_pages || book.printType || "-"}</td></tr>
   			<tr><th>Langue</th><td>${book.number_of_pages || book.language || "-"}</td></tr>
			<tr><th>URL</th><td><a href="${book.url || book.url || '-'}">${book.url || book.url || "-"}</a></td></tr>
			<tr><th>ID</th><td>${book.key || book.key || "-"}</td></tr>
			<tr><th>Cover</th><td><img src="${book.cover.medium || ''}" alt="medium cover"></td></tr>
			`;
		resultsDiv.appendChild(table);
	}

	function renderError(api, message) {
		const resultsDiv = document.getElementById("results");
		const error = document.createElement("p");
		error.innerHTML = `<strong>${api}</strong> : ${message}`;
		error.style.color = "red";
		resultsDiv.appendChild(error);
	}
  
});
