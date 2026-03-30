export async function logEvent(event_type: string, properties: object) {
  await supabase.from('events').insert({ event_type, properties })
}
