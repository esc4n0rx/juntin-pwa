import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export async function signInWithEmail(email: string) {
    const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
            shouldCreateUser: false,
            // emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
    })
    return { error }
}

// Actually user asked for "Login e registro com email/senha", NOT OTP (Magic Link).
// The prompt says: "Login e registro com email/senha"
// So I should use signInWithPassword and signUp.

export async function signUp(email: string, password: string, fullName: string) {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: fullName,
            },
        },
    })
    return { data, error }
}

export async function signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })
    return { data, error }
}

export async function signOut() {
    const { error } = await supabase.auth.signOut()
    return { error }
}

export async function getProfile(userId: string) {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

    return { data, error }
}

export async function updateProfileMode(userId: string, mode: 'solo' | 'couple') {
    const { data, error } = await supabase
        .from('profiles')
        .update({ mode })
        .eq('id', userId)
        .select() // return updated data
        .single()

    return { data, error }
}
