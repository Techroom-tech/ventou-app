INSERT INTO public.platform_settings (key, value)
VALUES ('footer_disclaimer', '"Cette boutique est exploitée de manière indépendante et est responsable de ses propres contenus et produits."')
ON CONFLICT DO NOTHING;