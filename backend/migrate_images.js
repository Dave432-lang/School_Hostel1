const pool = require('./config/dbConfig');

async function assignImages() {
  try {
    const res = await pool.query('SELECT id FROM hostels ORDER BY id ASC');
    const hostels = res.rows;
    if (hostels.length === 0) {
      console.log('No hostels found in database.');
      process.exit(0);
    }

    // We have 12 images: H1.jpg to H12.jpg
    const totalImages = 12;
    const imagesPerHostel = Math.max(1, Math.floor(totalImages / hostels.length));
    
    let currentImageIndex = 1;

    for (let i = 0; i < hostels.length; i++) {
      const hostelId = hostels[i].id;
      
      const assignedImages = [];
      for (let j = 0; j < imagesPerHostel; j++) {
        if (currentImageIndex <= totalImages) {
          assignedImages.push(`../src/assets/images/PIC/H${currentImageIndex}.jpg`);
          currentImageIndex++;
        }
      }

      // If we run out of images for the last few hostels, loop back to the first image
      if (assignedImages.length === 0) {
        assignedImages.push(`../src/assets/images/PIC/H1.jpg`);
      }

      const imageUrlsJson = JSON.stringify({
        rooms: assignedImages,
        washrooms: [],
        kitchens: []
      });

      await pool.query(
        'UPDATE hostels SET image_urls = $1 WHERE id = $2',
        [imageUrlsJson, hostelId]
      );
      console.log(`Assigned [${assignedImages.join(', ')}] to Hostel ID ${hostelId}`);
    }

    // Give any leftover images to the first hostel to make its gallery huge
    if (currentImageIndex <= totalImages) {
      const extraImages = [];
      while (currentImageIndex <= totalImages) {
        extraImages.push(`../src/assets/images/PIC/H${currentImageIndex}.jpg`);
        currentImageIndex++;
      }
      
      const firstHostelId = hostels[0].id;
      const fData = await pool.query('SELECT image_urls FROM hostels WHERE id=$1', [firstHostelId]);
      const currentJson = JSON.parse(fData.rows[0].image_urls);
      currentJson.rooms = currentJson.rooms.concat(extraImages);
      await pool.query('UPDATE hostels SET image_urls = $1 WHERE id = $2', [JSON.stringify(currentJson), firstHostelId]);
      console.log(`Assigned leftovers [${extraImages.join(', ')}] to Hostel ID ${firstHostelId}`);
    }

    console.log('✅ Image migration complete! Your UI will now automatically render them.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

assignImages();
