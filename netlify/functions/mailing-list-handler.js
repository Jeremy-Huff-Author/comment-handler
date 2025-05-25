const { Client } = require('@notionhq/client');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const data = JSON.parse(event.body);
    const { name, email } = data;

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
        Name: {
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
          select: {
            name: 'Active', // Set the default status to Active
          },
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
      body: JSON.stringify({ message: 'Successfully added to mailing list!' }),
    };
  } catch (error) {
    console.error('Error adding to mailing list:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to add to mailing list.' }),
    };
  }
};