addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  // Handle image requests from /uploads/
  if (pathname.startsWith('/uploads/')) {
    const filename = pathname.slice(9); // Remove '/uploads/' prefix
    
    // Fetch image from R2 bucket
    const object = await APRICOT_IMAGES.get(filename);
    
    if (!object) {
      return new Response('Image not found', {
        status: 404,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
    
    // Determine content type based on file extension
    const extension = filename.split('.').pop().toLowerCase();
    const contentTypeMap = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'svg': 'image/svg+xml'
    };
    
    const contentType = contentTypeMap[extension] || 'application/octet-stream';
    
    return new Response(object.body, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000' // Cache for 1 year
      }
    });
  }
  
  // Handle share requests (existing logic)
  const shareId = pathname.slice(1); // Remove leading slash
  
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
