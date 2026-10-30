import AuthForm from "@/components/AuthForm";

export const metadata = {
  title: "Log in | ServiceHub",
  description: "Log in to your ServiceHub account.",
};

export default function LoginPage() {
  return <AuthForm mode="login" />;
}
