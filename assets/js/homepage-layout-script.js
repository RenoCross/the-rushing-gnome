// homepage-layout-script.js

    // image à côté du poème aléatoire
    document.addEventListener('DOMContentLoaded', function () {
      const gnomeImages = ['nain.jpeg', 'gnome_ChatGPT.jpeg', 'gnome_ChatGPT2.jpg', 'gnome_ChatGPT3.jpg', 'gnome_deviantart1.jpg', 'gnome_deviantart2.jpg'];
      const chosenImage = gnomeImages[Math.floor(Math.random() * gnomeImages.length)];
      const imageElement = document.createElement('img');
      imageElement.src = `/the-rushing-gnome/assets/images/${chosenImage}`;
      imageElement.alt = 'Rushing Gnome';
      imageElement.style.maxWidth = '180px';
      imageElement.style.borderRadius = '8px';
      imageElement.style.boxShadow = '0 0 6px rgba(0, 0, 0, 0.2)';
      imageElement.style.flexShrink = '0';
  
      document.getElementById('gnome-image').appendChild(imageElement);
    });
