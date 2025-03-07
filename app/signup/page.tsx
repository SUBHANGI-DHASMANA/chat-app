"use client";
import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mobile, setMobile] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      return;
    }

    if (authData.user) {
      const { error: dbError } = await supabase.from("users").insert([
        {
          id: authData.user.id,
          email: authData.user.email,
          name,
          mobile,
        },
      ]);

      if (dbError) {
        setError(dbError.message);
        return;
      }

      router.push("/");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-[#F7F7F7] text-black">
      <div className="flex justify-center items-center flex-col bg-white p-8 px-16 rounded shadow-lg">
        <h2 className="text-2xl font-bold mb-10">Sign Up</h2>
        <form onSubmit={handleSignup} className="flex flex-col space-y-4">
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="p-2 border rounded"
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="p-2 border rounded"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="p-2 border rounded"
          />
          <input
            type="text"
            placeholder="Mobile Number"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            className="p-2 border rounded"
          />
          <button type="submit" className="p-2 bg-[#0C8E4D] text-white rounded">
            Signup
          </button>
        </form>
        {error && <p className="text-red-500">{error}</p>}
        <p className="p-4 mt-6">Already a User? <Link href='/login' className="underline text-green-700">Log in now!</Link></p>
      </div>
    </div>
  );
}