/**
 * Cloudflare Worker Configuration for Apricot Shared Spaces
 * 
 * This file provides instructions and implementation code for setting up a
 * Cloudflare Worker to host shared Apricot spaces. The worker uses Cloudflare KV
 * to store and serve the static HTML content of shared spaces.
 */

/**
 * SETUP INSTRUCTIONS
 * 
 * 1. Create a Cloudflare account if you don't have one (https://dash.cloudflare.com/sign-up)
 * 
 * 2. Set up a Worker:
 *    - Go to Workers & Pages in the Cloudflare dashboard
 *    - Create a new Worker (choose a name like "apricot-share")
 * 
 * 3. Create a KV Namespace:
 *    - Go to Workers → KV in the Cloudflare dashboard
 *    - Create a new namespace (name it "APRICOT_SHARES")
 *    - Bind this namespace to your worker under the name "APRICOT_SHARES"
 * 
 * 4. Create an API Token:
 *    - Go to My Profile → API Tokens in the Cloudflare dashboard
 *    - Create a token with the following permissions:
 *      • Worker Scripts:Edit
 *      • Workers KV Storage:Edit
 *    - Save this token to use in your server code
 * 
 * 5. Update Your Server:
 *    - Install the Cloudflare API client: npm install @cloudflare/wrangler
 *    - Replace the placeholder code in the /api/share endpoint with the actual implementation
 *    - Set your Cloudflare account ID and API token as environment variables
 */

/**
 * WORKER CODE
 * This is the code to paste into your Cloudflare Worker
 */
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  const shareId = url.pathname.slice(1); // Remove leading slash
  
  // Handle root path or empty shareId
  if (!shareId || shareId === '') {
    return new Response('Apricot Shared Spaces', {
      headers: { 'Content-Type': 'text/plain' }
    });
  }
  
  // Fetch the shared canvas HTML from KV storage
  const sharedHtml = await APRICOT_SHARES.get(shareId, { type: 'text' });
  
  if (!sharedHtml) {
    return new Response('Shared space not found', {
      status: 404,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
  
  // Return the saved HTML content
  return new Response(sharedHtml, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}

/**
 * SERVER-SIDE INTEGRATION CODE
 * 
 * This is how your server should integrate with Cloudflare
 * Replace the placeholder code in your /api/share endpoint with this
 */
/*
// Add these to your server.js dependencies
const fetch = require('node-fetch');

// API endpoint for sharing to Cloudflare
app.post('/api/share', async (req, res) => {
  try {
    const { canvasId, name, htmlContent } = req.body;
    
    // Generate a unique identifier for the shared canvas
    const shareId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    
    // Cloudflare account details - store these as environment variables
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;
    const namespaceId = process.env.CLOUDFLARE_KV_NAMESPACE_ID; // Get this from KV dashboard
    
    // Upload the HTML content to Cloudflare KV
    const kvUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/values/${shareId}`;
    
    const uploadResponse = await fetch(kvUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'text/html'
      },
      body: htmlContent
    });
    
    const uploadResult = await uploadResponse.json();
    
    if (!uploadResult.success) {
      throw new Error('Failed to upload content to Cloudflare');
    }
    
    // Get your worker's domain from environment variables
    const workerDomain = process.env.CLOUDFLARE_WORKER_DOMAIN;
    const shareUrl = `https://${workerDomain}/${shareId}`;
    
    // Return the share URL
    res.json({
      success: true,
      shareId: shareId,
      shareUrl: shareUrl
    });
  } catch (error) {
    console.error('Error sharing canvas:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
*/

/**
 * SECURITY CONSIDERATIONS
 * 
 * 1. Rate Limiting:
 *    - Implement rate limiting on the /api/share endpoint to prevent abuse
 *    - Consider adding Cloudflare rate limiting rules
 * 
 * 2. Content Validation:
 *    - Validate HTML content before uploading
 *    - Consider scanning for malicious content
 * 
 * 3. API Token Security:
 *    - Store API tokens as environment variables, never hardcode them
 *    - Use the principle of least privilege when creating API tokens
 * 
 * 4. CORS Configuration:
 *    - Configure appropriate CORS headers in your worker if needed
 */