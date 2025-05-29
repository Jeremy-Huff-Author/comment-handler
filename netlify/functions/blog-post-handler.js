// Import the Notion Client
const { Client } = require('@notionhq/client');

// Main handler function for the Netlify function
exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': 'https://jeremythuff.page',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  // Initialize the Notion Client with the API key from environment variables
  const notion = new Client({ auth: process.env.NOTION_API_KEY });
  // Get the Notion database ID for blog posts from environment variables
  const databaseId = process.env.NOTION_BLOG_DATABASE_ID;

  // Get the current date in YYYY-MM-DD format
  const currentDate = new Date().toISOString().split('T')[0];

  // Extract the 'post_id' from the query string parameters
  const { post_id } = event.queryStringParameters;

  // Define the filter for the Notion database query
  let filter;
  if (post_id) {
    filter = {
      and: [
        {
          property: 'post_id',
          rich_text: {
            equals: post_id,
          },
        },
        {
          property: 'Publication Date',
          date: {
            on_or_before: currentDate,
          },
        },
      ],
    };
  } else {
    filter = {
      database_id: databaseId,
      filter: {
        property: 'Publication Date',
        date: {
          on_or_before: currentDate
        },
      },
    }
  }

  // Query the Notion database

  const response = await notion.databases.query({
    database_id: databaseId,
    filter
  });

  console.log('Notion API Response:', JSON.stringify(response, null, 2)); // Log the Notion API response

  // Process the results to fetch block content if a specific post_id was requested
 let blogPosts = [];
 if (response.results && response.results.length > 0) {
    blogPosts = await Promise.all(response.results.map(async (page) => {
    // console.log('Post object:', JSON.stringify(page, null, 2)); // Add this line to log the post object
    const pageId = page.id;
    const properties = page.properties;
    let post_id = null;
    if (properties.post_id && properties.post_id.rich_text && properties.post_id.rich_text.length > 0) {
      post_id = properties.post_id.rich_text[0].plain_text;
    }

    let content = '';
    if (post_id && post_id === event.queryStringParameters.post_id) {
      // Fetch blocks for the specific post requested
      const blocksResponse = await notion.blocks.children.list({
        block_id: pageId,
        page_size: 100, // Adjust page size as needed
      });

      // Placeholder for markdown conversion logic
      // You'll need to iterate through blocksResponse.results
      // and convert different block types (paragraph, heading, image, etc.) to markdown
      content = blocksResponse.results.map(block => {
        if (block.type === 'paragraph' && block.paragraph.rich_text.length > 0) {
          return block.paragraph.rich_text[0].plain_text;
        }
        // Add more block type conversions here
        return ''; // Handle other block types or skip
      }).join('\n\n'); // Join paragraphs with double newline

    }

    return {
      id: pageId,
      Name: properties.Name.title[0]?.plain_text || '',
      post_id: post_id,
      "Publication Date": properties["Publication Date"].date?.start || '',
      Summary: properties.Summary.rich_text[0]?.plain_text || '',
      "Featured Image": properties["Featured Image"].files[0]?.external?.url || properties["Featured Image"].files[0]?.file?.url || '',
      content: content, // Include the fetched content
    };
  }));
 }

  // Handle the response based on whether a specific post_id was requested
  if (post_id && blogPosts.length > 0) {
    return {
      statusCode: 200,
      headers,
      // Stringify the first element (the matching post)
      body: JSON.stringify(blogPosts[0]),
    };
  } else if(blogPosts.length > 0) {
    return {
      statusCode: 200,
      headers,
      // Return all processed blog posts
      body: JSON.stringify(blogPosts),
    };
  } else {
    // If no blog posts were found (either for a specific ID or in general)
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ message: "No blog post(s) found" }),
    };
  }

}
