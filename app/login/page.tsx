"use client";
import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
    } else {
      router.push("/");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-[#F7F7F7] text-black">
      <div className="flex justify-center items-center flex-col bg-white p-8 rounded shadow-lg">
        <h2 className="text-2xl font-bold mb-10">Login</h2> 
        <form onSubmit={handleLogin} className="flex flex-col space-y-4">
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
          <button type="submit" className="p-2 bg-[#0C8E4D] text-white rounded">
            Login
          </button>
        </form>
        {error && <p className="text-red-500">{error}</p>}
        <p className="p-4 mt-6">New User? <Link href='/signup' className="underline text-green-700">Create new profile now!</Link></p>
      </div>
    </div>
  );
}
