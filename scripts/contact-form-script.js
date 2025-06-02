// contact-form-script.js

    const form = document.getElementById('contact-form');
    const status = document.getElementById('form-status');
  
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
  
      // anti-spam : le champ caché ne doit pas être rempli
      if (form.website.value !== "") {
        status.textContent = "Spam détecté.";
        return;
      }
  
      const payload = {
        name: form.name.value,
        email: form.email.value || null,
        subject: form.subject.value,
        message: form.message.value
      };
  
      const res = await fetch('https://dvzqvjmaavtvqzeilmcg.supabase.co/rest/v1/contact_messages', {
        method: 'POST',
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2enF2am1hYXZ0dnF6ZWlsbWNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc1OTM0OTMsImV4cCI6MjA2MzE2OTQ5M30.rZjwxo4YW6W4ZC2pvm0TGBvTLTkmSpZ8mJCOF3KAdzo',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2enF2am1hYXZ0dnF6ZWlsbWNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc1OTM0OTMsImV4cCI6MjA2MzE2OTQ5M30.rZjwxo4YW6W4ZC2pvm0TGBvTLTkmSpZ8mJCOF3KAdzo',
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(payload)
      });
  
      if (res.ok) {
        status.textContent = "Message envoyé ! Merci.";
        form.reset();
      } else {
        status.textContent = "Erreur lors de l’envoi.";
      }
    });

    // remplissage dynamique du champ Sujet
    document.addEventListener('DOMContentLoaded', () => {
      const select = document.getElementById('subject');
      const headings = document.querySelectorAll('#contrib h3');
  
      const subjects = new Set(); // pour éviter les doublons
      headings.forEach(h3 => {
        const text = h3.textContent.trim();
        if (text) subjects.add(text);
      });
  
      subjects.forEach(subject => {
        const option = document.createElement('option');
        option.value = subject;
        option.textContent = subject;
        select.appendChild(option);
      });
  
      // Ajouter l'option "Autre"
      const autreOption = document.createElement('option');
      autreOption.value = 'Autre';
      autreOption.textContent = 'Autre';
      select.appendChild(autreOption);
    });
