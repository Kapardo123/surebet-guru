import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RAPID_API_KEY = "fc0296157dmsh5bde502e15c007ap161035jsn820607c5daf7"
const RAPID_API_HOST = "sofascore6.p.rapidapi.com"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: {
        ...corsHeaders,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      } 
    })
  }

  try {
    const payload = await req.json()
    const { endpoint, params, isImage } = payload
    
    if (isImage) {
      console.log(`[Proxy] Fetching image from: ${endpoint}`);
      const imgRes = await fetch(endpoint, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          'Accept-Language': 'pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7',
          'Referer': 'https://www.sofascore.com/',
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!imgRes.ok) {
        console.error(`[Proxy] Image fetch failed with status: ${imgRes.status}`);
        return new Response(JSON.stringify({ error: `Image fetch failed: ${imgRes.status}` }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: imgRes.status,
        });
      }

      const arrayBuffer = await imgRes.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);
      
      return new Response(JSON.stringify({ 
        base64, 
        contentType: imgRes.headers.get('Content-Type') || 'image/png' 
      }), {
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=86400'
        },
        status: 200,
      });
    }

    // Construct SofaScore RapidAPI URL
    const date = params?.date || new Date().toISOString().split('T')[0];
    const sport_slug = params?.sport_slug || 'football';
    
    // Construct final URL with all parameters
    let finalUrl = `https://${RAPID_API_HOST}/api/sofascore/v1/${endpoint}?date=${date}`;
    
    if (endpoint === 'match/list') {
      finalUrl += `&sport_slug=${sport_slug}`;
    }
    
    console.log(`[Proxy] Requesting: ${finalUrl}`);

    const response = await fetch(finalUrl, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': RAPID_API_KEY,
        'X-RapidAPI-Host': RAPID_API_HOST,
        'Accept': 'application/json'
      }
    });

    const responseText = await response.text();
    console.log(`[Proxy] Status: ${response.status}`);
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error(`[Proxy] JSON Parse Error: ${e.message}`);
      data = { error: "Parse error", raw: responseText.substring(0, 1000) };
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: response.status,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
