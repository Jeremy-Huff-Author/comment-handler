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
      property: 'Publication Date',
      date: {
                on_or_before: currentDate,
      },
    }
  }

  // Query the Notion database

  const response = await notion.databases.query({
    database_id: databaseId,
    filter
  });

  // Process the results to fetch block content if a specific post_id was requested
 let blogPosts = [];
 if (response.results && response.results.length > 0) {
    blogPosts = await Promise.all(response.results.map(async (page) => {
    const pageId = page.id;
    const properties = page.properties;
    let post_id = null;
    if (properties.post_id && properties.post_id.rich_text && properties.post_id.rich_text.length > 0) {
      post_id = properties.post_id.rich_text[0].plain_text;
    }

    let content = '';
    if(!event.queryStringParameters.post_id) {
      // Fetch blocks for the specific post requested
      const blocksResponse = await notion.blocks.children.list({
        block_id: pageId,
        page_size: 100, // Adjust page size as needed
      });
      console.log("blocksResponse", blocksResponse);
      // Placeholder for markdown conversion logic
      // Convert Notion blocks to Markdown
      content = blocksResponse.results.map(block => { // Use map for initial transformation
        let blockContent = '';
        switch (block.type) {
          case 'paragraph':
            blockContent = block.paragraph.rich_text.map(rt => rt.plain_text).join('');
            break;
          case 'heading_1':
            blockContent = '# ' + block.heading_1.rich_text.map(rt => rt.plain_text).join('');
            break;
          case 'heading_2':
            blockContent = '## ' + block.heading_2.rich_text.map(rt => rt.plain_text).join('');
            break;
          case 'heading_3':
            blockContent = '### ' + block.heading_3.rich_text.map(rt => rt.plain_text).join('');
            break;
          case 'bulleted_list_item':
            blockContent = '* ' + block.bulleted_list_item.rich_text.map(rt => rt.plain_text).join('');
            break;
          case 'numbered_list_item':
            // Basic numbering, doesn't handle nested lists
            blockContent = '1. ' + block.numbered_list_item.rich_text.map(rt => rt.plain_text).join('');
            break;
          case 'to_do':
            blockContent = `- [${block.to_do.checked ? 'x' : ' '}] ` + block.to_do.rich_text.map(rt => rt.plain_text).join('');
            break;
          case 'quote':
            blockContent = '> ' + block.quote.rich_text.map(rt => rt.plain_text).join('');
            break;
          case 'image':
            const imageUrl = block.image.external?.url || block.image.file?.url;
            if (imageUrl) {
              blockContent = `![Image](${imageUrl})`;
            }
            break;
          case 'code':
            const codeContent = block.code.rich_text.map(rt => rt.plain_text).join('');
            const codeLanguage = block.code.language || '';
            blockContent = ''
        }
        // Add more block type conversions here
        return blockContent; // Handle other block types or skip
      }).join('\n\n'); // Join paragraphs with double newline
    }
    
    return {
      post_id,
      Name: properties.Name.title[0]?.plain_text || '',
      publicationDate: properties["Publication Date"].date?.start || '',
      summary: properties.Summary.rich_text[0]?.plain_text || '',
      coverImage: page.cover?.file?.url || '', 
      customStyles: properties['Custom Styles']?.rich_text[0]?.plain_text || '', 
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
