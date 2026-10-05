import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PasswordForm } from "@/components/PasswordForm";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Change password",
  robots: { index: false, follow: false },
};

export default async function ChangePasswordPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account/password");
  return <PasswordForm hasPassword={Boolean(user.passwordHash)} />;
}
