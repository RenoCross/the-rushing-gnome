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
	const reqs={};
	
	resultsDiv.innerHTML = "";
	jsonOutput.textContent = "";
	
	if (!isbn || selectedApis.length === 0) {
		resultsDiv.innerHTML = "<p>Veuillez entrer un ISBN et sélectionner au moins une API.</p>";
		return;
	}

	const allData = {};

	for (const api of selectedApis) {
		try {
			let data, req;
			if (api === "OpenLibrary_data") {
				req = `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`;
				const res = await fetch(req);				
				const jsonData = await res.json();
				data = jsonData[`ISBN:${isbn}`];
				jsonOutput.textContent += `\n[OpenLibrary data]\n` + JSON.stringify(data, null, 2);
			} else if (api === "OpenLibrary_details") {
				req = `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=details`;
				const res = await fetch(req);			
				const jsonData = await res.json();
				data = jsonData[`ISBN:${isbn}`];
				jsonOutput.textContent += `\n[OpenLibrary details]\n` + JSON.stringify(data, null, 2);				
			} else if (api === "GoogleBooks") {
				req = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`
				const res = await fetch(req);
				const jsonData = await res.json();
				data = jsonData.items?.[0]?.volumeInfo;
				jsonOutput.textContent += `\n[Google Books]\n` + JSON.stringify(data, null, 2);
			}
			reqs[api] = req;
			allData[api] = data || {};
		} catch (err) {
			console.error(`Erreur API ${api}:`, err);
			allData[api] = { error: "Erreur lors de la récupération des données." };
		}
	}

	renderUnifiedTable(allData, reqs);
}

function renderUnifiedTable(allData, req) {
	const resultsDiv = document.getElementById("results");
	const table = document.createElement("table");
	table.border = "1";
	table.style.marginTop = "1rem";
	
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
		"Description": d => 
			d.description 
			|| d.details?.description 
			|| "-",
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
			return link ? `<a href="${link}" target="_blank">Lire / Télécharger</a>` : "-";
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
		"Couverture": d => {
			const url_cover =
				d.cover?.medium
				|| d.cover?.large
				|| d.cover?.small
				|| d.thumbnail_url
				|| d.imageLinks?.Thumbnail			
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
				const value = fields[label].length === 2
					? fields[label](data, api)
					: fields[label](data);
				return `<td>${value}</td>`;
			} catch {
				return `<td>-</td>`;
			}
		});
		row.innerHTML = `<th>${label}</th>${cells.join("")}`;
		table.appendChild(row);
	}

	resultsDiv.appendChild(table);
}
  
});
