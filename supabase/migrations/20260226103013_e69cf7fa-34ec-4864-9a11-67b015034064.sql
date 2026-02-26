
-- Fix security definer view warning: Set companies_public to use invoker security
ALTER VIEW public.companies_public SET (security_invoker = on);
