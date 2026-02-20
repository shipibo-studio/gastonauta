#!/bin/bash
# Deploy script for Supabase Edge Functions
# Project: dxwjbluvxeusxtpstvsh

echo "Deploying Supabase Edge Functions..."

# Set required secrets (replace with your values)
# supabase secrets set WEBHOOK_BEARER_TOKEN=gastonauta-secret-token

# Deploy webhook-email function
echo "Deploying webhook-email function..."
supabase functions deploy webhook-email --project-ref dxwjbluvxeusxtpstvsh

echo "Deployment complete!"
echo ""
echo "Function URL: https://dxwjbluvxeusxtpstvsh.supabase.co/functions/v1/webhook-email"
echo ""
echo "To test locally:"
echo 'curl -X POST https://dxwjbluvxeusxtpstvsh.supabase.co/functions/v1/webhook-email \
  -H "Content-Type: application/json" \
  -d @test-email.json'
