// ════════════════════════════════════════════════════════════════════════════════
// GOOGLE APPS SCRIPT - Auto-Append Signup Data to Google Sheets (OPTIONAL)
// ════════════════════════════════════════════════════════════════════════════════
//
// INSTRUCTIONS:
// 1. Go to: script.google.com
// 2. Create a NEW project
// 3. Paste this entire code
// 4. Save project
// 5. Click "Deploy" → "New Deployment" → "Web app"
// 6. Select "Execute as: Your Account"
// 7. Select "Who has access: Anyone"
// 8. Copy the Deployment URL
// 9. Replace in HTML: line ~200, update the fetch URL
//
// ════════════════════════════════════════════════════════════════════════════════

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = SpreadsheetApp.getActiveSheet();
    
    // Add data to next empty row
    sheet.appendRow(data);
    
    return ContentService
      .createTextOutput(JSON.stringify({success: true}))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch(error) {
    return ContentService
      .createTextOutput(JSON.stringify({success: false, error: error.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// ALTERNATIVE METHOD - If using Google Forms
// ════════════════════════════════════════════════════════════════════════════════

/*
// Create a Google Form with fields:
// 1. user_id (Short answer)
// 2. email (Email)
// 3. password (Short answer)
// 4. name (Short answer)
// 5. phone_number (Short answer)

// The form will auto-populate the linked Google Sheet
// No Apps Script needed with this method!

// Setup:
// 1. Create Google Form
// 2. Add fields matching the order above
// 3. Form → Responses → Create Spreadsheet
// 4. Share the sheet's public CSV URL
*/

// ════════════════════════════════════════════════════════════════════════════════
// UPDATED HTML CODE (Replace in your HTML file)
// ════════════════════════════════════════════════════════════════════════════════

/*

// OLD CODE (Line 200):
const GOOGLE_SHEET_URL='https://docs.google.com/spreadsheets/d/e/2PACX-1vRT7RbhqPpuPpaHNJrvr3_d9ftFnjjKir81vaQM4JrfkRp1iHlFMTj1U4-HTmfyNNwJjPhJgWJYnE_G/pub?output=csv'

// REPLACE WITH NEW CODE:
const GOOGLE_SHEET_URL='https://docs.google.com/spreadsheets/d/e/2PACX-1vRT7RbhqPpuPpaHNJrvr3_d9ftFnjjKir81vaQM4JrfkRp1iHlFMTj1U4-HTmfyNNwJjPhJgWJYnE_G/pub?output=csv'
const GOOGLE_APPS_SCRIPT_URL='YOUR_DEPLOYMENT_URL_HERE' // From step 8 above

// Then update appendToSheet function (Line 700-720):

async function appendToSheet(data){
  try{
    await fetch(GOOGLE_APPS_SCRIPT_URL,{
      method:'POST',
      body:JSON.stringify(data),
      headers:{'Content-Type':'application/json'}
    })
  }catch(err){
    console.error('Sheet append note: Direct append requires Google Apps Script deployment',err)
  }
}

*/

// ════════════════════════════════════════════════════════════════════════════════
// SECURITY RECOMMENDATIONS
// ════════════════════════════════════════════════════════════════════════════════

/*

FOR PRODUCTION USE:

1. REMOVE Plain Text Passwords:
   - Use bcryptjs library
   - Hash passwords before storing
   - Never store plain passwords

2. Move to Firebase:
   ```javascript
   // Instead of Google Sheets, use Firebase Auth + Firestore
   import { initializeApp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js";
   import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";
   
   const firebaseConfig = {
     apiKey: "YOUR_API_KEY",
     authDomain: "your-project.firebaseapp.com",
     projectId: "your-project-id",
     storageBucket: "your-project.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abcdef123456"
   };
   
   const app = initializeApp(firebaseConfig);
   const auth = getAuth(app);
   ```

3. Enable HTTPS:
   - Always use SSL/TLS
   - Buy SSL certificate (Let's Encrypt is free)

4. Add Rate Limiting:
   - Prevent brute force login attempts
   - Limit signup requests

5. Email Verification:
   - Send verification email
   - Require email confirmation

6. 2FA (Two-Factor Authentication):
   - SMS or authenticator app
   - Extra security layer

7. Password Strength:
   - Require minimum 12 characters
   - Mix of upper, lower, numbers, symbols
   - Check against common passwords

8. Session Management:
   - Implement JWT tokens
   - Set expiration times
   - Refresh tokens

*/

// ════════════════════════════════════════════════════════════════════════════════
// TESTING THE INTEGRATION
// ════════════════════════════════════════════════════════════════════════════════

/*

MANUAL TESTING:

1. Open HTML file
2. Click "Sign Up"
3. Enter test data:
   - Name: Test User
   - Email: test@example.com
   - Phone: +91-9876543210
   - Password: Test@123

4. Click "Sign Up"

5. Check your Google Sheet:
   - Should see new row with data
   - user_id: USR[timestamp]
   - Other columns populated

6. Try to sign up again with same email:
   - Should get error "Email already registered"

7. Switch to Login tab
8. Enter same email & password
9. Should log in successfully

*/

// ════════════════════════════════════════════════════════════════════════════════
// TROUBLESHOOTING GOOGLE APPS SCRIPT DEPLOYMENT
// ════════════════════════════════════════════════════════════════════════════════

/*

If getting CORS errors:

1. Deploy as Web app (not just save)
2. Select "Execute as: Your Account"
3. Select "Who has access: Anyone"
4. Copy the deployment URL (not the script editor URL)

Example correct URL format:
https://script.google.com/macros/s/[SCRIPT_ID]/usercache

Wrong URL (script editor):
https://script.google.com/home/my?projects=[PROJECT_ID]

If still getting errors:
1. Check browser console (F12)
2. Verify deployment URL is correct
3. Check that sheet is in the script's account
4. Try with a simpler test first

*/

// ════════════════════════════════════════════════════════════════════════════════
// IMPORTANT: CURRENT SETUP
// ════════════════════════════════════════════════════════════════════════════════

/*

THE HTML FILE ALREADY INCLUDES:

✅ Google Sheets CSV Reading
   - Reads existing users from published CSV
   - Works without Apps Script

⚠️ Google Sheets CSV Writing (Limited)
   - Direct write to Google Sheets is blocked by Google
   - Fallback: Data is validated but not auto-appended

SOLUTION OPTIONS:

Option 1: Use Google Forms (RECOMMENDED for beginners)
   - Create Google Form
   - Link to spreadsheet
   - Form submissions auto-populate sheet
   - No code needed!

Option 2: Use Google Apps Script (this file)
   - More control
   - More complex setup
   - Requires deployment

Option 3: Use Firebase (RECOMMENDED for production)
   - Most secure
   - Best performance
   - Easiest to scale

Option 4: Use Backend Server
   - PHP, Node.js, Python
   - Full control
   - Most secure
   - Requires hosting

*/

// ════════════════════════════════════════════════════════════════════════════════
// QUICK SETUP USING GOOGLE FORMS (EASIEST)
// ════════════════════════════════════════════════════════════════════════════════

/*

STEPS:

1. Go to forms.google.com
2. Create new form
3. Title: "Timetable Generator Signup"
4. Add these questions:
   
   Q1: "User ID" (Short answer)
   Q2: "Email" (Email)
   Q3: "Password" (Short answer)
   Q4: "Full Name" (Short answer)
   Q5: "Phone Number" (Short answer)

5. Click "Responses" tab
6. Click spreadsheet icon → Create new spreadsheet
7. This creates a linked Google Sheet
8. Any form submission auto-populates the sheet
9. Share the sheet's CSV link

ADVANTAGES:
✅ No coding needed
✅ Auto-populates sheet
✅ Built-in validation
✅ Prevents duplicates (optional)
✅ Email notifications

DISADVANTAGES:
❌ Shows form page to users
❌ Less control over design
❌ Limited customization

*/

// ════════════════════════════════════════════════════════════════════════════════
// FILE STRUCTURE SUMMARY
// ════════════════════════════════════════════════════════════════════════════════

/*

FILES PROVIDED:

1. enhanced_timetable.html
   - Main application file
   - Includes everything in one file
   - No dependencies
   - Just open in browser

2. SETUP_GUIDE.md
   - Detailed setup instructions
   - Troubleshooting tips
   - Security recommendations
   - Data structure info

3. QUICK_START.md
   - Quick reference guide
   - Test credentials
   - Key changes from original
   - Checklists

4. GOOGLE_APPS_SCRIPT.js (this file)
   - Optional advanced setup
   - Auto-append script
   - Security improvements
   - Deployment instructions

WHAT YOU NEED:
- Just: enhanced_timetable.html
- Plus: Your Google Sheet (with public CSV)

OPTIONAL:
- Google Apps Script (for auto-append)
- Firebase setup (for production)

*/
