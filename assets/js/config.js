/**
 * Application Configuration
 * Frontend Configuration for Hongson Student Innovators WebApp
 * 
 * IMPORTANT:
 * - Public file hosted on GitHub Pages
 * - DO NOT put any secrets, passwords, or private API keys in this file
 * - Real API_URL and BRIDGE_URL will be provided in Phase 3 (Connection Gate)
 */

const APP_CONFIG = {
  // Google Apps Script Web App Deployment URL (/exec)
  API_URL: "https://script.google.com/macros/s/AKfycbzwvqvs51mg1PqNyCzB-I0prnjL6rvNORASTtz0LGBmFdjROTcdXxYzWEXPBYxdCBFk/exec",
  
  // Google Apps Script Iframe Bridge URL (Optional CORS fallback)
  BRIDGE_URL: "https://script.google.com/macros/s/AKfycbzwvqvs51mg1PqNyCzB-I0prnjL6rvNORASTtz0LGBmFdjROTcdXxYzWEXPBYxdCBFk/exec?view=bridge",
  
  // Application Branding
  APP_NAME: "Hongson Student Innovators",
  APP_SUBTITLE: "ศูนย์รวมเว็บแอปพลิเคชันและผลงานสร้างสรรค์ของนักเรียน",
  
  // Client-side image upload settings
  IMAGE_MAX_WIDTH: 1600,
  IMAGE_MAX_HEIGHT: 900,
  IMAGE_MAX_FILE_SIZE_BYTES: 5 * 1024 * 1024, // 5 MB before client-side compress
  IMAGE_OUTPUT_QUALITY: 0.82,
  
  // Placeholder image
  PLACEHOLDER_COVER: "assets/images/placeholder-cover.svg"
};

// Freeze to prevent accidental modification
Object.freeze(APP_CONFIG);
