import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const SPORT_API_KEY = "sk_live_7f431190a0515b40375c17e0f9ff8f39fbc6df19"
const BASE_URL = "https://sportapi.ai" // Changed: removed /api from here to avoid duplication if endpoint has it

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { endpoint, params } = await req.json()
    
    // Use the exact URL structure that reached the server in previous logs
    // Base: https://sportapi.ai/api
    // Endpoint: /fixtures
    // Auth: token=... in query params
    
    const queryParams = new URLSearchParams()
    queryParams.append('token', SPORT_API_KEY)
    
    if (params) {
      Object.keys(params).forEach(key => {
        queryParams.append(key, params[key])
      })
    }

    const urlString = `https://sportapi.ai/api${endpoint.startsWith('/') ? endpoint : '/' + endpoint}?${queryParams.toString()}`
    
    console.log(`[Proxy] Final URL: ${urlString}`);

    const response = await fetch(urlString, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    })
    const data = await response.json()

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
