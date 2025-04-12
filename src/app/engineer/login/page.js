'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function EngineerLogin() {
  const [engId, setEngId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  const handleLogin = async () => {
    setError('')

    const { data, error: fetchError } = await supabase
      .from('engineers')
      .select('id, eng_id, password, name')
      .eq('eng_id', engId)
      .single()

    if (fetchError || !data) {
      setError('Engineer not found')
      return
    }

    if (password !== data.password) {
      setError('Invalid password')
      return
    }

    localStorage.setItem('engineer', JSON.stringify({ id: data.id, name: data.name }))
    router.push('/engineer/jobs')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] p-4">
      <div className="w-full max-w-md bg-white/5 backdrop-blur-md rounded-3xl shadow-2xl p-8 border border-white/10">
        <h1 className="text-3xl font-extrabold text-center text-white mb-8">Engineer Login</h1>

        <div className="mb-4">
          <label className="text-sm text-white mb-1 block">Engineer ID</label>
          <input
            type="text"
            value={engId}
            onChange={(e) => setEngId(e.target.value)}
            placeholder="Enter your Engineer ID"
            className="w-full px-4 py-3 rounded-lg bg-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-teal-400"
          />
        </div>

        <div className="mb-6">
          <label className="text-sm text-white mb-1 block">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            className="w-full px-4 py-3 rounded-lg bg-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-teal-400"
          />
        </div>

        <button
          onClick={handleLogin}
          className="w-full py-3 bg-teal-500 hover:bg-teal-600 text-white font-bold rounded-lg transition"
        >
          Login
        </button>

        {error && <p className="mt-4 text-red-400 text-center">{error}</p>}
      </div>
    </div>
  )
}
