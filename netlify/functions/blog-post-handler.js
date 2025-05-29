// Import the Notion Client
const { Client } = require('@notionhq/client');

// Main handler function for the Netlify function
exports.handler = async (event, context) => {
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

  const blogPosts = response.results.map(page => {
    // Map the results from Notion to a more usable format
    const properties = page.properties;
    return {
      Name: properties.Name.title[0]?.plain_text || '',
      post_id: properties.post_id.rich_text[0]?.plain_text || '',
      "Publication Date": properties["Publication Date"].date?.start || '',
      Summary: properties.Summary.rich_text[0]?.plain_text || '',
      "Featured Image": properties["Featured Image"].files[0]?.external?.url || properties["Featured Image"].files[0]?.file?.url || '',
    };
  });

  // Handle the response based on whether a specific post_id was requested
  if (post_id && blogPosts.length > 0) {
    // If a post_id was provided and a matching post was found, return the single post
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      // Stringify the first element (the matching post)
      body: JSON.stringify(blogPosts[0]),
    };
  } else if(blogPosts.length > 0) {
    // If no post_id was provided and blog posts were found, return all blog posts
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      // Stringify the array of blog posts
      body: JSON.stringify(blogPosts),
    };
  } else {
    // If no blog posts were found (either for a specific ID or in general)
    return {
      statusCode: 404,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: "No blog post(s) found" }),
    };
  }

}
