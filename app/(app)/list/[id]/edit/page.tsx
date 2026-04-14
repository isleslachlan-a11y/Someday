// Editing list entries is now handled via the bottom sheet on the List page.
// This route is kept to avoid broken links during the v1 pivot.
import { redirect } from 'next/navigation'

export default function EditItemPage() {
  redirect('/list')
}
