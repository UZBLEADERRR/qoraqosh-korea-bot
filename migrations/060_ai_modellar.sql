-- AI modellari (egasining tanlovi):
--   tahlillar (skaner, maslahat, makiyaj…) — Google: gemini-3.8-flash,
--   yiqilsa gemini-3.7-flash;
--   xabar yozish (Instagram/Direct javoblari, postlar) — OpenRouter: GPT 5.6 Luna.
-- Admin panel → AI modellari bo'limida keyin o'zgartirsa bo'ladi.
insert into public.settings (key, value) values
  ('ai_modellar', '["gemini-3.8-flash", "gemini-3.7-flash"]'::jsonb),
  ('ai_yozuv_model', '"openai/gpt-5.6-luna"'::jsonb)
on conflict (key) do update set value = excluded.value, updated_at = now();
