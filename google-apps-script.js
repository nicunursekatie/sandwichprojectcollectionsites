// Google Apps Script for Sandwich Project Sign-In Form
// This script receives form data and adds it to a Google Sheet

function doPost(e) {
  try {
    // Parse the incoming data
    const data = JSON.parse(e.postData.contents);
    
    // Get the active spreadsheet (you'll need to replace this with your sheet ID)
    const sheet = SpreadsheetApp.getActiveSheet();
    
    // Prepare the row data
    const rowData = [
      new Date(), // Timestamp
      data.fullName || '',
      data.phoneNumber || '',
      data.groupOrganization || '',
      data.firstTime ? 'Yes' : 'No',
      data.meatCheese || 0, // This will go to "# Deli Sandwiches" column
      data.pbj || 0, // This will go to "# PBJ Sandwiches" column
      data.snacksFruit || '',
      data.date || ''
    ];
    
    // Add the data to the sheet
    sheet.appendRow(rowData);
    
    // Return success response
    return ContentService
      .createTextOutput(JSON.stringify({success: true, message: 'Data saved successfully'}))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    // Return error response
    return ContentService
      .createTextOutput(JSON.stringify({success: false, error: error.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Test function to verify the script works
function testScript() {
  const testData = {
    fullName: 'Test User',
    phoneNumber: '(555) 123-4567',
    groupOrganization: 'Test Organization',
    firstTime: true,
    meatCheese: 5, // Will go to "# Deli Sandwiches" column
    pbj: 3, // Will go to "# PBJ Sandwiches" column
    snacksFruit: 'Apples',
    date: '2024-01-15'
  };
  
  const mockEvent = {
    postData: {
      contents: JSON.stringify(testData)
    }
  };
  
  const result = doPost(mockEvent);
  console.log(result.getContent());
}
