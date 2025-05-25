const { Client } = require('@notionhq/client');
const fetch = require('node-fetch');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    // Handle OPTIONS requests for CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': 'https://jeremythuff.page',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      };
    }
    return { statusCode: 405, body: 'Method Not Allowed', headers: { 'Access-Control-Allow-Origin': 'https://jeremythuff.page' } };
  }

  try {
    const data = JSON.parse(event.body);
    const { name, email, recaptchaToken } = data;

    // reCAPTCHA verification
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    const verificationUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${recaptchaToken}`;

    const recaptchaResponse = await fetch(verificationUrl, {
      method: 'POST',
    });

    const recaptchaData = await recaptchaResponse.json();

    if (!recaptchaData.success || recaptchaData.score < 0.5) {
      console.error('reCAPTCHA verification failed:', recaptchaData);
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': 'https://jeremythuff.page',
        },
        body: JSON.stringify({ error: 'reCAPTCHA verification failed.' }),
      };
    }
    
    if (!name || !email) {
      return { statusCode: 400, body: 'Missing name or email' };
    }

    const notion = new Client({ auth: process.env.NOTION_API_KEY });
    const databaseId = process.env.NOTION_MAILING_LIST_DATABASE_ID;

    await notion.pages.create({
      parent: {
        database_id: databaseId,
      },
      properties: {
        'Contact Name': {
          title: [
            {
              text: {
                content: name,
              },
            },
          ],
        },
        'Email Address': { // Use the exact column name from the CSV
          email: email,
        },
        'Status': { // Add the Status property
          'status': { name: 'Active' }, // Set the default status to Active
        },
      },
      // Ensure other properties from your Notion database are included here if required and have default values set in Notion
      // For example, if you have a "Created At" date field, you might need to add:
      'Created At': {
        date: {
          start: new Date().toISOString(),
        }
      }
    });

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': 'https://jeremythuff.page',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: JSON.stringify({ message: 'Successfully added to mailing list!' }),
    };
  } catch (error) {
    console.error('Error adding to mailing list:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': 'https://jeremythuff.page',
      },
      body: JSON.stringify({ error: 'Failed to add to mailing list.' }),
    };
  }
};