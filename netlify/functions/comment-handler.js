const { Client } = require('@notionhq/client');
const querystring = require('querystring');

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const notionDatabaseId = process.env.NOTION_DATABASE_ID;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: 'Method Not Allowed'
    };
  }

  try {
    // Parse form-encoded body
    const formData = querystring.parse(event.body);

    const post_id = formData.post_id;
    const commenter_name = formData.commenter_name;
    const commenter_email = formData.commenter_email;
    const comment_text = formData.comment_text;

    const comment_date = new Date().toISOString();

    const notionPayload = {
      parent: { database_id: notionDatabaseId },
      properties: {
        'post_id': { url: post_id },
        'commenter_name': { rich_text: [{ text: { content: commenter_name } }] },
        'commenter_email': { email: commenter_email },
        'comment_text': { rich_text: [{ text: { content: comment_text } }] },
        'comment_date': { date: { start: comment_date } },
        'comment_approved': { checkbox: false },
      }
    };

    await notion.pages.create(notionPayload);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Comment submitted successfully!' })
    };

  } catch (error) {
    console.error('Error submitting comment to Notion:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to submit comment.' })
    };
  }
};