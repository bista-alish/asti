import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

const DOMAIN = '@asti.local'
export const toUsername = (email) =>
  email?.endsWith(DOMAIN) ? email.slice(0, -DOMAIN.length) : (email ?? '')

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)       // auth session resolved?
  const [profileLoading, setProfileLoading] = useState(false) // profile fetch in flight?

  useEffect(() => {
    // onAuthStateChange fires immediately with INITIAL_SESSION — no need for getSession()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        setLoading(false) // session is known — unblock routing immediately

        // TOKEN_REFRESHED just updates the token — no need to re-fetch the profile
        if (event === 'TOKEN_REFRESHED') return

        if (session?.user) {
          setProfileLoading(true)
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
          setProfile(data || null)
          setProfileLoading(false)
        } else {
          setProfile(null)
        }
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  async function signIn(username, password) {
    const { error } = await supabase.auth.signInWithPassword({
      email: `${username.trim().toLowerCase()}${DOMAIN}`,
      password,
    })
    return error
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ session, user: session?.user, profile, loading, profileLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
