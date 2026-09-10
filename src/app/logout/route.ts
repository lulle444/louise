import { signOut } from "@/app/login/actions";

export async function POST() {
  await signOut();
}
