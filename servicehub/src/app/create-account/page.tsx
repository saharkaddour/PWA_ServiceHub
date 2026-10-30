import AuthForm from "@/components/AuthForm";

export const metadata = {
  title: "Create account | ServiceHub",
  description: "Create a ServiceHub account.",
};

export default function CreateAccountPage() {
  return <AuthForm mode="register" />;
}
