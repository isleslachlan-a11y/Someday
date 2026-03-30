-- ============================================================
-- Someday — seed data
-- Requires a test user in auth.users first.
-- Replace TEST_USER_ID with the actual UUID from your Supabase dashboard
-- or run: select id from auth.users limit 1;
-- ============================================================

do $$
declare
  test_user_id uuid := 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'; -- replace me
begin

  insert into public.bucket_list_items
    (user_id, destination_name, country, region, category, notes, status, priority)
  values
    (
      test_user_id,
      'Northern Lights in Tromsø',
      'Norway',
      'Troms',
      'Nature',
      'Best seen November–February. Book a guided chase tour.',
      'want',
      5
    ),
    (
      test_user_id,
      'Eat at a Michelin-starred ramen shop',
      'Japan',
      'Tokyo',
      'Food & Drink',
      'Fuunji or Tsuta are on the list.',
      'want',
      4
    ),
    (
      test_user_id,
      'Trek the Inca Trail to Machu Picchu',
      'Peru',
      'Cusco',
      'Adventure',
      'Permits sell out months in advance. Classic 4-day trail.',
      'want',
      5
    ),
    (
      test_user_id,
      'Attend Carnival in Rio de Janeiro',
      'Brazil',
      'Rio de Janeiro',
      'Culture',
      'Go at least once before the crowds feel overwhelming.',
      'want',
      3
    ),
    (
      test_user_id,
      'Safari in the Serengeti during the Great Migration',
      'Tanzania',
      'Serengeti',
      'Nature',
      'July–October for the river crossings. Stay at least 4 nights.',
      'want',
      5
    );

end $$;
