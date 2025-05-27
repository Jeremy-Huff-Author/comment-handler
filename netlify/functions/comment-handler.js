const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const notionDatabaseId = process.env.NOTION_DATABASE_ID;

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': 'https://jeremythuff.page',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  switch (event.httpMethod) {
    case 'OPTIONS':
      return { statusCode: 204, headers, body: '' };
    case 'POST':
      return await handlePost(event, notion, notionDatabaseId, headers);
    case 'GET':
      return await handleGet(event, notion, notionDatabaseId, headers);
    default:
      return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }
};

async function handlePost(event, notion, notionDatabaseId, headers) {
  try {
    const requestBody = JSON.parse(event.body);
    const { recaptchaToken } = requestBody;

    const recaptchaSecretKey = process.env.RECAPTCHA_SECRET_KEY;

    const verificationUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${recaptchaSecretKey}&response=${recaptchaToken}`;

    const recaptchaResponse = await fetch(verificationUrl, { method: 'POST' });
    const recaptchaData = await recaptchaResponse.json();

    if (!recaptchaData.success || recaptchaData.score < 0.85) {
      console.error('reCAPTCHA verification failed:', recaptchaData);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'reCAPTCHA verification failed.' })
      };
    }

    // If reCAPTCHA verification is successful, proceed with comment submission
    const post_id = requestBody.post_id;
    const commenter_name = requestBody.name;
    const commenter_email = requestBody.email;
    const comment_text = requestBody.comment;

    const comment_date = new Date().toISOString();

    const notionPayload = {
      parent: { database_id: notionDatabaseId },
      properties: {
        'post_id': { url: post_id },
        'commenter_name': { rich_text: [{ text: { content: commenter_name } }] },
        'commenter_email': { email: commenter_email },
        'comment_text': { rich_text: [{ text: { content: comment_text } }] },
        'comment_date': { date: { start: comment_date } },
        'comment_approved': { checkbox: false }
      }
    };

    await notion.pages.create(notionPayload);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'Comment submitted successfully!' })
    };

  } catch (error) {
    console.error('Error submitting comment to Notion:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to submit comment.' })
    };
  }
}

async function handleGet(event, notion, notionDatabaseId, headers) {
  try {
    const { post_id } = event.queryStringParameters;

    if (!post_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing post_id query parameter.' })
      };
    }

    const response = await notion.databases.query({
      database_id: notionDatabaseId,
      filter: {
        property: 'post_id',
        url: { equals: post_id },
      },
    });

    const comments = response.results.map(result => {
      const properties = result.properties;
      return {
        comment: properties.comment_text.rich_text[0].text.content,
        name: properties.commenter_name.rich_text[0].text.content,
        date: properties.comment_date.date.start,
      };
    });


    return { statusCode: 200, headers, body: JSON.stringify(comments) };
  } catch (error) {
    console.error('Error fetching comments from Notion:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to fetch comments.' }) };
  }
}


