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

	const allData = {};

	for (const api of selectedApis) {
		try {
			let data;
			if (api === "OpenLibrary_data") {
				const req = "`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`"
				const res = await fetch(req);				
				const jsonData = await res.json();
				data = jsonData[`ISBN:${isbn}`];
				jsonOutput.textContent += `\n[OpenLibrary]\n` + JSON.stringify(data, null, 2);
			} else if (api === "OpenLibrary_details") {
				const req = "`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=details`"
				const res = await fetch(req);			
				const jsonData = await res.json();
				data = jsonData[`ISBN:${isbn}`];
				jsonOutput.textContent += `\n[OpenLibrary details]\n` + JSON.stringify(data, null, 2);				
			} else if (api === "GoogleBooks") {
				const req = "`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`"
				const res = await fetch(req);
				const jsonData = await res.json();
				data = jsonData.items?.[0]?.volumeInfo;
				jsonOutput.textContent += `\n[Google Books]\n` + JSON.stringify(data, null, 2);
			} else if (api === "ISBNdb") {
				const res = await fetch(`https://api.isbndb.com/book/${isbn}`, {
					headers: {
						"Authorization": "YOUR_ISBNDB_API_KEY"
					}
				});
				const json = await res.json();
				data = json.book;
				jsonOutput.textContent += `\n[ISBNdb]\n` + JSON.stringify(data, null, 2);
			}

			allData[api] = data || {};
		} catch (err) {
			console.error(`Erreur API ${api}:`, err);
			allData[api] = { error: "Erreur lors de la récupération des données." };
		}
	}

	renderUnifiedTable(allData);
}

function renderUnifiedTable(allData, req) {
	const resultsDiv = document.getElementById("results");
	const table = document.createElement("table");
	table.border = "1";
	table.style.marginTop = "1rem";

	// Entêtes
	const headerRow = document.createElement("tr");
	headerRow.innerHTML = `<th>Champ</th>${Object.keys(allData).map(api => `<th>${api}</th>`).join("")}`;
	table.appendChild(headerRow);

	const fields = {
		"Requête": d => d.title || d.details?.title || "-",		
		//"ISBN": d => d.identifiers?.isbn_13 || d.details?.isbn_13 || d.details?.identifiers?.isbn_13 || d.industryIdentifiers?.map(a => a.identifier).join(", ") || "-",
		"ISBN": d =>
			d.details?.isbn_13
			|| (Array.isArray(d.details?.isbn_13) ? d.details.isbn_13.join(", ") : d.details?.isbn_13)
			|| d.industryIdentifiers?.map(a => a.identifier).join(", ") 
			|| "-",
		"Titre": d => d.title || d.details?.title || "-",
		"Sous-titre": d => d.subtitle || d.details?.subtitle || "-",
		"Auteur": d => d.authors?.map(a => a.name).join(", ") || d.details?.authors?.map(a => a.name).join(", ") || d.authors?.[0] || "-",
		"Éditeur": d => d.publishers?.[0]?.name || d.details?.publishers || d.publisher || "-",
		"Lieu d'édition": d => d.publish_places || d.details?.publish_places || "-",		
		"Date": d => d.publish_date || d.details?.publish_date || d.publishedDate || "-",
		"Description": d => d.description || d.details?.description || "-",
		"Pages": d => d.number_of_pages || d.details?.number_of_pages || d.pageCount || "-",
		"Type d'impression": d => d.details?.physical_format || d.printType || "-",
		//"Langue": d => d.language || d.details?.language || "-",
		"Library of Congress Classification": d => d.classifications?.lc_classifications || d.details?.lc_classifications || "-",	
		"Classification décimale Dewey": d => d.classifications?.dewey_decimal_class || d.details?.dewey_decimal_class || "-"		
		//"ID": d => d.key || d.details?.key || d.id || "-"
		//"URL": d => d.url ? `<a href="${d.url}">${d.url}</a>` || "-",
		//"Couverture": d => `<img src="${d.cover.small}" alt="cover">` ||  `<img src="${d.details.thumbnail_url}" alt="cover">` || "-"
	};

	for (const label in fields) {
		const row = document.createElement("tr");
		const cells = Object.entries(allData).map(([api, data]) => {
			if (data?.error) return `<td style="color:red;">${data.error}</td>`;
			return `<td>${fields[label](data)}</td>`;
		});
		row.innerHTML = `<th>${label}</th>${cells.join("")}`;
		table.appendChild(row);
	}

	resultsDiv.appendChild(table);
}


	function renderTable(api, book) {
		const resultsDiv = document.getElementById("results");
		const table = document.createElement("table");
		table.border = "1";
		table.style.marginTop = "1rem";
		table.innerHTML = `
			<caption><strong>Résultats via ${api}</strong></caption>
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
