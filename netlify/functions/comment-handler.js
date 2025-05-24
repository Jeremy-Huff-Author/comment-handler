// netlify/functions/your-function-name.js
const { Client } = require('@notionhq/client');

// Initialize Notion client with API key from environment variables
const notion = new Client({ auth: process.env.NOTION_API_KEY });

// Replace with your Notion Database ID from environment variables
const notionDatabaseId = process.env.NOTION_DATABASE_ID;

exports.handler = async (event, context) => {
  // Check if the request is a POST request
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405, // Method Not Allowed
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    // Parse the form data from the request body
    const formData = new URLSearchParams(event.body);
    const post_id = formData.get('post_id');
    const commenter_name = formData.get('commenter_name');
    const commenter_email = formData.get('commenter_email');
    const comment_text = formData.get('comment_text');

    // Get the current date and time in ISO 8601 format
    const comment_date = new Date().toISOString();

    // Construct the payload for the Notion API
    const notionPayload = {
      parent: { database_id: notionDatabaseId },
      properties: {
        'post_id': { url: post_id },
        'commenter_name': { rich_text: [{ text: { content: commenter_name } }] },
        'commenter_email': { email: commenter_email },
        'comment_text': { rich_text: [{ text: { content: comment_text } }] },
        'comment_date': { date: { start: comment_date } },
        'comment_approved': { checkbox: false },
      },
    };

    // Send the payload to the Notion database
    await notion.pages.create(notionPayload);

    return {
      statusCode: 200, // OK
      body: JSON.stringify({ message: 'Comment submitted successfully!' }),
    };
  } catch (error) {
    console.error('Error submitting comment to Notion:', error);
    return {
      statusCode: 500, // Internal Server Error
      body: JSON.stringify({ error: 'Failed to submit comment.' }),
    };
  }
};