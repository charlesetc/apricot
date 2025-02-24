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