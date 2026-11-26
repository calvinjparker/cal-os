-- Tables made in the SQL editor aren't granted to the API roles on this project,
-- so signed-in users got "permission denied". RLS still limits rows to allowlisted users.
grant select, insert, update, delete on public.wardrobe_items, public.wardrobe_outfits, public.wardrobe_assets, public.wardrobe_wears to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on function public.wear_items(bigint[], date) to authenticated;
grant execute on function public.is_allowed() to authenticated;
revoke all on public.wardrobe_items, public.wardrobe_outfits, public.wardrobe_assets, public.wardrobe_wears from anon;
