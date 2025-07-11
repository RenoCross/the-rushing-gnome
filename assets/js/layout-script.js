// layout-script.js

document.addEventListener('DOMContentLoaded', function() {
	const collapsibles = document.querySelectorAll('.collapsible');
	collapsibles.forEach(header => {
		header.addEventListener('click', function () {
			this.classList.toggle('active');
			const content = this.nextElementSibling;
			if (content.style.display === "block") {
				content.style.display = "none";
			} else {
				content.style.display = "block";
			}
		});
	});
});
