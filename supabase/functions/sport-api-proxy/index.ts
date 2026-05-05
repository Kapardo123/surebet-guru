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
    const { endpoint, params } = await req.json()
    
    // Construct SofaScore RapidAPI URL
    const date = params?.date || new Date().toISOString().split('T')[0];
    const sport_slug = params?.sport_slug || 'football';
    
    // Construct final URL
    let finalUrl = `https://${RAPID_API_HOST}/api/sofascore/v1/${endpoint}`;
    
    if (endpoint === 'match/list') {
      finalUrl += `?date=${date}&sport_slug=${sport_slug}`;
    } else if (endpoint.includes('events/last')) {
      // No extra query params needed for this endpoint as per SofaScore structure
    } else {
      finalUrl += `?date=${date}`;
    }
    
    console.log(`[Proxy] Requesting SofaScore: ${finalUrl}`);

    const response = await fetch(finalUrl, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': RAPID_API_KEY,
        'X-RapidAPI-Host': RAPID_API_HOST,
        'Accept': 'application/json'
      }
    });

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
