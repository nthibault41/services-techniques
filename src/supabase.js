import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://fakjzofpufujfpaenqon.supabase.co' 

const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZha2p6b2ZwdWZ1amZwYWVucW9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0MzI1MDgsImV4cCI6MjA5NDAwODUwOH0.2kQ4bH_8sVXcO2GkUeBDV5IFumOXY92tbm414qKK3Qc' 

export const supabase = createClient(supabaseUrl, supabaseKey)