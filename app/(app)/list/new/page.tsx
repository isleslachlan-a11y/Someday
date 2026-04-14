// Adding new places is now done from the Home page catalogue.
// This route is kept to avoid broken links during the v1 pivot.
import { redirect } from 'next/navigation'

export default function NewItemPage() {
  redirect('/home')
}
