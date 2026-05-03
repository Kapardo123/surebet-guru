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
    const { endpoint, params, provider } = payload
    
    // Default config
    let host = RAPID_API_HOST;
    let baseUrl = `https://${RAPID_API_HOST}/api/sofascore/v1`;
    
    // Switch provider if requested (e.g., for logos)
    if (provider === 'api-football') {
      host = 'api-football-v1.p.rapidapi.com';
      baseUrl = `https://${host}/v3`;
    }
    
    // Construct final URL
    const date = params?.date || new Date().toISOString().split('T')[0];
    const sport_slug = params?.sport_slug || 'football';
    
    let finalUrl = `${baseUrl}/${endpoint}`;
    
    // Build query string from params
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        queryParams.append(key, String(value));
      });
    }
    
    if (queryParams.toString()) {
      finalUrl += `?${queryParams.toString()}`;
    }
    
    console.log(`[Proxy] Requesting (${provider || 'sofascore'}): ${finalUrl}`);

    const response = await fetch(finalUrl, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': RAPID_API_KEY,
        'X-RapidAPI-Host': host,
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
