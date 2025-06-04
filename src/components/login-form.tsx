"use client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [dept, setDept] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const { signUp, login } = useAuth();
  const router = useRouter();

  const handleSubmit = async function () {
    if (!dept || !password) {
      toast({
        title: "Please Enter email and password",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      if (isRegister) {
        await signUp(dept, password);
        console.log("Signing up a new user");
      } else {
        await login(dept, password);
        console.log("Logging in");
      }
      router.push("/");
    } catch (e) {
      toast({
        title: `There was a error ${isRegister ? "signing" : "logging"} you up`,
        variant: "destructive",
      });
      console.log(e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            {isRegister ? "Register" : "Login"}
          </CardTitle>
          <CardDescription>
            Enter your username and password login to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* <form> */}
          <div className="flex flex-col gap-6">
            <div className="grid gap-2">
              <Label htmlFor="email">Department</Label>
              <Input
                value={dept}
                onChange={(e) => {
                  setDept(e.target.value);
                }}
                type="email"
                placeholder="AN@GMAIL.COM"
                required
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Password</Label>
              </div>
              <Input
                placeholder="Password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                }}
                required
              />
            </div>
            <Button type="submit" className="w-full" onClick={handleSubmit}>
              {submitting ? "Submitting" : "Submit"}
            </Button>
          </div>
          <div className="mt-4 text-center text-sm">
            {isRegister ? "Already have an account?" : "Don't have an account?"}
            <a
              href="#"
              onClick={() => setIsRegister(!isRegister)}
              className="underline underline-offset-4"
            >
              {isRegister ? "Login" : "Sign up"}
            </a>
          </div>
          {/* </form> */}
        </CardContent>
      </Card>
    </div>
  );
}
