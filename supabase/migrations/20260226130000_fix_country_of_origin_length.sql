-- country_of_origin was VARCHAR(2) which only fits ISO codes like "DK"
-- but the URL scraper returns full country names like "Denmark"
ALTER TABLE public.physical_products ALTER COLUMN country_of_origin TYPE VARCHAR(100);
